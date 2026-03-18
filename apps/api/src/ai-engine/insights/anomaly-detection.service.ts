import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface AnomalyDetectionConfig {
  fundingThreshold?: number;
  hiringGrowthThreshold?: number;
  engagementDropThreshold?: number;
  competitorMentionEnabled?: boolean;
}

@Injectable()
export class AnomalyDetectionService {
  private readonly logger = new Logger(AnomalyDetectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // DETECT ANOMALIES
  // ============================================================

  async detectAnomalies(
    organizationId: string,
    config: AnomalyDetectionConfig = {},
  ): Promise<any[]> {
    const alerts: any[] = [];

    // Check for funding news
    const fundingAlerts = await this.detectFundingNews(organizationId, config.fundingThreshold || 1000000);
    alerts.push(...fundingAlerts);

    // Check for hiring sprees
    const hiringAlerts = await this.detectHiringSpree(organizationId, config.hiringGrowthThreshold || 50);
    alerts.push(...hiringAlerts);

    // Check for engagement drops
    const engagementAlerts = await this.detectEngagementDrops(organizationId, config.engagementDropThreshold || 30);
    alerts.push(...engagementAlerts);

    // Check for tech stack changes
    const techAlerts = await this.detectTechStackChanges(organizationId);
    alerts.push(...techAlerts);

    // Save alerts
    for (const alert of alerts) {
      await this.saveAnomalyAlert(organizationId, alert);
    }

    return alerts;
  }

  private async detectFundingNews(
    organizationId: string,
    threshold: number,
  ): Promise<any[]> {
    const alerts: any[] = [];

    // Get recent intelligence with funding news
    const intelligence = await this.prisma.accountIntelligence.findMany({
      where: { organizationId },
      include: { company: true },
    });

    for (const intel of intelligence) {
      const funding = intel.fundingNews as any;
      if (funding?.amount >= threshold) {
        // Check if alert already exists
        const existing = await this.prisma.anomalyAlert.findFirst({
          where: {
            organizationId,
            companyId: intel.companyId,
            anomalyType: 'funding_news',
            detectedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        });

        if (!existing) {
          alerts.push({
            type: 'funding_news',
            severity: funding.amount >= 10000000 ? 'critical' : 'high',
            title: `🚀 ${intel.company.name} raised $${(funding.amount / 1000000).toFixed(0)}M!`,
            description: `${intel.company.name} just announced a ${funding.round} of $${(funding.amount / 1000000).toFixed(0)}M led by ${funding.investors?.[0] || 'top investors'}. This signals strong growth and likely budget for new solutions.`,
            companyId: intel.companyId,
            detectedData: funding,
            recommendedAction: `Reach out immediately with a congratulatory message and position your solution as perfect for their scaling needs.`,
            suggestedMessage: `Hi {{firstName}}, congratulations on the ${funding.round}! With this new funding, I imagine you're thinking about scaling efficiently. I'd love to show you how we helped {{similarCompany}} streamline their operations during rapid growth.`,
          });
        }
      }
    }

    return alerts;
  }

  private async detectHiringSpree(
    organizationId: string,
    threshold: number,
  ): Promise<any[]> {
    const alerts: any[] = [];

    const intelligence = await this.prisma.accountIntelligence.findMany({
      where: { organizationId },
      include: { company: true },
    });

    for (const intel of intelligence) {
      const hiring = intel.hiringActivity as any;
      if (hiring?.growthRate >= threshold) {
        alerts.push({
          type: 'hiring_spree',
          severity: 'medium',
          title: `📈 ${intel.company.name} is hiring aggressively`,
          description: `${intel.company.name} has ${hiring.openRoles} open positions across ${hiring.departments?.join(', ')}, representing a ${hiring.growthRate}% increase. This indicates rapid expansion.`,
          companyId: intel.companyId,
          detectedData: hiring,
          recommendedAction: `They're scaling fast and likely facing operational challenges. Position your solution as a way to maintain efficiency during growth.`,
          suggestedMessage: `Hi {{firstName}}, I noticed ${intel.company.name} is growing rapidly with ${hiring.openRoles} open roles. During scaling phases, we've seen companies struggle with {{painPoint}}. Is this something you're dealing with?`,
        });
      }
    }

    return alerts;
  }

  private async detectEngagementDrops(
    organizationId: string,
    threshold: number,
  ): Promise<any[]> {
    const alerts: any[] = [];

    // Get hot leads with recent engagement drop
    const enrollments = await this.prisma.sequenceEnrollment.findMany({
      where: {
        organizationId,
        status: 'active',
      },
      include: {
        contact: true,
        stepExecutions: {
          orderBy: { sentAt: 'desc' },
          take: 5,
        },
      },
    });

    for (const enrollment of enrollments) {
      const recentExecutions = enrollment.stepExecutions;
      if (recentExecutions.length >= 3) {
        const noRecentOpens = recentExecutions.every((e) => !e.openedAt);
        
        if (noRecentOpens) {
          alerts.push({
            type: 'engagement_drop',
            severity: 'medium',
            title: `⚠️ ${enrollment.contact.firstName} ${enrollment.contact.lastName} engagement dropped`,
            description: `This contact hasn't opened the last ${recentExecutions.length} emails. They may have gone cold or changed roles.`,
            contactId: enrollment.contactId,
            detectedData: { lastEmails: recentExecutions.length },
            recommendedAction: `Try a different channel (LinkedIn, phone) or send a breakup email to re-engage.`,
            suggestedMessage: `Hi ${enrollment.contact.firstName}, I haven't heard back on my previous emails. Have your priorities shifted, or should I close your file for now?`,
          });
        }
      }
    }

    return alerts;
  }

  private async detectTechStackChanges(organizationId: string): Promise<any[]> {
    // This would require historical tech stack data to detect changes
    // For now, return empty
    return [];
  }

  private async saveAnomalyAlert(organizationId: string, alert: any): Promise<void> {
    await this.prisma.anomalyAlert.create({
      data: {
        organizationId,
        companyId: alert.companyId,
        contactId: alert.contactId,
        anomalyType: alert.type,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        detectedData: alert.detectedData,
        recommendedAction: alert.recommendedAction,
        suggestedMessage: alert.suggestedMessage,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });
  }

  // ============================================================
  // GET ALERTS
  // ============================================================

  async getAlerts(
    organizationId: string,
    filters?: {
      severity?: string;
      type?: string;
      status?: string;
    },
  ): Promise<any[]> {
    const where: any = {
      organizationId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    };

    if (filters?.severity) where.severity = filters.severity;
    if (filters?.type) where.anomalyType = filters.type;
    if (filters?.status) where.status = filters.status;

    return this.prisma.anomalyAlert.findMany({
      where,
      include: {
        company: { select: { name: true, industry: true } },
        contact: { select: { firstName: true, lastName: true, jobTitle: true } },
      },
      orderBy: [
        { severity: 'asc' },
        { detectedAt: 'desc' },
      ],
    });
  }

  async acknowledgeAlert(
    organizationId: string,
    alertId: string,
    userId: string,
  ): Promise<void> {
    await this.prisma.anomalyAlert.updateMany({
      where: { id: alertId, organizationId },
      data: {
        status: 'acknowledged',
        acknowledgedById: userId,
      },
    });
  }

  async actOnAlert(organizationId: string, alertId: string): Promise<void> {
    await this.prisma.anomalyAlert.updateMany({
      where: { id: alertId, organizationId },
      data: {
        status: 'acted_upon',
        actedUponAt: new Date(),
      },
    });
  }

  async dismissAlert(organizationId: string, alertId: string): Promise<void> {
    await this.prisma.anomalyAlert.updateMany({
      where: { id: alertId, organizationId },
      data: { status: 'dismissed' },
    });
  }
}
