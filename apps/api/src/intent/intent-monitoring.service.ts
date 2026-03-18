import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  CreateIntentSignalDto,
  IntentScoreResult,
  CreateIntentAlertDto,
  IntentAlertTriggered,
  IntentDashboardData,
  IntentWebhookPayload,
} from './dto/intent.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class IntentMonitoringService {
  private readonly logger = new Logger(IntentMonitoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  // ==========================================
  // Intent Signal Processing
  // ==========================================

  async processIntentSignal(
    organizationId: string,
    dto: CreateIntentSignalDto
  ): Promise<{ success: boolean; signalId?: string; error?: string }> {
    try {
      // Resolve contact/company from email/domain
      let contactId = dto.contactId;
      let companyId = dto.companyId;

      if (!contactId && dto.email) {
        const contact = await this.prisma.contact.findFirst({
          where: {
            organizationId,
            email: dto.email,
          },
        });
        if (contact) contactId = contact.id;
      }

      if (!companyId && dto.domain) {
        const company = await this.prisma.company.findFirst({
          where: {
            organizationId,
            domain: dto.domain,
          },
        });
        if (company) companyId = company.id;
      }

      // Calculate expiration (intent decays over time)
      const expiresAt = dto.expiresAt
        ? new Date(dto.expiresAt)
        : this.calculateExpiration(dto.type);

      // Create intent signal
      const signal = await this.prisma.intentSignal.create({
        data: {
          organizationId,
          contactId,
          companyId,
          type: dto.type,
          category: dto.category,
          source: 'webhook',
          score: dto.score,
          confidence: dto.confidence,
          url: dto.url,
          referrer: dto.referrer,
          campaign: dto.campaign,
          utmSource: dto.utmSource,
          utmMedium: dto.utmMedium,
          utmCampaign: dto.utmCampaign,
          pageTitle: dto.pageTitle,
          contentTopic: dto.contentTopic,
          metadata: dto.metadata || {},
          expiresAt,
        },
      });

      // Recalculate intent scores
      if (contactId) {
        await this.calculateContactIntentScore(contactId);
      }
      if (companyId) {
        await this.calculateCompanyIntentScore(companyId);
      }

      // Check alerts
      await this.checkIntentAlerts(organizationId, contactId, companyId);

      this.logger.log(`Intent signal created: ${signal.id} (${dto.type})`);

      return { success: true, signalId: signal.id };
    } catch (error) {
      this.logger.error('Failed to process intent signal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==========================================
  // Intent Score Calculation
  // ==========================================

  async calculateContactIntentScore(contactId: string): Promise<IntentScoreResult> {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        intents: {
          where: {
            expiresAt: { gt: new Date() },
          },
          orderBy: { detectedAt: 'desc' },
        },
        company: true,
      },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    const signals = contact.intents;

    // Calculate component scores
    const behavioralScore = this.calculateBehavioralScore(signals);
    const engagementScore = this.calculateEngagementScore(signals);
    const technographicScore = this.calculateTechnographicScore(signals);
    const firmographicScore = this.calculateFirmographicScore(signals, contact.company);
    const newsScore = this.calculateNewsScore(signals);

    // Weighted overall score
    const weights = {
      behavioral: 0.35,
      engagement: 0.25,
      technographic: 0.15,
      firmographic: 0.15,
      news: 0.10,
    };

    const overallScore = Math.round(
      behavioralScore * weights.behavioral +
        engagementScore * weights.engagement +
        technographicScore * weights.technographic +
        firmographicScore * weights.firmographic +
        newsScore * weights.news
    );

    // Determine buying stage
    const stage = this.determineBuyingStage(overallScore, signals);

    // Update contact
    await this.prisma.contact.update({
      where: { id: contactId },
      data: {
        intentScore: overallScore,
        buyingStage: stage,
        lastActivityAt: new Date(),
      },
    });

    return {
      contactId,
      overallScore,
      behavioralScore,
      engagementScore,
      technographicScore,
      firmographicScore,
      newsScore,
      stage,
      recentSignals: signals.slice(0, 5).map((s) => ({
        type: s.type,
        score: s.score,
        detectedAt: s.detectedAt.toISOString(),
      })),
      recommendedActions: this.getRecommendedActions(stage, signals),
      bestTimeToContact: this.getBestTimeToContact(signals),
      suggestedMessaging: this.getSuggestedMessaging(stage, contact),
    };
  }

  async calculateCompanyIntentScore(companyId: string): Promise<IntentScoreResult> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        intents: {
          where: {
            expiresAt: { gt: new Date() },
          },
          orderBy: { detectedAt: 'desc' },
        },
        contacts: {
          select: { intentScore: true },
        },
      },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    const signals = company.intents;

    // Calculate scores
    const behavioralScore = this.calculateBehavioralScore(signals);
    const engagementScore = this.calculateEngagementScore(signals);
    const technographicScore = this.calculateTechnographicScore(signals);
    const firmographicScore = this.calculateFirmographicScore(signals, company);
    const newsScore = this.calculateNewsScore(signals);

    // Factor in contact scores
    const avgContactScore =
      company.contacts.length > 0
        ? company.contacts.reduce((sum, c) => sum + c.intentScore, 0) / company.contacts.length
        : 0;

    const weights = {
      behavioral: 0.30,
      engagement: 0.20,
      technographic: 0.15,
      firmographic: 0.15,
      news: 0.10,
      contacts: 0.10,
    };

    const overallScore = Math.round(
      behavioralScore * weights.behavioral +
        engagementScore * weights.engagement +
        technographicScore * weights.technographic +
        firmographicScore * weights.firmographic +
        newsScore * weights.news +
        avgContactScore * weights.contacts
    );

    const stage = this.determineBuyingStage(overallScore, signals);

    // Update company
    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        intentScore: overallScore,
        buyingStage: stage,
      },
    });

    return {
      companyId,
      overallScore,
      behavioralScore,
      engagementScore,
      technographicScore,
      firmographicScore,
      newsScore,
      stage,
      recentSignals: signals.slice(0, 5).map((s) => ({
        type: s.type,
        score: s.score,
        detectedAt: s.detectedAt.toISOString(),
      })),
      recommendedActions: this.getRecommendedActions(stage, signals),
      suggestedMessaging: this.getSuggestedMessaging(stage, undefined, company),
    };
  }

  // ==========================================
  // Intent Alerts
  // ==========================================

  async createIntentAlert(
    organizationId: string,
    dto: CreateIntentAlertDto
  ): Promise<{ id: string }> {
    const alert = await this.prisma.intentAlert.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        filters: dto.filters,
        minIntentScore: dto.threshold,
        notifyEmail: dto.notifyEmail,
        notifySlack: dto.notifySlack || false,
        webhookUrl: dto.webhookUrl,
        isActive: true,
      },
    });

    return { id: alert.id };
  }

  async checkIntentAlerts(
    organizationId: string,
    contactId?: string,
    companyId?: string
  ): Promise<IntentAlertTriggered[]> {
    const triggered: IntentAlertTriggered[] = [];

    // Get active alerts
    const alerts = await this.prisma.intentAlert.findMany({
      where: {
        organizationId,
        isActive: true,
      },
    });

    for (const alert of alerts) {
      const filters = alert.filters as {
        minIntentScore?: number;
        intentTypes?: string[];
        buyingStage?: string[];
      };

      let targetContact = null;
      let targetCompany = null;

      // Check contact
      if (contactId) {
        targetContact = await this.prisma.contact.findUnique({
          where: { id: contactId },
          include: {
            intents: {
              where: { expiresAt: { gt: new Date() } },
              orderBy: { detectedAt: 'desc' },
            },
          },
        });
      }

      // Check company
      if (companyId) {
        targetCompany = await this.prisma.company.findUnique({
          where: { id: companyId },
          include: {
            intents: {
              where: { expiresAt: { gt: new Date() } },
              orderBy: { detectedAt: 'desc' },
            },
          },
        });
      }

      // Evaluate against alert criteria
      const target = targetContact || targetCompany;
      const targetType = targetContact ? 'contact' : 'company';

      if (target) {
        const meetsScore = !filters.minIntentScore || target.intentScore >= filters.minIntentScore;
        const meetsStage =
          !filters.buyingStage || filters.buyingStage.includes(target.buyingStage);

        if (meetsScore && meetsStage) {
          // Update alert
          await this.prisma.intentAlert.update({
            where: { id: alert.id },
            data: {
              lastTriggeredAt: new Date(),
              triggerCount: { increment: 1 },
            },
          });

          triggered.push({
            alertId: alert.id,
            alertName: alert.name,
            triggeredBy: {
              type: targetType,
              id: target.id,
              name:
                targetType === 'contact'
                  ? `${(target as { firstName: string }).firstName} ${(target as { lastName: string }).lastName}`
                  : (target as { name: string }).name,
              intentScore: target.intentScore,
              buyingStage: target.buyingStage,
            },
            contributingSignals: (target as { intents: Array<{ type: string; score: number; detectedAt: Date }> }).intents
              .slice(0, 3)
              .map((s) => ({
                type: s.type,
                score: s.score,
                detectedAt: s.detectedAt.toISOString(),
              })),
            recommendedAction: this.getAlertRecommendedAction(target),
            triggeredAt: new Date().toISOString(),
          });

          // Send notifications
          await this.sendAlertNotifications(alert, triggered[triggered.length - 1]);
        }
      }
    }

    return triggered;
  }

  // ==========================================
  // Dashboard
  // ==========================================

  async getIntentDashboard(organizationId: string): Promise<IntentDashboardData> {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get counts
    const [totalContacts, totalCompanies, highIntentCount] = await Promise.all([
      this.prisma.contact.count({ where: { organizationId } }),
      this.prisma.company.count({ where: { organizationId } }),
      this.prisma.contact.count({
        where: {
          organizationId,
          intentScore: { gte: 70 },
        },
      }),
    ]);

    // Intent distribution
    const [highIntent, mediumIntent, lowIntent] = await Promise.all([
      this.prisma.contact.count({
        where: { organizationId, intentScore: { gte: 70 } },
      }),
      this.prisma.contact.count({
        where: { organizationId, intentScore: { gte: 40, lt: 70 } },
      }),
      this.prisma.contact.count({
        where: { organizationId, intentScore: { lt: 40 } },
      }),
    ]);

    // Recent signals
    const signalsToday = await this.prisma.intentSignal.count({
      where: {
        organizationId,
        detectedAt: { gte: today },
      },
    });

    const signalsThisWeek = await this.prisma.intentSignal.count({
      where: {
        organizationId,
        detectedAt: { gte: weekAgo },
      },
    });

    // Top prospects
    const topContacts = await this.prisma.contact.findMany({
      where: { organizationId },
      orderBy: { intentScore: 'desc' },
      take: 5,
      include: {
        company: { select: { name: true } },
      },
    });

    // Signals by type
    const signalsByType = await this.prisma.intentSignal.groupBy({
      by: ['type'],
      where: { organizationId },
      _count: { type: true },
    });

    // Intent trend (last 7 days)
    const intentTrend = await this.getIntentTrend(organizationId, 7);

    return {
      totalContacts,
      totalCompanies,
      highIntentCount,
      intentDistribution: {
        high: highIntent,
        medium: mediumIntent,
        low: lowIntent,
      },
      signalsToday,
      signalsThisWeek,
      alertsTriggered: 0, // TODO: Track this
      topContacts: topContacts.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        company: c.company?.name || 'Unknown',
        intentScore: c.intentScore,
        lastActivity: c.lastActivityAt?.toISOString() || c.updatedAt.toISOString(),
      })),
      signalsByType: signalsByType.reduce(
        (acc, curr) => ({
          ...acc,
          [curr.type]: curr._count.type,
        }),
        {}
      ),
      intentTrend,
    };
  }

  // ==========================================
  // Private Helpers
  // ==========================================

  private calculateExpiration(type: string): Date {
    const now = new Date();
    const decayDays: Record<string, number> = {
      website_visit: 7,
      pricing_view: 14,
      demo_request: 30,
      content_download: 21,
      email_open: 3,
      email_click: 7,
      funding_news: 60,
      technology_change: 45,
    };

    const days = decayDays[type] || 14;
    now.setDate(now.getDate() + days);
    return now;
  }

  private calculateBehavioralScore(
    signals: Array<{ type: string; score: number }>
  ): number {
    const behavioralSignals = signals.filter((s) =>
      ['website_visit', 'pricing_view', 'demo_request'].includes(s.type)
    );

    if (behavioralSignals.length === 0) return 0;

    const avgScore =
      behavioralSignals.reduce((sum, s) => sum + s.score, 0) / behavioralSignals.length;

    // Boost for multiple behavioral signals
    const multiplier = Math.min(1 + behavioralSignals.length * 0.1, 1.5);

    return Math.min(Math.round(avgScore * multiplier), 100);
  }

  private calculateEngagementScore(
    signals: Array<{ type: string; score: number }>
  ): number {
    const engagementSignals = signals.filter((s) =>
      ['email_open', 'email_click', 'content_download', 'webinar_attendance'].includes(s.type)
    );

    if (engagementSignals.length === 0) return 0;

    const avgScore =
      engagementSignals.reduce((sum, s) => sum + s.score, 0) / engagementSignals.length;

    return Math.min(Math.round(avgScore), 100);
  }

  private calculateTechnographicScore(
    signals: Array<{ type: string; score: number }>
  ): number {
    const techSignals = signals.filter((s) => s.type === 'technology_change');
    return techSignals.length > 0
      ? Math.round(techSignals.reduce((sum, s) => sum + s.score, 0) / techSignals.length)
      : 50; // Neutral if no signals
  }

  private calculateFirmographicScore(
    signals: Array<{ type: string; score: number }>,
    company: { employeeCount?: number | null; fundingStage?: string | null } | null
  ): number {
    let score = 50; // Neutral base

    // Company size bonus
    if (company?.employeeCount) {
      if (company.employeeCount >= 200) score += 15;
      else if (company.employeeCount >= 50) score += 10;
    }

    // Funding stage bonus
    const highIntentStages = ['series_b', 'series_c', 'series_d_plus', 'ipo'];
    if (company?.fundingStage && highIntentStages.includes(company.fundingStage)) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  private calculateNewsScore(
    signals: Array<{ type: string; score: number }>
  ): number {
    const newsSignals = signals.filter((s) => s.type === 'funding_news');
    return newsSignals.length > 0
      ? Math.round(newsSignals.reduce((sum, s) => sum + s.score, 0) / newsSignals.length)
      : 50;
  }

  private determineBuyingStage(
    score: number,
    signals: Array<{ type: string }>
  ): 'awareness' | 'consideration' | 'decision' | 'purchase' | 'churned' {
    // Check for purchase signals
    if (signals.some((s) => s.type === 'purchase' || s.type === 'contract_signed')) {
      return 'purchase';
    }

    // Check for decision signals
    if (
      score >= 80 ||
      signals.some((s) => ['demo_request', 'pricing_view', 'sales_call'].includes(s.type))
    ) {
      return 'decision';
    }

    // Check for consideration signals
    if (
      score >= 50 ||
      signals.some((s) => ['content_download', 'webinar_attendance', 'case_study_view'].includes(s.type))
    ) {
      return 'consideration';
    }

    return 'awareness';
  }

  private getRecommendedActions(
    stage: string,
    signals: Array<{ type: string }>
  ): string[] {
    const actions: string[] = [];

    switch (stage) {
      case 'awareness':
        actions.push('Send educational content');
        actions.push('Connect on LinkedIn');
        break;
      case 'consideration':
        actions.push('Share case studies');
        actions.push('Invite to webinar');
        actions.push('Send comparison guide');
        break;
      case 'decision':
        actions.push('Schedule demo');
        actions.push('Offer free trial');
        actions.push('Connect with sales');
        break;
      case 'purchase':
        actions.push('Welcome onboarding');
        actions.push('Assign customer success manager');
        break;
    }

    return actions;
  }

  private getBestTimeToContact(
    signals: Array<{ type: string; detectedAt: Date }>
  ): string | undefined {
    if (signals.length === 0) return undefined;

    // Find most active day/hour
    const hourCounts: Record<number, number> = {};
    signals.forEach((s) => {
      const hour = s.detectedAt.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const bestHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    if (bestHour) {
      const hour = parseInt(bestHour);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:00 ${ampm}`;
    }

    return undefined;
  }

  private getSuggestedMessaging(
    stage: string,
    contact?: { firstName?: string | null; title?: string | null } | null,
    company?: { name?: string } | null
  ): string | undefined {
    const name = contact?.firstName || 'there';
    const companyName = company?.name || 'your company';

    const messages: Record<string, string> = {
      awareness: `Hi ${name}, I noticed ${companyName} is exploring solutions in this space...`,
      consideration: `Hi ${name}, saw you downloaded our guide. Here's a case study from a similar company...`,
      decision: `Hi ${name}, ready to see how we can help ${companyName}? Let's schedule a quick demo...`,
      purchase: `Welcome ${name}! Excited to have ${companyName} on board...`,
    };

    return messages[stage];
  }

  private getAlertRecommendedAction(target: { intentScore: number; buyingStage: string }): string {
    if (target.intentScore >= 80) {
      return 'Contact immediately - high buying intent';
    } else if (target.intentScore >= 60) {
      return 'Schedule follow-up within 24 hours';
    } else {
      return 'Add to nurture campaign';
    }
  }

  private async sendAlertNotifications(
    alert: { notifyEmail: boolean; webhookUrl?: string | null },
    trigger: IntentAlertTriggered
  ): Promise<void> {
    // TODO: Implement email and webhook notifications
    this.logger.log(`Alert triggered: ${trigger.alertName} for ${trigger.triggeredBy.name}`);
  }

  private async getIntentTrend(
    organizationId: string,
    days: number
  ): Promise<IntentDashboardData['intentTrend']> {
    const trend: IntentDashboardData['intentTrend'] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [avgScore, signalCount] = await Promise.all([
        this.prisma.contact
          .aggregate({
            where: { organizationId },
            _avg: { intentScore: true },
          })
          .then((r) => r._avg.intentScore || 0),
        this.prisma.intentSignal.count({
          where: {
            organizationId,
            detectedAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),
      ]);

      trend.push({
        date: date.toISOString().split('T')[0],
        avgScore: Math.round(avgScore),
        signalCount,
      });
    }

    return trend;
  }
}
