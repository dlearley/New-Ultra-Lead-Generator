import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface OptimalTimeResult {
  contactId: string;
  recommendations: Array<{
    channel: string;
    day: string;
    time: string;
    confidence: number;
    reason: string;
  }>;
  bestTimeOverall: {
    day: string;
    time: string;
    channel: string;
  };
}

export interface EngagementPattern {
  contactId: string;
  emailOpensByHour: Record<number, number>; // hour -> count
  emailClicksByHour: Record<number, number>;
  emailRepliesByHour: Record<number, number>;
  linkedinViewsByHour: Record<number, number>;
  mostActiveDay: string;
  mostActiveHour: number;
  timezone?: string;
}

@Injectable()
export class OptimalTimeService {
  private readonly logger = new Logger(OptimalTimeService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // OPTIMAL TIME CALCULATION
  // ============================================================

  async calculateOptimalTime(
    organizationId: string,
    contactId: string,
  ): Promise<OptimalTimeResult> {
    // Get contact's engagement history
    const pattern = await this.analyzeEngagementPattern(organizationId, contactId);
    
    // Get industry benchmarks
    const benchmarks = this.getIndustryBenchmarks();
    
    // Calculate recommendations for each channel
    const recommendations: OptimalTimeResult['recommendations'] = [];

    // Email recommendations
    const emailRec = this.calculateBestTimeForChannel(
      pattern.emailOpensByHour,
      pattern.emailClicksByHour,
      pattern.emailRepliesByHour,
      'email',
      benchmarks.email,
    );
    if (emailRec) {
      recommendations.push(emailRec);
    }

    // LinkedIn recommendations
    const linkedinRec = this.calculateBestTimeForChannel(
      pattern.linkedinViewsByHour,
      {},
      {},
      'linkedin',
      benchmarks.linkedin,
    );
    if (linkedinRec) {
      recommendations.push(linkedinRec);
    }

    // Find best overall
    const bestOverall = recommendations.length > 0
      ? recommendations.reduce((best, current) =>
          current.confidence > best.confidence ? current : best
        )
      : { day: 'Tuesday', time: '10:00', channel: 'email', confidence: 50, reason: 'Default' };

    // Save to database
    await this.saveOptimalTime(organizationId, contactId, {
      emailBestTime: recommendations.find((r) => r.channel === 'email')?.time,
      emailBestDay: recommendations.find((r) => r.channel === 'email')?.day,
      linkedinBestTime: recommendations.find((r) => r.channel === 'linkedin')?.time,
      openPatterns: pattern.emailOpensByHour,
      clickPatterns: pattern.emailClicksByHour,
      replyPatterns: pattern.emailRepliesByHour,
    });

    return {
      contactId,
      recommendations,
      bestTimeOverall: {
        day: bestOverall.day,
        time: bestOverall.time,
        channel: bestOverall.channel,
      },
    };
  }

  // ============================================================
  // ENGAGEMENT PATTERN ANALYSIS
  // ============================================================

  async analyzeEngagementPattern(
    organizationId: string,
    contactId: string,
  ): Promise<EngagementPattern> {
    // Get step executions for this contact
    const executions = await this.prisma.stepExecution.findMany({
      where: {
        enrollment: { contactId },
        organizationId,
        status: 'sent',
      },
      orderBy: { sentAt: 'desc' },
      take: 100,
    });

    const opensByHour: Record<number, number> = {};
    const clicksByHour: Record<number, number> = {};
    const repliesByHour: Record<number, number> = {};
    const daysActive: Record<string, number> = {};

    for (let hour = 0; hour < 24; hour++) {
      opensByHour[hour] = 0;
      clicksByHour[hour] = 0;
      repliesByHour[hour] = 0;
    }

    for (const execution of executions) {
      // Track opens
      if (execution.openedAt) {
        const hour = new Date(execution.openedAt).getHours();
        const day = new Date(execution.openedAt).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        opensByHour[hour] = (opensByHour[hour] || 0) + (execution.openCount || 1);
        daysActive[day] = (daysActive[day] || 0) + 1;
      }

      // Track clicks
      if (execution.clickedAt) {
        const hour = new Date(execution.clickedAt).getHours();
        clicksByHour[hour] = (clicksByHour[hour] || 0) + (execution.clickCount || 1);
      }

      // Track replies
      if (execution.repliedAt) {
        const hour = new Date(execution.repliedAt).getHours();
        repliesByHour[hour] = (repliesByHour[hour] || 0) + 1;
      }
    }

    // Find most active day and hour
    const mostActiveDay = Object.entries(daysActive)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'tuesday';

    const mostActiveHour = Object.entries(opensByHour)
      .sort((a, b) => b[1] - a[1])[0]?.[0] 
      ? parseInt(Object.entries(opensByHour).sort((a, b) => b[1] - a[1])[0][0])
      : 10;

    return {
      contactId,
      emailOpensByHour: opensByHour,
      emailClicksByHour: clicksByHour,
      emailRepliesByHour: repliesByHour,
      linkedinViewsByHour: {},
      mostActiveDay,
      mostActiveHour,
    };
  }

  // ============================================================
  // BEST TIME CALCULATION
  // ============================================================

  private calculateBestTimeForChannel(
    opens: Record<number, number>,
    clicks: Record<number, number>,
    replies: Record<number, number>,
    channel: string,
    benchmarks: { bestHours: number[]; bestDays: string[] },
  ): {
    channel: string;
    day: string;
    time: string;
    confidence: number;
    reason: string;
  } | null {
    // Score each hour based on engagement
    const hourScores: Record<number, number> = {};

    for (let hour = 0; hour < 24; hour++) {
      let score = 0;

      // Weight: opens (30%), clicks (30%), replies (40%)
      score += (opens[hour] || 0) * 0.3;
      score += (clicks[hour] || 0) * 0.3;
      score += (replies[hour] || 0) * 0.4;

      // Boost if hour matches industry benchmark
      if (benchmarks.bestHours.includes(hour)) {
        score *= 1.2;
      }

      hourScores[hour] = score;
    }

    // Find best hour
    const bestHourEntry = Object.entries(hourScores)
      .sort((a, b) => b[1] - a[1])[0];

    if (!bestHourEntry) {
      return null;
    }

    const bestHour = parseInt(bestHourEntry[0]);
    const score = bestHourEntry[1];

    // Determine confidence based on data volume
    const totalOpens = Object.values(opens).reduce((a, b) => a + b, 0);
    let confidence = Math.min(95, 30 + totalOpens * 2);

    // Determine best day
    const bestDay = benchmarks.bestDays[0];

    // Generate reason
    let reason = `Based on ${totalOpens} opens, peak activity at ${bestHour}:00`;
    if (score > 0) {
      reason += ` (engagement score: ${Math.round(score)})`;
    }

    return {
      channel,
      day: bestDay,
      time: `${bestHour.toString().padStart(2, '0')}:00`,
      confidence,
      reason,
    };
  }

  // ============================================================
  // INDUSTRY BENCHMARKS
  // ============================================================

  private getIndustryBenchmarks(): {
    email: { bestHours: number[]; bestDays: string[] };
    linkedin: { bestHours: number[]; bestDays: string[] };
  } {
    return {
      email: {
        bestHours: [8, 9, 10, 13, 14, 15], // 8am, 9am, 10am, 1pm, 2pm, 3pm
        bestDays: ['tuesday', 'wednesday', 'thursday'],
      },
      linkedin: {
        bestHours: [8, 9, 12, 13, 17, 18], // Morning, lunch, evening
        bestDays: ['tuesday', 'wednesday', 'thursday'],
      },
    };
  }

  // ============================================================
  // SAVE OPTIMAL TIME
  // ============================================================

  private async saveOptimalTime(
    organizationId: string,
    contactId: string,
    data: {
      emailBestTime?: string;
      emailBestDay?: string;
      linkedinBestTime?: string;
      openPatterns: Record<number, number>;
      clickPatterns: Record<number, number>;
      replyPatterns: Record<number, number>;
    },
  ): Promise<void> {
    await this.prisma.sendTimeOptimization.upsert({
      where: {
        organizationId_contactId: {
          organizationId,
          contactId,
        },
      },
      create: {
        organizationId,
        contactId,
        emailBestTime: data.emailBestTime,
        emailBestDay: data.emailBestDay,
        linkedinBestTime: data.linkedinBestTime,
        openPatterns: data.openPatterns,
        clickPatterns: data.clickPatterns,
        replyPatterns: data.replyPatterns,
        lastCalculatedAt: new Date(),
      },
      update: {
        emailBestTime: data.emailBestTime,
        emailBestDay: data.emailBestDay,
        linkedinBestTime: data.linkedinBestTime,
        openPatterns: data.openPatterns,
        clickPatterns: data.clickPatterns,
        replyPatterns: data.replyPatterns,
        lastCalculatedAt: new Date(),
      },
    });
  }

  // ============================================================
  // BATCH OPTIMIZATION
  // ============================================================

  async batchCalculateOptimalTimes(
    organizationId: string,
    contactIds: string[],
  ): Promise<{
    processed: number;
    results: OptimalTimeResult[];
  }> {
    const results: OptimalTimeResult[] = [];

    for (const contactId of contactIds) {
      try {
        const result = await this.calculateOptimalTime(organizationId, contactId);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to calculate optimal time for ${contactId}:`, error);
      }
    }

    return {
      processed: results.length,
      results,
    };
  }

  // ============================================================
  // AI RECOMMENDATIONS
  // ============================================================

  async getAIRecommendations(
    organizationId: string,
    contactId: string,
  ): Promise<{
    suggestedSubjectLines: string[];
    bestSendTimes: Array<{ time: string; reason: string }>;
    personalizationTips: string[];
  }> {
    const optimalTime = await this.prisma.sendTimeOptimization.findFirst({
      where: { organizationId, contactId },
    });

    const bestTimes = [];
    if (optimalTime?.emailBestTime) {
      bestTimes.push({
        time: optimalTime.emailBestTime,
        reason: 'Based on their email open patterns',
      });
    }

    // Add general best practices
    bestTimes.push(
      { time: '09:00', reason: 'Start of work day - high visibility' },
      { time: '14:00', reason: 'Post-lunch - catching up on emails' },
    );

    return {
      suggestedSubjectLines: [
        'Quick question about {{company}}',
        '{{company}} + growth opportunity?',
        '15 min to discuss {{company}}?',
      ],
      bestSendTimes: bestTimes,
      personalizationTips: [
        'Reference their recent LinkedIn activity',
        'Mention a company achievement',
        'Connect to their industry trends',
      ],
    };
  }

  // ============================================================
  // ORGANIZATION-WIDE OPTIMIZATION
  // ============================================================

  async getOrganizationBestTimes(
    organizationId: string,
  ): Promise<{
    overall: { day: string; hour: number };
    bySegment: Record<string, { day: string; hour: number }>;
  }> {
    // Aggregate across all contacts
    const optimizations = await this.prisma.sendTimeOptimization.findMany({
      where: { organizationId },
    });

    const dayCounts: Record<string, number> = {};
    const hourCounts: Record<number, number> = {};

    for (const opt of optimizations) {
      if (opt.emailBestDay) {
        dayCounts[opt.emailBestDay] = (dayCounts[opt.emailBestDay] || 0) + 1;
      }
      if (opt.emailBestTime) {
        const hour = parseInt(opt.emailBestTime.split(':')[0]);
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    }

    const bestDay = Object.entries(dayCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'tuesday';

    const bestHour = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] 
      ? parseInt(Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0][0])
      : 10;

    return {
      overall: { day: bestDay, hour: bestHour },
      bySegment: {
        enterprise: { day: 'tuesday', hour: 9 },
        mid_market: { day: 'wednesday', hour: 10 },
        smb: { day: 'thursday', hour: 14 },
      },
    };
  }

  // ============================================================
  // MOBILE ALERTS
  // ============================================================

  async getMobileAlerts(
    agentId: string,
  ): Promise<Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    message: string;
    contactId: string;
    contactName: string;
    actionRequired: string;
  }>> {
    // Get high-priority replies requiring response
    const replies = await this.prisma.outreachReply.findMany({
      where: {
        enrollment: { assignedToId: agentId },
        status: 'unread',
      },
      include: {
        enrollment: {
          include: {
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      take: 10,
    });

    return replies.map((reply) => ({
      type: 'reply',
      priority: reply.sentiment === 'positive' ? 'high' : 'medium',
      message: `New reply from ${reply.enrollment.contact.firstName} ${reply.enrollment.contact.lastName}`,
      contactId: reply.enrollment.contact.id,
      contactName: `${reply.enrollment.contact.firstName} ${reply.enrollment.contact.lastName}`,
      actionRequired: 'Respond to email',
    }));
  }
}
