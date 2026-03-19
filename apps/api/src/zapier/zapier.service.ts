import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import * as crypto from 'crypto';

export interface ZapierTrigger {
  id: string;
  name: string;
  description: string;
  event: string;
  sampleData: any;
}

export interface ZapierAction {
  id: string;
  name: string;
  description: string;
  fields: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
    helpText?: string;
  }>;
}

@Injectable()
export class ZapierService {
  private readonly logger = new Logger(ZapierService.name);

  // Predefined triggers
  private readonly triggers: ZapierTrigger[] = [
    {
      id: 'new_lead',
      name: 'New Lead',
      description: 'Triggers when a new lead is created',
      event: 'contact.created',
      sampleData: {
        id: 'contact_123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        company: 'Acme Inc',
        title: 'CEO',
        source: 'website',
        createdAt: '2024-01-15T10:30:00Z',
      },
    },
    {
      id: 'lead_qualified',
      name: 'Lead Qualified',
      description: 'Triggers when a lead score reaches threshold',
      event: 'contact.qualified',
      sampleData: {
        id: 'contact_123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        leadScore: 85,
        leadStatus: 'qualified',
        qualifiedAt: '2024-01-15T10:30:00Z',
      },
    },
    {
      id: 'new_deal',
      name: 'New Deal Created',
      description: 'Triggers when a new deal is created',
      event: 'deal.created',
      sampleData: {
        id: 'deal_456',
        name: 'Enterprise License',
        value: 50000,
        stage: 'proposal',
        company: 'Acme Inc',
        contactEmail: 'john@example.com',
        createdAt: '2024-01-15T10:30:00Z',
      },
    },
    {
      id: 'deal_won',
      name: 'Deal Won',
      description: 'Triggers when a deal is closed won',
      event: 'deal.won',
      sampleData: {
        id: 'deal_456',
        name: 'Enterprise License',
        value: 50000,
        stage: 'closed_won',
        company: 'Acme Inc',
        contactEmail: 'john@example.com',
        closedAt: '2024-01-15T10:30:00Z',
      },
    },
    {
      id: 'email_opened',
      name: 'Email Opened',
      description: 'Triggers when a lead opens an email',
      event: 'email.opened',
      sampleData: {
        emailId: 'email_789',
        contactId: 'contact_123',
        contactEmail: 'john@example.com',
        subject: 'Welcome to Our Platform',
        openedAt: '2024-01-15T10:30:00Z',
      },
    },
    {
      id: 'meeting_booked',
      name: 'Meeting Booked',
      description: 'Triggers when a meeting is scheduled',
      event: 'meeting.booked',
      sampleData: {
        bookingId: 'booking_012',
        contactId: 'contact_123',
        contactEmail: 'john@example.com',
        title: 'Product Demo',
        startTime: '2024-01-20T14:00:00Z',
        endTime: '2024-01-20T15:00:00Z',
        meetingLink: 'https://zoom.us/j/123456789',
      },
    },
    {
      id: 'sequence_completed',
      name: 'Sequence Completed',
      description: 'Triggers when a contact completes a sequence',
      event: 'sequence.completed',
      sampleData: {
        enrollmentId: 'enroll_345',
        contactId: 'contact_123',
        contactEmail: 'john@example.com',
        sequenceName: 'Welcome Sequence',
        completedAt: '2024-01-15T10:30:00Z',
      },
    },
  ];

