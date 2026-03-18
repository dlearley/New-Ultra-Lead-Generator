import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  CreateLeadFormDto,
  UpdateLeadFormDto,
  LeadFormResponse,
  SubmitFormDto,
  FormSubmissionResponse,
  CreateLandingPageDto,
  UpdateLandingPageDto,
  LandingPageResponse,
  TrackVisitorDto,
  IdentifyVisitorDto,
  VisitorResponse,
  CreateLeadMagnetDto,
  UpdateLeadMagnetDto,
  LeadMagnetResponse,
  FormAnalytics,
  LandingPageAnalytics,
  ConversionDashboard,
} from './dto/capture.dto';
import { EnrichmentService } from '../enrichment/enrichment.service';

@Injectable()
export class LeadCaptureService {
  private readonly logger = new Logger(LeadCaptureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly enrichmentService: EnrichmentService,
  ) {}

  // ============================================================================
  // LEAD FORMS
  // ============================================================================

  async createLeadForm(
    organizationId: string,
    dto: CreateLeadFormDto,
  ): Promise<{ id: string }> {
    const form = await this.prisma.leadForm.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        formType: dto.formType || 'inline',
        template: dto.template,
        fields: dto.fields as any,
        design: dto.design as any,
        triggerConfig: dto.triggerConfig as any,
        displayRules: dto.displayRules as any,
        thankYouMessage: dto.thankYouMessage,
        redirectUrl: dto.redirectUrl,
        leadMagnetId: dto.leadMagnetId,
        status: 'draft',
      },
    });

    this.logger.log(`Created lead form ${form.id} for organization ${organizationId}`);
    return { id: form.id };
  }

  async getLeadForms(
    organizationId: string,
    options?: { status?: string; limit?: number; offset?: number },
  ): Promise<LeadFormResponse[]> {
    const forms = await this.prisma.leadForm.findMany({
      where: {
        organizationId,
        ...(options?.status && { status: options.status }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    return forms.map((form) => this.mapToLeadFormResponse(form));
  }

  async getLeadForm(
    organizationId: string,
    formId: string,
  ): Promise<LeadFormResponse> {
    const form = await this.prisma.leadForm.findFirst({
      where: { id: formId, organizationId },
    });

    if (!form) {
      throw new NotFoundException('Lead form not found');
    }

    return this.mapToLeadFormResponse(form);
  }

  async updateLeadForm(
    organizationId: string,
    formId: string,
    dto: UpdateLeadFormDto,
  ): Promise<LeadFormResponse> {
    const form = await this.prisma.leadForm.update({
      where: { id: formId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.formType && { formType: dto.formType }),
        ...(dto.template !== undefined && { template: dto.template }),
        ...(dto.fields && { fields: dto.fields as any }),
        ...(dto.design && { design: dto.design as any }),
        ...(dto.triggerConfig && { triggerConfig: dto.triggerConfig as any }),
        ...(dto.displayRules && { displayRules: dto.displayRules as any }),
        ...(dto.thankYouMessage !== undefined && { thankYouMessage: dto.thankYouMessage }),
        ...(dto.redirectUrl !== undefined && { redirectUrl: dto.redirectUrl }),
        ...(dto.leadMagnetId !== undefined && { leadMagnetId: dto.leadMagnetId }),
        ...(dto.status && { status: dto.status }),
      },
    });

    return this.mapToLeadFormResponse(form);
  }

  async deleteLeadForm(
    organizationId: string,
    formId: string,
  ): Promise<{ success: boolean }> {
    await this.prisma.leadForm.delete({
      where: { id: formId },
    });

    return { success: true };
  }

  // ============================================================================
  // FORM SUBMISSIONS
  // ============================================================================

  async submitForm(
    formId: string,
    dto: SubmitFormDto,
  ): Promise<{ submissionId: string; contactId?: string }> {
    const form = await this.prisma.leadForm.findUnique({
      where: { id: formId },
      include: { organization: true },
    });

    if (!form || form.status !== 'active') {
      throw new NotFoundException('Form not found or not active');
    }

    // Create submission
    const submission = await this.prisma.formSubmission.create({
      data: {
        formId,
        organizationId: form.organizationId,
        data: dto.data as any,
        visitorId: dto.visitorId,
        pageUrl: dto.pageUrl,
        referrer: dto.referrer,
        utmSource: dto.utmSource,
        utmMedium: dto.utmMedium,
        utmCampaign: dto.utmCampaign,
      },
    });

    // Update form stats
    await this.prisma.leadForm.update({
      where: { id: formId },
      data: {
        submissions: { increment: 1 },
      },
    });

    // Try to create contact from submission
    let contactId: string | undefined;
    try {
      contactId = await this.createContactFromSubmission(form.organizationId, dto.data);
      
      // Update submission with contact
      await this.prisma.formSubmission.update({
        where: { id: submission.id },
        data: {
          contactId,
          converted: true,
        },
      });

      // Update form conversion stats
      await this.prisma.leadForm.update({
        where: { id: formId },
        data: {
          conversions: { increment: 1 },
        },
      });

      // Create conversion record
      await this.prisma.conversion.create({
        data: {
          organizationId: form.organizationId,
          sourceType: 'form',
          sourceId: formId,
          contactId,
          submissionId: submission.id,
          utmSource: dto.utmSource,
          utmMedium: dto.utmMedium,
          utmCampaign: dto.utmCampaign,
          referrer: dto.referrer,
          landingPage: dto.pageUrl,
        },
      });
    } catch (error) {
      this.logger.warn('Failed to create contact from submission:', error);
    }

    return { submissionId: submission.id, contactId };
  }

  async getFormSubmissions(
    organizationId: string,
    formId: string,
    options?: { limit?: number; offset?: number; converted?: boolean },
  ): Promise<FormSubmissionResponse[]> {
    const submissions = await this.prisma.formSubmission.findMany({
      where: {
        formId,
        organizationId,
        ...(options?.converted !== undefined && { converted: options.converted }),
      },
      orderBy: { submittedAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    return submissions.map((sub) => this.mapToFormSubmissionResponse(sub));
  }

  // ============================================================================
  // LANDING PAGES
  // ============================================================================

  async createLandingPage(
    organizationId: string,
    dto: CreateLandingPageDto,
  ): Promise<{ id: string }> {
    // Check if slug is unique
    const existing = await this.prisma.landingPage.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new Error('Landing page with this slug already exists');
    }

    const page = await this.prisma.landingPage.create({
      data: {
        organizationId,
        name: dto.name,
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        content: dto.content as any,
        template: dto.template,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        formId: dto.formId,
        status: 'draft',
      },
    });

    return { id: page.id };
  }

  async getLandingPageBySlug(slug: string): Promise<LandingPageResponse | null> {
    const page = await this.prisma.landingPage.findUnique({
      where: { slug },
    });

    if (!page || page.status !== 'published') {
      return null;
    }

    // Increment views
    await this.prisma.landingPage.update({
      where: { id: page.id },
      data: { views: { increment: 1 } },
    });

    return this.mapToLandingPageResponse(page);
  }

  async getLandingPages(
    organizationId: string,
    options?: { status?: string; limit?: number; offset?: number },
  ): Promise<LandingPageResponse[]> {
    const pages = await this.prisma.landingPage.findMany({
      where: {
        organizationId,
        ...(options?.status && { status: options.status }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    return pages.map((page) => this.mapToLandingPageResponse(page));
  }

  // ============================================================================
  // WEBSITE VISITORS
  // ============================================================================

  async trackVisitor(
    organizationId: string,
    dto: TrackVisitorDto,
  ): Promise<{ visitorId: string; isNew: boolean }> {
    // Check if visitor exists
    let visitor = await this.prisma.websiteVisitor.findFirst({
      where: {
        organizationId,
        fingerprint: dto.fingerprint,
      },
    });

    const isNew = !visitor;

    if (visitor) {
      // Update existing visitor
      visitor = await this.prisma.websiteVisitor.update({
        where: { id: visitor.id },
        data: {
          pageViews: { increment: 1 },
          lastVisitAt: new Date(),
          sessionId: dto.sessionId,
        },
      });
    } else {
      // Create new visitor
      visitor = await this.prisma.websiteVisitor.create({
        data: {
          organizationId,
          fingerprint: dto.fingerprint,
          sessionId: dto.sessionId,
          ipAddress: dto.ipAddress,
          pageViews: 1,
        },
      });

      // Try to enrich IP data (optional)
      if (dto.ipAddress) {
        this.enrichVisitorData(visitor.id, dto.ipAddress).catch(() => {
          // Ignore enrichment errors
        });
      }
    }

    // Track page view
    await this.prisma.visitorPageView.create({
      data: {
        visitorId: visitor.id,
        pageUrl: dto.pageUrl,
        pageTitle: dto.pageTitle,
        referrer: dto.referrer,
        utmSource: dto.utmSource,
        utmMedium: dto.utmCampaign,
      },
    });

    return { visitorId: visitor.id, isNew };
  }

  async identifyVisitor(
    organizationId: string,
    dto: IdentifyVisitorDto,
  ): Promise<{ contactId: string }> {
    const visitor = await this.prisma.websiteVisitor.findFirst({
      where: {
        id: dto.visitorId,
        organizationId,
      },
    });

    if (!visitor) {
      throw new NotFoundException('Visitor not found');
    }

    // Create contact
    const contact = await this.prisma.contact.create({
      data: {
        organizationId,
        email: dto.email,
        firstName: dto.firstName || '',
        lastName: dto.lastName || '',
        phone: dto.phone,
        company: dto.company,
        title: dto.title,
        source: 'website',
      },
    });

    // Update visitor
    await this.prisma.websiteVisitor.update({
      where: { id: visitor.id },
      data: {
        contactId: contact.id,
        identifiedAt: new Date(),
      },
    });

    return { contactId: contact.id };
  }

  async getVisitors(
    organizationId: string,
    options?: { limit?: number; offset?: number; identified?: boolean },
  ): Promise<VisitorResponse[]> {
    const visitors = await this.prisma.websiteVisitor.findMany({
      where: {
        organizationId,
        ...(options?.identified !== undefined && {
          contactId: options.identified ? { not: null } : null,
        }),
      },
      orderBy: { lastVisitAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    return visitors.map((v) => this.mapToVisitorResponse(v));
  }

  // ============================================================================
  // LEAD MAGNETS
  // ============================================================================

  async createLeadMagnet(
    organizationId: string,
    dto: CreateLeadMagnetDto,
  ): Promise<{ id: string }> {
    const magnet = await this.prisma.leadMagnet.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        fileUrl: dto.fileUrl,
        content: dto.content,
        externalUrl: dto.externalUrl,
        deliveryMethod: dto.deliveryMethod || 'immediate',
        requireEmail: dto.requireEmail ?? true,
        requirePhone: dto.requirePhone ?? false,
      },
    });

    return { id: magnet.id };
  }

  async getLeadMagnet(
    organizationId: string,
    magnetId: string,
  ): Promise<LeadMagnetResponse> {
    const magnet = await this.prisma.leadMagnet.findFirst({
      where: { id: magnetId, organizationId },
    });

    if (!magnet) {
      throw new NotFoundException('Lead magnet not found');
    }

    return this.mapToLeadMagnetResponse(magnet);
  }

  async recordLeadMagnetDownload(
    magnetId: string,
  ): Promise<void> {
    await this.prisma.leadMagnet.update({
      where: { id: magnetId },
      data: { downloads: { increment: 1 } },
    });
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  async getFormAnalytics(
    organizationId: string,
    formId: string,
  ): Promise<FormAnalytics> {
    const form = await this.prisma.leadForm.findFirst({
      where: { id: formId, organizationId },
      include: {
        formSubmissions: {
          orderBy: { submittedAt: 'desc' },
          take: 1000,
        },
      },
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    const submissionsByDay = this.aggregateByDay(form.formSubmissions, 'submittedAt');
    const submissionsBySource = this.aggregateByKey(form.formSubmissions, 'utmSource');
    const topReferrers = this.aggregateByKey(form.formSubmissions, 'referrer');

    return {
      formId,
      totalViews: form.views,
      totalSubmissions: form.submissions,
      conversionRate: form.conversionRate,
      submissionsByDay,
      submissionsBySource,
      topReferrers: Object.entries(topReferrers)
        .map(([url, count]) => ({ url, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }

  async getConversionDashboard(
    organizationId: string,
    days = 30,
  ): Promise<ConversionDashboard> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const conversions = await this.prisma.conversion.findMany({
      where: {
        organizationId,
        convertedAt: { gte: since },
      },
      include: {
        submission: true,
      },
    });

    const conversionsBySource = this.aggregateByKey(conversions, 'sourceType');
    const conversionsByDay = this.aggregateByDay(conversions, 'convertedAt');

    return {
      totalConversions: conversions.length,
      conversionsBySource,
      conversionsByDay,
      topLandingPages: [],
      topForms: [],
      avgTimeToConvert: 0,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async createContactFromSubmission(
    organizationId: string,
    data: Record<string, any>,
  ): Promise<string | undefined> {
    const email = data.email || data.Email;
    if (!email) return undefined;

    // Check if contact exists
    const existing = await this.prisma.contact.findFirst({
      where: { organizationId, email },
    });

    if (existing) {
      return existing.id;
    }

    // Create new contact
    const contact = await this.prisma.contact.create({
      data: {
        organizationId,
        email,
        firstName: data.firstName || data.first_name || data['First Name'] || '',
        lastName: data.lastName || data.last_name || data['Last Name'] || '',
        phone: data.phone || data.Phone,
        title: data.title || data.Title || data.jobTitle,
        company: data.company || data.Company,
        source: 'form_submission',
      },
    });

    // Trigger enrichment
    this.enrichmentService.enrichContact(contact.id).catch(() => {
      // Ignore enrichment errors
    });

    return contact.id;
  }

  private async enrichVisitorData(
    visitorId: string,
    ipAddress: string,
  ): Promise<void> {
    // This would integrate with IP enrichment service
    // For now, just a placeholder
    this.logger.debug(`Would enrich visitor ${visitorId} with IP ${ipAddress}`);
  }

  private mapToLeadFormResponse(form: any): LeadFormResponse {
    return {
      id: form.id,
      name: form.name,
      description: form.description,
      formType: form.formType,
      status: form.status,
      template: form.template,
      fields: form.fields || [],
      design: form.design || {},
      triggerConfig: form.triggerConfig || {},
      displayRules: form.displayRules || {},
      thankYouMessage: form.thankYouMessage,
      redirectUrl: form.redirectUrl,
      leadMagnetId: form.leadMagnetId,
      views: form.views,
      submissions: form.submissions,
      conversions: form.conversions,
      conversionRate: form.conversionRate,
      createdAt: form.createdAt.toISOString(),
      updatedAt: form.updatedAt.toISOString(),
    };
  }

  private mapToFormSubmissionResponse(sub: any): FormSubmissionResponse {
    return {
      id: sub.id,
      formId: sub.formId,
      data: sub.data || {},
      visitorId: sub.visitorId,
      ipAddress: sub.ipAddress,
      pageUrl: sub.pageUrl,
      referrer: sub.referrer,
      utmSource: sub.utmSource,
      utmMedium: sub.utmMedium,
      utmCampaign: sub.utmCampaign,
      contactId: sub.contactId,
      converted: sub.converted,
      submittedAt: sub.submittedAt.toISOString(),
    };
  }

  private mapToLandingPageResponse(page: any): LandingPageResponse {
    return {
      id: page.id,
      name: page.name,
      slug: page.slug,
      title: page.title,
      description: page.description,
      content: page.content || [],
      template: page.template,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      status: page.status,
      publishedAt: page.publishedAt?.toISOString(),
      views: page.views,
      uniqueViews: page.uniqueViews,
      conversions: page.conversions,
      conversionRate: page.conversionRate,
      formId: page.formId,
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
    };
  }

  private mapToVisitorResponse(v: any): VisitorResponse {
    return {
      id: v.id,
      fingerprint: v.fingerprint,
      sessionId: v.sessionId,
      ipAddress: v.ipAddress,
      country: v.country,
      city: v.city,
      companyName: v.companyName,
      companyDomain: v.companyDomain,
      companyIndustry: v.companyIndustry,
      pageViews: v.pageViews,
      firstVisitAt: v.firstVisitAt.toISOString(),
      lastVisitAt: v.lastVisitAt.toISOString(),
      leadScore: v.leadScore,
      contactId: v.contactId,
      identifiedAt: v.identifiedAt?.toISOString(),
    };
  }

  private mapToLeadMagnetResponse(magnet: any): LeadMagnetResponse {
    return {
      id: magnet.id,
      name: magnet.name,
      description: magnet.description,
      type: magnet.type,
      fileUrl: magnet.fileUrl,
      content: magnet.content,
      externalUrl: magnet.externalUrl,
      deliveryMethod: magnet.deliveryMethod,
      views: magnet.views,
      downloads: magnet.downloads,
      createdAt: magnet.createdAt.toISOString(),
      updatedAt: magnet.updatedAt.toISOString(),
    };
  }

  private aggregateByDay(items: any[], dateField: string): Array<{ date: string; count: number }> {
    const grouped = items.reduce((acc, item) => {
      const date = new Date(item[dateField]).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([date, count]) => ({ date, count: count as number }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private aggregateByKey(items: any[], key: string): Record<string, number> {
    return items.reduce((acc, item) => {
      const value = item[key] || 'Direct';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }
}
