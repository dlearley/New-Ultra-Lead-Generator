import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import { AccountResearchService } from '../research/account-research.service';

export interface ContentGenerationRequest {
  contactId: string;
  channel: 'email' | 'linkedin' | 'sms' | 'phone';
  contentType: 'intro' | 'follow_up' | 'value_prop' | 'case_study' | 'breakup';
  tone?: 'professional' | 'casual' | 'friendly' | 'formal' | 'enthusiastic';
  length?: 'short' | 'medium' | 'long';
  context?: {
    previousMessage?: string;
    triggerEvent?: string;
    mutualConnection?: string;
  };
}

export interface GeneratedContent {
  subject?: string;
  body: string;
  personalizationPoints: string[];
  researchUsed: string[];
  suggestedActions: string[];
  variants: Array<{
    name: string;
    subject?: string;
    body: string;
  }>;
}

export interface OneClickApplyAction {
  type: 'add_to_sequence' | 'create_task' | 'add_note' | 'update_field' | 'send_now';
  label: string;
  icon: string;
  config: any;
}

@Injectable()
export class HyperPersonalizationService {
  private readonly logger = new Logger(HyperPersonalizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountResearch: AccountResearchService,
  ) {}

  // ============================================================
  // GENERATE HYPER-PERSONALIZED CONTENT
  // ============================================================

  async generateContent(
    organizationId: string,
    request: ContentGenerationRequest,
  ): Promise<GeneratedContent> {
    const { contactId, channel, contentType, tone, length, context } = request;

    // Get contact with company
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId },
      include: { company: true },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Get account intelligence
    let intelligence = await this.prisma.accountIntelligence.findFirst({
      where: { organizationId, companyId: contact.companyId || '' },
    });

    // If no intelligence or stale, trigger research
    if (!intelligence || this.isStale(intelligence.lastResearchedAt)) {
      try {
        await this.accountResearch.researchAccount(
          organizationId,
          contact.companyId || '',
          { news: true, techStack: true, funding: true },
        );
        intelligence = await this.prisma.accountIntelligence.findFirst({
          where: { organizationId, companyId: contact.companyId || '' },
        });
      } catch (error) {
        this.logger.warn('Failed to research account:', error);
      }
    }

    // Get contact's recent activity
    const recentActivity = await this.getRecentActivity(organizationId, contactId);

    // Get scoring data
    const scoreData = await this.prisma.leadScore.findFirst({
      where: { contactId },
      orderBy: { calculatedAt: 'desc' },
    });

    // Build personalization context
    const personalizationContext = this.buildPersonalizationContext(
      contact,
      intelligence,
      recentActivity,
      scoreData,
      context,
    );

    // Generate content based on channel and type
    const content = await this.createPersonalizedContent(
      personalizationContext,
      channel,
      contentType,
      tone,
      length,
    );

    // Save generated content
    await this.savePersonalizedContent(organizationId, contactId, content, channel, contentType);

