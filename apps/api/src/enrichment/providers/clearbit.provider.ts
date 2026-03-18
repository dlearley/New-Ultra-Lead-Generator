import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EnrichmentProvider,
  CompanyEnrichmentResult,
  PersonEnrichmentResult,
  EnrichmentError,
} from './enrichment-provider.interface';

@Injectable()
export class ClearbitProvider implements EnrichmentProvider {
  readonly name = 'clearbit';
  private readonly logger = new Logger(ClearbitProvider.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://person.clearbit.com/v2';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('CLEARBIT_API_KEY');
  }

  async testConnection(): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn('Clearbit API key not configured');
      return false;
    }

    try {
      // Test with a known domain
      const response = await fetch(
        `${this.baseUrl}/combined/find?email=alex@clearbit.com`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      return response.status === 200 || response.status === 404; // 404 is OK, means API is working
    } catch (error) {
      this.logger.error('Clearbit connection test failed:', error);
      return false;
    }
  }

  async enrichCompany(domain: string): Promise<{
    result?: CompanyEnrichmentResult;
    error?: EnrichmentError;
  }> {
    if (!this.apiKey) {
      return {
        error: {
          provider: this.name,
          error: 'API key not configured',
          retryable: false,
        },
      };
    }

    try {
      const response = await fetch(
        `https://company.clearbit.com/v2/companies/find?domain=${encodeURIComponent(domain)}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      if (response.status === 404) {
        return {
          error: {
            provider: this.name,
            error: 'Company not found',
            retryable: false,
          },
        };
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json() as any;

      const result: CompanyEnrichmentResult = {
        name: data.name,
        domain: data.domain,
        description: data.description,
        industry: data.category?.industry,
        subIndustry: data.category?.subIndustry,
        employeeCount: data.metrics?.employees,
        employeeRange: data.metrics?.employeesRange,
        annualRevenue: data.metrics?.estimatedAnnualRevenue,
        foundedYear: data.foundedYear,
        logo: data.logo,
        headquarters: data.geo
          ? {
              address: data.geo.streetAddress,
              city: data.geo.city,
              state: data.geo.state,
              country: data.geo.country,
              postalCode: data.geo.postalCode,
            }
          : undefined,
        linkedInUrl: data.linkedin?.handle
          ? `https://linkedin.com/company/${data.linkedin.handle}`
          : undefined,
        twitterHandle: data.twitter?.handle,
        facebookUrl: data.facebook?.handle
          ? `https://facebook.com/${data.facebook.handle}`
          : undefined,
        technologies: data.tech?.map((t: { name: string }) => t.name),
        confidence: 0.9,
        source: this.name,
      };

      return { result };
    } catch (error) {
      this.logger.error(`Clearbit company enrichment failed for ${domain}:`, error);
      return {
        error: {
          provider: this.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      };
    }
  }

  async enrichPerson(email: string): Promise<{
    result?: PersonEnrichmentResult;
    error?: EnrichmentError;
  }> {
    if (!this.apiKey) {
      return {
        error: {
          provider: this.name,
          error: 'API key not configured',
          retryable: false,
        },
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/combined/find?email=${encodeURIComponent(email)}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      if (response.status === 404) {
        return {
          error: {
            provider: this.name,
            error: 'Person not found',
            retryable: false,
          },
        };
      }

      if (response.status === 202) {
        // Clearbit is still processing
        return {
          error: {
            provider: this.name,
            error: 'Enrichment in progress',
            code: 'PENDING',
            retryable: true,
          },
        };
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json() as any;
      const person = data.person;
      const company = data.company;

      const result: PersonEnrichmentResult = {
        firstName: person?.name?.givenName,
        lastName: person?.name?.familyName,
        fullName: person?.name?.fullName,
        email: person?.email,
        title: person?.employment?.title,
        seniority: person?.employment?.seniority,
        department: person?.employment?.role,
        linkedInUrl: person?.linkedin?.handle
          ? `https://linkedin.com/in/${person.linkedin.handle}`
          : undefined,
        twitterHandle: person?.twitter?.handle,
        githubUsername: person?.github?.handle,
        location: person?.location
          ? {
              city: person.geo?.city,
              state: person.geo?.state,
              country: person.geo?.country,
            }
          : undefined,
        company: company
          ? {
              name: company.name,
              domain: company.domain,
              title: person?.employment?.title,
            }
          : undefined,
        confidence: 0.85,
        source: this.name,
      };

      return { result };
    } catch (error) {
      this.logger.error(`Clearbit person enrichment failed for ${email}:`, error);
      return {
        error: {
          provider: this.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      };
    }
  }

  async enrichByDomain(domain: string): Promise<{
    company?: CompanyEnrichmentResult;
    error?: EnrichmentError;
  }> {
    return this.enrichCompany(domain);
  }
}
