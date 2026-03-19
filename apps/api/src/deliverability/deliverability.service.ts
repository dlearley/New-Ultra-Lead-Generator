import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';

export interface DeliverabilityMetrics {
  totalSent: number;
  delivered: number;
  bounced: number;
  complained: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  bounceRate: number;
  complaintRate: number;
  openRate: number;
  clickRate: number;
}

export interface SenderReputation {
  score: number; // 0-100
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  factors: Array<{
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    score: number;
    description: string;
  }>;
  recommendations: string[];
}

export interface DomainReputation {
  domain: string;
  reputation: SenderReputation;
  volumeHistory: Array<{ date: string; sent: number; delivered: number }>;
  blacklistStatus: Array<{ list: string; listed: boolean; reason?: string }>;
}

@Injectable()
export class DeliverabilityService {
  private readonly logger = new Logger(DeliverabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // EMAIL EVENT TRACKING
  // ============================================================

  async trackEmailEvent(
    organizationId: string,
    data: {
      emailId: string;
      contactId: string;
      event: 'sent' | 'delivered' | 'bounced' | 'complained' | 'opened' | 'clicked' | 'unsubscribed';
      timestamp: Date;
      metadata?: {
        ip?: string;
        userAgent?: string;
        linkId?: string;
        bounceReason?: string;
        bounceType?: 'hard' | 'soft' | 'transient';
        spamScore?: number;
        isp?: string;
      };
    },
  ): Promise<void> {
    // Store event
    await this.prisma.emailEvent.create({
      data: {
        organizationId,
        emailId: data.emailId,
        contactId: data.contactId,
        event: data.event,
        timestamp: data.timestamp,
        metadata: data.metadata as any,
      },
    });

    // Update email stats
    await this.updateEmailStats(data.emailId, data.event);

    // Update contact engagement
    await this.updateContactEngagement(data.contactId, data.event);

    // Handle bounce/complaint immediately
    if (data.event === 'bounced') {
      await this.handleBounce(data.contactId, data.metadata);
    } else if (data.event === 'complained') {
      await this.handleComplaint(data.contactId);
    }

    this.logger.debug(`Email event tracked: ${data.event} for ${data.emailId}`);
  }

  private async updateEmailStats(emailId: string, event: string): Promise<void> {
    const update: any = {};
    
    switch (event) {
      case 'delivered':
        update.deliveredAt = new Date();
        break;
      case 'opened':
        update.openCount = { increment: 1 };
        update.lastOpenedAt = new Date();
        break;
      case 'clicked':
        update.clickCount = { increment: 1 };
        update.lastClickedAt = new Date();
        break;
      case 'bounced':
        update.bouncedAt = new Date();
        break;
      case 'complained':
        update.complainedAt = new Date();
        break;
    }

    await this.prisma.sentEmail.update({
      where: { id: emailId },
      data: update,
    });
  }

  private async updateContactEngagement(contactId: string, event: string): Promise<void> {
    const update: any = {};

    switch (event) {
      case 'opened':
        update.lastEmailOpenedAt = new Date();
        update.emailOpenCount = { increment: 1 };
        break;
      case 'clicked':
        update.lastEmailClickedAt = new Date();
        update.emailClickCount = { increment: 1 };
        break;
      case 'bounced':
        update.emailBouncedAt = new Date();
        update.emailStatus = 'bounced';
        break;
      case 'complained':
        update.emailComplainedAt = new Date();
        update.emailStatus = 'complained';
        break;
    }

    await this.prisma.contact.update({
      where: { id: contactId },
      data: update,
    });
  }

  private async handleBounce(
    contactId: string,
    metadata?: { bounceType?: 'hard' | 'soft' | 'transient'; bounceReason?: string },
  ): Promise<void> {
    // Hard bounces: immediately suppress
    if (metadata?.bounceType === 'hard') {
      await this.prisma.contact.update({
        where: { id: contactId },
        data: {
          emailStatus: 'hard_bounced',
          suppressed: true,
          suppressionReason: `Hard bounce: ${metadata.bounceReason || 'Unknown'}`,
        },
      });
    }

    // Soft bounces: track and suppress after 3 consecutive
    if (metadata?.bounceType === 'soft') {
      const recentBounces = await this.prisma.emailEvent.count({
        where: {
          contactId,
          event: 'bounced',
          timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      });

      if (recentBounces >= 3) {
        await this.prisma.contact.update({
          where: { id: contactId },
          data: {
            emailStatus: 'soft_bounced',
            suppressed: true,
            suppressionReason: '3 consecutive soft bounces',
          },
        });
      }
    }
  }

  private async handleComplaint(contactId: string): Promise<void> {
    // Complaints: immediately suppress and flag
    await this.prisma.contact.update({
      where: { id: contactId },
      data: {
        emailStatus: 'complained',
        suppressed: true,
        suppressionReason: 'Spam complaint received',
      },
    });

    // Alert organization
    this.logger.warn(`Spam complaint received for contact ${contactId}`);
  }

  // ============================================================
  // DELIVERABILITY METRICS
  // ============================================================

  async getDeliverabilityMetrics(
    organizationId: string,
    period: '24h' | '7d' | '30d' = '7d',
  ): Promise<DeliverabilityMetrics> {
    const periodMap = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const since = new Date(Date.now() - periodMap[period]);

    const stats = await this.prisma.emailEvent.groupBy({
      by: ['event'],
      where: {
        organizationId,
        timestamp: { gte: since },
      },
      _count: { event: true },
    });

    const counts = stats.reduce((acc, item) => {
      acc[item.event] = item._count.event;
      return acc;
    }, {} as Record<string, number>);

    const totalSent = counts['sent'] || 0;
    const delivered = counts['delivered'] || 0;
    const bounced = counts['bounced'] || 0;
    const complained = counts['complained'] || 0;
    const opened = counts['opened'] || 0;
    const clicked = counts['clicked'] || 0;

    return {
      totalSent,
      delivered,
      bounced,
      complained,
      opened,
      clicked,
      deliveryRate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
      bounceRate: totalSent > 0 ? (bounced / totalSent) * 100 : 0,
      complaintRate: totalSent > 0 ? (complained / totalSent) * 100 : 0,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      clickRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
    };
  }

  // ============================================================
  // SENDER REPUTATION
  // ============================================================

  async getSenderReputation(organizationId: string): Promise<SenderReputation> {
    const [metrics, recentBounces, recentComplaints, volume] = await Promise.all([
      this.getDeliverabilityMetrics(organizationId, '30d'),
      this.prisma.emailEvent.count({
        where: {
          organizationId,
          event: 'bounced',
          timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.emailEvent.count({
        where: {
          organizationId,
          event: 'complained',
          timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.emailEvent.count({
        where: {
          organizationId,
          event: 'sent',
          timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    // Calculate reputation score (0-100)
    let score = 100;
    const factors: SenderReputation['factors'] = [];
    const recommendations: string[] = [];

    // Bounce rate factor (max -30 points)
    if (metrics.bounceRate > 5) {
      const penalty = Math.min(30, (metrics.bounceRate - 5) * 2);
      score -= penalty;
      factors.push({
        name: 'High Bounce Rate',
        impact: 'negative',
        score: -penalty,
        description: `Bounce rate of ${metrics.bounceRate.toFixed(2)}% is above 5% threshold`,
      });
      recommendations.push('Clean your email list to remove invalid addresses');
    } else {
      factors.push({
        name: 'Bounce Rate',
        impact: 'positive',
        score: 10,
        description: `Bounce rate of ${metrics.bounceRate.toFixed(2)}% is healthy`,
      });
    }

    // Complaint rate factor (max -40 points)
    if (metrics.complaintRate > 0.1) {
      const penalty = Math.min(40, (metrics.complaintRate - 0.1) * 100);
      score -= penalty;
      factors.push({
        name: 'High Complaint Rate',
        impact: 'negative',
        score: -penalty,
        description: `Complaint rate of ${metrics.complaintRate.toFixed(3)}% is above 0.1% threshold`,
      });
      recommendations.push('Review email content and ensure clear unsubscribe options');
      recommendations.push('Implement double opt-in for new subscribers');
    } else {
      factors.push({
        name: 'Complaint Rate',
        impact: 'positive',
        score: 15,
        description: `Complaint rate of ${metrics.complaintRate.toFixed(3)}% is excellent`,
      });
    }

    // Engagement factor (open rate)
    if (metrics.openRate < 15) {
      score -= 10;
      factors.push({
        name: 'Low Engagement',
        impact: 'negative',
        score: -10,
        description: `Open rate of ${metrics.openRate.toFixed(2)}% is below industry average`,
      });
      recommendations.push('Improve subject lines and email personalization');
    } else {
      factors.push({
        name: 'Engagement',
        impact: 'positive',
        score: 10,
        description: `Open rate of ${metrics.openRate.toFixed(2)}% is good`,
      });
    }

    // Volume consistency factor
    const dailyVolume = volume / 30;
    if (dailyVolume > 0 && dailyVolume < 100) {
      score -= 5;
      factors.push({
        name: 'Low Volume',
        impact: 'neutral',
        score: -5,
        description: 'Low sending volume may affect reputation establishment',
      });
    }

    // Determine status
    let status: SenderReputation['status'];
    if (score >= 90) status = 'excellent';
    else if (score >= 75) status = 'good';
    else if (score >= 60) status = 'fair';
    else if (score >= 40) status = 'poor';
    else status = 'critical';

    if (recommendations.length === 0) {
      recommendations.push('Continue current email practices');
      recommendations.push('Monitor metrics regularly for changes');
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      status,
      factors,
      recommendations,
    };
  }

  // ============================================================
  // DOMAIN REPUTATION
  // ============================================================

  async getDomainReputation(organizationId: string, domain: string): Promise<DomainReputation> {
    // Get reputation for specific sending domain
    const reputation = await this.getSenderReputation(organizationId);

    // Mock blacklist checks (in production, integrate with DNSBL services)
    const blacklistStatus = [
      { list: 'Spamhaus SBL', listed: false },
      { list: 'Barracuda', listed: false },
      { list: 'SpamCop', listed: false },
      { list: 'SORBS', listed: false },
      { list: 'URIBL', listed: false },
    ];

    // Get volume history (last 30 days)
    const volumeHistory = await this.getVolumeHistory(organizationId, 30);

    return {
      domain,
      reputation,
      volumeHistory,
      blacklistStatus,
    };
  }

  private async getVolumeHistory(
    organizationId: string,
    days: number,
  ): Promise<Array<{ date: string; sent: number; delivered: number }>> {
    const history: Array<{ date: string; sent: number; delivered: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const [sent, delivered] = await Promise.all([
        this.prisma.emailEvent.count({
          where: {
            organizationId,
            event: 'sent',
            timestamp: {
              gte: new Date(`${dateStr}T00:00:00Z`),
              lt: new Date(`${dateStr}T23:59:59Z`),
            },
          },
        }),
        this.prisma.emailEvent.count({
          where: {
            organizationId,
            event: 'delivered',
            timestamp: {
              gte: new Date(`${dateStr}T00:00:00Z`),
              lt: new Date(`${dateStr}T23:59:59Z`),
            },
          },
        }),
      ]);

      history.push({ date: dateStr, sent, delivered });
    }

    return history;
  }

  // ============================================================
  // SPAM SCORE CHECKING
  // ============================================================

  async checkSpamScore(content: {
    subject: string;
    body: string;
    fromEmail: string;
  }): Promise<{
    score: number; // 0-10, lower is better
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // Check for spam trigger words
    const spamWords = [
      'FREE', 'URGENT', 'ACT NOW', 'LIMITED TIME', 'CLICK HERE',
      'BUY NOW', 'ORDER NOW', 'SPECIAL PROMOTION', 'EXCLUSIVE DEAL',
      'CONGRATULATIONS', 'WINNER', 'PRIZE', 'MILLION DOLLARS',
    ];

    const contentLower = `${content.subject} ${content.body}`.toUpperCase();
    const foundSpamWords = spamWords.filter((word) => contentLower.includes(word));

    if (foundSpamWords.length > 0) {
      score += foundSpamWords.length * 0.5;
      issues.push(`Contains spam trigger words: ${foundSpamWords.join(', ')}`);
      suggestions.push('Replace spam trigger words with professional alternatives');
    }

    // Check subject line length
    if (content.subject.length > 60) {
      score += 1;
      issues.push('Subject line is too long (over 60 characters)');
      suggestions.push('Keep subject lines under 60 characters for better display');
    }

    if (content.subject.length < 10) {
      score += 0.5;
      issues.push('Subject line is very short (under 10 characters)');
      suggestions.push('Use descriptive subject lines (20-50 characters ideal)');
    }

    // Check for ALL CAPS
    const capsWords = content.subject.split(' ').filter((w) => w.length > 2 && w === w.toUpperCase());
    if (capsWords.length > 2) {
      score += 1.5;
      issues.push('Too many words in ALL CAPS');
      suggestions.push('Avoid using all caps - it looks spammy');
    }

    // Check for excessive punctuation
    const excessivePunctuation = (content.subject.match(/[!]{2,}/g) || []).length;
    if (excessivePunctuation > 0) {
      score += 1;
      issues.push('Excessive exclamation marks');
      suggestions.push('Use single punctuation marks');
    }

    // Check for links without https
    const httpLinks = (content.body.match(/http:\/\//g) || []).length;
    if (httpLinks > 0) {
      score += 0.5;
      issues.push('Contains HTTP links (not HTTPS)');
      suggestions.push('Use HTTPS links for better security and reputation');
    }

    // Check image-to-text ratio
    const imgCount = (content.body.match(/<img/gi) || []).length;
    const textLength = content.body.replace(/<[^>]*>/g, '').length;
    if (imgCount > 0 && textLength / imgCount < 100) {
      score += 1;
      issues.push('High image-to-text ratio');
      suggestions.push('Include more text content relative to images');
    }

    // Check for unsubscribe link
    if (!content.body.toLowerCase().includes('unsubscribe')) {
      score += 2;
      issues.push('Missing unsubscribe link');
      suggestions.push('Include a clear unsubscribe link (required by law)');
    }

    return {
      score: Math.min(10, score),
      issues,
      suggestions: suggestions.length > 0 ? suggestions : ['Email looks good!'],
    };
  }

  // ============================================================
  // SUPPRESSION LIST MANAGEMENT
  // ============================================================

  async addToSuppressionList(
    organizationId: string,
    data: {
      email: string;
      reason: string;
      source: 'bounce' | 'complaint' | 'unsubscribe' | 'manual';
    },
  ): Promise<void> {
    await this.prisma.suppressedEmail.upsert({
      where: {
        organizationId_email: {
          organizationId,
          email: data.email,
        },
      },
      create: {
        organizationId,
        email: data.email,
        reason: data.reason,
        source: data.source,
      },
      update: {
        reason: data.reason,
        source: data.source,
        updatedAt: new Date(),
      },
    });
  }

  async checkSuppressionList(organizationId: string, email: string): Promise<{
    suppressed: boolean;
    reason?: string;
  }> {
    const suppressed = await this.prisma.suppressedEmail.findUnique({
      where: {
        organizationId_email: {
          organizationId,
          email,
        },
      },
    });

    return {
      suppressed: !!suppressed,
      reason: suppressed?.reason,
    };
  }

  async getSuppressionList(
    organizationId: string,
    filters?: { source?: string; limit?: number },
  ) {
    return this.prisma.suppressedEmail.findMany({
      where: {
        organizationId,
        ...(filters?.source && { source: filters.source }),
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
    });
  }

  // ============================================================
  // CLEANUP
  // ============================================================

  async cleanupOldEvents(olderThanDays: number = 90): Promise<{ deleted: number }> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await this.prisma.emailEvent.deleteMany({
      where: { timestamp: { lt: cutoff } },
    });

    return { deleted: result.count };
  }
}