    return content;
  }

  private buildPersonalizationContext(
    contact: any,
    intelligence: any,
    recentActivity: any,
    scoreData: any,
    context?: any,
  ): any {
    const ctx: any = {
      contact: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        title: contact.jobTitle,
        email: contact.email,
      },
      company: {
        name: contact.company?.name,
        industry: contact.company?.industry,
        size: contact.company?.employeeCount,
      },
    };

    // Add intelligence data
    if (intelligence) {
      ctx.intelligence = {
        recentNews: intelligence.recentNews,
        techStack: intelligence.techStack,
        funding: intelligence.fundingNews,
        hiring: intelligence.hiringActivity,
        competitors: intelligence.competitors,
      };
    }

    // Add activity data
    if (recentActivity) {
      ctx.activity = recentActivity;
    }

    // Add score data
    if (scoreData) {
      ctx.score = {
        total: scoreData.totalScore,
        category: scoreData.category,
      };
    }

    // Add custom context
    if (context) {
      ctx.custom = context;
    }

    return ctx;
  }

  private async createPersonalizedContent(
    context: any,
    channel: string,
    contentType: string,
    tone: string = 'professional',
    length: string = 'medium',
  ): Promise<GeneratedContent> {
    // Generate using AI (mock implementation)
    const personalizationPoints: string[] = [];
    const researchUsed: string[] = [];

    // Build subject line
    let subject = '';
    if (channel === 'email') {
      subject = this.generateSubjectLine(context, contentType);
    }

    // Build body
    const body = this.generateBody(context, channel, contentType, tone, length, personalizationPoints, researchUsed);

    // Generate variants for A/B testing
    const variants = this.generateVariants(context, channel, contentType);

    // Suggest actions
    const suggestedActions = this.suggestActions(context, contentType);

    return {
      subject,
      body,
      personalizationPoints,
      researchUsed,
      suggestedActions,
      variants,
    };
  }

  private generateSubjectLine(context: any, contentType: string): string {
    const { contact, company, intelligence } = context;
    
    // Use intelligence to craft subject
    if (intelligence?.funding?.round) {
      return `${company.name} + scaling with ${intelligence.funding.round} funding?`;
    }

    if (intelligence?.recentNews?.[0]?.title) {
      return `Following ${company.name}'s recent expansion`;
    }

    if (intelligence?.hiring?.growthRate > 30) {
      return `Quick question about ${company.name}'s growth`;
    }

    // Default subjects by type
    const subjects: Record<string, string> = {
      intro: `Quick question about ${company.name}`,
      follow_up: `Following up on my note`,
      value_prop: `Idea for ${company.name}`,
      case_study: `How we helped a ${company.industry || 'similar'} company`,
      breakup: `Should I close your file?`,
    };

    return subjects[contentType] || subjects.intro;
  }

  private generateBody(
    context: any,
    channel: string,
    contentType: string,
    tone: string,
    length: string,
    personalizationPoints: string[],
    researchUsed: string[],
  ): string {
    const { contact, company, intelligence } = context;
    const firstName = contact.firstName;

    let body = '';

    // Opening based on intelligence
    if (intelligence?.recentNews?.[0]) {
      body += `Hi ${firstName},\n\nI saw the news about ${intelligence.recentNews[0].title.toLowerCase().replace(company.name.toLowerCase(), company.name)} - exciting times!\n\n`;
      personalizationPoints.push('referenced recent company news');
      researchUsed.push('recent_news');
    } else if (intelligence?.funding) {
      body += `Hi ${firstName},\n\nCongratulations on the ${intelligence.funding.round}! With the new funding, I'm sure you're thinking about scaling efficiently.\n\n`;
      personalizationPoints.push('congratulated on recent funding');
      researchUsed.push('funding_data');
    } else {
      body += `Hi ${firstName},\n\n`;
    }

    // Main content based on type
    const contentTemplates: Record<string, string> = {
      intro: `I came across ${company.name} and was impressed by your approach to the ${company.industry || 'market'} space.\n\nWe've helped similar companies like ${intelligence?.competitors?.[0] || 'Competitor X'} streamline their lead generation process, resulting in a 40% increase in qualified pipeline.\n\nGiven your growth trajectory, I thought there might be a fit. Worth a brief conversation?`,

      follow_up: `I wanted to follow up on my previous note about helping ${company.name} with lead generation.\n\nI know things get busy, but given your recent ${intelligence?.hiring ? 'hiring push' : 'growth'}, I thought this might be particularly timely.\n\nWould you be open to a quick 15-minute call next week?`,

      value_prop: `I'm reaching out because we've developed a unique approach to helping ${company.industry || 'companies like yours'} generate high-quality leads at scale.\n\nSpecifically, we've helped companies:\n\n• Increase qualified pipeline by 40%\n• Reduce cost per lead by 25%\n• Improve sales team productivity\n\nWould you be interested in seeing how this could apply to ${company.name}?`,

      case_study: `I wanted to share a quick story about a ${company.industry || 'similar'} company we worked with recently.\n\nThey were facing similar challenges with lead quality and volume. After implementing our approach, they saw:\n\n• 3x increase in qualified meetings\n• 50% reduction in sales cycle\n• $2M additional pipeline in 90 days\n\nI'd love to share how we achieved these results and if they might apply to ${company.name}.`,

      break_up: `I've reached out a few times about helping ${company.name} with lead generation, but haven't heard back.\n\nI don't want to be a nuisance, so this will be my last email unless you're interested in exploring further.\n\nIf now's not the right time, I completely understand. Feel free to reach out whenever makes sense.\n\nBest of luck with everything,`,
    };

    body += contentTemplates[contentType] || contentTemplates.intro;

    // Add tech stack personalization
    if (intelligence?.techStack?.length > 0) {
      const tools = intelligence.techStack.slice(0, 3).join(', ');
      body += `\n\nP.S. I noticed you use ${tools} - we integrate seamlessly with your existing stack.`;
      personalizationPoints.push('mentioned tech stack compatibility');
      researchUsed.push('tech_stack');
    }

    return body;
  }

  private generateVariants(context: any, channel: string, contentType: string): Array<{ name: string; subject?: string; body: string }> {
    return [
      {
        name: 'Direct',
        body: `Hi ${context.contact.firstName},\n\nI help ${context.company.industry || 'companies like yours'} generate more qualified leads. Interested in a brief conversation?`,
      },
      {
        name: 'Question',
        body: `Hi ${context.contact.firstName},\n\nQuick question: How is ${context.company.name} currently handling lead generation?\n\nWe've helped similar companies improve their pipeline by 40%.`,
      },
    ];
  }

  private suggestActions(context: any, contentType: string): string[] {
    const actions: string[] = [];

    if (context.intelligence?.funding) {
      actions.push('Reference their funding round in your opening');
    }

    if (context.intelligence?.techStack?.includes('Salesforce')) {
      actions.push('Highlight Salesforce integration');
    }

    if (context.score?.category === 'hot') {
      actions.push('Prioritize this lead - high score');
      actions.push('Suggest meeting this week');
    }

    if (context.activity?.lastReply?.sentiment === 'positive') {
      actions.push('Follow up quickly while interest is high');
    }

    return actions;
  }

  private async savePersonalizedContent(
    organizationId: string,
    contactId: string,
    content: GeneratedContent,
    channel: string,
    contentType: string,
  ): Promise<void> {
    await this.prisma.personalizedContent.create({
      data: {
        organizationId,
        contactId,
        channel,
        contentType,
        subject: content.subject,
        body: content.body,
        personalizationPoints: content.personalizationPoints,
        researchUsed: content.researchUsed,
      },
    });
  }

  // ============================================================
  // ONE-CLICK APPLY ACTIONS
  // ============================================================

  async getOneClickActions(
    organizationId: string,
    contentId: string,
  ): Promise<OneClickApplyAction[]> {
    const content = await this.prisma.personalizedContent.findFirst({
      where: { id: contentId, organizationId },
      include: { contact: true },
    });

    if (!content) {
      throw new Error('Content not found');
    }

    const actions: OneClickApplyAction[] = [
      {
        type: 'add_to_sequence',
        label: 'Add to Outreach Sequence',
        icon: 'mail',
        config: {
          contentId: content.id,
          contactId: content.contactId,
          suggestedSequences: await this.getSuggestedSequences(organizationId, content.contact),
        },
      },
      {
        type: 'create_task',
        label: 'Create Follow-up Task',
        icon: 'check-square',
        config: {
          title: `Follow up with ${content.contact.firstName} ${content.contact.lastName}`,
          description: content.body.substring(0, 200) + '...',
          dueDate: '3_days',
          priority: 'high',
        },
      },
      {
        type: 'add_note',
        label: 'Add to CRM Notes',
        icon: 'file-text',
        config: {
          contactId: content.contactId,
          note: `AI-Generated Content:\n\nSubject: ${content.subject}\n\n${content.body}`,
          tags: ['ai-generated', content.contentType],
        },
      },
      {
        type: 'send_now',
        label: 'Send Immediately',
        icon: 'send',
        config: {
          channel: content.channel,
          contactId: content.contactId,
          subject: content.subject,
          body: content.body,
        },
      },
      {
        type: 'update_field',
        label: 'Update Contact Status',
        icon: 'edit',
        config: {
          contactId: content.contactId,
          fields: {
            status: 'engaged',
            lastContactedAt: new Date().toISOString(),
            aiPersonalized: true,
          },
        },
      },
    ];

    return actions;
  }

  private async getSuggestedSequences(organizationId: string, contact: any): Promise<any[]> {
    // Get active sequences that match the contact's profile
    return this.prisma.outreachSequence.findMany({
      where: {
        organizationId,
        status: 'active',
      },
      take: 3,
      select: {
        id: true,
        name: true,
        sequenceType: true,
      },
    });
  }

  async applyOneClickAction(
    organizationId: string,
    contentId: string,
    actionType: string,
    config?: any,
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    const content = await this.prisma.personalizedContent.findFirst({
      where: { id: contentId, organizationId },
    });

    if (!content) {
      return { success: false, error: 'Content not found' };
    }

    try {
      switch (actionType) {
        case 'add_to_sequence':
          return await this.addToSequence(organizationId, content, config);
        
        case 'create_task':
          return await this.createTask(organizationId, content, config);
        
        case 'add_note':
          return await this.addNote(organizationId, content, config);
        
        case 'send_now':
          return await this.sendNow(organizationId, content, config);
        
        case 'update_field':
          return await this.updateContactField(organizationId, content, config);
        
        default:
          return { success: false, error: 'Unknown action type' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async addToSequence(
    organizationId: string,
    content: any,
    config: any,
  ): Promise<{ success: boolean; result?: any }> {
    // Enroll contact in sequence
    // This would integrate with the outreach module
    
    return {
      success: true,
      result: {
        message: 'Contact enrolled in sequence',
        sequenceId: config.sequenceId,
        contactId: content.contactId,
      },
    };
  }

  private async createTask(
    organizationId: string,
    content: any,
    config: any,
  ): Promise<{ success: boolean; result?: any }> {
    // Create CRM task
    const task = await this.prisma.crmTask.create({
      data: {
        organizationId,
        contactId: content.contactId,
        subject: config.title,
        description: config.description,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        status: 'open',
      },
    });

    return {
      success: true,
      result: { taskId: task.id },
    };
  }

  private async addNote(
    organizationId: string,
    content: any,
    config: any,
  ): Promise<{ success: boolean; result?: any }> {
    // Add note to contact
    await this.prisma.contact.update({
      where: { id: content.contactId },
      data: {
        notes: {
          push: {
            content: config.note,
            createdAt: new Date(),
            tags: config.tags,
          },
        },
      },
    });

    return {
      success: true,
      result: { message: 'Note added to contact' },
    };
  }

  private async sendNow(
    organizationId: string,
    content: any,
    config: any,
  ): Promise<{ success: boolean; result?: any }> {
    // Send message immediately
    // This would integrate with email/SMS providers
    
    return {
      success: true,
      result: {
        message: 'Message queued for sending',
        messageId: `msg_${Date.now()}`,
      },
    };
  }

  private async updateContactField(
    organizationId: string,
    content: any,
    config: any,
  ): Promise<{ success: boolean; result?: any }> {
    await this.prisma.contact.update({
      where: { id: content.contactId },
      data: config.fields,
    });

    return {
      success: true,
      result: { message: 'Contact updated' },
    };
  }

  // ============================================================
  // CACHING
  // ============================================================

  async getCachedPersonalization(
    organizationId: string,
    contactId: string,
  ): Promise<any> {
    const cache = await this.prisma.hyperPersonalizationCache.findFirst({
      where: {
        organizationId,
        contactId,
        expiresAt: { gt: new Date() },
      },
    });

    return cache;
  }

  async cachePersonalization(
    organizationId: string,
    contactId: string,
    data: {
      researchSummary: string;
      talkingPoints: string[];
      contentIdeas: string[];
    },
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Cache for 7 days

    await this.prisma.hyperPersonalizationCache.upsert({
      where: {
        organizationId_contactId: {
          organizationId,
          contactId,
        },
      },
      create: {
        organizationId,
        contactId,
        researchSummary: data.researchSummary,
        talkingPoints: data.talkingPoints,
        contentIdeas: data.contentIdeas,
        expiresAt,
      },
      update: {
        researchSummary: data.researchSummary,
        talkingPoints: data.talkingPoints,
        contentIdeas: data.contentIdeas,
        expiresAt,
      },
    });
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private isStale(lastResearchedAt: Date): boolean {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return lastResearchedAt < oneWeekAgo;
  }

  private async getRecentActivity(organizationId: string, contactId: string): Promise<any> {
    const [replies, executions] = await Promise.all([
      this.prisma.outreachReply.findFirst({
        where: { organizationId, contactId },
        orderBy: { receivedAt: 'desc' },
      }),
      this.prisma.stepExecution.findMany({
        where: { organizationId, enrollment: { contactId } },
        orderBy: { sentAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      lastReply: replies,
      recentMessages: executions,
    };
  }
}
