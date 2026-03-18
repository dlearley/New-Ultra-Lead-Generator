import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { ClearbitProvider } from './providers/clearbit.provider';
import { HunterProvider } from './providers/hunter.provider';
import { BuiltWithProvider } from './providers/builtwith.provider';
import {
  CompanyEnrichmentResult,
  PersonEnrichmentResult,
  EmailVerificationResult,
  TechnologyDetectionResult,
  EnrichmentError,
} from './providers/enrichment-provider.interface';

export interface EnrichmentJob {
  contactId?: string;
  companyId?: string;
  email?: string;
  domain?: string;
  priority: 'high' | 'normal' | 'low';
  fields: ('email' | 'phone' | 'company' | 'person' | 'technology')[];
}

export interface EnrichmentResult {
  success: boolean;
  contactId?: string;
  companyId?: string;
  fieldsEnriched: string[];
  creditsUsed: number;
  errors: EnrichmentError[];
  durationMs: number;
}

@Injectable()
export class EnrichmentService {
  private readonly logger = new Logger(EnrichmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clearbit: ClearbitProvider,
    private readonly hunter: HunterProvider,
    private readonly builtwith: BuiltWithProvider
  ) {}

  async getProviderStatus(): Promise<
    Array<{ name: string; connected: boolean }>
  > {
    const [clearbitConnected, hunterConnected, builtwithConnected] = await Promise.all([
      this.clearbit.testConnection(),
      this.hunter.testConnection(),
      this.builtwith.testConnection(),
    ]);

    return [
      { name: 'clearbit', connected: clearbitConnected },
      { name: 'hunter', connected: hunterConnected },
      { name: 'builtwith', connected: builtwithConnected },
    ];
  }

