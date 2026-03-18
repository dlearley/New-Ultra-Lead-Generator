import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { IntentMonitoringService } from '../intent-monitoring.service';
import { PrismaService } from '../../services/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  WebsiteVisitEvent,
  ContentDownloadEvent,
  EmailEngagementEvent,
  PricingPageEvent,
  DemoRequestEvent,
  FundingNewsEvent,
  TechnologyChangeEvent,
  HiringActivityEvent,
} from '../dto/intent.dto';
import { Logger } from '@nestjs/common';

@Controller('webhooks/intent')
export class IntentWebhookController {
  private readonly logger = new Logger(IntentWebhookController.name);
  private readonly webhookSecret: string | undefined;

  constructor(
    private readonly intentService: IntentMonitoringService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    this.webhookSecret = this.configService.get<string>('WEBHOOK_SECRET');
  }

  // ==========================================
  // Website Tracking Webhooks
  // ==========================================

  @Post('website/visit')
  async handleWebsiteVisit(
    @Body() event: WebsiteVisitEvent,
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-webhook-signature') signature: string
  ) {
    this.verifyWebhook(signature);

    if (!organizationId) {
      throw new BadRequestException('Organization ID required');
    }

    // Extract domain from URL or use fingerprint
    const domain = this.extractDomain(event.url);
    const email = this.extractEmailFromUtm(event);

    // Calculate intent score based on page visited
    const score = this.calculatePageScore(event);
    const confidence = this.calculateConfidence(event);

    const result = await this.intentService.processIntentSignal(organizationId, {
      type: 'website_visit',
      category: 'behavioral',
      email,
      domain,
      score,
      confidence,
      url: event.url,
      referrer: event.referrer,
      utmSource: event.utmSource,
      utmMedium: event.utmMedium,
      utmCampaign: event.utmCampaign,
      pageTitle: event.title,
      metadata: {
        duration: event.duration,
        scrollDepth: event.scrollDepth,
        userAgent: event.userAgent,
      },
    });

    return result;
  }

  @Post('website/pricing')
  async handlePricingPageView(
    @Body() event: PricingPageEvent,
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-webhook-signature') signature: string
  ) {
    this.verifyWebhook(signature);

    const domain = this.extractDomain(event.url || '');

    const result = await this.intentService.processIntentSignal(organizationId, {
      type: 'pricing_view',
      category: 'behavioral',
      domain,
      score: 85, // High intent for pricing page
      confidence: 0.9,
      url: event.url,
      metadata: {
        planViewed: event.planViewed,
        calculatorUsed: event.calculatorUsed,
        estimatedValue: event.estimatedValue,
      },
    });

    return result;
  }

  @Post('website/demo-request')
  async handleDemoRequest(
    @Body() event: DemoRequestEvent,
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-webhook-signature') signature: string
  ) {
    this.verifyWebhook(signature);

    const result = await this.intentService.processIntentSignal(organizationId, {
      type: 'demo_request',
      category: 'behavioral',
      email: event.email,
      domain: event.domain,
      score: 95, // Very high intent
      confidence: 1.0,
      metadata: {
        preferredDate: event.preferredDate,
        teamSize: event.teamSize,
        useCase: event.useCase,
        budgetRange: event.budgetRange,
        timeline: event.timeline,
      },
    });

    return result;
  }

  // ==========================================
  // Content Engagement Webhooks
  // ==========================================

  @Post('content/download')
  async handleContentDownload(
    @Body() event: ContentDownloadEvent,
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-webhook-signature') signature: string
  ) {
    this.verifyWebhook(signature);

    const score = this.calculateContentScore(event.contentType);

    const result = await this.intentService.processIntentSignal(organizationId, {
      type: 'content_download',
      category: 'engagement',
      email: event.formFields?.email,
      domain: event.formFields?.company
        ? this.extractDomainFromCompany(event.formFields.company)
        : undefined,
      score,
      confidence: 0.85,
      metadata: {
        contentType: event.contentType,
        contentId: event.contentId,
        contentTitle: event.contentTitle,
        formData: event.formFields,
      },
    });

    return result;
  }

  // ==========================================
  // Email Engagement Webhooks
  // ==========================================

