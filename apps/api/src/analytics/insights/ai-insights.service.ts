import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface AIInsightData {
  title: string;
  description: string;
  insightType: 'trend' | 'anomaly' | 'recommendation' | 'prediction' | 'benchmark';
  category: string;
  metric: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  recommendation?: string;
  actionItems: string[];
  priority: 'high' | 'medium' | 'low';
}

@Injectable()
export class AIInsightsService {
  private readonly logger = new Logger(AIInsightsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // GENERATE INSIGHTS
  // ============================================================

  async generateInsights(organizationId: string): Promise<AIInsightData[]> {
    const insights: AIInsightData[] = [];

    // Analyze trends
    const trendInsights = await this.analyzeTrends(organizationId);
    insights.push(...trendInsights);

    // Detect anomalies
    const anomalyInsights = await this.detectAnomalies(organizationId);
    insights.push(...anomalyInsights);

    // Generate recommendations
    const recommendationInsights = await this.generateRecommendations(organizationId);
    insights.push(...recommendationInsights);

    // Benchmark comparisons
    const benchmarkInsights = await this.compareBenchmarks(organizationId);
    insights.push(...benchmarkInsights);

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Save to database
    for (const insight of insights) {
      await this.saveInsight(organizationId, insight);
    }

    return insights;
  }

  // ============================================================
  // TREND ANALYSIS
  // ============================================================

  private async analyzeTrends(organizationId: string): Promise<AIInsightData[]> {
    const insights: AIInsightData[] = [];

    // Email open rate trend
    const emailTrend = await this.analyzeEmailTrends(organizationId);
    if (emailTrend) {
      insights.push(emailTrend);
    }

    // Lead volume trend
    const leadTrend = await this.analyzeLeadTrends(organizationId);
    if (leadTrend) {
      insights.push(leadTrend);
    }

    // Conversion rate trend
    const conversionTrend = await this.analyzeConversionTrends(organizationId);
    if (conversionTrend) {
      insights.push(conversionTrend);
    }

    return insights;
  }

  private async analyzeEmailTrends(organizationId: string): Promise<AIInsightData | null> {
    // Get this week's vs last week's open rates
    const thisWeekOpens = await this.getMetricForPeriod(organizationId, 'email_opens', 7);
    const lastWeekOpens = await this.getMetricForPeriod(organizationId, 'email_opens', 14, 7);
    
    const thisWeekSent = await this.getMetricForPeriod(organizationId, 'emails_sent', 7);
    const lastWeekSent = await this.getMetricForPeriod(organizationId, 'emails_sent', 14, 7);

    const thisWeekRate = thisWeekSent > 0 ? (thisWeekOpens / thisWeekSent) * 100 : 0;
    const lastWeekRate = lastWeekSent > 0 ? (lastWeekOpens / lastWeekSent) * 100 : 0;
    
    const changePercent = lastWeekRate > 0 
      ? ((thisWeekRate - lastWeekRate) / lastWeekRate) * 100 
      : 0;

    if (Math.abs(changePercent) > 10) {
      const isPositive = changePercent > 0;
      
      return {
        title: isPositive 
          ? '📈 Email Open Rates Improved' 
          : '⚠️ Email Open Rates Dropped',
        description: isPositive
          ? `Your email open rates increased by ${changePercent.toFixed(1)}% this week (${thisWeekRate.toFixed(1)}% vs ${lastWeekRate.toFixed(1)}% last week). Your subject line optimizations are working!`
          : `Your email open rates dropped by ${Math.abs(changePercent).toFixed(1)}% this week (${thisWeekRate.toFixed(1)}% vs ${lastWeekRate.toFixed(1)}% last week). This could indicate deliverability issues or subject line fatigue.`,
        insightType: 'trend',
        category: 'email',
        metric: 'open_rate',
        currentValue: thisWeekRate,
        previousValue: lastWeekRate,
        changePercent,
        recommendation: isPositive
          ? 'Keep testing subject lines to maintain this momentum. Consider A/B testing your top performers.'
          : 'Review your subject lines for spam trigger words. Check your sender reputation and consider warming up new sending domains.',
        actionItems: isPositive
          ? ['Document winning subject line patterns', 'Scale A/B testing', 'Analyze best performing send times']
          : ['Audit subject lines for spam words', 'Check sender reputation score', 'Review recent list imports', 'Test new subject line variations'],
        priority: changePercent < -20 ? 'high' : changePercent < -10 ? 'medium' : 'low',
      };
    }

    return null;
  }

  private async analyzeLeadTrends(organizationId: string): Promise<AIInsightData | null> {
    const thisMonth = await this.getMetricForPeriod(organizationId, 'leads', 30);
    const lastMonth = await this.getMetricForPeriod(organizationId, 'leads', 60, 30);
    
    const changePercent = lastMonth > 0 
      ? ((thisMonth - lastMonth) / lastMonth) * 100 
      : 0;

    if (Math.abs(changePercent) > 15) {
      const isPositive = changePercent > 0;
      
      return {
        title: isPositive 
          ? '🚀 Lead Volume Surging' 
          : '📉 Lead Volume Declining',
        description: isPositive
          ? `Lead volume is up ${changePercent.toFixed(1)}% this month (${thisMonth} vs ${lastMonth} last month). Your campaigns are gaining traction!`
          : `Lead volume is down ${Math.abs(changePercent).toFixed(1)}% this month (${thisMonth} vs ${lastMonth} last month). Review your top performing channels.`,
        insightType: 'trend',
        category: 'lead_source',
        metric: 'lead_volume',
        currentValue: thisMonth,
        previousValue: lastMonth,
        changePercent,
        recommendation: isPositive
          ? 'Double down on your top performing channels. Consider increasing budget for high-ROI sources.'
          : 'Analyze which channels dropped off. Check for campaign pauses, budget reductions, or technical issues.',
        actionItems: isPositive
          ? ['Increase budget for top channels', 'Scale winning campaigns', 'Document what\'s working']
          : ['Audit paused campaigns', 'Check tracking pixels', 'Review channel performance', 'Identify budget cuts'],
        priority: changePercent < -25 ? 'high' : changePercent < -15 ? 'medium' : 'low',
      };
    }

    return null;
  }

  private async analyzeConversionTrends(organizationId: string): Promise<AIInsightData | null> {
    // Calculate conversion rate trend
    const thisMonthLeads = await this.getMetricForPeriod(organizationId, 'leads', 30);
    const thisMonthConversions = await this.getMetricForPeriod(organizationId, 'conversions', 30);
    
    const lastMonthLeads = await this.getMetricForPeriod(organizationId, 'leads', 60, 30);
    const lastMonthConversions = await this.getMetricForPeriod(organizationId, 'conversions', 60, 30);

    const thisRate = thisMonthLeads > 0 ? (thisMonthConversions / thisMonthLeads) * 100 : 0;
    const lastRate = lastMonthLeads > 0 ? (lastMonthConversions / lastMonthLeads) * 100 : 0;
    
    const changePercent = lastRate > 0 ? ((thisRate - lastRate) / lastRate) * 100 : 0;

    if (Math.abs(changePercent) > 10) {
      const isPositive = changePercent > 0;
      
      return {
        title: isPositive 
          ? '✅ Conversion Rate Improving' 
          : '⚠️ Conversion Rate Dropping',
        description: isPositive
          ? `Your lead-to-customer conversion rate improved by ${changePercent.toFixed(1)}% (${thisRate.toFixed(1)}% vs ${lastRate.toFixed(1)}%). Your sales process optimizations are paying off!`
          : `Your conversion rate dropped by ${Math.abs(changePercent).toFixed(1)}% (${thisRate.toFixed(1)}% vs ${lastRate.toFixed(1)}%). Review your qualification criteria and sales handoff process.`,
        insightType: 'trend',
        category: 'conversion',
        metric: 'conversion_rate',
        currentValue: thisRate,
        previousValue: lastRate,
        changePercent,
        recommendation: isPositive
          ? 'Document what\'s working in your sales process. Consider expanding successful tactics to other reps.'
          : 'Audit your lead scoring model. Check if marketing and sales are aligned on qualification criteria.',
        actionItems: isPositive
          ? ['Document winning tactics', 'Train other reps', 'Scale successful plays']
          : ['Review lead scoring', 'Audit sales handoff', 'Check follow-up timing', 'Analyze lost deals'],
        priority: changePercent < -15 ? 'high' : 'medium',
      };
    }

    return null;
  }

  // ============================================================
  // ANOMALY DETECTION
  // ============================================================

  private async detectAnomalies(organizationId: string): Promise<AIInsightData[]> {
    const insights: AIInsightData[] = [];

    // Check for sudden spikes or drops
    const dailyLeads = await this.getDailyLeads(organizationId, 14);
    
    if (dailyLeads.length >= 7) {
      const avg = dailyLeads.reduce((a, b) => a + b, 0) / dailyLeads.length;
      const stdDev = this.calculateStdDev(dailyLeads, avg);
      
      const today = dailyLeads[0];
      const zScore = (today - avg) / stdDev;

      if (Math.abs(zScore) > 2) {
        const isSpike = zScore > 0;
        const changePercent = ((today - avg) / avg) * 100;
        
        insights.push({
          title: isSpike ? '🔥 Unusual Lead Spike Detected' : '⚠️ Lead Drop Alert',
          description: isSpike
            ? `You received ${today} leads today - that's ${changePercent.toFixed(0)}% above your 2-week average of ${Math.round(avg)}. Something went viral!`
            : `Only ${today} leads today - that's ${Math.abs(changePercent).toFixed(0)}% below your 2-week average of ${Math.round(avg)}. Investigate immediately.`,
          insightType: 'anomaly',
          category: 'lead_source',
          metric: 'daily_leads',
          currentValue: today,
          previousValue: avg,
          changePercent,
          recommendation: isSpike
            ? 'Identify the source of the spike and capitalize on it. Increase capacity to handle the influx.'
            : 'Check if campaigns are still running. Verify tracking is working. Look for technical issues.',
          actionItems: isSpike
            ? ['Identify the source', 'Check campaign performance', 'Scale the winning tactic', 'Prepare sales team']
            : ['Check campaign status', 'Verify tracking', 'Test lead forms', 'Check for errors'],
          priority: isSpike ? 'medium' : 'high',
        });
      }
    }

    return insights;
  }

  // ============================================================
  // RECOMMENDATIONS
  // ============================================================

  private async generateRecommendations(organizationId: string): Promise<AIInsightData[]> {
    const insights: AIInsightData[] = [];

    // Check for optimization opportunities
    const sequenceStats = await this.getSequenceStats(organizationId);
    
    if (sequenceStats.avgOpenRate < 20) {
      insights.push({
        title: '💡 Improve Email Open Rates',
        description: `Your average email open rate is ${sequenceStats.avgOpenRate.toFixed(1)}%, which is below the industry benchmark of 24%. Here are 3 quick fixes to try:`,
        insightType: 'recommendation',
        category: 'email',
        metric: 'open_rate',
        currentValue: sequenceStats.avgOpenRate,
        previousValue: 24,
        changePercent: -((24 - sequenceStats.avgOpenRate) / 24) * 100,
        recommendation: 'Implement these 3 proven tactics to boost open rates:',
        actionItems: [
          '1. Add personalization: Use {{firstName}} in subject lines (can increase opens by 26%)',
          '2. Send at optimal times: Tuesday-Thursday, 9-11am typically performs best',
          '3. A/B test subject lines: Test curiosity vs. benefit-driven subjects',
        ],
        priority: 'medium',
      });
    }

    // Check for sequence completion rates
    if (sequenceStats.completionRate < 60) {
      insights.push({
        title: '💡 Reduce Sequence Drop-offs',
        description: `Only ${sequenceStats.completionRate.toFixed(0)}% of contacts complete your sequences. Most drop off after the first email.`,
        insightType: 'recommendation',
        category: 'engagement',
        metric: 'sequence_completion',
        currentValue: sequenceStats.completionRate,
        previousValue: 75,
        changePercent: -((75 - sequenceStats.completionRate) / 75) * 100,
        recommendation: 'Improve sequence engagement with these tactics:',
        actionItems: [
          'Shorten your sequences - 3-5 touches is the sweet spot',
          'Add value in every touch, not just asks',
          'Use multi-channel (email + LinkedIn) for better engagement',
          'Test different cadences (3 days vs 5 days between touches)',
        ],
        priority: 'medium',
      });
    }

    return insights;
  }

  // ============================================================
  // BENCHMARK COMPARISONS
  // ============================================================

  private async compareBenchmarks(organizationId: string): Promise<AIInsightData[]> {
    const insights: AIInsightData[] = [];

    // Compare to industry benchmarks
    const benchmarks = await this.getBenchmarks(organizationId);
    
    if (benchmarks.openRate > 0) {
      const industryAvg = 24; // Industry average
      
      if (benchmarks.openRate < industryAvg - 5) {
        insights.push({
          title: '📊 Below Industry Average on Opens',
          description: `Your ${benchmarks.openRate.toFixed(1)}% open rate is below the ${industryAvg}% industry average. You're in the bottom 30% of similar companies.`,
          insightType: 'benchmark',
          category: 'email',
          metric: 'open_rate',
          currentValue: benchmarks.openRate,
          previousValue: industryAvg,
          changePercent: -((industryAvg - benchmarks.openRate) / industryAvg) * 100,
          recommendation: 'Top performers achieve 35%+ open rates. Focus on subject line optimization and list hygiene.',
          actionItems: [
            'Audit and clean your email list',
            'Implement subject line A/B testing',
            'Segment by engagement level',
            'Review sender reputation',
          ],
          priority: 'medium',
        });
      } else if (benchmarks.openRate > industryAvg + 5) {
        insights.push({
          title: '🏆 Top Performer on Email Opens!',
          description: `Your ${benchmarks.openRate.toFixed(1)}% open rate puts you in the top 20% of similar companies. Great work!`,
          insightType: 'benchmark',
          category: 'email',
          metric: 'open_rate',
          currentValue: benchmarks.openRate,
          previousValue: industryAvg,
          changePercent: ((benchmarks.openRate - industryAvg) / industryAvg) * 100,
          recommendation: 'You\'re outperforming the industry. Document your tactics and scale them.',
          actionItems: [
            'Document your winning subject line patterns',
            'Share tactics with the team',
            'Test advanced personalization',
            'Consider increasing email volume',
          ],
          priority: 'low',
        });
      }
    }

    return insights;
  }

  // ============================================================
  // DATA FETCHING
  // ============================================================

  private async getMetricForPeriod(
    organizationId: string,
    metric: string,
    daysBack: number,
    daysDuration?: number,
  ): Promise<number> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - (daysBack - (daysDuration || daysBack)));
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Mock implementations - in production, query actual tables
    const mockValues: Record<string, number> = {
      'email_opens': 1250,
      'emails_sent': 5000,
      'leads': 450,
      'conversions': 85,
    };

