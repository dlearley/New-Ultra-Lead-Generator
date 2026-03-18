import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import { AIEmailWriterService } from '../ai/ai-email-writer.service';

export interface LinkedInMessageRequest {
  contactId: string;
  connectionDegree: 1 | 2 | 3; // 1st, 2nd, 3rd degree
  messageType: 'connection_request' | 'message' | 'inmail';
  purpose: 'intro' | 'follow_up' | 'value_share' | 'meeting_request';
  context?: {
    mutualConnections?: string[];
    recentPost?: string;
    jobChange?: boolean;
    companyNews?: string;
  };
}

export interface LinkedInMessage {
  subject?: string;
  body: string;
  personalizationTips: string[];
  recommendedFollowUp?: string;
}

@Injectable()
export class LinkedInService {
  private readonly logger = new Logger(LinkedInService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiWriter: AIEmailWriterService,
  ) {}

  // ============================================================
  // LINKEDIN MESSAGE GENERATION
  // ============================================================

  async generateMessage(request: LinkedInMessageRequest): Promise<LinkedInMessage> {
    const { connectionDegree, messageType, purpose, context } = request;
    
    // Get contact data
    const contact = await this.prisma.contact.findFirst({
      where: { id: request.contactId },
      include: { company: true },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Generate message based on connection degree
    switch (connectionDegree) {
      case 1:
        return this.generate1stDegreeMessage(contact, purpose, context);
      case 2:
        return this.generate2ndDegreeMessage(contact, purpose, context);
      case 3:
        return this.generateInMailMessage(contact, purpose, context);
      default:
        throw new Error('Invalid connection degree');
    }
  }

  private async generate1stDegreeMessage(
    contact: any,
    purpose: string,
    context?: any,
  ): Promise<LinkedInMessage> {
    const firstName = contact.firstName;
    const company = contact.company?.name;
    
    const templates: Record<string, string> = {
      intro: `Hi ${firstName},

Hope you're doing well! I came across your profile and was impressed by your experience at ${company}.

I'd love to connect and learn more about your approach to {{topic}}.

Best,`,

      follow_up: `Hi ${firstName},

Following up on my previous message. Would love to connect and share some insights about {{topic}} that might be relevant to ${company}.

Let me know if you're open to a brief conversation.

Best,`,

      value_share: `Hi ${firstName},

I saw your recent post about {{topic}} - great insights!

I thought you might find this article relevant: {{link}}

Would love to hear your thoughts.

Best,`,

      meeting_request: `Hi ${firstName},

I've been following your work at ${company} and am impressed by your growth.

We help companies like yours streamline {{process}} and I'd love to show you how.

Would you be open to a brief call next week?

Best,`,
    };

    return {
      body: templates[purpose] || templates.intro,
      personalizationTips: [
        'Reference their recent LinkedIn activity',
        'Mention specific achievements from their profile',
        'Keep it under 300 characters for mobile',
      ],
      recommendedFollowUp: purpose === 'intro' 
        ? 'Follow up in 3-5 days if no response' 
        : undefined,
    };
  }

  private async generate2ndDegreeMessage(
    contact: any,
    purpose: string,
    context?: any,
  ): Promise<LinkedInMessage> {
    const firstName = contact.firstName;
    const mutualConnections = context?.mutualConnections || [];
    
    const mutualRef = mutualConnections.length > 0 
      ? `I noticed we're both connected to ${mutualConnections[0]}.` 
      : '';
    
    const templates: Record<string, string> = {
      intro: `Hi ${firstName},

${mutualRef} I came across your profile and was impressed by your work.

I'd love to connect and learn more about your experience at ${contact.company?.name}.

Best,`,

      value_share: `Hi ${firstName},

${mutualRef} I saw your recent post about {{topic}} and found it insightful.

Thought you might find this relevant: {{value}}

Best,`,

      meeting_request: `Hi ${firstName},

${mutualRef} I've been following ${contact.company?.name}'s growth and am impressed.

We help similar companies with {{solution}}. Worth a brief conversation?

Best,`,
    };

    return {
      body: templates[purpose] || templates.intro,
      personalizationTips: [
        'Reference mutual connections',
        'Keep connection request under 300 characters',
        'Be specific about why you want to connect',
      ],
    };
  }

  private async generateInMailMessage(
    contact: any,
    purpose: string,
    context?: any,
  ): Promise<LinkedInMessage> {
    const firstName = contact.firstName;
    
    const subjectTemplates: Record<string, string> = {
      intro: `Quick question about ${contact.company?.name || 'your company'}`,
      value_share: `Idea for ${contact.company?.name || 'your company'}`,
      meeting_request: `15 minutes to discuss ${contact.company?.name || 'your company'}?`,
    };

    const bodyTemplates: Record<string, string> = {
      intro: `Hi ${firstName},

I'm reaching out because we've helped companies similar to ${contact.company?.name || 'yours'} achieve significant growth in {{area}}.

Given your role as ${contact.jobTitle || 'a leader'} there, I thought this might be relevant.

Would you be open to a brief conversation?

Best regards,`,

      value_share: `Hi ${firstName},

I wanted to share an insight that's helped ${contact.company?.name || 'companies like yours'} improve {{metric}} by 40%.

{{Value proposition}}

Worth exploring how this might apply to ${contact.company?.name || 'your situation'}?

Best,`,

      meeting_request: `Hi ${firstName},

I've been researching ${contact.company?.name || 'your company'} and am impressed by {{specific achievement}}.

We specialize in helping {{industry}} companies like yours {{solution}}.

Would you have 15 minutes for a quick call next week to explore if there's a fit?

Best regards,`,
    };

    return {
      subject: subjectTemplates[purpose] || subjectTemplates.intro,
      body: bodyTemplates[purpose] || bodyTemplates.intro,
      personalizationTips: [
        'Research their recent company news',
        'Reference specific achievements',
        'Keep subject under 60 characters',
        'Body should be 150 words max',
      ],
    };
  }

  // ============================================================
  // LINKEDIN SEQUENCE STEPS
  // ============================================================

  async getLinkedInSequenceSteps(): Promise<Array<{
    step: number;
    action: string;
    delayDays: number;
    messageType: string;
  }>> {
    return [
      { step: 1, action: 'Send connection request', delayDays: 0, messageType: 'connection_request' },
      { step: 2, action: 'Wait for connection acceptance', delayDays: 3, messageType: 'wait' },
      { step: 3, action: 'Send value-driven message', delayDays: 1, messageType: 'message' },
      { step: 4, action: 'Follow up with soft pitch', delayDays: 4, messageType: 'message' },
      { step: 5, action: 'Final follow up or breakup', delayDays: 7, messageType: 'message' },
    ];
  }

  // ============================================================
  // PROFILE ENRICHMENT
  // ============================================================

  async enrichFromLinkedIn(contactId: string): Promise<{
    enriched: boolean;
    data?: {
      headline?: string;
      summary?: string;
      currentPosition?: string;
      company?: string;
      location?: string;
      connections?: number;
      recentActivity?: string[];
      skills?: string[];
    };
  }> {
    // In production, this would call LinkedIn API or scraping service
    // For now, return mock enrichment
    
    return {
      enriched: true,
      data: {
        headline: 'Sales Leader | Helping companies scale',
        summary: 'Experienced sales professional with 10+ years...',
        currentPosition: 'VP of Sales',
        connections: 500,
        recentActivity: ['Posted about sales automation', 'Shared industry article'],
        skills: ['Sales Leadership', 'Business Development', 'Team Management'],
      },
    };
  }

  // ============================================================
  // CONNECTION TRACKING
  // ============================================================

  async trackConnectionStatus(
    contactId: string,
  ): Promise<{
    status: 'not_connected' | 'pending' | 'connected';
    connectedAt?: Date;
    messagingEnabled: boolean;
  }> {
    // In production, check actual LinkedIn connection status
    return {
      status: 'not_connected',
      messagingEnabled: false,
    };
  }

  // ============================================================
  // LINKEDIN VOICEMAIL (VOICE NOTES)
  // ============================================================

  async generateVoiceNoteScript(
    contactId: string,
    purpose: string,
  ): Promise<{
    script: string;
    duration: string;
    tips: string[];
  }> {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId },
    });

    const scripts: Record<string, string> = {
      intro: `Hi ${contact?.firstName}, this is [your name] from [company]. I came across your profile and was impressed by your work at ${contact?.company?.name || 'your company'}. I'd love to connect and learn more about what you're working on. Give me a call back when you have a moment.`,
      
      follow_up: `Hi ${contact?.firstName}, [your name] here following up on my LinkedIn message. I know you're busy, but I'd love to quickly share how we helped a similar company achieve {{result}}. Worth a 5-minute conversation?`,
      
      meeting_request: `Hi ${contact?.firstName}, [your name] from [company]. I'm calling because we've been helping ${contact?.company?.name || 'companies like yours'} with {{solution}} and I thought there might be a fit. Would you have 15 minutes next week for a quick call?`,
    };

    return {
      script: scripts[purpose] || scripts.intro,
      duration: '30-45 seconds',
      tips: [
        'Speak clearly and at moderate pace',
        'Smile while recording - it comes through',
        'Keep it under 60 seconds',
        'Include a clear call-to-action',
      ],
    };
  }
}