  @Post('email/engagement')
  async handleEmailEngagement(
    @Body() event: EmailEngagementEvent,
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-webhook-signature') signature: string
  ) {
    this.verifyWebhook(signature);

    const score = this.calculateEmailScore(event.action);

    const result = await this.intentService.processIntentSignal(organizationId, {
      type: `email_${event.action}`,
      category: 'engagement',
      email: event.email,
      score,
      confidence: 0.9,
      metadata: {
        emailType: event.emailType,
        campaignId: event.campaignId,
        subject: event.subject,
        linkUrl: event.linkUrl,
      },
    });

    return result;
  }

  // ==========================================
  // News & Intelligence Webhooks
  // ==========================================

  @Post('news/funding')
  async handleFundingNews(
    @Body() event: FundingNewsEvent,
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-webhook-signature') signature: string
  ) {
    this.verifyWebhook(signature);

    // Find company by domain or name
    const company = await this.findCompany(organizationId, event.domain, event.companyName);

    if (!company) {
      return { success: false, error: 'Company not found' };
    }

    // Create company news
    await this.prisma.companyNews.create({
      data: {
        companyId: company.id,
        title: `${event.companyName} raises $${event.amount} ${event.fundingRound}`,
        summary: `Lead investor: ${event.leadInvestor || 'Unknown'}`,
        url: event.newsUrl,
        category: 'funding',
        fundingAmount: event.amount,
        valuation: event.valuation,
        publishedAt: new Date(event.publishedAt),
      },
    });

    // Calculate intent score based on funding amount
    const score = this.calculateFundingScore(event.amount);

    const result = await this.intentService.processIntentSignal(organizationId, {
      type: 'funding_news',
      category: 'news',
      companyId: company.id,
      score,
      confidence: 0.95,
      metadata: {
        fundingRound: event.fundingRound,
        amount: event.amount,
        leadInvestor: event.leadInvestor,
      },
    });

    return result;
  }

  // ==========================================
  // Technographic Webhooks
  // ==========================================

  @Post('technology/change')
  async handleTechnologyChange(
    @Body() event: TechnologyChangeEvent,
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-webhook-signature') signature: string
  ) {
    this.verifyWebhook(signature);

    const company = await this.findCompany(organizationId, event.domain);

    if (!company) {
      return { success: false, error: 'Company not found' };
    }

    // Update company technology
    await this.updateCompanyTechnology(
      company.id,
      event.technology,
      event.category,
      event.changeType,
      event.confidence
    );

    const score = event.changeType === 'added' ? 70 : 60;

    const result = await this.intentService.processIntentSignal(organizationId, {
      type: 'technology_change',
      category: 'technographic',
      companyId: company.id,
      score,
      confidence: event.confidence,
      metadata: {
        changeType: event.changeType,
        technology: event.technology,
        category: event.category,
      },
    });

    return result;
  }

  // ==========================================
  // Hiring Activity Webhooks
  // ==========================================

  @Post('hiring/activity')
  async handleHiringActivity(
    @Body() event: HiringActivityEvent,
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-webhook-signature') signature: string
  ) {
    this.verifyWebhook(signature);

    const company = await this.findCompany(organizationId, event.domain, event.companyName);

    if (!company) {
      return { success: false, error: 'Company not found' };
    }

    // Hiring growth signals expansion/intent
    const score = Math.min(50 + event.jobCount * 5, 80);

    const result = await this.intentService.processIntentSignal(organizationId, {
      type: 'hiring_activity',
      category: 'firmographic',
      companyId: company.id,
      score,
      confidence: 0.8,
      metadata: {
        jobTitle: event.jobTitle,
        department: event.department,
        seniority: event.seniority,
        jobCount: event.jobCount,
        location: event.location,
        remote: event.remote,
      },
    });

    return result;
  }

  // ==========================================
  // Dashboard Webhook
  // ==========================================

  @Get('dashboard')
  async getDashboard(
    @Headers('x-organization-id') organizationId: string,
    @Headers('x-webhook-signature') signature: string
  ) {
    this.verifyWebhook(signature);
    return this.intentService.getIntentDashboard(organizationId);
  }

  // ==========================================
  // Private Helpers
  // ==========================================

