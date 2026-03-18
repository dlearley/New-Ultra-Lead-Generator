import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import { ConfigService } from '@nestjs/config';

export interface VerificationResult {
  email?: {
    verified: boolean;
    status: 'valid' | 'invalid' | 'catch_all' | 'unknown';
    score: number;
    disposable: boolean;
    roleBased: boolean;
    provider?: string;
    riskLevel: 'low' | 'medium' | 'high';
  };
  phone?: {
    verified: boolean;
    status: 'valid' | 'invalid' | 'landline' | 'mobile' | 'voip';
    carrier?: string;
    country?: string;
    formatted?: string;
    riskLevel: 'low' | 'medium' | 'high';
  };
  overallScore: number;
  dataQuality: 'poor' | 'fair' | 'good' | 'excellent';
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private zeroBounceKey: string;
  private twilioSid: string;
  private twilioToken: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.zeroBounceKey = this.configService.get('ZEROBOUNCE_API_KEY') || '';
    this.twilioSid = this.configService.get('TWILIO_SID') || '';
    this.twilioToken = this.configService.get('TWILIO_TOKEN') || '';
  }

  // ============================================================
  // VERIFY CONTACT
  // ============================================================

  async verifyContact(
    organizationId: string,
    contactId: string,
    options?: {
      verifyEmail?: boolean;
      verifyPhone?: boolean;
      force?: boolean;
    },
  ): Promise<VerificationResult> {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Check if recently verified
    if (!options?.force) {
      const existing = await this.prisma.contactVerification.findUnique({
        where: { contactId },
      });

      if (existing && existing.lastCheckedAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
        // Return cached result if less than 30 days old
        return this.formatResult(existing);
      }
    }

    const result: VerificationResult = {
      overallScore: 0,
      dataQuality: 'poor',
    };

    // Verify email
    if (options?.verifyEmail !== false && contact.email) {
      result.email = await this.verifyEmail(contact.email);
    }

    // Verify phone
    if (options?.verifyPhone !== false && contact.phone) {
      result.phone = await this.verifyPhone(contact.phone);
    }

    // Calculate overall score
    result.overallScore = this.calculateOverallScore(result);
    result.dataQuality = this.getDataQuality(result.overallScore);

    // Save results
    await this.saveVerificationResult(contactId, result);

    return result;
  }

  // ============================================================
  // EMAIL VERIFICATION
  // ============================================================

  private async verifyEmail(email: string): Promise<VerificationResult['email']> {
    try {
      // In production, call ZeroBounce or similar API
      // const response = await fetch(`https://api.zerobounce.net/v2/validate?api_key=${this.zeroBounceKey}&email=${email}`);
      
      // Mock implementation based on email pattern
      const isDisposable = this.isDisposableEmail(email);
      const isRoleBased = this.isRoleBasedEmail(email);
      const provider = this.detectEmailProvider(email);
      
      // Simulate validation
      const status = this.simulateEmailValidation(email);
      const score = status === 'valid' ? (isDisposable ? 60 : isRoleBased ? 70 : 95) : 
                    status === 'catch_all' ? 80 : 20;

      return {
        verified: status === 'valid',
        status,
        score,
        disposable: isDisposable,
        roleBased: isRoleBased,
        provider,
        riskLevel: isDisposable ? 'high' : isRoleBased ? 'medium' : 'low',
      };
    } catch (error) {
      this.logger.error('Email verification failed:', error);
      return {
        verified: false,
        status: 'unknown',
        score: 0,
        disposable: false,
        roleBased: false,
        riskLevel: 'high',
      };
    }
  }

  private isDisposableEmail(email: string): boolean {
    const disposableDomains = [
      'tempmail.com', 'throwaway.com', 'mailinator.com', 
      'guerrillamail.com', 'yopmail.com',
    ];
    const domain = email.split('@')[1]?.toLowerCase();
    return disposableDomains.includes(domain);
  }

  private isRoleBasedEmail(email: string): boolean {
    const rolePrefixes = ['admin', 'support', 'info', 'sales', 'marketing', 
                          'contact', 'help', 'service', 'team', 'office'];
    const prefix = email.split('@')[0]?.toLowerCase();
    return rolePrefixes.some((role) => prefix?.includes(role));
  }

  private detectEmailProvider(email: string): string {
    const domain = email.split('@')[1]?.toLowerCase();
    
    if (domain?.includes('gmail')) return 'gmail';
    if (domain?.includes('outlook') || domain?.includes('hotmail')) return 'outlook';
    if (domain?.includes('yahoo')) return 'yahoo';
    if (domain?.includes('icloud') || domain?.includes('me.com')) return 'apple';
    
    return 'corporate';
  }

  private simulateEmailValidation(email: string): 'valid' | 'invalid' | 'catch_all' | 'unknown' {
    // Simple simulation - in production use actual API
    if (email.includes('invalid')) return 'invalid';
    if (email.includes('catchall')) return 'catch_all';
    if (email.includes('unknown')) return 'unknown';
    return 'valid';
  }

  // ============================================================
  // PHONE VERIFICATION
  // ============================================================

  private async verifyPhone(phone: string): Promise<VerificationResult['phone']> {
    try {
      // In production, call Twilio Lookup API
      // const client = twilio(this.twilioSid, this.twilioToken);
      // const lookup = await client.lookups.v1.phoneNumbers(phone).fetch({ type: ['carrier'] });

      // Mock implementation
      const cleaned = phone.replace(/\D/g, '');
      
      // Basic validation
      const isValid = cleaned.length >= 10;
      const type = this.detectPhoneType(cleaned);
      
      return {
        verified: isValid,
        status: isValid ? type : 'invalid',
        carrier: isValid ? this.detectCarrier(cleaned) : undefined,
        country: cleaned.length > 10 ? 'US' : undefined,
        formatted: isValid ? this.formatPhone(cleaned) : undefined,
        riskLevel: isValid ? 'low' : 'high',
      };
    } catch (error) {
      this.logger.error('Phone verification failed:', error);
      return {
        verified: false,
        status: 'invalid',
        riskLevel: 'high',
      };
    }
  }

  private detectPhoneType(phone: string): 'mobile' | 'landline' | 'voip' {
    // Simple heuristic - in production use actual carrier data
    const voipPrefixes = ['500', '521', '522', '523', '524', '525'];
    const prefix = phone.substring(0, 3);
    
    if (voipPrefixes.includes(prefix)) return 'voip';
    if (phone.length === 10) return 'mobile';
    return 'landline';
  }

  private detectCarrier(phone: string): string {
    // Mock carrier detection
    const carriers = ['Verizon', 'AT&T', 'T-Mobile', 'Sprint'];
    return carriers[Math.floor(Math.random() * carriers.length)];
  }

  private formatPhone(phone: string): string {
    if (phone.length === 10) {
      return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    if (phone.length === 11 && phone.startsWith('1')) {
      return `+1 (${phone.slice(1, 4)}) ${phone.slice(4, 7)}-${phone.slice(7)}`;
    }
    return phone;
  }

  // ============================================================
  // BULK VERIFICATION
  // ============================================================

  async verifyContactsBulk(
    organizationId: string,
    contactIds: string[],
  ): Promise<{
    total: number;
    completed: number;
    failed: number;
    results: Array<{ contactId: string; result: VerificationResult }>;
  }> {
    const results: Array<{ contactId: string; result: VerificationResult }> = [];
    let completed = 0;
    let failed = 0;

    for (const contactId of contactIds) {
      try {
        const result = await this.verifyContact(organizationId, contactId);
        results.push({ contactId, result });
        completed++;
      } catch (error) {
        this.logger.error(`Failed to verify ${contactId}:`, error);
        failed++;
      }

      // Rate limiting - small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return {
      total: contactIds.length,
      completed,
      failed,
      results,
    };
  }

  // ============================================================
  // DATA QUALITY CHECKS
  // ============================================================

  async checkDataQuality(
    organizationId: string,
  ): Promise<{
    totalContacts: number;
    verifiedContacts: number;
    averageScore: number;
    qualityBreakdown: {
      excellent: number;
      good: number;
      fair: number;
      poor: number;
    };
    issues: Array<{
      type: string;
      count: number;
      description: string;
    }>;
  }> {
    const verifications = await this.prisma.contactVerification.findMany({
      where: { organizationId },
    });

    const totalContacts = await this.prisma.contact.count({
      where: { organizationId },
    });

    const scores = verifications.map((v) => v.overallScore);
    const averageScore = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 0;

    const qualityBreakdown = {
      excellent: verifications.filter((v) => v.overallScore >= 90).length,
      good: verifications.filter((v) => v.overallScore >= 70 && v.overallScore < 90).length,
      fair: verifications.filter((v) => v.overallScore >= 50 && v.overallScore < 70).length,
      poor: verifications.filter((v) => v.overallScore < 50).length,
    };

    const issues = [];
    
    const disposableEmails = verifications.filter((v) => v.emailDisposable).length;
    if (disposableEmails > 0) {
      issues.push({
        type: 'disposable_emails',
        count: disposableEmails,
        description: `${disposableEmails} contacts using disposable email addresses`,
      });
    }

    const invalidEmails = verifications.filter((v) => v.emailStatus === 'invalid').length;
    if (invalidEmails > 0) {
      issues.push({
        type: 'invalid_emails',
        count: invalidEmails,
        description: `${invalidEmails} contacts with invalid email addresses`,
      });
    }

    const highBounceRisk = verifications.filter((v) => v.bounceCount > 0).length;
    if (highBounceRisk > 0) {
      issues.push({
        type: 'bounce_risk',
        count: highBounceRisk,
        description: `${highBounceRisk} contacts with bounce history`,
      });
    }

    return {
      totalContacts,
      verifiedContacts: verifications.length,
      averageScore: Math.round(averageScore),
      qualityBreakdown,
      issues,
    };
  }

  // ============================================================
  // BOUNCE TRACKING
  // ============================================================

  async recordBounce(
    organizationId: string,
    contactId: string,
    bounceType: 'hard' | 'soft',
    reason?: string,
  ): Promise<void> {
    await this.prisma.contactVerification.update({
      where: { contactId },
      data: {
        bounceCount: { increment: 1 },
        lastBounceAt: new Date(),
        emailStatus: bounceType === 'hard' ? 'invalid' : undefined,
      },
    });

    // Log security event for hard bounces
    if (bounceType === 'hard') {
      await this.prisma.securityEvent.create({
        data: {
          organizationId,
          eventType: 'email_bounce',
          severity: 'medium',
          description: `Hard bounce recorded for contact ${contactId}: ${reason}`,
          metadata: { contactId, bounceType, reason },
        },
      });
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private calculateOverallScore(result: VerificationResult): number {
    let score = 0;
    let factors = 0;

    if (result.email) {
      score += result.email.score * 0.6; // Email is 60% weight
      factors++;
    }

    if (result.phone) {
      score += (result.phone.verified ? 100 : 0) * 0.4; // Phone is 40% weight
      factors++;
    }

    return factors > 0 ? Math.round(score) : 0;
  }

  private getDataQuality(score: number): 'poor' | 'fair' | 'good' | 'excellent' {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  private async saveVerificationResult(
    contactId: string,
    result: VerificationResult,
  ): Promise<void> {
    await this.prisma.contactVerification.upsert({
      where: { contactId },
      create: {
        contactId,
        organizationId: '', // Will be set from contact
        emailVerified: result.email?.verified || false,
        emailStatus: result.email?.status || 'unknown',
        emailScore: result.email?.score || 0,
        emailDisposable: result.email?.disposable || false,
        emailRoleBased: result.email?.roleBased || false,
        emailProvider: result.email?.provider,
        emailRiskLevel: result.email?.riskLevel || 'medium',
        phoneVerified: result.phone?.verified || false,
        phoneStatus: result.phone?.status || 'unknown',
        phoneCarrier: result.phone?.carrier,
        phoneCountry: result.phone?.country,
        phoneFormatted: result.phone?.formatted,
        phoneRiskLevel: result.phone?.riskLevel || 'medium',
        overallScore: result.overallScore,
        dataQuality: result.dataQuality,
        lastCheckedAt: new Date(),
      },
      update: {
        emailVerified: result.email?.verified || false,
        emailStatus: result.email?.status || 'unknown',
        emailScore: result.email?.score || 0,
        emailDisposable: result.email?.disposable || false,
        emailRoleBased: result.email?.roleBased || false,
        emailProvider: result.email?.provider,
        emailRiskLevel: result.email?.riskLevel || 'medium',
        phoneVerified: result.phone?.verified || false,
        phoneStatus: result.phone?.status || 'unknown',
        phoneCarrier: result.phone?.carrier,
        phoneCountry: result.phone?.country,
        phoneFormatted: result.phone?.formatted,
        phoneRiskLevel: result.phone?.riskLevel || 'medium',
        overallScore: result.overallScore,
        dataQuality: result.dataQuality,
        lastCheckedAt: new Date(),
      },
    });
  }

  private formatResult(verification: any): VerificationResult {
    return {
      email: verification ? {
        verified: verification.emailVerified,
        status: verification.emailStatus,
        score: verification.emailScore,
        disposable: verification.emailDisposable,
        roleBased: verification.emailRoleBased,
        provider: verification.emailProvider,
        riskLevel: verification.emailRiskLevel,
      } : undefined,
      phone: verification ? {
        verified: verification.phoneVerified,
        status: verification.phoneStatus,
        carrier: verification.phoneCarrier,
        country: verification.phoneCountry,
        formatted: verification.phoneFormatted,
        riskLevel: verification.phoneRiskLevel,
      } : undefined,
      overallScore: verification?.overallScore || 0,
      dataQuality: verification?.dataQuality || 'poor',
    };
  }
}
