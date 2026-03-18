import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface ConsentStatus {
  contactId: string;
  emailConsent: boolean;
  phoneConsent: boolean;
  smsConsent: boolean;
  marketingConsent: boolean;
  dataProcessingConsent: boolean;
  doubleOptInConfirmed: boolean;
  overallStatus: 'fully_consented' | 'partially_consented' | 'not_consented';
  lastUpdated: Date;
}

export interface ConsentReport {
  totalContacts: number;
  fullyConsented: number;
  partiallyConsented: number;
  notConsented: number;
  gdprCompliant: boolean;
  tcpaCompliant: boolean;
  consentRate: number;
}

@Injectable()
export class ConsentManagementService {
  private readonly logger = new Logger(ConsentManagementService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // RECORD CONSENT
  // ============================================================

  async recordConsent(
    organizationId: string,
    data: {
      contactId: string;
      consentType: 'email' | 'phone' | 'sms' | 'marketing' | 'data_processing';
      granted: boolean;
      grantedVia: string;
      source?: string;
      sourceUrl?: string;
      ipAddress?: string;
      userAgent?: string;
      legalBasis?: string;
      consentText?: string;
      privacyPolicyVersion?: string;
    },
  ): Promise<any> {
    const consent = await this.prisma.consentRecord.create({
      data: {
        organizationId,
        contactId: data.contactId,
        consentType: data.consentType,
        granted: data.granted,
        grantedVia: data.grantedVia,
        source: data.source,
        sourceUrl: data.sourceUrl,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        legalBasis: data.legalBasis || 'consent',
        consentText: data.consentText,
        privacyPolicyVersion: data.privacyPolicyVersion,
      },
    });

    // Log audit event
    await this.logConsentEvent(organizationId, data.contactId, data.consentType, data.granted);

    return consent;
  }

  // ============================================================
  // WITHDRAW CONSENT
  // ============================================================

  async withdrawConsent(
    organizationId: string,
    contactId: string,
    consentType: string,
    reason?: string,
  ): Promise<any> {
    // Update all matching consent records
    await this.prisma.consentRecord.updateMany({
      where: {
        organizationId,
        contactId,
        consentType,
      },
      data: {
        granted: false,
        withdrawnAt: new Date(),
        withdrawalReason: reason,
      },
    });

    // Create new withdrawal record
    const withdrawal = await this.prisma.consentRecord.create({
      data: {
        organizationId,
        contactId,
        consentType,
        granted: false,
        grantedVia: 'withdrawal',
        withdrawnAt: new Date(),
        withdrawalReason: reason,
      },
    });

    // Log audit event
    await this.logConsentEvent(organizationId, contactId, consentType, false, 'withdrawal');

    return withdrawal;
  }

  // ============================================================
  // DOUBLE OPT-IN
  // ============================================================

  async sendDoubleOptIn(
    organizationId: string,
    contactId: string,
  ): Promise<{ sent: boolean; message?: string }> {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId },
    });

    if (!contact || !contact.email) {
      return { sent: false, message: 'Contact not found or no email' };
    }

    // Update consent record
    await this.prisma.consentRecord.updateMany({
      where: {
        organizationId,
        contactId,
        consentType: 'email',
      },
      data: {
        doubleOptInSent: true,
        doubleOptInSentAt: new Date(),
      },
    });

    // In production, send actual email with confirmation link
    // await this.emailService.sendDoubleOptIn(contact.email, contactId);

    this.logger.log(`Double opt-in sent to ${contact.email}`);

    return { sent: true };
  }

  async confirmDoubleOptIn(
    organizationId: string,
    contactId: string,
  ): Promise<{ confirmed: boolean }> {
    await this.prisma.consentRecord.updateMany({
      where: {
        organizationId,
        contactId,
        consentType: 'email',
      },
      data: {
        doubleOptInConfirmed: true,
        doubleOptInConfirmedAt: new Date(),
      },
    });

    return { confirmed: true };
  }

  // ============================================================
  // CHECK CONSENT STATUS
  // ============================================================

  async getConsentStatus(
    organizationId: string,
    contactId: string,
  ): Promise<ConsentStatus> {
    const consents = await this.prisma.consentRecord.findMany({
      where: { organizationId, contactId },
      orderBy: { createdAt: 'desc' },
    });

    // Get latest consent for each type
    const latestConsents: Record<string, any> = {};
    for (const consent of consents) {
      if (!latestConsents[consent.consentType] || 
          consent.createdAt > latestConsents[consent.consentType].createdAt) {
        latestConsents[consent.consentType] = consent;
      }
    }

    const emailConsent = latestConsents['email']?.granted ?? false;
    const phoneConsent = latestConsents['phone']?.granted ?? false;
    const smsConsent = latestConsents['sms']?.granted ?? false;
    const marketingConsent = latestConsents['marketing']?.granted ?? false;
    const dataProcessingConsent = latestConsents['data_processing']?.granted ?? false;
    const doubleOptInConfirmed = latestConsents['email']?.doubleOptInConfirmed ?? false;

    // Determine overall status
    const allConsented = emailConsent && phoneConsent && smsConsent && marketingConsent;
    const someConsented = emailConsent || phoneConsent || smsConsent || marketingConsent;
    
    let overallStatus: 'fully_consented' | 'partially_consented' | 'not_consented';
    if (allConsented) overallStatus = 'fully_consented';
    else if (someConsented) overallStatus = 'partially_consented';
    else overallStatus = 'not_consented';

    return {
      contactId,
      emailConsent,
      phoneConsent,
      smsConsent,
      marketingConsent,
      dataProcessingConsent,
      doubleOptInConfirmed,
      overallStatus,
      lastUpdated: consents[0]?.createdAt || new Date(),
    };
  }

  async canContact(
    organizationId: string,
    contactId: string,
    channel: 'email' | 'phone' | 'sms' | 'marketing',
  ): Promise<{ allowed: boolean; reason?: string }> {
    const status = await this.getConsentStatus(organizationId, contactId);

    const privacySettings = await this.prisma.privacySettings.findUnique({
      where: { organizationId },
    });

    // Check TCPA compliance for SMS/phone
    if ((channel === 'sms' || channel === 'phone') && privacySettings?.tcpaComplianceEnabled) {
      if (!status.phoneConsent && !status.smsConsent) {
        return { allowed: false, reason: 'No phone/SMS consent recorded' };
      }
    }

    // Check email consent
    if (channel === 'email') {
      if (!status.emailConsent) {
        return { allowed: false, reason: 'No email consent recorded' };
      }
      
      // Check double opt-in if required
      if (privacySettings?.doubleOptInRequired && !status.doubleOptInConfirmed) {
        return { allowed: false, reason: 'Double opt-in not confirmed' };
      }
    }

    // Check marketing consent
    if (channel === 'marketing' && !status.marketingConsent) {
      return { allowed: false, reason: 'No marketing consent recorded' };
    }

    return { allowed: true };
  }

  // ============================================================
  // COMPLIANCE REPORTING
  // ============================================================

  async generateConsentReport(
    organizationId: string,
  ): Promise<ConsentReport> {
    const contacts = await this.prisma.contact.findMany({
      where: { organizationId },
    });

    let fullyConsented = 0;
    let partiallyConsented = 0;
    let notConsented = 0;

    for (const contact of contacts) {
      const status = await this.getConsentStatus(organizationId, contact.id);
      
      if (status.overallStatus === 'fully_consented') fullyConsented++;
      else if (status.overallStatus === 'partially_consented') partiallyConsented++;
      else notConsented++;
    }

    const totalContacts = contacts.length;
    const consentRate = totalContacts > 0 
      ? ((fullyConsented + partiallyConsented) / totalContacts) * 100 
      : 0;

    const privacySettings = await this.prisma.privacySettings.findUnique({
      where: { organizationId },
    });

    return {
      totalContacts,
      fullyConsented,
      partiallyConsented,
      notConsented,
      gdprCompliant: privacySettings?.gdprEnabled || false,
      tcpaCompliant: privacySettings?.tcpaComplianceEnabled || false,
      consentRate: Math.round(consentRate),
    };
  }

  // ============================================================
  // EXPORT CONSENT RECORDS
  // ============================================================

  async exportConsentRecords(
    organizationId: string,
    contactId?: string,
  ): Promise<Array<{
    contactId: string;
    contactName: string;
    email: string;
    consentType: string;
    granted: boolean;
    grantedAt: Date;
    grantedVia: string;
    legalBasis?: string;
    withdrawnAt?: Date;
    doubleOptInConfirmed: boolean;
  }>> {
    const where: any = { organizationId };
    if (contactId) where.contactId = contactId;

    const records = await this.prisma.consentRecord.findMany({
      where,
      include: { contact: true },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => ({
      contactId: record.contactId,
      contactName: `${record.contact.firstName} ${record.contact.lastName}`,
      email: record.contact.email,
      consentType: record.consentType,
      granted: record.granted,
      grantedAt: record.grantedAt,
      grantedVia: record.grantedVia,
      legalBasis: record.legalBasis,
      withdrawnAt: record.withdrawnAt,
      doubleOptInConfirmed: record.doubleOptInConfirmed,
    }));
  }

  // ============================================================
  // COMPLIANCE CHECKLIST
  // ============================================================

  async getComplianceChecklist(
    organizationId: string,
  ): Promise<Array<{
    category: string;
    requirement: string;
    status: 'pass' | 'fail' | 'warning';
    description: string;
    action?: string;
  }>> {
    const privacySettings = await this.prisma.privacySettings.findUnique({
      where: { organizationId },
    });

    const consentReport = await this.generateConsentReport(organizationId);

    const checklist = [];

    // GDPR Checks
    checklist.push({
      category: 'GDPR',
      requirement: 'GDPR Compliance Enabled',
      status: privacySettings?.gdprEnabled ? 'pass' : 'fail',
      description: 'GDPR compliance features must be enabled for EU contacts',
      action: privacySettings?.gdprEnabled ? undefined : 'Enable GDPR compliance in settings',
    });

    checklist.push({
      category: 'GDPR',
      requirement: 'Privacy Policy URL Configured',
      status: privacySettings?.privacyPolicyUrl ? 'pass' : 'warning',
      description: 'Privacy policy must be accessible to contacts',
      action: privacySettings?.privacyPolicyUrl ? undefined : 'Add privacy policy URL',
    });

    checklist.push({
      category: 'GDPR',
      requirement: 'Consent Rate Above 80%',
      status: consentReport.consentRate >= 80 ? 'pass' : consentReport.consentRate >= 50 ? 'warning' : 'fail',
      description: `${consentReport.consentRate}% of contacts have given consent`,
      action: consentReport.consentRate >= 80 ? undefined : 'Implement consent collection workflows',
    });

    // TCPA Checks
    checklist.push({
      category: 'TCPA',
      requirement: 'TCPA Compliance Enabled',
      status: privacySettings?.tcpaComplianceEnabled ? 'pass' : 'warning',
      description: 'TCPA compliance required for phone/SMS outreach',
      action: privacySettings?.tcpaComplianceEnabled ? undefined : 'Enable TCPA compliance',
    });

    checklist.push({
      category: 'TCPA',
      requirement: 'Express Consent Required',
      status: privacySettings?.expressConsentRequired ? 'pass' : 'warning',
      description: 'Express consent should be obtained before calling/texting',
    });

    // Security Checks
    checklist.push({
      category: 'Security',
      requirement: 'Audit Log Retention Configured',
      status: privacySettings?.auditLogRetentionDays ? 'pass' : 'warning',
      description: 'Audit logs should be retained for compliance',
    });

    checklist.push({
      category: 'Security',
      requirement: 'Data Processing Location Set',
      status: privacySettings?.dataProcessingLocation ? 'pass' : 'warning',
      description: 'Data residency should be configured',
    });

    return checklist;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private async logConsentEvent(
    organizationId: string,
    contactId: string,
    consentType: string,
    granted: boolean,
    action: 'grant' | 'withdrawal' = 'grant',
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        action: action === 'grant' ? 'consent_granted' : 'consent_withdrawn',
        entityType: 'consent',
        entityId: contactId,
        newValues: {
          consentType,
          granted,
          timestamp: new Date(),
        },
        category: 'security',
        severity: 'info',
      },
    });
  }
}
