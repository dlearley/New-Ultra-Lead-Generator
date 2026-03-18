import { Module } from '@nestjs/common';
import { ComplianceController } from './compliance.controller';
import { VerificationService } from './verification/verification.service';
import { ConsentManagementService } from './consent/consent-management.service';
import { AuditLoggingService } from './audit/audit-logging.service';
import { GDPRComplianceService } from './gdpr/gdpr-compliance.service';
import { RBACService } from './rbac/rbac.service';
import { PrivacySettingsService } from './privacy/privacy-settings.service';

@Module({
  controllers: [ComplianceController],
  providers: [
    VerificationService,
    ConsentManagementService,
    AuditLoggingService,
    GDPRComplianceService,
    RBACService,
    PrivacySettingsService,
  ],
  exports: [
    VerificationService,
    ConsentManagementService,
    AuditLoggingService,
    GDPRComplianceService,
    RBACService,
    PrivacySettingsService,
  ],
})
export class ComplianceModule {}