  // Predefined actions
  private readonly actions: ZapierAction[] = [
    {
      id: 'create_lead',
      name: 'Create Lead',
      description: 'Creates a new lead in Ultra Lead Generator',
      fields: [
        { key: 'firstName', label: 'First Name', type: 'string', required: true },
        { key: 'lastName', label: 'Last Name', type: 'string', required: true },
        { key: 'email', label: 'Email', type: 'string', required: true },
        { key: 'phone', label: 'Phone', type: 'string', required: false },
        { key: 'company', label: 'Company', type: 'string', required: false },
        { key: 'title', label: 'Job Title', type: 'string', required: false },
        { key: 'source', label: 'Source', type: 'string', required: false, helpText: 'e.g., website, referral, zapier' },
      ],
    },
    {
      id: 'create_deal',
      name: 'Create Deal',
      description: 'Creates a new deal for a contact',
      fields: [
        { key: 'contactId', label: 'Contact ID', type: 'string', required: true },
        { key: 'name', label: 'Deal Name', type: 'string', required: true },
        { key: 'value', label: 'Deal Value', type: 'number', required: false },
        { key: 'stage', label: 'Stage', type: 'string', required: false, helpText: 'e.g., prospecting, proposal, negotiation' },
      ],
    },
    {
      id: 'enroll_in_sequence',
      name: 'Enroll in Sequence',
      description: 'Enroll a contact in an outreach sequence',
      fields: [
        { key: 'contactId', label: 'Contact ID', type: 'string', required: true },
        { key: 'sequenceId', label: 'Sequence ID', type: 'string', required: true },
      ],
    },
    {
      id: 'add_note',
      name: 'Add Note',
      description: 'Adds a note to a contact',
      fields: [
        { key: 'contactId', label: 'Contact ID', type: 'string', required: true },
        { key: 'content', label: 'Note Content', type: 'text', required: true },
      ],
    },
    {
      id: 'update_lead_score',
      name: 'Update Lead Score',
      description: 'Manually update a lead score',
      fields: [
        { key: 'contactId', label: 'Contact ID', type: 'string', required: true },
        { key: 'score', label: 'New Score', type: 'number', required: true, helpText: '0-100' },
      ],
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // ZAPIER CONNECTION MANAGEMENT
  // ============================================================

  async createConnection(
    organizationId: string,
    data: {
      zapId: string;
      triggerId?: string;
      actionId?: string;
      webhookUrl: string;
      isActive: boolean;
    },
  ) {
    // Generate API key for this connection
    const apiKey = this.generateApiKey();

    return this.prisma.zapierConnection.create({
      data: {
        organizationId,
        apiKey,
        zapId: data.zapId,
        triggerId: data.triggerId,
        actionId: data.actionId,
        webhookUrl: data.webhookUrl,
        isActive: data.isActive,
      },
    });
  }

  async deactivateConnection(organizationId: string, connectionId: string): Promise<void> {
    await this.prisma.zapierConnection.updateMany({
      where: {
        id: connectionId,
        organizationId,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  async getConnections(organizationId: string) {
    return this.prisma.zapierConnection.findMany({
      where: {
        organizationId,
        isActive: true,
      },
    });
  }

  async validateApiKey(apiKey: string): Promise<{
    valid: boolean;
    organizationId?: string;
  }> {
    const connection = await this.prisma.zapierConnection.findUnique({
      where: { apiKey },
    });

    if (!connection || !connection.isActive) {
      return { valid: false };
    }

    return { valid: true, organizationId: connection.organizationId };
  }

  // ============================================================
  // TRIGGERS (Outgoing to Zapier)
  // ============================================================

  getTriggers(): ZapierTrigger[] {
    return this.triggers;
  }

  getTrigger(triggerId: string): ZapierTrigger | undefined {
    return this.triggers.find((t) => t.id === triggerId);
  }

  async triggerEvent(
    organizationId: string,
    event: string,
    data: any,
  ): Promise<void> {
    // Find all active connections for this trigger
    const connections = await this.prisma.zapierConnection.findMany({
      where: {
        organizationId,
        isActive: true,
        triggerId: { not: null },
      },
    });

    // Filter connections that match this event
    const matchingConnections = connections.filter((conn) => {
      const trigger = this.getTrigger(conn.triggerId || '');
      return trigger?.event === event;
    });

    if (matchingConnections.length === 0) {
      return;
    }

    // Send webhook to each matching connection
    await Promise.all(
      matchingConnections.map((conn) => this.sendWebhook(conn.webhookUrl, data)),
    );
  }

  // ============================================================
  // ACTIONS (Incoming from Zapier)
  // ============================================================

  getActions(): ZapierAction[] {
    return this.actions;
  }

  getAction(actionId: string): ZapierAction | undefined {
    return this.actions.find((a) => a.id === actionId);
  }

  async executeAction(
    organizationId: string,
    actionId: string,
    data: any,
  ): Promise<any> {
    switch (actionId) {
      case 'create_lead':
        return this.createLead(organizationId, data);
      case 'create_deal':
        return this.createDeal(organizationId, data);
      case 'enroll_in_sequence':
        return this.enrollInSequence(organizationId, data);
      case 'add_note':
        return this.addNote(organizationId, data);
      case 'update_lead_score':
        return this.updateLeadScore(organizationId, data);
      default:
        throw new Error(`Unknown action: ${actionId}`);
    }
  }

  private async createLead(organizationId: string, data: any) {
    return this.prisma.contact.create({
      data: {
        organizationId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        title: data.title,
        source: data.source || 'zapier',
        status: 'new',
      },
    });
  }

  private async createDeal(organizationId: string, data: any) {
    return this.prisma.deal.create({
      data: {
        organizationId,
        contactId: data.contactId,
        name: data.name,
        value: data.value ? parseFloat(data.value) : null,
        stage: data.stage || 'prospecting',
        status: 'open',
      },
    });
  }

  private async enrollInSequence(organizationId: string, data: any) {
    return this.prisma.sequenceEnrollment.create({
      data: {
        organizationId,
        contactId: data.contactId,
        sequenceId: data.sequenceId,
        status: 'active',
        enrolledAt: new Date(),
      },
    });
  }

  private async addNote(organizationId: string, data: any) {
    return this.prisma.contactActivity.create({
      data: {
        organizationId,
        contactId: data.contactId,
        type: 'note',
        content: data.content,
      },
    });
  }

  private async updateLeadScore(organizationId: string, data: any) {
    return this.prisma.leadScore.create({
      data: {
        organizationId,
        contactId: data.contactId,
        totalScore: parseInt(data.score),
        categoryScores: {},
        calculatedAt: new Date(),
      },
    });
  }

  // ============================================================
  // WEBHOOK HELPERS
  // ============================================================

  private async sendWebhook(url: string, data: any): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'UltraLead-Zapier/1.0',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to send Zapier webhook: ${error.message}`);
    }
  }

  private generateApiKey(): string {
    return `zap_${crypto.randomBytes(32).toString('hex')}`;
  }
}
