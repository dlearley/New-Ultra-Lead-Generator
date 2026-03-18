import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VerificationService } from './verification/verification.service';
import { ConsentManagementService } from './consent/consent-management.service';
import { AuditLoggingService } from './audit/audit-logging.service';
import { GDPRComplianceService } from './gdpr/gdpr-compliance.service';
import { RBACService } from './rbac/rbac.service';
import { PrivacySettingsService } from './privacy/privacy-settings.service';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
  role?: string;
}

@Controller('compliance')
@UseGuards(JwtAuthGuard)
export class ComplianceController {
  constructor(
    private readonly verification: VerificationService,
    private readonly consent: ConsentManagementService,
    private readonly audit: AuditLoggingService,
    private readonly gdpr: GDPRComplianceService,
    private readonly rbac: RBACService,
    private readonly privacy: PrivacySettingsService,
  ) {}

  // ============================================================
  // VERIFICATION
  // ============================================================

  @Post('verify/:contactId')
  async verifyContact(
    @Param('contactId') contactId: string,
    @Body() dto: { verifyEmail?: boolean; verifyPhone?: boolean },
    @CurrentUser() user: UserPayload,
  ) {
    return this.verification.verifyContact(user.organizationId, contactId, dto);
  }

  @Post('verify/bulk')
  async verifyBulk(
    @Body() dto: { contactIds: string[] },
    @CurrentUser() user: UserPayload,
  ) {
    return this.verification.verifyContactsBulk(user.organizationId, dto.contactIds);
  }

  @Get('data-quality')
  async getDataQuality(
    @CurrentUser() user: UserPayload,
  ) {
    return this.verification.checkDataQuality(user.organizationId);
  }

  @Post('bounce')
  async recordBounce(
    @Body() dto: { contactId: string; type: 'hard' | 'soft'; reason?: string },
    @CurrentUser() user: UserPayload,
  ) {
    await this.verification.recordBounce(
      user.organizationId,
      dto.contactId,
      dto.type,
      dto.reason,
    );
    return { success: true };
  }

  // ============================================================
  // CONSENT
  // ============================================================

  @Post('consent')
  async recordConsent(
    @Body() dto: {
      contactId: string;
      consentType: string;
      granted: boolean;
      grantedVia: string;
      source?: string;
      legalBasis?: string;
    },
    @CurrentUser() user: UserPayload,
  ) {
    return this.consent.recordConsent(user.organizationId, {
      ...dto,
      ipAddress: '127.0.0.1', // In production, get from request
    });
  }

