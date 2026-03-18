import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EnrichmentProvider,
  EmailVerificationResult,
  EnrichmentError,
} from './enrichment-provider.interface';

interface HunterEmailFinderResponse {
  data?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    position?: string;
    company?: string;
    domain?: string;
    sources?: Array<{ domain: string; uri: string; extracted_on: string } >;
  };
  meta?: {
    results: number;
  };
}

interface HunterEmailVerifierResponse {
  data?: {
    status?: 'valid' | 'invalid' | 'catch_all' | 'unknown';
    result?: 'deliverable' | 'undeliverable' | 'risky';
    score?: number;
    email?: string;
    regexp?: boolean;
    gibberish?: boolean;
    disposable?: boolean;
    webmail?: boolean;
    mx_records?: boolean;
    smtp_server?: boolean;
    smtp_check?: boolean;
    accept_all?: boolean;
    block?: boolean;
    sources?: Array<{ domain: string; uri: string; extracted_on: string } >;
  };
}

@Injectable()
export class HunterProvider implements EnrichmentProvider {
  readonly name = 'hunter';
  private readonly logger = new Logger(HunterProvider.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://api.hunter.io/v2';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('HUNTER_API_KEY');
  }

  async testConnection(): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn('Hunter API key not configured');
      return false;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/account?api_key=${this.apiKey}`
      );
      return response.ok;
    } catch (error) {
      this.logger.error('Hunter connection test failed:', error);
      return false;
    }
  }

  async verifyEmail(email: string): Promise<{
    result?: EmailVerificationResult;
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
        `${this.baseUrl}/email-verifier?email=${encodeURIComponent(email)}&api_key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data: HunterEmailVerifierResponse = await response.json();

      if (!data.data) {
        return {
          error: {
            provider: this.name,
            error: 'No data returned',
            retryable: false,
          },
        };
      }

      const result: EmailVerificationResult = {
        email: data.data.email || email,
        status: this.mapStatus(data.data.status),
        isDeliverable: data.data.result === 'deliverable',
        isDisposable: data.data.disposable || false,
        isRoleAccount: false, // Hunter doesn't provide this directly
        isFreeProvider: data.data.webmail || false,
        hasMxRecord: data.data.mx_records || false,
        mxDomain: undefined,
        smtpVerified: data.data.smtp_check || false,
        confidence: (data.data.score || 0) / 100,
        score: data.data.score,
        source: this.name,
      };

      return { result };
    } catch (error) {
      this.logger.error(`Hunter email verification failed for ${email}:`, error);
      return {
        error: {
          provider: this.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      };
    }
  }

  async findEmail(
    domain: string,
    firstName?: string,
    lastName?: string
  ): Promise<{
    email?: string;
    confidence?: number;
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
      let url = `${this.baseUrl}/email-finder?domain=${encodeURIComponent(domain)}&api_key=${this.apiKey}`;

      if (firstName) {
        url += `&first_name=${encodeURIComponent(firstName)}`;
      }
      if (lastName) {
        url += `&last_name=${encodeURIComponent(lastName)}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data: HunterEmailFinderResponse = await response.json();

      if (!data.data?.email) {
        return {
          error: {
            provider: this.name,
            error: 'Email not found',
            retryable: false,
          },
        };
      }

      return {
        email: data.data.email,
        confidence: data.meta?.results ? Math.min(data.meta.results / 10, 1) : 0.5,
      };
    } catch (error) {
      this.logger.error(`Hunter email finder failed for ${domain}:`, error);
      return {
        error: {
          provider: this.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      };
    }
  }

  async getDomainEmails(domain: string): Promise<{
    emails: Array<{
      email: string;
      firstName?: string;
      lastName?: string;
      position?: string;
      confidence?: number;
    }>;
    error?: EnrichmentError;
  }> {
    if (!this.apiKey) {
      return {
        emails: [],
        error: {
          provider: this.name,
          error: 'API key not configured',
          retryable: false,
        },
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/domain-search?domain=${encodeURIComponent(domain)}&api_key=${this.apiKey}&limit=100`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();

      const emails =
        data.data?.emails?.map(
          (e: {
            value: string;
            first_name?: string;
            last_name?: string;
            position?: string;
            confidence?: number;
          }) => ({
            email: e.value,
            firstName: e.first_name,
            lastName: e.last_name,
            position: e.position,
            confidence: e.confidence,
          })
        ) || [];

      return { emails };
    } catch (error) {
      this.logger.error(`Hunter domain search failed for ${domain}:`, error);
      return {
        emails: [],
        error: {
          provider: this.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      };
    }
  }

  private mapStatus(
    status: string | undefined
  ): 'valid' | 'invalid' | 'catch_all' | 'unknown' | 'risky' {
    switch (status) {
      case 'valid':
        return 'valid';
      case 'invalid':
        return 'invalid';
      case 'catch_all':
        return 'catch_all';
      case 'unknown':
        return 'unknown';
      default:
        return 'unknown';
    }
  }
}
