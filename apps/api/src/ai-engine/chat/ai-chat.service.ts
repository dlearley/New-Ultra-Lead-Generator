import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import { AccountResearchService } from '../research/account-research.service';
import { HyperPersonalizationService } from '../personalization/hyper-personalization.service';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: AIAction[];
}

export interface AIAction {
  type: 'generate_email' | 'research_account' | 'create_sequence' | 'add_to_crm' | 'schedule_followup' | 'show_insights';
  label: string;
  config: any;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  context?: {
    activeContactId?: string;
    activeCompanyId?: string;
    activeSequenceId?: string;
  };
}

@Injectable()
export class AIChatService {
  private readonly logger = new Logger(AIChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountResearch: AccountResearchService,
    private readonly personalization: HyperPersonalizationService,
  ) {}

  // ============================================================
  // CHAT SESSIONS
  // ============================================================

  async createSession(
    organizationId: string,
    userId: string,
    title?: string,
  ): Promise<ChatSession> {
    const session = await this.prisma.aIChatSession.create({
      data: {
        organizationId,
        userId,
        title: title || 'New Chat',
        messages: [],
        isActive: true,
      },
    });

    return {
      id: session.id,
      title: session.title || 'New Chat',
      messages: [],
    };
  }

  async getSession(
    organizationId: string,
    userId: string,
    sessionId: string,
  ): Promise<ChatSession> {
    const session = await this.prisma.aIChatSession.findFirst({
      where: { id: sessionId, organizationId, userId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    return {
      id: session.id,
      title: session.title || 'Chat',
      messages: (session.messages as any[]) || [],
      context: session.context as any,
    };
  }

  async getActiveSessions(
    organizationId: string,
    userId: string,
  ): Promise<ChatSession[]> {
    const sessions = await this.prisma.aIChatSession.findMany({
      where: { organizationId, userId, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      title: s.title || 'Chat',
      messages: (s.messages as any[]) || [],
    }));
  }

  async closeSession(
    organizationId: string,
    userId: string,
    sessionId: string,
  ): Promise<void> {
    await this.prisma.aIChatSession.updateMany({
      where: { id: sessionId, organizationId, userId },
      data: { isActive: false },
    });
  }

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  async sendMessage(
    organizationId: string,
    userId: string,
    sessionId: string,
    message: string,
  ): Promise<{
    userMessage: ChatMessage;
    assistantResponse: ChatMessage;
    updatedSession: ChatSession;
  }> {
    const session = await this.getSession(organizationId, userId, sessionId);

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    // Process message and generate response
    const response = await this.processMessage(
      organizationId,
      message,
      session,
    );

    const assistantResponse: ChatMessage = {
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      actions: response.actions,
    };

    // Update session
    const updatedMessages = [...session.messages, userMessage, assistantResponse];
    
    await this.prisma.aIChatSession.update({
      where: { id: sessionId },
      data: {
        messages: updatedMessages as any,
        context: response.updatedContext as any,
      },
    });

    return {
      userMessage,
      assistantResponse,
      updatedSession: {
        ...session,
        messages: updatedMessages,
        context: response.updatedContext,
      },
    };
  }

  private async processMessage(
    organizationId: string,
    message: string,
    session: ChatSession,
  ): Promise<{
    content: string;
    actions?: AIAction[];
    updatedContext?: any;
  }> {
    const lowerMessage = message.toLowerCase();
    const context = session.context || {};

    // Intent detection
    if (this.isEmailRequest(lowerMessage)) {
      return this.handleEmailRequest(organizationId, message, context);
    }

    if (this.isResearchRequest(lowerMessage)) {
      return this.handleResearchRequest(organizationId, message, context);
    }

    if (this.isInsightsRequest(lowerMessage)) {
      return this.handleInsightsRequest(organizationId, message, context);
    }

    if (this.isSequenceRequest(lowerMessage)) {
      return this.handleSequenceRequest(organizationId, message, context);
    }

    // Default response
    return {
      content: `I can help you with:\n\n` +
        `• **Write emails** - "Write an email for the CTO at Acme Corp"\n` +
        `• **Research accounts** - "Research Salesforce and tell me about them"\n` +
        `• **Generate insights** - "Show me hot leads to prioritize"\n` +
        `• **Create sequences** - "Build a 5-step sequence for enterprise prospects"\n\n` +
        `What would you like to do?`,
      actions: [
        {
          type: 'generate_email',
          label: 'Write an Email',
          config: {},
        },
        {
          type: 'research_account',
          label: 'Research Account',
          config: {},
        },
        {
          type: 'show_insights',
          label: 'View Insights',
          config: {},
        },
      ],
    };
  }

  // ============================================================
  // INTENT HANDLERS
  // ============================================================

  private async handleEmailRequest(
    organizationId: string,
    message: string,
    context: any,
  ): Promise<{ content: string; actions: AIAction[]; updatedContext: any }> {
    // Extract company/contact from message
    const companyName = this.extractCompanyName(message);
    const contactName = this.extractContactName(message);
    const role = this.extractRole(message);

    // Find contact
    let contact;
    if (contactName) {
      contact = await this.prisma.contact.findFirst({
        where: {
          organizationId,
          OR: [
            { firstName: { contains: contactName.split(' ')[0], mode: 'insensitive' } },
            { lastName: { contains: contactName.split(' ').pop(), mode: 'insensitive' } },
          ],
        },
        include: { company: true },
      });
    } else if (companyName) {
      contact = await this.prisma.contact.findFirst({
        where: {
          organizationId,
          company: { name: { contains: companyName, mode: 'insensitive' } },
        },
        include: { company: true },
      });
    } else if (role) {
      contact = await this.prisma.contact.findFirst({
        where: {
          organizationId,
          jobTitle: { contains: role, mode: 'insensitive' },
        },
        include: { company: true },
      });
    }

    if (!contact) {
      return {
        content: `I couldn't find a contact matching "${contactName || companyName || role}". Could you provide more details or check the spelling?`,
        actions: [],
        updatedContext: context,
      };
    }

    // Generate email
    const content = await this.personalization.generateContent(
      organizationId,
      {
        contactId: contact.id,
        channel: 'email',
        contentType: 'intro',
        tone: 'professional',
      },
    );

    return {
      content: `Here's a personalized email for **${contact.firstName} ${contact.lastName}** at **${contact.company?.name}**:\n\n` +
        `**Subject:** ${content.subject}\n\n` +
        `${content.body}\n\n` +
        `**Personalization used:** ${content.personalizationPoints.join(', ')}`,
      actions: [
        {
          type: 'add_to_crm',
          label: 'Add to Sequence',
          config: { contactId: contact.id, content },
        },
        {
          type: 'generate_email',
          label: 'Generate Variants',
          config: { contactId: contact.id, generateVariants: true },
        },
      ],
      updatedContext: {
        ...context,
        activeContactId: contact.id,
        activeCompanyId: contact.companyId,
      },
    };
  }

  private async handleResearchRequest(
    organizationId: string,
    message: string,
    context: any,
  ): Promise<{ content: string; actions: AIAction[]; updatedContext: any }> {
    const companyName = this.extractCompanyName(message);

    if (!companyName) {
      return {
        content: 'Which company would you like me to research? Please include the company name.',
        actions: [],
        updatedContext: context,
      };
    }

    const company = await this.prisma.company.findFirst({
      where: {
        organizationId,
        name: { contains: companyName, mode: 'insensitive' },
      },
    });

    if (!company) {
      return {
        content: `I couldn't find a company named "${companyName}". Would you like to add them first?`,
        actions: [],
        updatedContext: context,
      };
    }

    // Trigger research
    const research = await this.accountResearch.researchAccount(
      organizationId,
      company.id,
      { news: true, techStack: true, funding: true, hiring: true },
    );

    return {
      content: `Here's what I found about **${company.name}**:\n\n` +
        `**Recent News:**\n${research.findings.news?.map((n: any) => `• ${n.title}`).join('\n') || 'No recent news'}\n\n` +
        `**Tech Stack:** ${research.findings.techStack?.slice(0, 5).join(', ') || 'Unknown'}\n\n` +
        `**Key Insights:**\n${research.insights.map((i: string) => `• ${i}`).join('\n')}`,
      actions: [
        {
          type: 'generate_email',
          label: 'Write Email Based on Research',
          config: { companyId: company.id },
        },
        {
          type: 'add_to_crm',
          label: 'Add to CRM',
          config: { companyId: company.id },
        },
      ],
      updatedContext: {
        ...context,
        activeCompanyId: company.id,
      },
    };
  }

  private async handleInsightsRequest(
    organizationId: string,
    message: string,
    context: any,
  ): Promise<{ content: string; actions: AIAction[]; updatedContext: any }> {
    // Get hot leads
    const hotLeads = await this.prisma.leadScore.findMany({
      where: {
        organizationId,
        category: 'hot',
      },
      include: { contact: { include: { company: true } } },
      take: 5,
      orderBy: { totalScore: 'desc' },
    });

    // Get recent anomalies
    const anomalies = await this.prisma.anomalyAlert.findMany({
      where: {
        organizationId,
        status: { in: ['new', 'acknowledged'] },
      },
      take: 3,
      orderBy: { detectedAt: 'desc' },
    });

    let content = `**Here are your top insights:**\n\n`;

    if (hotLeads.length > 0) {
      content += `**🔥 Hot Leads to Prioritize:**\n`;
      hotLeads.forEach((lead) => {
        content += `• **${lead.contact.firstName} ${lead.contact.lastName}** (${lead.contact.company?.name}) - Score: ${lead.totalScore}\n`;
      });
      content += '\n';
    }

    if (anomalies.length > 0) {
      content += `**⚠️ Anomalies Detected:**\n`;
      anomalies.forEach((alert) => {
        content += `• **${alert.title}**\n`;
      });
    }

    return {
      content,
      actions: [
        {
          type: 'show_insights',
          label: 'View Full Dashboard',
          config: {},
        },
        {
          type: 'schedule_followup',
          label: 'Schedule Follow-ups',
          config: {},
        },
      ],
      updatedContext: context,
    };
  }

  private async handleSequenceRequest(
    organizationId: string,
    message: string,
    context: any,
  ): Promise<{ content: string; actions: AIAction[]; updatedContext: any }> {
    return {
      content: `I can help you build a sequence. What type of sequence would you like to create?\n\n` +
        `**Options:**\n` +
        `• **Cold Outreach** - 5-step email sequence for new prospects\n` +
        `• **Follow-up** - 3-touch sequence for warm leads\n` +
        `• **Re-engagement** - Win-back sequence for dormant contacts\n` +
        `• **Event Follow-up** - Post-conference/event sequence`,
      actions: [
        {
          type: 'create_sequence',
          label: 'Cold Outreach (5 steps)',
          config: { type: 'cold_outreach', steps: 5 },
        },
        {
          type: 'create_sequence',
          label: 'Follow-up (3 steps)',
          config: { type: 'follow_up', steps: 3 },
        },
        {
          type: 'create_sequence',
          label: 'Re-engagement',
          config: { type: 're_engagement', steps: 4 },
        },
      ],
      updatedContext: context,
    };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private isEmailRequest(message: string): boolean {
    return message.includes('write') && 
      (message.includes('email') || message.includes('message'));
  }

  private isResearchRequest(message: string): boolean {
    return message.includes('research') || 
      message.includes('tell me about') ||
      message.includes('what do you know about');
  }

  private isInsightsRequest(message: string): boolean {
    return message.includes('insights') ||
      message.includes('prioritize') ||
      message.includes('hot leads') ||
      message.includes('what should i focus on');
  }

  private isSequenceRequest(message: string): boolean {
    return message.includes('sequence') ||
      message.includes('campaign') ||
      message.includes('build');
  }

  private extractCompanyName(message: string): string | null {
    const patterns = [
      /at ([A-Z][a-zA-Z\s]+)/,
      /for ([A-Z][a-zA-Z\s]+)/,
      /about ([A-Z][a-zA-Z\s]+)/,
      /research ([A-Z][a-zA-Z\s]+)/,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) return match[1].trim();
    }

    return null;
  }

  private extractContactName(message: string): string | null {
    const pattern = /for ([A-Z][a-z]+)\s+([A-Z][a-z]+)/i;
    const match = message.match(pattern);
    if (match) return `${match[1]} ${match[2]}`;
    return null;
  }

  private extractRole(message: string): string | null {
    const roles = ['cto', 'ceo', 'cfo', 'cmo', 'vp', 'director', 'manager', 'head of'];
    for (const role of roles) {
      if (message.includes(role)) return role;
    }
    return null;
  }
}
