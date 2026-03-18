import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface PrivacyConfig {
  gdprEnabled: boolean;
  ccpaEnabled: boolean;
  tcpaComplianceEnabled: boolean;
  doubleOptInRequired: boolean;
  expressConsentRequired: boolean;
  dataProcessingLocation: string;
  thirdPartySharing: boolean;
  mfaRequired: boolean;
  passwordPolicy: 'basic' | 'strong' | 'enterprise';
  sessionTimeoutMinutes: number;
  auditLogRetentionDays: number;
}

@Injectable()
export class PrivacySettingsService {
  private readonly logger = new Logger(PrivacySettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // GET/SET PRIVACY SETTINGS
  // ============================================================

  async getSettings(organizationId: string): Promise<any> {
    let settings = await this.prisma.privacySettings.findUnique({
      where: { organizationId },
    });

    if (!settings) {
      // Create default settings
      settings = await this.prisma.privacySettings.create({
        data: {
          organizationId,
          gdprEnabled: true,
          ccpaEnabled: false,
          tcpaComplianceEnabled: true,
          expressConsentRequired: true,
          doubleOptInRequired: false,
          dataProcessingLocation: 'US',
          thirdPartySharing: false,
          analyticsSharing: true,
          mfaRequired: false,
          passwordPolicy: 'strong',
          sessionTimeoutMinutes: 480,
          auditLogRetentionDays: 365,
          userActivityTracking: true,
        },
      });
    }

    return settings;
  }

  async updateSettings(
    organizationId: string,
    data: Partial<PrivacyConfig>,
  ): Promise<any> {
    const settings = await this.prisma.privacySettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        ...data as any,
      },
      update: data as any,
    });

    // Log the change
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        action: 'privacy_settings_updated',
        entityType: 'settings',
        newValues: data,
        category: 'security',
        severity: 'info',
        status: 'success',
      },
    });

    return settings;
  }

  // ============================================================
  // DATA RETENTION POLICIES
  // ============================================================

  async getRetentionPolicy(organizationId: string): Promise<any> {
    let policy = await this.prisma.dataRetentionPolicy.findFirst({
      where: { organizationId },
    });

    if (!policy) {
      policy = await this.prisma.dataRetentionPolicy.create({
        data: {
          organizationId,
          policyName: 'Default Policy',
          contactRetentionDays: 2555, // 7 years
          activityRetentionDays: 1095, // 3 years
          emailRetentionDays: 1095,
          callRetentionDays: 365,
          deletedDataRetentionDays: 30,
          autoDeleteEnabled: false,
          legalHoldEnabled: false,
        },
      });
    }

    return policy;
  }

  async updateRetentionPolicy(
    organizationId: string,
    data: {
      contactRetentionDays?: number;
      activityRetentionDays?: number;
      autoDeleteEnabled?: boolean;
      autoDeleteInactiveAfterDays?: number;
      legalHoldEnabled?: boolean;
      legalHoldReason?: string;
    },
  ): Promise<any> {
    const policy = await this.prisma.dataRetentionPolicy.updateMany({
      where: { organizationId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    // If legal hold is enabled, log it
    if (data.legalHoldEnabled) {
      await this.prisma.securityEvent.create({
        data: {
          organizationId,
          eventType: 'legal_hold_enabled',
          severity: 'high',
          description: `Legal hold enabled: ${data.legalHoldReason}`,
          status: 'open',
        },
      });
    }

    return policy;
  }

  // ============================================================
  // COMPLIANCE STATUS
  // ============================================================

  async getComplianceStatus(organizationId: string): Promise<{
    gdpr: { compliant: boolean; issues: string[] };
    ccpa: { compliant: boolean; issues: string[] };
    tcpa: { compliant: boolean; issues: string[] };
    soc2: { compliant: boolean; issues: string[] };
    overall: 'compliant' | 'partial' | 'non_compliant';
  }> {
    const settings = await this.getSettings(organizationId);
    const consentReport = await this.getConsentSummary(organizationId);

    const gdprIssues: string[] = [];
    const ccpaIssues: string[] = [];
    const tcpaIssues: string[] = [];
    const soc2Issues: string[] = [];

    // GDPR checks
    if (!settings.gdprEnabled) {
      gdprIssues.push('GDPR compliance not enabled');
    }
    if (!settings.privacyPolicyUrl) {
      gdprIssues.push('Privacy policy URL not configured');
    }
    if (consentReport.consentRate < 80) {
      gdprIssues.push(`Consent rate below 80% (${consentReport.consentRate}%)`);
    }

    // CCPA checks
    if (settings.ccpaEnabled) {
      if (!settings.doNotSellEnabled) {
        ccpaIssues.push('Do Not Sell option not enabled');
      }
    }

    // TCPA checks
    if (!settings.tcpaComplianceEnabled) {
      tcpaIssues.push('TCPA compliance not enabled');
    }
    if (!settings.expressConsentRequired) {
      tcpaIssues.push('Express consent not required for phone/SMS');
    }

    // SOC2 checks
    if (!settings.mfaRequired) {
      soc2Issues.push('MFA not required for all users');
    }
    if (settings.passwordPolicy !== 'strong' && settings.passwordPolicy !== 'enterprise') {
      soc2Issues.push('Password policy not set to strong or enterprise');
    }
    if (settings.auditLogRetentionDays < 365) {
      soc2Issues.push('Audit log retention less than 365 days');
    }

    const gdprCompliant = gdprIssues.length === 0;
    const ccpaCompliant = ccpaIssues.length === 0;
    const tcpaCompliant = tcpaIssues.length === 0;
    const soc2Compliant = soc2Issues.length === 0;

    const totalIssues = gdprIssues.length + ccpaIssues.length + tcpaIssues.length + soc2Issues.length;
    
    let overall: 'compliant' | 'partial' | 'non_compliant';
    if (totalIssues === 0) overall = 'compliant';
    else if (totalIssues <= 3) overall = 'partial';
    else overall = 'non_compliant';

    return {
      gdpr: { compliant: gdprCompliant, issues: gdprIssues },
      ccpa: { compliant: ccpaCompliant, issues: ccpaIssues },
      tcpa: { compliant: tcpaCompliant, issues: tcpaIssues },
      soc2: { compliant: soc2Compliant, issues: soc2Issues },
      overall,
    };
  }

  // ============================================================
  // COMPLIANCE REPORTS
  // ============================================================

  async generateComplianceReport(
    organizationId: string,
    reportType: 'gdpr' | 'ccpa' | 'tcpa' | 'soc2' | 'general',
  ): Promise<{
    reportId: string;
    generatedAt: Date;
    summary: any;
    details: any;
  }> {
    const settings = await this.getSettings(organizationId);
    const status = await this.getComplianceStatus(organizationId);

    let summary: any = {};
    let details: any = {};

    switch (reportType) {
      case 'gdpr':
        summary = {
          gdprEnabled: settings.gdprEnabled,
          dpoConfigured: !!settings.dpoEmail,
          privacyPolicyConfigured: !!settings.privacyPolicyUrl,
          cookieConsentEnabled: settings.cookieConsentEnabled,
          overallStatus: status.gdpr.compliant ? 'Compliant' : 'Action Required',
        };
        details = {
          issues: status.gdpr.issues,
          recommendations: this.getGDPRRecommendations(status.gdpr.issues),
        };
        break;

      case 'tcpa':
        summary = {
          tcpaEnabled: settings.tcpaComplianceEnabled,
          expressConsentRequired: settings.expressConsentRequired,
          overallStatus: status.tcpa.compliant ? 'Compliant' : 'Action Required',
        };
        details = {
          issues: status.tcpa.issues,
          consentStats: await this.getConsentSummary(organizationId),
        };
        break;

      case 'soc2':
        summary = {
          mfaRequired: settings.mfaRequired,
          passwordPolicy: settings.passwordPolicy,
          auditLogRetention: settings.auditLogRetentionDays,
          overallStatus: status.soc2.compliant ? 'Compliant' : 'Action Required',
        };
        details = {
          issues: status.soc2.issues,
          securityEvents: await this.getRecentSecurityEvents(organizationId),
        };
        break;

      default:
        summary = {
          overallStatus: status.overall,
          frameworks: {
            gdpr: status.gdpr.compliant,
            ccpa: status.ccpa.compliant,
            tcpa: status.tcpa.compliant,
            soc2: status.soc2.compliant,
          },
        };
    }

    // Save report
    const report = await this.prisma.complianceReport.create({
      data: {
        organizationId,
        reportType,
        reportName: `${reportType.toUpperCase()} Compliance Report`,
        reportData: { summary, details },
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        generatedById: 'system',
      },
    });

    return {
      reportId: report.id,
      generatedAt: report.generatedAt,
      summary,
      details,
    };
  }

  // ============================================================
  // SECURITY EVENTS
  // ============================================================

  async logSecurityEvent(
    organizationId: string,
    event: {
      eventType: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      userId?: string;
      userEmail?: string;
      ipAddress?: string;
      metadata?: any;
    },
  ): Promise<void> {
    await this.prisma.securityEvent.create({
      data: {
        organizationId,
        ...event,
        status: 'open',
      },
    });

    // If critical, also log to audit log
    if (event.severity === 'critical') {
      await this.prisma.auditLog.create({
        data: {
          organizationId,
          action: event.eventType,
          entityType: 'security',
          userId: event.userId,
          userEmail: event.userEmail,
          newValues: { description: event.description, ...event.metadata },
          ipAddress: event.ipAddress,
          status: 'success',
          severity: 'critical',
          category: 'security',
        },
      });
    }
  }

  async getSecurityEvents(
    organizationId: string,
    filters?: {
      severity?: string;
      status?: string;
      limit?: number;
    },
  ): Promise<any[]> {
    return this.prisma.securityEvent.findMany({
      where: {
        organizationId,
        ...(filters?.severity && { severity: filters.severity }),
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
    });
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private async getConsentSummary(organizationId: string): Promise<any> {
    const totalContacts = await this.prisma.contact.count({
      where: { organizationId },
    });

    const consentedContacts = await this.prisma.consentRecord.groupBy({
      by: ['contactId'],
      where: { organizationId, granted: true },
    });

    return {
      totalContacts,
      consentedContacts: consentedContacts.length,
      consentRate: totalContacts > 0
        ? Math.round((consentedContacts.length / totalContacts) * 100)
        : 0,
    };
  }

  private async getRecentSecurityEvents(organizationId: string): Promise<any[]> {
    return this.prisma.securityEvent.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  private getGDPRRecommendations(issues: string[]): string[] {
    const recommendations: Record<string, string> = {
      'GDPR compliance not enabled': 'Enable GDPR compliance in Privacy Settings',
      'Privacy policy URL not configured': 'Add your privacy policy URL in settings',
      'Consent rate below 80%': 'Implement consent collection workflows and double opt-in',
    };

    return issues.map((issue) => recommendations[issue] || 'Review compliance documentation');
  }
}
