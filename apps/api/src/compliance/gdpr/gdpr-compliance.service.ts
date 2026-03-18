import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface DeletionRequest {
  id: string;
  subjectType: 'contact' | 'company' | 'user' | 'all_data';
  subjectId?: string;
  subjectEmail?: string;
  requestType: 'gdpr_deletion' | 'ccpa_deletion' | 'data_cleanup' | 'right_to_be_forgotten';
  reason?: string;
  scope: {
    contacts: boolean;
    activities: boolean;
    communications: boolean;
    analytics: boolean;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  requestedAt: Date;
  completedAt?: Date;
  recordsDeleted?: number;
}

@Injectable()
export class GDPRComplianceService {
  private readonly logger = new Logger(GDPRComplianceService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // SUBMIT DELETION REQUEST
  // ============================================================

  async submitDeletionRequest(
    organizationId: string,
    data: {
      requestedById: string;
      requestedByEmail: string;
      subjectType: 'contact' | 'company' | 'user' | 'all_data';
      subjectId?: string;
      subjectEmail?: string;
      requestType: 'gdpr_deletion' | 'ccpa_deletion' | 'data_cleanup' | 'right_to_be_forgotten';
      reason?: string;
      scope: {
        contacts: boolean;
        activities: boolean;
        communications: boolean;
        analytics: boolean;
      };
    },
  ): Promise<DeletionRequest> {
    // Create deletion request
    const request = await this.prisma.dataDeletionRequest.create({
      data: {
        organizationId,
        requestedById: data.requestedById,
        requestedByEmail: data.requestedByEmail,
        subjectType: data.subjectType,
        subjectId: data.subjectId,
        subjectEmail: data.subjectEmail,
        requestType: data.requestType,
        reason: data.reason,
        scope: data.scope as any,
        status: 'pending',
      },
    });

    // For GDPR, generate verification code
    if (data.requestType === 'gdpr_deletion' || data.requestType === 'right_to_be_forgotten') {
      const verificationCode = this.generateVerificationCode();
      await this.prisma.dataDeletionRequest.update({
        where: { id: request.id },
        data: { verificationCode },
      });

      // In production, send verification email
      // await this.emailService.sendVerificationEmail(data.subjectEmail, verificationCode);
    }

    // Log audit event
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        action: 'deletion_requested',
        entityType: data.subjectType,
        entityId: data.subjectId,
        userId: data.requestedById,
        userEmail: data.requestedByEmail,
        newValues: {
          requestId: request.id,
          requestType: data.requestType,
          scope: data.scope,
        },
        category: 'security',
        severity: 'warning',
        status: 'success',
      },
    });

    return this.formatDeletionRequest(request);
  }

  // ============================================================
  // VERIFY DELETION REQUEST
  // ============================================================

  async verifyDeletionRequest(
    organizationId: string,
    requestId: string,
    verificationCode: string,
  ): Promise<{ verified: boolean; message?: string }> {
    const request = await this.prisma.dataDeletionRequest.findFirst({
      where: { id: requestId, organizationId },
    });

    if (!request) {
      return { verified: false, message: 'Request not found' };
    }

    if (request.verificationCode !== verificationCode) {
      return { verified: false, message: 'Invalid verification code' };
    }

    await this.prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: { verifiedAt: new Date() },
    });

    return { verified: true };
  }

  // ============================================================
  // PROCESS DELETION REQUEST
  // ============================================================

  async processDeletionRequest(
    organizationId: string,
    requestId: string,
    processedById: string,
  ): Promise<{
    success: boolean;
    recordsDeleted: number;
    details: any;
  }> {
    const request = await this.prisma.dataDeletionRequest.findFirst({
      where: { id: requestId, organizationId },
    });

    if (!request) {
      throw new Error('Request not found');
    }

    // Check for legal holds
    const retentionPolicy = await this.prisma.dataRetentionPolicy.findFirst({
      where: { organizationId },
    });

    if (retentionPolicy?.legalHoldEnabled) {
      return {
        success: false,
        recordsDeleted: 0,
        details: { error: 'Legal hold in effect - deletion blocked' },
      };
    }

    // Update status to processing
    await this.prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: { status: 'processing', processedById },
    });

    try {
      const scope = request.scope as any;
      let totalDeleted = 0;
      const deletionLog: any = {};

      // Delete based on scope
      if (scope?.contacts && request.subjectId) {
        const deleted = await this.deleteContactData(
          organizationId,
          request.subjectId,
        );
        totalDeleted += deleted.count;
        deletionLog.contacts = deleted;
      }

      if (scope?.activities && request.subjectId) {
        const deleted = await this.deleteActivityData(
          organizationId,
          request.subjectId,
        );
        totalDeleted += deleted.count;
        deletionLog.activities = deleted;
      }

      if (scope?.communications && request.subjectId) {
        const deleted = await this.deleteCommunicationData(
          organizationId,
          request.subjectId,
        );
        totalDeleted += deleted.count;
        deletionLog.communications = deleted;
      }

      if (scope?.analytics && request.subjectId) {
        const deleted = await this.deleteAnalyticsData(
          organizationId,
          request.subjectId,
        );
        totalDeleted += deleted.count;
        deletionLog.analytics = deleted;
      }

      // Update request as completed
      await this.prisma.dataDeletionRequest.update({
        where: { id: requestId },
        data: {
          status: 'completed',
          processedAt: new Date(),
          recordsDeleted: totalDeleted,
          deletionLog,
        },
      });

      // Log completion
      await this.prisma.auditLog.create({
        data: {
          organizationId,
          action: 'deletion_completed',
          entityType: request.subjectType,
          entityId: request.subjectId,
          userId: processedById,
          newValues: {
            requestId,
            recordsDeleted: totalDeleted,
          },
          category: 'security',
          severity: 'warning',
          status: 'success',
        },
      });

      return {
        success: true,
        recordsDeleted: totalDeleted,
        details: deletionLog,
      };
    } catch (error: any) {
      // Update request as failed
      await this.prisma.dataDeletionRequest.update({
        where: { id: requestId },
        data: {
          status: 'failed',
          processedAt: new Date(),
        },
      });

      throw error;
    }
  }

  // ============================================================
  // DELETE OPERATIONS
  // ============================================================

  private async deleteContactData(organizationId: string, contactId: string): Promise<{ count: number; entities: string[] }> {
    let count = 0;
    const entities: string[] = [];

    // Delete or anonymize contact
    await this.prisma.contact.update({
      where: { id: contactId },
      data: {
        firstName: '[REDACTED]',
        lastName: '[REDACTED]',
        email: `redacted_${contactId}@deleted.local`,
        phone: null,
        address: null,
        status: 'deleted',
      },
    });
    count++;
    entities.push('contact');

    // Delete verification records
    await this.prisma.contactVerification.deleteMany({
      where: { contactId },
    });
    entities.push('verification');

    // Delete consent records
    await this.prisma.consentRecord.deleteMany({
      where: { contactId },
    });
    entities.push('consent');

    return { count, entities };
  }

  private async deleteActivityData(organizationId: string, contactId: string): Promise<{ count: number; entities: string[] }> {
    let count = 0;
    const entities: string[] = [];

    // Delete step executions
    const executions = await this.prisma.stepExecution.deleteMany({
      where: {
        enrollment: { contactId },
        organizationId,
      },
    });
    count += executions.count;
    entities.push('step_executions');

    // Delete sequence enrollments
    const enrollments = await this.prisma.sequenceEnrollment.deleteMany({
      where: { contactId, organizationId },
    });
    count += enrollments.count;
    entities.push('sequence_enrollments');

    // Delete outreach replies
    const replies = await this.prisma.outreachReply.deleteMany({
      where: { contactId, organizationId },
    });
    count += replies.count;
    entities.push('outreach_replies');

    return { count, entities };
  }

  private async deleteCommunicationData(organizationId: string, contactId: string): Promise<{ count: number; entities: string[] }> {
    let count = 0;
    const entities: string[] = [];

    // Delete scheduled messages
    const messages = await this.prisma.scheduledMessage.deleteMany({
      where: { contactId, organizationId },
    });
    count += messages.count;
    entities.push('scheduled_messages');

    // Delete call records
    const calls = await this.prisma.callRecord.deleteMany({
      where: { contactId, organizationId },
    });
    count += calls.count;
    entities.push('call_records');

    return { count, entities };
  }

  private async deleteAnalyticsData(organizationId: string, contactId: string): Promise<{ count: number; entities: string[] }> {
    let count = 0;
    const entities: string[] = [];

    // Delete lead scores
    const scores = await this.prisma.leadScore.deleteMany({
      where: { contactId },
    });
    count += scores.count;
    entities.push('lead_scores');

    // Delete lead qualifications
    const qualifications = await this.prisma.leadQualification.deleteMany({
      where: { contactId, organizationId },
    });
    count += qualifications.count;
    entities.push('lead_qualifications');

    // Delete attribution touchpoints
    const touchpoints = await this.prisma.attributionTouchpoint.deleteMany({
      where: { contactId, organizationId },
    });
    count += touchpoints.count;
    entities.push('attribution_touchpoints');

    return { count, entities };
  }

  // ============================================================
  // GET DELETION REQUESTS
  // ============================================================

  async getDeletionRequests(
    organizationId: string,
    filters?: {
      status?: string;
      subjectType?: string;
      limit?: number;
    },
  ): Promise<DeletionRequest[]> {
    const where: any = { organizationId };

    if (filters?.status) where.status = filters.status;
    if (filters?.subjectType) where.subjectType = filters.subjectType;

    const requests = await this.prisma.dataDeletionRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
    });

    return requests.map((r) => this.formatDeletionRequest(r));
  }

  async getDeletionRequest(
    organizationId: string,
    requestId: string,
  ): Promise<DeletionRequest | null> {
    const request = await this.prisma.dataDeletionRequest.findFirst({
      where: { id: requestId, organizationId },
    });

    return request ? this.formatDeletionRequest(request) : null;
  }

  // ============================================================
  // CANCEL REQUEST
  // ============================================================

  async cancelDeletionRequest(
    organizationId: string,
    requestId: string,
    cancelledById: string,
  ): Promise<void> {
    const request = await this.prisma.dataDeletionRequest.findFirst({
      where: { id: requestId, organizationId },
    });

    if (!request) {
      throw new Error('Request not found');
    }

    if (request.status === 'completed') {
      throw new Error('Cannot cancel completed request');
    }

    await this.prisma.dataDeletionRequest.update({
      where: { id: requestId },
      data: { status: 'cancelled' },
    });

    // Log cancellation
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        action: 'deletion_cancelled',
        entityType: request.subjectType,
        entityId: request.subjectId,
        userId: cancelledById,
        newValues: { requestId },
        category: 'security',
        severity: 'info',
        status: 'success',
      },
    });
  }

  // ============================================================
  // DATA PORTABILITY (GDPR)
  // ============================================================

  async exportUserData(
    organizationId: string,
    contactId: string,
  ): Promise<{
    personalData: any;
    activityData: any;
    communicationData: any;
    consentRecords: any;
  }> {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId },
      include: {
        company: true,
      },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Get activity data
    const activities = await this.prisma.contactActivity.findMany({
      where: { contactId, organizationId },
    });

    const enrollments = await this.prisma.sequenceEnrollment.findMany({
      where: { contactId, organizationId },
      include: { stepExecutions: true },
    });

    // Get consent records
    const consents = await this.prisma.consentRecord.findMany({
      where: { contactId, organizationId },
    });

    // Get verification data
    const verification = await this.prisma.contactVerification.findUnique({
      where: { contactId },
    });

    return {
      personalData: {
        contact,
        verification: verification ? {
          emailVerified: verification.emailVerified,
          emailStatus: verification.emailStatus,
          phoneVerified: verification.phoneVerified,
          phoneStatus: verification.phoneStatus,
          overallScore: verification.overallScore,
          dataQuality: verification.dataQuality,
        } : null,
      },
      activityData: {
        activities,
        enrollments,
      },
      communicationData: {
        // Summarized communication data
      },
      consentRecords: consents,
    };
  }

  // ============================================================
  // COMPLIANCE REPORTING
  // ============================================================

  async generateGDPRReport(
    organizationId: string,
    period: { start: Date; end: Date },
  ): Promise<{
    totalContacts: number;
    deletionRequests: number;
    completedDeletions: number;
    pendingDeletions: number;
    dataExports: number;
    averageProcessingTime: number; // hours
    complianceRate: number;
  }> {
    const [contacts, requests, exports] = await Promise.all([
      this.prisma.contact.count({ where: { organizationId } }),
      this.prisma.dataDeletionRequest.findMany({
        where: {
          organizationId,
          createdAt: { gte: period.start, lte: period.end },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          organizationId,
          action: 'data_export',
          timestamp: { gte: period.start, lte: period.end },
        },
      }),
    ]);

    const completed = requests.filter((r) => r.status === 'completed').length;
    const pending = requests.filter((r) => r.status === 'pending' || r.status === 'processing').length;

    // Calculate average processing time
    const completedRequests = requests.filter((r) => r.status === 'completed' && r.processedAt);
    const avgProcessingTime = completedRequests.length > 0
      ? completedRequests.reduce((sum, r) => {
          const hours = (r.processedAt!.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }, 0) / completedRequests.length
      : 0;

    // GDPR requires deletion within 30 days (720 hours)
    const compliantDeletions = completedRequests.filter((r) => {
      const hours = (r.processedAt!.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60);
      return hours <= 720;
    }).length;

    const complianceRate = completed > 0 ? (compliantDeletions / completed) * 100 : 100;

    return {
      totalContacts: contacts,
      deletionRequests: requests.length,
      completedDeletions: completed,
      pendingDeletions: pending,
      dataExports: exports,
      averageProcessingTime: Math.round(avgProcessingTime),
      complianceRate: Math.round(complianceRate),
    };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private formatDeletionRequest(request: any): DeletionRequest {
    return {
      id: request.id,
      subjectType: request.subjectType,
      subjectId: request.subjectId,
      subjectEmail: request.subjectEmail,
      requestType: request.requestType,
      reason: request.reason,
      scope: request.scope as any,
      status: request.status,
      requestedAt: request.createdAt,
      completedAt: request.processedAt,
      recordsDeleted: request.recordsDeleted,
    };
  }
}
