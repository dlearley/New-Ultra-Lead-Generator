import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import { ConfigService } from '@nestjs/config';

export interface DialerConfig {
  mode: 'manual' | 'power' | 'predictive' | 'preview';
  callsPerHour?: number;
  localPresence: boolean;
  localAreaCodes?: string[];
  recordCalls?: boolean;
  voicemailDrop?: boolean;
}

export interface CallSession {
  id: string;
  campaignId: string;
  agentId: string;
  status: 'idle' | 'dialing' | 'connected' | 'completed';
  currentCall?: Call;
  callsMade: number;
  callsConnected: number;
  startTime: Date;
}

export interface Call {
  id: string;
  contactId: string;
  phoneNumber: string;
  fromNumber: string;
  status: 'pending' | 'dialing' | 'ringing' | 'connected' | 'completed' | 'failed' | 'no_answer' | 'voicemail';
  recordingUrl?: string;
  notes?: string;
  disposition?: string;
  duration?: number;
}

@Injectable()
export class DialerService {
  private readonly logger = new Logger(DialerService.name);
  private activeSessions: Map<string, CallSession> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================================
  // DIALER SESSIONS
  // ============================================================

  async startDialerSession(
    organizationId: string,
    agentId: string,
    campaignId: string,
    config: DialerConfig,
  ): Promise<CallSession> {
    const session: CallSession = {
      id: `session_${Date.now()}_${agentId}`,
      campaignId,
      agentId,
      status: 'idle',
      callsMade: 0,
      callsConnected: 0,
      startTime: new Date(),
    };

    this.activeSessions.set(session.id, session);

    // Log session start
    await this.prisma.integrationActivity.create({
      data: {
        organizationId,
        integrationType: 'dialer',
        action: 'session_started',
        details: { campaignId, mode: config.mode },
        performedById: agentId,
      },
    });

    return session;
  }

  async endDialerSession(sessionId: string): Promise<{
    totalCalls: number;
    connectedCalls: number;
    duration: number;
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const duration = Math.floor(
      (new Date().getTime() - session.startTime.getTime()) / 1000,
    );

    this.activeSessions.delete(sessionId);

    return {
      totalCalls: session.callsMade,
      connectedCalls: session.callsConnected,
      duration,
    };
  }

  // ============================================================
  // LOCAL PRESENCE
  // ============================================================

  async getLocalNumber(
    organizationId: string,
    targetAreaCode: string,
  ): Promise<{ number: string; areaCode: string }> {
    // In production, this would:
    // 1. Check Twilio/Bandwidth for available numbers in area code
    // 2. Purchase/provision number if not exists
    // 3. Return the local number

    // Mock implementation
    const localNumbers: Record<string, string> = {
      '212': '+1-212-555-0100',
      '213': '+1-213-555-0101',
      '312': '+1-312-555-0102',
      '415': '+1-415-555-0103',
      '512': '+1-512-555-0104',
      '617': '+1-617-555-0105',
      '646': '+1-646-555-0106',
      '702': '+1-702-555-0107',
      '713': '+1-713-555-0108',
      '801': '+1-801-555-0109',
    };

    const number = localNumbers[targetAreaCode];
    if (number) {
      return { number, areaCode: targetAreaCode };
    }

    // Fallback to default number
    return { number: '+1-800-555-0199', areaCode: '800' };
  }

  async provisionLocalNumbers(
    organizationId: string,
    areaCodes: string[],
  ): Promise<Array<{ areaCode: string; number: string; status: string }>> {
    const results: Array<{ areaCode: string; number: string; status: string }> = [];

    for (const areaCode of areaCodes) {
      try {
        const result = await this.getLocalNumber(organizationId, areaCode);
        results.push({
          areaCode,
          number: result.number,
          status: 'provisioned',
        });
      } catch (error) {
        results.push({
          areaCode,
          number: '',
          status: 'failed',
        });
      }
    }

    return results;
  }

  // ============================================================
  // CALL DIALING
  // ============================================================

