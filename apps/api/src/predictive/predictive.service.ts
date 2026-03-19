import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';

export interface ChurnRiskScore {
  contactId: string;
  riskScore: number; // 0-100, higher = more likely to churn
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{
    name: string;
    weight: number;
    score: number;
    description: string;
  }>;
  predictedChurnDate?: Date;
  recommendations: string[];
}

export interface BestTimeToContact {
  contactId: string;
  dayOfWeek: number; // 0-6
  hourOfDay: number; // 0-23
  confidence: number; // 0-100
  reason: string;
  timezone?: string;
}

@Injectable()
export class PredictiveService {
  private readonly logger = new Logger(PredictiveService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // CHURN PREDICTION
  // ============================================================

  async predictChurnRisk(
    organizationId: string,
    contactId: string,
  ): Promise<ChurnRiskScore> {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        emailEvents: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
        leadScores: {
          orderBy: { calculatedAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            activities: true,
            emailEvents: true,
          },
        },
      },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    const factors: ChurnRiskScore['factors'] = [];
    let totalScore = 0;
    let totalWeight = 0;

    // Factor 1: Days since last activity (weight: 30%)
    const lastActivity = contact.activities[0]?.createdAt;
    const daysSinceActivity = lastActivity
      ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    
    let activityScore = 0;
    if (daysSinceActivity <= 7) activityScore = 0;
    else if (daysSinceActivity <= 14) activityScore = 20;
    else if (daysSinceActivity <= 30) activityScore = 40;
    else if (daysSinceActivity <= 60) activityScore = 60;
    else activityScore = 80;

    factors.push({
      name: 'Inactivity',
      weight: 0.3,
      score: activityScore,
      description: `${daysSinceActivity} days since last activity`,
    });
    totalScore += activityScore * 0.3;
    totalWeight += 0.3;

    // Factor 2: Email engagement decline (weight: 25%)
    const recentEmails = contact.emailEvents.filter(
      (e) => e.timestamp > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    );
    const openedEmails = recentEmails.filter((e) => e.event === 'opened').length;
    const openRate = recentEmails.length > 0
      ? (openedEmails / recentEmails.length) * 100
      : 0;

    let engagementScore = 0;
    if (openRate >= 50) engagementScore = 0;
    else if (openRate >= 30) engagementScore = 30;
    else if (openRate >= 10) engagementScore = 60;
    else engagementScore = 90;

    factors.push({
      name: 'Email Engagement',
      weight: 0.25,
      score: engagementScore,
      description: `${openRate.toFixed(1)}% open rate in last 30 days`,
    });
    totalScore += engagementScore * 0.25;
    totalWeight += 0.25;

    // Factor 3: Lead score trend (weight: 20%)
    const currentScore = contact.leadScores[0]?.totalScore || 50;
    let scoreTrendScore = 0;
    if (currentScore >= 80) scoreTrendScore = 0;
    else if (currentScore >= 60) scoreTrendScore = 30;
    else if (currentScore >= 40) scoreTrendScore = 60;
    else scoreTrendScore = 90;

    factors.push({
      name: 'Lead Score',
      weight: 0.2,
      score: scoreTrendScore,
      description: `Current lead score: ${currentScore}`,
    });
    totalScore += scoreTrendScore * 0.2;
    totalWeight += 0.2;

    // Factor 4: Contact age (weight: 15%)
    const contactAge = Math.floor(
      (Date.now() - contact.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    let ageScore = 0;
    if (contactAge <= 30) ageScore = 0;
    else if (contactAge <= 90) ageScore = 20;
    else if (contactAge <= 180) ageScore = 40;
    else ageScore = 60;

    factors.push({
      name: 'Contact Age',
      weight: 0.15,
      score: ageScore,
      description: `${contactAge} days since contact creation`,
    });
    totalScore += ageScore * 0.15;
    totalWeight += 0.15;

    // Factor 5: Bounced emails (weight: 10%)
    const bouncedEmails = contact.emailEvents.filter(
      (e) => e.event === 'bounced',
    ).length;
    let bounceScore = bouncedEmails > 0 ? 70 : 0;

    factors.push({
      name: 'Email Bounces',
      weight: 0.1,
      score: bounceScore,
      description: `${bouncedEmails} bounced emails`,
    });
    totalScore += bounceScore * 0.1;
    totalWeight += 0.1;

    // Calculate final score
    const normalizedScore = Math.round(totalScore / totalWeight);

    // Determine risk level
    let riskLevel: ChurnRiskScore['riskLevel'];
    if (normalizedScore < 30) riskLevel = 'low';
    else if (normalizedScore < 50) riskLevel = 'medium';
    else if (normalizedScore < 75) riskLevel = 'high';
    else riskLevel = 'critical';

    // Generate recommendations
    const recommendations: string[] = [];
    if (daysSinceActivity > 14) {
      recommendations.push('Reach out with a personalized check-in message');
    }
    if (openRate < 20) {
      recommendations.push('Try a different subject line or content approach');
    }
    if (currentScore < 50) {
      recommendations.push('Schedule a value-add demo or consultation');
    }
    if (recommendations.length === 0) {
      recommendations.push('Continue regular engagement cadence');
    }

    return {
      contactId,
      riskScore: normalizedScore,
      riskLevel,
      factors,
      recommendations,
    };
  }

  async getHighRiskContacts(
    organizationId: string,
    minRiskScore: number = 70,
    limit: number = 50,
  ): Promise<ChurnRiskScore[]> {
    // Get all contacts with recent activity
    const contacts = await this.prisma.contact.findMany({
      where: {
        organizationId,
        status: { not: 'churned' },
      },
      take: limit * 2, // Get more to filter
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        emailEvents: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    });

    // Calculate churn risk for each
    const results: ChurnRiskScore[] = [];
    for (const contact of contacts.slice(0, limit)) {
      const risk = await this.predictChurnRisk(organizationId, contact.id);
      if (risk.riskScore >= minRiskScore) {
        results.push(risk);
      }
    }

    return results.sort((a, b) => b.riskScore - a.riskScore);
  }

  // ============================================================
  // BEST TIME TO CONTACT
  // ============================================================

  async predictBestTimeToContact(
    organizationId: string,
    contactId: string,
  ): Promise<BestTimeToContact> {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId },
      include: {
        emailEvents: {
          where: {
            event: { in: ['opened', 'clicked'] },
          },
          orderBy: { timestamp: 'asc' },
        },
        meetingBooking: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Analyze engagement patterns
    const engagementByHour: Record<number, number> = {};
    const engagementByDay: Record<number, number> = {};

    // Process email engagement
    for (const event of contact.emailEvents) {
      const hour = event.timestamp.getUTCHours();
      const day = event.timestamp.getUTCDay();

      engagementByHour[hour] = (engagementByHour[hour] || 0) + 1;
      engagementByDay[day] = (engagementByDay[day] || 0) + 1;
    }

    // Process meeting bookings
    for (const meeting of contact.meetingBooking || []) {
      const hour = meeting.startTime.getUTCHours();
      const day = meeting.startTime.getUTCDay();

      engagementByHour[hour] = (engagementByHour[hour] || 0) + 2; // Weight meetings higher
      engagementByDay[day] = (engagementByDay[day] || 0) + 2;
    }

    // Find best hour
    let bestHour = 9; // Default 9 AM
    let maxHourEngagement = 0;
    for (let hour = 8; hour <= 18; hour++) {
      const engagement = engagementByHour[hour] || 0;
      if (engagement > maxHourEngagement) {
        maxHourEngagement = engagement;
        bestHour = hour;
      }
    }

    // Find best day
    let bestDay = 2; // Default Tuesday
    let maxDayEngagement = 0;
    for (let day = 1; day <= 5; day++) { // Monday-Friday
      const engagement = engagementByDay[day] || 0;
      if (engagement > maxDayEngagement) {
        maxDayEngagement = engagement;
        bestDay = day;
      }
    }

    // Calculate confidence
    const totalEngagements = Object.values(engagementByHour).reduce((a, b) => a + b, 0);
    const confidence = Math.min(100, totalEngagements * 5);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hourFormatted = bestHour > 12 ? `${bestHour - 12} PM` : `${bestHour} AM`;

    return {
      contactId,
      dayOfWeek: bestDay,
      hourOfDay: bestHour,
      confidence,
      reason: `Based on ${totalEngagements} historical engagements. Best engagement on ${dayNames[bestDay]}s at ${hourFormatted}.`,
      timezone: contact.timezone || undefined,
    };
  }

  async getBestTimesForContacts(
    organizationId: string,
    contactIds: string[],
  ): Promise<BestTimeToContact[]> {
    const results: BestTimeToContact[] = [];

    for (const contactId of contactIds) {
      try {
        const bestTime = await this.predictBestTimeToContact(organizationId, contactId);
        results.push(bestTime);
      } catch (error) {
        this.logger.warn(`Failed to get best time for ${contactId}`);
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  // ============================================================
  // CONVERSION PREDICTION
  // ============================================================

  async predictConversionProbability(
    organizationId: string,
    contactId: string,
  ): Promise<{
    probability: number;
    factors: Array<{ name: string; impact: 'positive' | 'negative'; weight: number }>;
    estimatedDaysToConvert: number;
  }> {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId },
      include: {
        leadScores: {
          orderBy: { calculatedAt: 'desc' },
          take: 1,
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        emailEvents: {
          where: { event: 'opened' },
        },
        _count: {
          select: {
            meetingBooking: true,
          },
        },
      },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    const factors: Array<{ name: string; impact: 'positive' | 'negative'; weight: number }> = [];
    let probability = 50; // Base probability

    // Lead score factor
    const leadScore = contact.leadScores[0]?.totalScore || 50;
    if (leadScore >= 80) {
      factors.push({ name: 'High Lead Score', impact: 'positive', weight: 20 });
      probability += 20;
    } else if (leadScore >= 60) {
      factors.push({ name: 'Good Lead Score', impact: 'positive', weight: 10 });
      probability += 10;
    } else if (leadScore < 40) {
      factors.push({ name: 'Low Lead Score', impact: 'negative', weight: -15 });
      probability -= 15;
    }

    // Meeting booked factor
    if (contact._count.meetingBooking > 0) {
      factors.push({ name: 'Meeting Scheduled', impact: 'positive', weight: 25 });
      probability += 25;
    }

    // Email engagement factor
    const emailOpens = contact.emailEvents.length;
    if (emailOpens >= 5) {
      factors.push({ name: 'High Email Engagement', impact: 'positive', weight: 15 });
      probability += 15;
    } else if (emailOpens >= 2) {
      factors.push({ name: 'Moderate Email Engagement', impact: 'positive', weight: 5 });
      probability += 5;
    }

    // Recent activity factor
    const lastActivity = contact.activities[0]?.createdAt;
    if (lastActivity) {
      const daysSince = Math.floor(
        (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSince <= 3) {
        factors.push({ name: 'Recent Activity', impact: 'positive', weight: 10 });
        probability += 10;
      } else if (daysSince > 30) {
        factors.push({ name: 'Stale Contact', impact: 'negative', weight: -10 });
        probability -= 10;
      }
    }

    // Clamp probability
    probability = Math.max(5, Math.min(95, probability));

    // Estimate days to convert based on probability
    let estimatedDays = 30;
    if (probability >= 80) estimatedDays = 7;
    else if (probability >= 60) estimatedDays = 14;
    else if (probability >= 40) estimatedDays = 30;
    else estimatedDays = 60;

    return {
      probability,
      factors,
      estimatedDaysToConvert: estimatedDays,
    };
  }
}
