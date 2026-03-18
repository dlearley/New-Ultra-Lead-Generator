import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import { ConfigService } from '@nestjs/config';

export interface SMSMessage {
  to: string;
  body: string;
  from?: string;
  mediaUrls?: string[];
  scheduleAt?: Date;
}

export interface WhatsAppMessage {
  to: string;
  body: string;
  from?: string;
  templateName?: string;
  templateData?: Record<string, string>;
  mediaUrl?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioSid: string;
  private twilioToken: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.twilioSid = this.configService.get('TWILIO_SID') || '';
    this.twilioToken = this.configService.get('TWILIO_TOKEN') || '';
  }

  // ============================================================
  // SMS SENDING
  // ============================================================

  async sendSMS(
    organizationId: string,
    message: SMSMessage,
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // In production, call Twilio API
      // const twilioClient = twilio(this.twilioSid, this.twilioToken);
      // const result = await twilioClient.messages.create({
      //   to: message.to,
      //   from: message.from || this.getDefaultFromNumber(),
      //   body: message.body,
      //   mediaUrl: message.mediaUrls,
      // });

      // Mock implementation
      const messageId = `SM${Date.now()}`;

      this.logger.log(`SMS sent to ${message.to}: ${message.body.substring(0, 50)}...`);

      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      this.logger.error('SMS sending failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendBulkSMS(
    organizationId: string,
    messages: SMSMessage[],
  ): Promise<{
    total: number;
    sent: number;
    failed: number;
    results: Array<{ to: string; success: boolean; messageId?: string; error?: string }>;
  }> {
    const results: Array<{ to: string; success: boolean; messageId?: string; error?: string }> = [];
    let sent = 0;
    let failed = 0;

    for (const message of messages) {
      const result = await this.sendSMS(organizationId, message);
      
      results.push({
        to: message.to,
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      });

      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      // Rate limiting - small delay between messages
      await this.delay(100);
    }

    return {
      total: messages.length,
      sent,
      failed,
      results,
    };
  }

  async scheduleSMS(
    organizationId: string,
    contactId: string,
    message: Omit<SMSMessage, 'to'>,
    scheduledAt: Date,
  ): Promise<any> {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId },
    });

    if (!contact || !contact.phone) {
      throw new Error('Contact or phone number not found');
    }

    return this.prisma.scheduledMessage.create({
      data: {
        organizationId,
        contactId,
        channel: 'sms',
        body: message.body,
        scheduledAt,
        timezone: 'UTC',
        status: 'scheduled',
      },
    });
  }

  // ============================================================
  // SMS TEMPLATES
  // ============================================================

  async createSMSTemplate(
    organizationId: string,
    data: {
      name: string;
      body: string;
      category?: string;
    },
  ): Promise<any> {
    // Extract variables
    const variables = (data.body.match(/{{\s*(\w+)\s*}}/g) || [])
      .map((v) => v.replace(/[{}\s]/g, ''));

    return this.prisma.smsTemplate.create({
      data: {
        organizationId,
        name: data.name,
        body: data.body,
        category: data.category || 'general',
        variables: [...new Set(variables)],
      },
    });
  }

  async getSMSTemplates(
    organizationId: string,
    category?: string,
  ): Promise<any[]> {
    const where: any = { organizationId };
    if (category) {
      where.category = category;
    }

    return this.prisma.smsTemplate.findMany({
      where,
      orderBy: { useCount: 'desc' },
    });
  }

  personalizeSMSTemplate(
    template: string,
    contact: any,
  ): string {
    let personalized = template;
    
    const variables: Record<string, string> = {
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      company: contact.company?.name || '',
      jobTitle: contact.jobTitle || '',
    };

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      personalized = personalized.replace(regex, String(value || ''));
    }

    return personalized;
  }

  // ============================================================
  // SMS COMPLIANCE & OPT-OUT
  // ============================================================

  async isOptedOut(phoneNumber: string): Promise<boolean> {
    // Check if number is on opt-out list
    // In production, query opt-out database
    return false;
  }

  async handleOptOut(phoneNumber: string): Promise<void> {
    // Add to opt-out list
    this.logger.log(`Number ${phoneNumber} opted out`);
  }

  validatePhoneNumber(phone: string): {
    valid: boolean;
    formatted: string;
    error?: string;
  } {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');

    // US validation
    if (cleaned.length === 10) {
      return {
        valid: true,
        formatted: `+1${cleaned}`,
      };
    }

    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return {
        valid: true,
        formatted: `+${cleaned}`,
      };
    }

    // International (basic check)
    if (cleaned.length >= 10) {
      return {
        valid: true,
        formatted: `+${cleaned}`,
      };
    }

    return {
      valid: false,
      formatted: phone,
      error: 'Invalid phone number format',
    };
  }

  // ============================================================
  // WHATSAPP
  // ============================================================

  async sendWhatsApp(
    organizationId: string,
    message: WhatsAppMessage,
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // In production, call WhatsApp Business API or Twilio WhatsApp
      // const result = await twilioClient.messages.create({
      //   to: `whatsapp:${message.to}`,
      //   from: `whatsapp:${message.from || defaultNumber}`,
      //   body: message.body,
      // });

      const messageId = `WA${Date.now()}`;

      this.logger.log(`WhatsApp sent to ${message.to}`);

      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendWhatsAppTemplate(
    organizationId: string,
    to: string,
    templateName: string,
    templateData: Record<string, string>,
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    // WhatsApp Business API requires pre-approved templates
    // This sends a template message

    const templates: Record<string, string> = {
      'appointment_reminder': 'Hello {{1}}, this is a reminder about your appointment on {{2}} at {{3}}.',
      'follow_up': 'Hi {{1}}, following up on our conversation about {{2}}. Let me know if you have any questions.',
      'meeting_confirmation': 'Hi {{1}}, confirming our meeting on {{2}}. Looking forward to speaking with you.',
    };

    let body = templates[templateName] || 'Hello {{1}}';
    
    // Replace template variables
    for (const [key, value] of Object.entries(templateData)) {
      body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return this.sendWhatsApp(organizationId, { to, body });
  }

  // ============================================================
  // TWO-WAY MESSAGING
  // ============================================================

  async handleIncomingSMS(
    organizationId: string,
    from: string,
    body: string,
    messageId: string,
  ): Promise<void> {
    // Find contact by phone
    const contact = await this.prisma.contact.findFirst({
      where: {
        organizationId,
        phone: { contains: from.slice(-10) }, // Match last 10 digits
      },
    });

    if (!contact) {
      this.logger.warn(`Incoming SMS from unknown number: ${from}`);
      return;
    }

    // Check for opt-out keywords
    const optOutKeywords = ['stop', 'unsubscribe', 'cancel', 'quit'];
    if (optOutKeywords.some((kw) => body.toLowerCase().includes(kw))) {
      await this.handleOptOut(from);
      
      // Send confirmation
      await this.sendSMS(organizationId, {
        to: from,
        body: 'You have been unsubscribed. You will no longer receive messages.',
      });
      
      return;
    }

    // Store reply
    // This would create a reply record for tracking
    this.logger.log(`SMS reply from ${contact.firstName} ${contact.lastName}: ${body}`);

    // Could trigger workflow automation here
  }

  // ============================================================
  // SMS SEQUENCES
  // ============================================================

  async createSMSSequence(
    organizationId: string,
    data: {
      name: string;
      steps: Array<{
        delayHours: number;
        templateId: string;
        condition?: string;
      }>;
    },
  ): Promise<any> {
    // Create as outreach sequence
    return this.prisma.outreachSequence.create({
      data: {
        organizationId,
        name: data.name,
        sequenceType: 'sms',
        status: 'active',
      },
    });
  }

  // ============================================================
  // DELIVERY STATUS
  // ============================================================

  async getDeliveryStatus(messageId: string): Promise<{
    status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
    deliveredAt?: Date;
    error?: string;
  }> {
    // In production, query Twilio message status
    return {
      status: 'delivered',
      deliveredAt: new Date(),
    };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getDefaultFromNumber(): string {
    return '+1-800-555-0199';
  }
}
