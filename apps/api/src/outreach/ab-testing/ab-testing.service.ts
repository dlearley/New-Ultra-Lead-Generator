import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface ABTestVariant {
  id: string;
  name: string;
  subject?: string;
  body: string;
  trafficPercentage: number;
}

export interface ABTestResult {
  variantId: string;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  statisticalSignificance: boolean;
  confidenceLevel: number;
}

@Injectable()
export class ABTestingService {
  private readonly logger = new Logger(ABTestingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // A/B TEST SETUP
  // ============================================================

  async createABTest(
    organizationId: string,
    sequenceId: string,
    stepId: string,
    variants: ABTestVariant[],
    sampleSize?: number,
    duration?: number, // days
  ): Promise<{
    testId: string;
    status: string;
    winnerCriteria: string;
  }> {
    // Validate variants
    if (variants.length < 2) {
      throw new Error('At least 2 variants required');
    }

    // Ensure traffic percentages sum to 100
    const totalPercentage = variants.reduce((sum, v) => sum + v.trafficPercentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.1) {
      throw new Error('Traffic percentages must sum to 100%');
    }

    // Create A/B test on sequence step
    await this.prisma.outreachStep.update({
      where: { id: stepId },
      data: {
        variant: 'A', // Mark as A/B test step
      },
    });

    // Enable A/B testing on sequence
    await this.prisma.outreachSequence.update({
      where: { id: sequenceId },
      data: {
        isABTest: true,
        abTestConfig: {
          stepId,
          variants: variants.map((v) => ({
            id: v.id,
            name: v.name,
            subject: v.subject,
            body: v.body,
            trafficPercentage: v.trafficPercentage,
          })),
          sampleSize: sampleSize || 100,
          duration: duration || 7,
          startDate: new Date(),
          status: 'running',
        },
      },
    });

    return {
      testId: `${sequenceId}_${stepId}`,
      status: 'running',
      winnerCriteria: 'reply_rate', // Default criteria
    };
  }

  // ============================================================
  // VARIANT ASSIGNMENT
  // ============================================================

  assignVariant(
    contactId: string,
    variants: ABTestVariant[],
  ): ABTestVariant {
    // Deterministic assignment based on contact ID
    // This ensures same contact always gets same variant
    const hash = this.hashString(contactId);
    const randomValue = (hash % 100) / 100;
    
    let cumulativePercentage = 0;
    for (const variant of variants) {
      cumulativePercentage += variant.trafficPercentage / 100;
      if (randomValue <= cumulativePercentage) {
        return variant;
      }
    }
    
    return variants[variants.length - 1];
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // ============================================================
  // RESULTS TRACKING
  // ============================================================

  async trackEvent(
    enrollmentId: string,
    eventType: 'sent' | 'opened' | 'clicked' | 'replied',
    variantId: string,
  ): Promise<void> {
    const fieldMap: Record<string, string> = {
      opened: 'openedCount',
      clicked: 'clickedCount',
      replied: 'repliedCount',
    };

    if (eventType === 'sent') {
      await this.prisma.outreachStep.update({
        where: { id: variantId },
        data: { sentCount: { increment: 1 } },
      });
    } else if (fieldMap[eventType]) {
      // Update appropriate count
      await this.prisma.outreachStep.update({
        where: { id: variantId },
        data: { [fieldMap[eventType]]: { increment: 1 } },
      });
    }
  }

  async getTestResults(
    organizationId: string,
    sequenceId: string,
    stepId?: string,
  ): Promise<ABTestResult[]> {
    const sequence = await this.prisma.outreachSequence.findFirst({
      where: { id: sequenceId, organizationId },
      include: { steps: true },
    });

    if (!sequence || !sequence.isABTest) {
      return [];
    }

    const abConfig = sequence.abTestConfig as any;
    const testStepId = stepId || abConfig?.stepId;
    
    if (!testStepId) {
      return [];
    }

    // Get step data
    const steps = await this.prisma.outreachStep.findMany({
      where: { sequenceId, id: testStepId },
    });

    const results: ABTestResult[] = [];
    
    for (const step of steps) {
      const sent = step.sentCount || 1;
      const opened = step.openedCount || 0;
      const clicked = step.clickedCount || 0;
      const replied = step.repliedCount || 0;

      results.push({
        variantId: step.id,
        sent,
        opened,
        clicked,
        replied,
        openRate: (opened / sent) * 100,
        clickRate: (clicked / sent) * 100,
        replyRate: (replied / sent) * 100,
        statisticalSignificance: this.calculateSignificance(sent, opened),
        confidenceLevel: 95,
      });
    }

    return results;
  }

  // ============================================================
  // STATISTICAL SIGNIFICANCE
  // ============================================================

  private calculateSignificance(sampleSize: number, conversions: number): boolean {
    // Simplified significance check
    // In production, use proper statistical tests (chi-square, z-test)
    
    if (sampleSize < 30) {
      return false; // Not enough data
    }

    const conversionRate = conversions / sampleSize;
    const standardError = Math.sqrt((conversionRate * (1 - conversionRate)) / sampleSize);
    const marginOfError = 1.96 * standardError; // 95% confidence
    
    // Significant if margin of error is less than 10% of conversion rate
    return marginOfError < (conversionRate * 0.1);
  }

  async determineWinner(
    organizationId: string,
    sequenceId: string,
    criteria: 'open_rate' | 'click_rate' | 'reply_rate' = 'reply_rate',
  ): Promise<{
    winner: ABTestResult | null;
    confidence: number;
    recommendation: string;
  }> {
    const results = await this.getTestResults(organizationId, sequenceId);
    
    if (results.length < 2) {
      return {
        winner: null,
        confidence: 0,
        recommendation: 'Not enough variants to compare',
      };
    }

    // Sort by criteria
    const sortedResults = [...results].sort((a, b) => {
      const metricMap: Record<string, keyof ABTestResult> = {
        open_rate: 'openRate',
        click_rate: 'clickRate',
        reply_rate: 'replyRate',
      };
      
      const metric = metricMap[criteria];
      return (b[metric] as number) - (a[metric] as number);
    });

    const winner = sortedResults[0];
    const runnerUp = sortedResults[1];

    // Calculate confidence
    const confidence = this.calculateWinnerConfidence(winner, runnerUp, criteria);
    
    let recommendation: string;
    if (winner.statisticalSignificance && confidence >= 95) {
      recommendation = `Winner identified with ${confidence.toFixed(1)}% confidence. Deploy to 100% of traffic.`;
    } else if (winner.statisticalSignificance) {
      recommendation = `Leading variant found, but confidence is ${confidence.toFixed(1)}%. Continue test for more data.`;
    } else {
      recommendation = 'Results are not statistically significant yet. Continue testing.';
    }

    return {
      winner,
      confidence,
      recommendation,
    };
  }

  private calculateWinnerConfidence(
    winner: ABTestResult,
    runnerUp: ABTestResult,
    criteria: string,
  ): number {
    const metricMap: Record<string, number> = {
      open_rate: winner.openRate,
      click_rate: winner.clickRate,
      reply_rate: winner.replyRate,
    };

    const winnerRate = metricMap[criteria];
    const runnerUpRate = metricMap[criteria];
    
    // Simple confidence estimation
    const difference = winnerRate - runnerUpRate;
    const combinedSample = winner.sent + runnerUp.sent;
    
    // Higher sample size and larger difference = higher confidence
    const sampleConfidence = Math.min(100, (combinedSample / 200) * 100);
    const differenceConfidence = Math.min(100, difference * 5);
    
    return Math.round((sampleConfidence + differenceConfidence) / 2);
  }

  // ============================================================
  // AUTO-OPTIMIZATION
  // ============================================================

  async autoOptimize(
    organizationId: string,
    sequenceId: string,
  ): Promise<{
    optimized: boolean;
    changes: string[];
    newTrafficSplit?: Record<string, number>;
  }> {
    const results = await this.getTestResults(organizationId, sequenceId);
    
    if (results.length < 2) {
      return { optimized: false, changes: ['Not enough variants'] };
    }

    const changes: string[] = [];
    
    // Check if we have a clear winner
    const { winner, confidence } = await this.determineWinner(
      organizationId,
      sequenceId,
      'reply_rate',
    );

    if (winner && confidence >= 95) {
      // Shift traffic to winner
      changes.push(`Shifted 100% traffic to winning variant (${winner.variantId})`);
      
      return {
        optimized: true,
        changes,
        newTrafficSplit: { [winner.variantId]: 100 },
      };
    }

    // Multi-armed bandit approach - gradually shift to better performers
    const totalSent = results.reduce((sum, r) => sum + r.sent, 0);
    if (totalSent > 100) {
      const performanceScores = results.map((r) => ({
        variantId: r.variantId,
        score: r.replyRate * 0.5 + r.openRate * 0.3 + r.clickRate * 0.2,
      }));

      const totalScore = performanceScores.reduce((sum, p) => sum + p.score, 0);
      const newSplit: Record<string, number> = {};
      
      for (const perf of performanceScores) {
        newSplit[perf.variantId] = Math.round((perf.score / totalScore) * 100);
      }

      changes.push('Adjusted traffic split based on performance');
      
      return {
        optimized: true,
        changes,
        newTrafficSplit: newSplit,
      };
    }

    return {
      optimized: false,
      changes: ['Not enough data for optimization yet'],
    };
  }

  // ============================================================
  // TEST RECOMMENDATIONS
  // ============================================================

  async getTestRecommendations(
    organizationId: string,
  ): Promise<Array<{
    type: string;
    element: string;
    currentValue: string;
    suggestedVariants: string[];
    expectedImpact: string;
  }>> {
    return [
      {
        type: 'subject_line',
        element: 'Email Subject',
        currentValue: 'Quick question about {{company}}',
        suggestedVariants: [
          '{{company}} + growth = ?',
          'Saw {{company}}\'s expansion',
          '15 min to discuss {{company}}?',
        ],
        expectedImpact: '+15-25% open rate',
      },
      {
        type: 'opening_line',
        element: 'Email Opening',
        currentValue: 'I hope this email finds you well',
        suggestedVariants: [
          'Saw your recent post about {{topic}}',
          'Congrats on the {{achievement}}',
          'Noticed {{company}}\'s growth...',
        ],
        expectedImpact: '+20-30% reply rate',
      },
      {
        type: 'cta',
        element: 'Call to Action',
        currentValue: 'Worth a brief conversation?',
        suggestedVariants: [
          'Are you open to a 15-min call Tuesday?',
          'Would you be interested in a quick demo?',
          'Can I send you a brief overview?',
        ],
        expectedImpact: '+10-15% conversion',
      },
    ];
  }
}