    return mockValues[metric] || Math.floor(Math.random() * 1000) + 100;
  }

  private async getDailyLeads(organizationId: string, days: number): Promise<number[]> {
    // Mock daily lead data
    const data: number[] = [];
    for (let i = 0; i < days; i++) {
      data.push(Math.floor(Math.random() * 30) + 10);
    }
    return data;
  }

  private async getSequenceStats(organizationId: string): Promise<any> {
    return {
      avgOpenRate: 18.5,
      avgClickRate: 3.2,
      avgReplyRate: 1.8,
      completionRate: 55,
    };
  }

  private async getBenchmarks(organizationId: string): Promise<any> {
    return {
      openRate: 21.5,
      clickRate: 3.8,
      conversionRate: 2.5,
    };
  }

  // ============================================================
  // INSIGHT MANAGEMENT
  // ============================================================

  private async saveInsight(
    organizationId: string,
    insight: AIInsightData,
  ): Promise<void> {
    await this.prisma.aIInsight.create({
      data: {
        organizationId,
        title: insight.title,
        description: insight.description,
        insightType: insight.insightType,
        category: insight.category,
        metric: insight.metric,
        currentValue: insight.currentValue,
        previousValue: insight.previousValue,
        changePercent: insight.changePercent,
        recommendation: insight.recommendation,
        actionItems: insight.actionItems,
        priority: insight.priority,
        status: 'new',
      },
    });
  }

  async getInsights(
    organizationId: string,
    filters?: {
      category?: string;
      priority?: string;
      status?: string;
      limit?: number;
    },
  ): Promise<any[]> {
    const where: any = { organizationId };
    
    if (filters?.category) where.category = filters.category;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.status) where.status = filters.status;

    return this.prisma.aIInsight.findMany({
      where,
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' },
      ],
      take: filters?.limit || 20,
    });
  }

  async acknowledgeInsight(
    organizationId: string,
    insightId: string,
    userId: string,
  ): Promise<void> {
    await this.prisma.aIInsight.update({
      where: { id: insightId, organizationId },
      data: {
        status: 'acknowledged',
        acknowledgedById: userId,
        acknowledgedAt: new Date(),
      },
    });
  }

  async dismissInsight(
    organizationId: string,
    insightId: string,
  ): Promise<void> {
    await this.prisma.aIInsight.update({
      where: { id: insightId, organizationId },
      data: { status: 'dismissed' },
    });
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private calculateStdDev(values: number[], mean: number): number {
    const squareDiffs = values.map((value) => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }
}