  async dialContact(
    sessionId: string,
    contactId: string,
    config: DialerConfig,
  ): Promise<Call> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Get contact
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId },
    });

    if (!contact || !contact.phone) {
      throw new Error('Contact or phone number not found');
    }

    // Determine from number (local presence)
    let fromNumber = '+1-800-555-0199'; // Default
    
    if (config.localPresence) {
      // Extract area code from contact phone
      const contactAreaCode = contact.phone.match(/\d{3}/)?.[0];
      if (contactAreaCode) {
        const local = await this.getLocalNumber(contact.organizationId, contactAreaCode);
        fromNumber = local.number;
      }
    }

    // Create call record
    const callRecord = await this.prisma.callRecord.create({
      data: {
        organizationId: contact.organizationId,
        campaignId: session.campaignId,
        contactId,
        phoneNumber: contact.phone,
        fromNumber,
        assignedToId: session.agentId,
        status: 'pending',
      },
    });

    const call: Call = {
      id: callRecord.id,
      contactId,
      phoneNumber: contact.phone,
      fromNumber,
      status: 'pending',
    };

    session.currentCall = call;
    session.status = 'dialing';

    // In production, this would trigger actual dial via Twilio/Bandwidth
    this.logger.log(`Dialing ${contact.phone} from ${fromNumber}`);

    return call;
  }

  async connectCall(callId: string): Promise<void> {
    await this.prisma.callRecord.update({
      where: { id: callId },
      data: {
        status: 'connected',
        startedAt: new Date(),
      },
    });

    // Update session
    for (const session of this.activeSessions.values()) {
      if (session.currentCall?.id === callId) {
        session.status = 'connected';
        session.callsConnected++;
        break;
      }
    }
  }

  async endCall(
    callId: string,
    data: {
      duration: number;
      notes?: string;
      disposition?: string;
      recordingUrl?: string;
    },
  ): Promise<void> {
    const outcome = this.mapDispositionToOutcome(data.disposition);

    await this.prisma.callRecord.update({
      where: { id: callId },
      data: {
        status: 'completed',
        endedAt: new Date(),
        duration: data.duration,
        notes: data.notes,
        disposition: data.disposition,
        outcome,
        recordingUrl: data.recordingUrl,
      },
    });

    // Update session
    for (const session of this.activeSessions.values()) {
      if (session.currentCall?.id === callId) {
        session.callsMade++;
        session.status = 'idle';
        session.currentCall = undefined;
        break;
      }
    }
  }

  // ============================================================
  // VOICEMAIL DROP
  // ============================================================

  async dropVoicemail(
    callId: string,
    voicemailTemplateId: string,
  ): Promise<{ success: boolean; url?: string }> {
    // In production, this would:
    // 1. Play pre-recorded voicemail
    // 2. Detect voicemail beep
    // 3. Drop the message
    // 4. Record the drop

    const templates: Record<string, string> = {
      'intro': 'Hi, this is {{name}} from {{company}}. I\'m calling about helping with your lead generation. Give me a call back when you have a moment.',
      'follow_up': 'Hi {{name}}, following up on my email. Would love to connect about {{company}}\'s growth. Call me back when you can.',
      'meeting': 'Hi {{name}}, {{name}} from {{company}}. I\'d love to show you how we can help {{theirCompany}} with lead generation. Give me a call.',
    };

    const message = templates[voicemailTemplateId] || templates['intro'];

    await this.prisma.callRecord.update({
      where: { id: callId },
      data: {
        voicemailLeft: true,
        voicemailUrl: `https://recordings.example.com/${callId}.mp3`,
        status: 'completed',
      },
    });

    return {
      success: true,
      url: `https://recordings.example.com/${callId}.mp3`,
    };
  }

  async uploadVoicemailRecording(
    organizationId: string,
    name: string,
    audioData: Buffer,
  ): Promise<{ id: string; url: string }> {
    // In production, upload to S3/storage
    const id = `vm_${Date.now()}`;
    return {
      id,
      url: `https://recordings.example.com/${id}.mp3`,
    };
  }

  // ============================================================
  // CALL RECORDING
  // ============================================================

  async startRecording(callId: string): Promise<{ recordingId: string }> {
    // In production, start Twilio/Bandwidth recording
    const recordingId = `rec_${callId}_${Date.now()}`;
    
    this.logger.log(`Started recording for call ${callId}`);
    
    return { recordingId };
  }

  async stopRecording(callId: string, recordingId: string): Promise<{ url: string }> {
    // In production, stop recording and get URL
    const url = `https://recordings.example.com/${recordingId}.mp3`;
    
    await this.prisma.callRecord.update({
      where: { id: callId },
      data: { recordingUrl: url },
    });

    return { url };
  }

  async getRecordings(
    organizationId: string,
    filters?: {
      agentId?: string;
      contactId?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<any[]> {
    return this.prisma.callRecord.findMany({
      where: {
        organizationId,
        recordingUrl: { not: null },
        ...(filters?.agentId && { assignedToId: filters.agentId }),
        ...(filters?.contactId && { contactId: filters.contactId }),
        ...(filters?.startDate && filters?.endDate && {
          createdAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        contact: {
          select: {
            firstName: true,
            lastName: true,
            company: { select: { name: true } },
          },
        },
      },
    });
  }

  // ============================================================
  // CALL QUEUE / POWER DIALER
  // ============================================================

  async buildCallQueue(
    campaignId: string,
    filters?: {
      priority?: 'hot' | 'warm' | 'all';
      limit?: number;
    },
  ): Promise<any[]> {
    const where: any = {
      campaignId,
      status: 'pending',
    };

    // Get contacts enrolled in campaign
    const calls = await this.prisma.callRecord.findMany({
      where,
      take: filters?.limit || 50,
      orderBy: { createdAt: 'asc' },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            company: { select: { name: true } },
          },
        },
      },
    });

    return calls;
  }

  async getNextCall(sessionId: string): Promise<any | null> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return null;
    }

    const queue = await this.buildCallQueue(session.campaignId, { limit: 1 });
    return queue[0] || null;
  }

  // ============================================================
  // CALL ANALYTICS
  // ============================================================

  async getCallStats(
    organizationId: string,
    campaignId?: string,
    period: 'today' | 'week' | 'month' = 'today',
  ): Promise<{
    totalCalls: number;
    connected: number;
    voicemails: number;
    noAnswers: number;
    avgDuration: number;
    connectionRate: number;
  }> {
    const dateFilter = this.getDateFilter(period);

    const stats = await this.prisma.callRecord.aggregate({
      where: {
        organizationId,
        ...(campaignId && { campaignId }),
        createdAt: dateFilter,
      },
      _count: { _all: true },
      _avg: { duration: true },
    });

    const connected = await this.prisma.callRecord.count({
      where: {
        organizationId,
        ...(campaignId && { campaignId }),
        createdAt: dateFilter,
        status: 'connected',
      },
    });

    const voicemails = await this.prisma.callRecord.count({
      where: {
        organizationId,
        ...(campaignId && { campaignId }),
        createdAt: dateFilter,
        voicemailLeft: true,
      },
    });

    const total = stats._count._all;
    
    return {
      totalCalls: total,
      connected,
      voicemails,
      noAnswers: total - connected - voicemails,
      avgDuration: Math.round(stats._avg.duration || 0),
      connectionRate: total > 0 ? Math.round((connected / total) * 100) : 0,
    };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private mapDispositionToOutcome(disposition?: string): string {
    const mapping: Record<string, string> = {
      'appointment_set': 'converted',
      'qualified': 'qualified',
      'follow_up': 'nurture',
      'not_interested': 'disqualified',
      'wrong_number': 'invalid',
      'callback': 'callback',
      'no_answer': 'no_answer',
      'voicemail': 'voicemail',
    };

    return mapping[disposition || ''] || 'unknown';
  }

  private getDateFilter(period: string): { gte: Date } {
    const now = new Date();
    const start = new Date(now);

    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
    }

    return { gte: start };
  }
}