  private verifyWebhook(signature: string): void {
    if (!this.webhookSecret) {
      this.logger.warn('WEBHOOK_SECRET not configured, skipping signature verification');
      return;
    }

    // TODO: Implement proper HMAC signature verification
    // const expectedSignature = crypto
    //   .createHmac('sha256', this.webhookSecret)
    //   .update(payload)
    //   .digest('hex');
    //
    // if (signature !== expectedSignature) {
    //   throw new UnauthorizedException('Invalid webhook signature');
    // }
  }

  private extractDomain(url: string): string | undefined {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return undefined;
    }
  }

  private extractEmailFromUtm(event: WebsiteVisitEvent): string | undefined {
    // Extract email from UTM parameters or tracking
    return undefined; // TODO: Implement tracking cookie resolution
  }

  private extractDomainFromCompany(company: string): string | undefined {
    // Convert company name to likely domain
    const cleaned = company
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/inc|llc|corp|ltd/gi, '');
    return `${cleaned}.com`;
  }

  private calculatePageScore(event: WebsiteVisitEvent): number {
    let score = 30; // Base score for any visit

    // Boost for pricing page
    if (event.url?.includes('pricing')) score += 40;

    // Boost for product pages
    if (event.url?.includes('product') || event.url?.includes('features')) score += 20;

    // Boost for duration
    if (event.duration) {
      if (event.duration > 120) score += 15;
      else if (event.duration > 60) score += 10;
      else if (event.duration > 30) score += 5;
    }

    // Boost for scroll depth
    if (event.scrollDepth) {
      if (event.scrollDepth > 75) score += 10;
      else if (event.scrollDepth > 50) score += 5;
    }

    return Math.min(score, 100);
  }

  private calculateConfidence(event: WebsiteVisitEvent): number {
    let confidence = 0.7;

    // Higher confidence with more data
    if (event.duration) confidence += 0.1;
    if (event.scrollDepth) confidence += 0.1;
    if (event.utmSource) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private calculateContentScore(contentType: string): number {
    const scores: Record<string, number> = {
      whitepaper: 75,
      ebook: 70,
      'case_study': 80,
      'roi_calculator': 85,
      'pricing_guide': 80,
      webinar: 65,
      video: 60,
      blog: 40,
    };

    return scores[contentType] || 50;
  }

  private calculateEmailScore(action: string): number {
    const scores: Record<string, number> = {
      open: 20,
      click: 50,
      reply: 90,
      forward: 70,
      unsubscribe: -10,
    };

    return scores[action] || 20;
  }

  private calculateFundingScore(amount: number): number {
    if (amount >= 50000000) return 95; // $50M+
    if (amount >= 10000000) return 85; // $10M+
    if (amount >= 5000000) return 75; // $5M+
    if (amount >= 1000000) return 65; // $1M+
    return 55;
  }

  private async findCompany(
    organizationId: string,
    domain?: string,
    name?: string
  ): Promise<{ id: string } | null> {
    if (domain) {
      const company = await this.prisma.company.findFirst({
        where: {
          organizationId,
          OR: [{ domain }, { website: { contains: domain } }],
        },
        select: { id: true },
      });
      if (company) return company;
    }

    if (name) {
      const company = await this.prisma.company.findFirst({
        where: {
          organizationId,
          name: { contains: name, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (company) return company;
    }

    return null;
  }

  private async updateCompanyTechnology(
    companyId: string,
    technology: string,
    category: string,
    changeType: string,
    confidence: number
  ): Promise<void> {
    // Find or create technology
    let tech = await this.prisma.technology.findUnique({
      where: { name: technology },
    });

    if (!tech) {
      tech = await this.prisma.technology.create({
        data: {
          name: technology,
          slug: technology.toLowerCase().replace(/\s+/g, '-'),
          category: category.toLowerCase().replace(/\s+/g, '_'),
        },
      });
    }

    // Update company-technology relationship
    if (changeType === 'added') {
      await this.prisma.companyTechnology.upsert({
        where: {
          companyId_technologyId: {
            companyId,
            technologyId: tech.id,
          },
        },
        update: {
          isActive: true,
          confidence,
          lastSeenAt: new Date(),
        },
        create: {
          companyId,
          technologyId: tech.id,
          confidence,
          detectionMethod: 'webhook',
        },
      });
    } else if (changeType === 'removed') {
      await this.prisma.companyTechnology.updateMany({
        where: {
          companyId,
          technologyId: tech.id,
        },
        data: {
          isActive: false,
          removedAt: new Date(),
        },
      });
    }
  }
}