  @Post('consent/withdraw')
  async withdrawConsent(
    @Body() dto: { contactId: string; consentType: string; reason?: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.consent.withdrawConsent(
      user.organizationId,
      dto.contactId,
      dto.consentType,
      dto.reason,
    );
  }

  @Get('consent/status/:contactId')
  async getConsentStatus(
    @Param('contactId') contactId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.consent.getConsentStatus(user.organizationId, contactId);
  }

  @Post('consent/double-opt-in/:contactId')
  async sendDoubleOptIn(
    @Param('contactId') contactId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.consent.sendDoubleOptIn(user.organizationId, contactId);
  }

  @Get('consent/report')
  async getConsentReport(
    @CurrentUser() user: UserPayload,
  ) {
    return this.consent.generateConsentReport(user.organizationId);
  }

  @Get('consent/checklist')
  async getComplianceChecklist(
    @CurrentUser() user: UserPayload,
  ) {
    return this.consent.getComplianceChecklist(user.organizationId);
  }

  // ============================================================
  // AUDIT LOGS
  // ============================================================

  @Get('audit-logs')
  async getAuditLogs(
    @Query() filters: any,
    @CurrentUser() user: UserPayload,
  ) {
    return this.audit.getAuditLogs(user.organizationId, filters);
  }

  @Get('audit-logs/entity/:type/:id')
  async getEntityHistory(
    @Param('type') type: string,
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.audit.getEntityHistory(user.organizationId, type, id);
  }

  @Get('audit-logs/user/:userId')
  async getUserActivity(
    @Param('userId') targetUserId: string,
    @Query('days') days: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.audit.getUserActivity(
      user.organizationId,
      targetUserId,
      parseInt(days) || 30,
    );
  }

  @Get('audit-logs/security-metrics')
  async getSecurityMetrics(
    @Query('days') days: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.audit.getSecurityMetrics(user.organizationId, parseInt(days) || 30);
  }

  @Post('audit-logs/export')
  async exportAuditLogs(
    @Body() dto: { startDate?: string; endDate?: string; format?: 'csv' | 'json' },
    @CurrentUser() user: UserPayload,
  ) {
    return this.audit.exportAuditLogs(user.organizationId, {
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      format: dto.format,
    });
  }

  // ============================================================
  // GDPR / DATA DELETION
  // ============================================================

  @Post('deletion-request')
  async submitDeletionRequest(
    @Body() dto: {
      subjectType: string;
      subjectId?: string;
      subjectEmail?: string;
      requestType: string;
      reason?: string;
      scope: any;
    },
    @CurrentUser() user: UserPayload,
  ) {
    return this.gdpr.submitDeletionRequest(user.organizationId, {
      requestedById: user.userId,
      requestedByEmail: user.email,
      ...dto,
    });
  }

  @Post('deletion-request/:id/verify')
  async verifyDeletionRequest(
    @Param('id') requestId: string,
    @Body() dto: { code: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.gdpr.verifyDeletionRequest(user.organizationId, requestId, dto.code);
  }

  @Post('deletion-request/:id/process')
  async processDeletionRequest(
    @Param('id') requestId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.gdpr.processDeletionRequest(user.organizationId, requestId, user.userId);
  }

  @Get('deletion-requests')
  async getDeletionRequests(
    @Query() filters: any,
    @CurrentUser() user: UserPayload,
  ) {
    return this.gdpr.getDeletionRequests(user.organizationId, filters);
  }

  @Get('gdpr/report')
  async getGDPRReport(
    @Query() query: { startDate: string; endDate: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.gdpr.generateGDPRReport(user.organizationId, {
      start: new Date(query.startDate),
      end: new Date(query.endDate),
    });
  }

  @Get('export-data/:contactId')
  async exportUserData(
    @Param('contactId') contactId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.gdpr.exportUserData(user.organizationId, contactId);
  }

  // ============================================================
  // RBAC
  // ============================================================

  @Get('roles')
  async getRoles(
    @CurrentUser() user: UserPayload,
  ) {
    return this.rbac.getRoles(user.organizationId);
  }

  @Post('roles')
  async createRole(
    @Body() dto: { name: string; description?: string; permissions: any; dataScope?: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.rbac.createRole(user.organizationId, dto);
  }

  @Post('roles/:id/assign')
  async assignRole(
    @Param('id') roleId: string,
    @Body() dto: { userId: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.rbac.assignRole(user.organizationId, dto.userId, roleId, user.userId);
  }

  @Get('permissions')
  async getMyPermissions(
    @CurrentUser() user: UserPayload,
  ) {
    return this.rbac.getPermissionSummary(user.organizationId, user.userId);
  }

  // ============================================================
  // PRIVACY SETTINGS
  // ============================================================

  @Get('privacy-settings')
  async getPrivacySettings(
    @CurrentUser() user: UserPayload,
  ) {
    return this.privacy.getSettings(user.organizationId);
  }

  @Put('privacy-settings')
  async updatePrivacySettings(
    @Body() dto: any,
    @CurrentUser() user: UserPayload,
  ) {
    return this.privacy.updateSettings(user.organizationId, dto);
  }

  @Get('retention-policy')
  async getRetentionPolicy(
    @CurrentUser() user: UserPayload,
  ) {
    return this.privacy.getRetentionPolicy(user.organizationId);
  }

  @Put('retention-policy')
  async updateRetentionPolicy(
    @Body() dto: any,
    @CurrentUser() user: UserPayload,
  ) {
    return this.privacy.updateRetentionPolicy(user.organizationId, dto);
  }

  // ============================================================
  // COMPLIANCE STATUS
  // ============================================================

  @Get('status')
  async getComplianceStatus(
    @CurrentUser() user: UserPayload,
  ) {
    return this.privacy.getComplianceStatus(user.organizationId);
  }

  @Post('reports/:type')
  async generateComplianceReport(
    @Param('type') reportType: 'gdpr' | 'ccpa' | 'tcpa' | 'soc2' | 'general',
    @CurrentUser() user: UserPayload,
  ) {
    return this.privacy.generateComplianceReport(user.organizationId, reportType);
  }

  @Get('security-events')
  async getSecurityEvents(
    @Query() filters: any,
    @CurrentUser() user: UserPayload,
  ) {
    return this.privacy.getSecurityEvents(user.organizationId, filters);
  }
}
