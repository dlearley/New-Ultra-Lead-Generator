import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface SequenceStep {
  name: string;
  channel: 'email' | 'linkedin' | 'phone' | 'sms' | 'whatsapp' | 'task';
  templateId?: string;
  subject?: string;
  body?: string;
  delayDays: number;
  delayHours: number;
  sendTime?: string;
  useAI: boolean;
  condition?: any;
}

export interface SequenceData {
  name: string;
  description?: string;
  sequenceType: 'email' | 'linkedin' | 'mixed' | 'sms' | 'whatsapp';
  steps: SequenceStep[];
  targetCriteria?: any;
  scheduleSettings?: any;
  exitConditions?: any;
}

@Injectable()
export class SequenceService {
  private readonly logger = new Logger(SequenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // SEQUENCE CRUD
  // ============================================================

  async createSequence(
    organizationId: string,
    data: SequenceData,
  ): Promise<any> {
    const sequence = await this.prisma.outreachSequence.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        sequenceType: data.sequenceType,
        targetCriteria: data.targetCriteria || {},
        scheduleSettings: data.scheduleSettings || this.getDefaultScheduleSettings(),
        exitConditions: data.exitConditions || this.getDefaultExitConditions(),
      },
    });

    // Create steps
    for (let i = 0; i < data.steps.length; i++) {
      const step = data.steps[i];
      await this.prisma.outreachStep.create({
        data: {
          sequenceId: sequence.id,
          name: step.name,
          stepNumber: i + 1,
          channel: step.channel,
          templateId: step.templateId,
          subject: step.subject,
          body: step.body,
          useAI: step.useAI,
          aiPrompt: step.useAI ? step.body : null,
          delayDays: step.delayDays,
          delayHours: step.delayHours,
          sendTime: step.sendTime,
          condition: step.condition,
        },
      });
    }

    return this.getSequence(organizationId, sequence.id);
  }

  async getSequence(organizationId: string, sequenceId: string): Promise<any> {
    return this.prisma.outreachSequence.findFirst({
      where: { id: sequenceId, organizationId },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
          include: { template: true },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });
  }

  async getSequences(organizationId: string, status?: string): Promise<any[]> {
    const where: any = { organizationId };
    if (status) {
      where.status = status;
    }

    return this.prisma.outreachSequence.findMany({
      where,
      include: {
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateSequence(
    organizationId: string,
    sequenceId: string,
    data: Partial<SequenceData>,
  ): Promise<any> {
    // Update sequence
    await this.prisma.outreachSequence.update({
      where: { id: sequenceId, organizationId },
      data: {
        name: data.name,
        description: data.description,
        targetCriteria: data.targetCriteria,
        scheduleSettings: data.scheduleSettings,
        exitConditions: data.exitConditions,
      },
    });

    // If steps provided, update them
    if (data.steps) {
      // Delete existing steps
      await this.prisma.outreachStep.deleteMany({
        where: { sequenceId },
      });

      // Create new steps
      for (let i = 0; i < data.steps.length; i++) {
        const step = data.steps[i];
        await this.prisma.outreachStep.create({
          data: {
            sequenceId,
            name: step.name,
            stepNumber: i + 1,
            channel: step.channel,
            templateId: step.templateId,
            subject: step.subject,
            body: step.body,
            useAI: step.useAI,
            delayDays: step.delayDays,
            delayHours: step.delayHours,
            sendTime: step.sendTime,
            condition: step.condition,
          },
        });
      }
    }

    return this.getSequence(organizationId, sequenceId);
  }

  async deleteSequence(
    organizationId: string,
    sequenceId: string,
  ): Promise<void> {
    await this.prisma.outreachSequence.delete({
      where: { id: sequenceId, organizationId },
    });
  }

  async activateSequence(
    organizationId: string,
    sequenceId: string,
  ): Promise<any> {
    return this.prisma.outreachSequence.update({
      where: { id: sequenceId, organizationId },
      data: { status: 'active' },
    });
  }

  async pauseSequence(
    organizationId: string,
    sequenceId: string,
  ): Promise<any> {
    return this.prisma.outreachSequence.update({
      where: { id: sequenceId, organizationId },
      data: { status: 'paused' },
    });
  }

  // ============================================================
  // ENROLLMENT
  // ============================================================

  async enrollContacts(
    organizationId: string,
    sequenceId: string,
    contactIds: string[],
    assignedToId?: string,
  ): Promise<{ enrolled: number; alreadyEnrolled: number; errors: number }> {
    const sequence = await this.getSequence(organizationId, sequenceId);
    
    if (!sequence) {
      throw new Error('Sequence not found');
    }

    let enrolled = 0;
    let alreadyEnrolled = 0;
    let errors = 0;

    for (const contactId of contactIds) {
      try {
        // Check if already enrolled
        const existing = await this.prisma.sequenceEnrollment.findUnique({
          where: {
            sequenceId_contactId: {
              sequenceId,
              contactId,
            },
          },
        });

        if (existing) {
          alreadyEnrolled++;
          continue;
        }

        // Create enrollment
        const enrollment = await this.prisma.sequenceEnrollment.create({
          data: {
            organizationId,
            sequenceId,
            contactId,
            assignedToId,
            status: 'active',
          },
        });

        // Schedule first step
        await this.scheduleNextStep(enrollment.id);
        
        enrolled++;
      } catch (error) {
        this.logger.error(`Failed to enroll contact ${contactId}:`, error);
        errors++;
      }
    }

    // Update sequence stats
    await this.prisma.outreachSequence.update({
      where: { id: sequenceId },
      data: { totalEnrolled: { increment: enrolled } },
    });

    return { enrolled, alreadyEnrolled, errors };
  }

  async unenrollContact(
    organizationId: string,
    sequenceId: string,
    contactId: string,
    reason?: string,
  ): Promise<void> {
    await this.prisma.sequenceEnrollment.updateMany({
      where: {
        sequenceId,
        contactId,
        organizationId,
      },
      data: {
        status: 'exited',
        exitReason: reason || 'manual',
      },
    });
  }

  // ============================================================
  // STEP SCHEDULING
  // ============================================================

  async scheduleNextStep(enrollmentId: string): Promise<void> {
    const enrollment = await this.prisma.sequenceEnrollment.findFirst({
      where: { id: enrollmentId },
      include: {
        sequence: { include: { steps: true } },
        contact: true,
      },
    });

    if (!enrollment || enrollment.status !== 'active') {
      return;
    }

    const { sequence, currentStepNumber } = enrollment;
    const nextStepNumber = currentStepNumber + 1;
    const nextStep = sequence.steps.find((s: any) => s.stepNumber === nextStepNumber);

    if (!nextStep) {
      // Sequence completed
      await this.prisma.sequenceEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });
      
      await this.prisma.outreachSequence.update({
        where: { id: sequence.id },
        data: { totalCompleted: { increment: 1 } },
      });
      
      return;
    }

    // Calculate send time
    const scheduledAt = this.calculateSendTime(
      enrollment,
      nextStep,
      sequence.scheduleSettings,
    );

    // Create step execution
    await this.prisma.stepExecution.create({
      data: {
        organizationId: enrollment.organizationId,
        enrollmentId,
        stepId: nextStep.id,
        status: 'scheduled',
        scheduledAt,
      },
    });

    // Update enrollment
    await this.prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        currentStepId: nextStep.id,
        currentStepNumber: nextStepNumber,
        nextStepAt: scheduledAt,
      },
    });
  }

  private calculateSendTime(
    enrollment: any,
    step: any,
    scheduleSettings: any,
  ): Date {
    const now = new Date();
    const settings = scheduleSettings || this.getDefaultScheduleSettings();
    
    // Base delay
    let sendTime = new Date(now);
    sendTime.setDate(sendTime.getDate() + (step.delayDays || 0));
    sendTime.setHours(sendTime.getHours() + (step.delayHours || 0));
    
    // Apply send time preference
    if (step.sendTime) {
      const [hours, minutes] = step.sendTime.split(':').map(Number);
      sendTime.setHours(hours, minutes, 0, 0);
    }
    
    // Ensure within business hours
    if (settings.businessHours) {
      const dayOfWeek = sendTime.getDay();
      const daysOfWeek = settings.daysOfWeek || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      // Skip to next business day if needed
      let attempts = 0;
      while (!daysOfWeek.includes(dayNames[sendTime.getDay()]) && attempts < 7) {
        sendTime.setDate(sendTime.getDate() + 1);
        attempts++;
      }
      
      // Adjust to business hours
      const [startHour] = (settings.businessHours.start || '09:00').split(':').map(Number);
      const [endHour] = (settings.businessHours.end || '17:00').split(':').map(Number);
      
      if (sendTime.getHours() < startHour) {
        sendTime.setHours(startHour, 0, 0, 0);
      } else if (sendTime.getHours() >= endHour) {
        sendTime.setDate(sendTime.getDate() + 1);
        sendTime.setHours(startHour, 0, 0, 0);
      }
    }
    
    return sendTime;
  }

  // ============================================================
  // TEMPLATES
  // ============================================================

  async createTemplate(
    organizationId: string,
    data: {
      name: string;
      description?: string;
      channel: string;
      subject?: string;
      body: string;
      category?: string;
      isAIGenerated?: boolean;
    },
  ): Promise<any> {
    // Extract variables from body
    const variables = this.extractVariables(data.body);
    
    return this.prisma.messageTemplate.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        channel: data.channel,
        subject: data.subject,
        body: data.body,
        category: data.category || 'general',
        isAIGenerated: data.isAIGenerated || false,
        variables,
      },
    });
  }

  async getTemplates(
    organizationId: string,
    options?: { channel?: string; category?: string },
  ): Promise<any[]> {
    const where: any = { organizationId };
    if (options?.channel) where.channel = options.channel;
    if (options?.category) where.category = options.category;

    return this.prisma.messageTemplate.findMany({
      where,
      orderBy: { useCount: 'desc' },
    });
  }

  // ============================================================
  // PERSONALIZATION
  // ============================================================

  personalizeContent(
    content: string,
    contact: any,
    company?: any,
  ): string {
    let personalized = content;
    
    const variables: Record<string, any> = {
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      fullName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
      email: contact.email || '',
      jobTitle: contact.jobTitle || '',
      department: contact.department || '',
      phone: contact.phone || '',
      company: company?.name || contact.company?.name || '',
      companyIndustry: company?.industry || contact.company?.industry || '',
      companySize: company?.employeeCount || contact.company?.employeeCount || '',
      companyWebsite: company?.website || contact.company?.website || '',
    };

    // Replace {{variable}} patterns
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      personalized = personalized.replace(regex, String(value || ''));
    }

    return personalized;
  }

  // ============================================================
  // STATS
  // ============================================================

  async getSequenceStats(organizationId: string, sequenceId: string): Promise<any> {
    const enrollments = await this.prisma.sequenceEnrollment.groupBy({
      by: ['status'],
      where: { sequenceId, organizationId },
      _count: { status: true },
    });

    const executions = await this.prisma.stepExecution.aggregate({
      where: {
        enrollment: { sequenceId, organizationId },
      },
      _count: { _all: true },
      _sum: { openCount: true, clickCount: true },
    });

    return {
      enrollments: {
        active: enrollments.find((e) => e.status === 'active')?._count.status || 0,
        completed: enrollments.find((e) => e.status === 'completed')?._count.status || 0,
        exited: enrollments.find((e) => e.status === 'exited')?._count.status || 0,
        total: enrollments.reduce((sum, e) => sum + e._count.status, 0),
      },
      messages: {
        sent: executions._count._all,
        opens: executions._sum.openCount || 0,
        clicks: executions._sum.clickCount || 0,
      },
    };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private extractVariables(content: string): string[] {
    const matches = content.match(/{{\s*(\w+)\s*}}/g) || [];
    return [...new Set(matches.map((m) => m.replace(/[{}\s]/g, '')))];
  }

  private getDefaultScheduleSettings(): any {
    return {
      timezone: 'America/New_York',
      businessHours: { start: '09:00', end: '17:00' },
      daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      skipHolidays: true,
      optimalSendTime: true,
    };
  }

  private getDefaultExitConditions(): any {
    return [
      { type: 'replied', action: 'exit' },
      { type: 'booked_meeting', action: 'exit' },
      { type: 'opted_out', action: 'exit' },
    ];
  }
}