  async enrichContact(contactId: string): Promise<EnrichmentResult> {
    const startTime = Date.now();
    const errors: EnrichmentError[] = [];
    const fieldsEnriched: string[] = [];
    let creditsUsed = 0;

    try {
      // Get contact from database
      const contact = await this.prisma.contact.findUnique({
        where: { id: contactId },
        include: { company: true },
      });

      if (!contact) {
        return {
          success: false,
          contactId,
          fieldsEnriched: [],
          creditsUsed: 0,
          errors: [{ provider: 'system', error: 'Contact not found', retryable: false }],
          durationMs: Date.now() - startTime,
        };
      }

      // Check enrichment credits
      const hasCredits = await this.checkEnrichmentCredits(contact.organizationId, 1);
      if (!hasCredits) {
        return {
          success: false,
          contactId,
          fieldsEnriched: [],
          creditsUsed: 0,
          errors: [{ provider: 'system', error: 'Insufficient enrichment credits', retryable: false }],
          durationMs: Date.now() - startTime,
        };
      }

      // 1. Verify email if present
      if (contact.email) {
        const emailResult = await this.enrichEmail(contact.email);
        if (emailResult.error) {
          errors.push(emailResult.error);
        } else if (emailResult.result) {
          await this.prisma.contact.update({
            where: { id: contactId },
            data: {
              emailStatus: emailResult.result.status,
            },
          });
          fieldsEnriched.push('email_status');
          creditsUsed++;
        }
      }

      // 2. Enrich person data if email present
      if (contact.email) {
        const personResult = await this.enrichPerson(contact.email);
        if (personResult.error) {
          errors.push(personResult.error);
        } else if (personResult.result) {
          const updateData: Record<string, unknown> = {};
          if (personResult.result.firstName) updateData.firstName = personResult.result.firstName;
          if (personResult.result.lastName) updateData.lastName = personResult.result.lastName;
          if (personResult.result.title) updateData.title = personResult.result.title;
          if (personResult.result.seniority) updateData.seniority = personResult.result.seniority;
          if (personResult.result.department) updateData.department = personResult.result.department;
          if (personResult.result.linkedInUrl) updateData.linkedInUrl = personResult.result.linkedInUrl;

          if (Object.keys(updateData).length > 0) {
            await this.prisma.contact.update({
              where: { id: contactId },
              data: updateData,
            });
            fieldsEnriched.push(...Object.keys(updateData));
            creditsUsed++;
          }
        }
      }

      // 3. Enrich company if domain available
      const domain = contact.company?.domain || this.extractDomain(contact.email);
      if (domain) {
        const companyResult = await this.enrichCompany(domain);
        if (companyResult.error) {
          errors.push(companyResult.error);
        } else if (companyResult.result) {
          // Update or create company
          const companyData = {
            name: companyResult.result.name,
            description: companyResult.result.description,
            industry: companyResult.result.industry,
            employeeCount: companyResult.result.employeeCount,
            annualRevenue: companyResult.result.annualRevenue,
            linkedInUrl: companyResult.result.linkedInUrl,
            twitterHandle: companyResult.result.twitterHandle,
            enrichedAt: new Date(),
            enrichmentSource: 'clearbit',
          };

          if (contact.companyId) {
            await this.prisma.company.update({
              where: { id: contact.companyId },
              data: companyData,
            });
          } else {
            const company = await this.prisma.company.create({
              data: {
                ...companyData,
                domain,
                organizationId: contact.organizationId,
              },
            });
            await this.prisma.contact.update({
              where: { id: contactId },
              data: { companyId: company.id },
            });
          }
          fieldsEnriched.push('company');
          creditsUsed++;

          // 4. Detect technologies
          const techResult = await this.detectTechnologies(domain);
          if (techResult.error) {
            errors.push(techResult.error);
          } else if (techResult.result?.technologies) {
            // Save technologies
            for (const tech of techResult.result.technologies) {
              await this.saveTechnology(
                contact.companyId!,
                tech.name,
                tech.category,
                tech.confidence
              );
            }
            fieldsEnriched.push('technologies');
            creditsUsed++;
          }
        }
      }

      // Update contact enrichment metadata
      await this.prisma.contact.update({
        where: { id: contactId },
        data: {
          enrichedAt: new Date(),
          enrichmentSource: fieldsEnriched.length > 0 ? 'multi' : undefined,
          enrichmentAttempts: { increment: 1 },
        },
      });

      // Log enrichment
      await this.prisma.enrichmentLog.create({
        data: {
          contactId,
          source: 'multi',
          status: fieldsEnriched.length > 0 ? 'completed' : 'failed',
          fieldsEnriched,
          creditsUsed,
        },
      });

      // Deduct credits
      await this.deductEnrichmentCredits(contact.organizationId, creditsUsed);

      return {
        success: fieldsEnriched.length > 0,
        contactId,
        fieldsEnriched,
        creditsUsed,
        errors,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error(`Enrichment failed for contact ${contactId}:`, error);
      return {
        success: false,
        contactId,
        fieldsEnriched,
        creditsUsed,
        errors: [
          ...errors,
          {
            provider: 'system',
            error: error instanceof Error ? error.message : 'Unknown error',
            retryable: true,
          },
        ],
        durationMs: Date.now() - startTime,
      };
    }
  }

  async enrichEmail(email: string): Promise<{
    result?: EmailVerificationResult;
    error?: EnrichmentError;
  }> {
    return this.hunter.verifyEmail(email);
  }

  async enrichPerson(email: string): Promise<{
    result?: PersonEnrichmentResult;
    error?: EnrichmentError;
  }> {
    return this.clearbit.enrichPerson(email);
  }

  async enrichCompany(domain: string): Promise<{
    result?: CompanyEnrichmentResult;
    error?: EnrichmentError;
  }> {
    return this.clearbit.enrichCompany(domain);
  }

  async detectTechnologies(domain: string): Promise<{
    result?: TechnologyDetectionResult;
    error?: EnrichmentError;
  }> {
    return this.builtwith.detectTechnologies(domain);
  }

  async findEmail(
    domain: string,
    firstName?: string,
    lastName?: string
  ): Promise<{ email?: string; confidence?: number; error?: EnrichmentError }> {
    return this.hunter.findEmail(domain, firstName, lastName);
  }

  private extractDomain(email: string | null): string | null {
    if (!email) return null;
    const match = email.match(/@(.+)$/);
    return match ? match[1] : null;
  }

  private async checkEnrichmentCredits(
    organizationId: string,
    required: number
  ): Promise<boolean> {
    const credits = await this.prisma.enrichmentCredit.aggregate({
      where: {
        organizationId,
        remaining: { gt: 0 },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      _sum: {
        remaining: true,
      },
    });

    return (credits._sum.remaining || 0) >= required;
  }

  private async deductEnrichmentCredits(
    organizationId: string,
    amount: number
  ): Promise<void> {
    const credits = await this.prisma.enrichmentCredit.findMany({
      where: {
        organizationId,
        remaining: { gt: 0 },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }],
    });

    let remainingToDeduct = amount;

    for (const credit of credits) {
      if (remainingToDeduct <= 0) break;

      const deductAmount = Math.min(credit.remaining, remainingToDeduct);
      await this.prisma.enrichmentCredit.update({
        where: { id: credit.id },
        data: {
          used: { increment: deductAmount },
          remaining: { decrement: deductAmount },
        },
      });
      remainingToDeduct -= deductAmount;
    }
  }

  private async saveTechnology(
    companyId: string,
    techName: string,
    category: string,
    confidence: number
  ): Promise<void> {
    // Find or create technology
    let technology = await this.prisma.technology.findUnique({
      where: { name: techName },
    });

    if (!technology) {
      technology = await this.prisma.technology.create({
        data: {
          name: techName,
          slug: techName.toLowerCase().replace(/\s+/g, '-'),
          category: this.mapTechCategory(category),
        },
      });
    }

    // Create or update company-technology relationship
    await this.prisma.companyTechnology.upsert({
      where: {
        companyId_technologyId: {
          companyId,
          technologyId: technology.id,
        },
      },
      update: {
        confidence,
        lastSeenAt: new Date(),
        isActive: true,
      },
      create: {
        companyId,
        technologyId: technology.id,
        confidence,
        detectionMethod: 'api',
      },
    });
  }

  private mapTechCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      crm: 'crm',
      'marketing automation': 'marketing_automation',
      analytics: 'analytics',
      ecommerce: 'ecommerce',
      communication: 'communication',
      productivity: 'productivity',
      infrastructure: 'infrastructure',
      security: 'security',
      'dev tools': 'dev_tools',
    };

    return categoryMap[category.toLowerCase()] || 'other';
  }
}
