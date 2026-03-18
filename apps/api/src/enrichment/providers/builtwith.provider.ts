import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EnrichmentProvider,
  TechnologyDetectionResult,
  EnrichmentError,
} from './enrichment-provider.interface';

interface BuiltWithResponse {
  Results?: Array<{
    Result?: {
      Path?: string;
      SubDomain?: string;
      TopLevelDomain?: string;
      Domain?: string;
      Technologies?: Array<{
        Name?: string;
        Tag?: string; // Category
        FirstDetected?: number; // Unix timestamp
        LastDetected?: number;
      }>;
    };
  }>;
}

@Injectable()
export class BuiltWithProvider implements EnrichmentProvider {
  readonly name = 'builtwith';
  private readonly logger = new Logger(BuiltWithProvider.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://api.builtwith.com/v20/api.json';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BUILTWITH_API_KEY');
  }

  async testConnection(): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn('BuiltWith API key not configured');
      return false;
    }

    try {
      // Test with a known domain
      const response = await fetch(
        `${this.baseUrl}?KEY=${this.apiKey}&LOOKUP=builtwith.com`
      );
      return response.ok;
    } catch (error) {
      this.logger.error('BuiltWith connection test failed:', error);
      return false;
    }
  }

  async detectTechnologies(domain: string): Promise<{
    result?: TechnologyDetectionResult;
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
        `${this.baseUrl}?KEY=${this.apiKey}&LOOKUP=${encodeURIComponent(domain)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data: BuiltWithResponse = await response.json();

      if (!data.Results?.[0]?.Result?.Technologies) {
        return {
          result: {
            domain,
            technologies: [],
            detectedAt: new Date(),
            source: this.name,
          },
        };
      }

      const technologies = data.Results[0].Result.Technologies.map(
        (tech: { Name?: string; Tag?: string; FirstDetected?: number; LastDetected?: number }) => ({
          name: tech.Name || 'Unknown',
          category: this.mapCategory(tech.Tag),
          confidence: 0.95,
          firstDetectedAt: tech.FirstDetected
            ? new Date(tech.FirstDetected * 1000)
            : undefined,
          lastSeenAt: tech.LastDetected
            ? new Date(tech.LastDetected * 1000)
            : undefined,
        })
      );

      const result: TechnologyDetectionResult = {
        domain,
        technologies,
        detectedAt: new Date(),
        source: this.name,
      };

      return { result };
    } catch (error) {
      this.logger.error(`BuiltWith technology detection failed for ${domain}:`, error);
      return {
        error: {
          provider: this.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      };
    }
  }

  async detectBatch(domains: string[]): Promise<
    Array<{
      domain: string;
      result?: TechnologyDetectionResult;
      error?: EnrichmentError;
    }>
  > {
    if (!this.apiKey) {
      return domains.map((domain) => ({
        domain,
        error: {
          provider: this.name,
          error: 'API key not configured',
          retryable: false,
        },
      }));
    }

    // BuiltWith supports batch lookups with comma-separated domains
    const batchSize = 10;
    const results: Array<{
      domain: string;
      result?: TechnologyDetectionResult;
      error?: EnrichmentError;
    }> = [];

    for (let i = 0; i < domains.length; i += batchSize) {
      const batch = domains.slice(i, i + batchSize);
      const domainList = batch.join(',');

      try {
        const response = await fetch(
          `${this.baseUrl}?KEY=${this.apiKey}&LOOKUP=${encodeURIComponent(domainList)}`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: BuiltWithResponse = await response.json();

        batch.forEach((domain) => {
          const resultData = data.Results?.find(
            (r) =>
              r.Result?.Domain?.toLowerCase() === domain.toLowerCase() ||
              r.Result?.Path?.toLowerCase().includes(domain.toLowerCase())
          );

          if (resultData?.Result?.Technologies) {
            results.push({
              domain,
              result: {
                domain,
                technologies: resultData.Result.Technologies.map(
                  (tech: { Name?: string; Tag?: string }) => ({
                    name: tech.Name || 'Unknown',
                    category: this.mapCategory(tech.Tag),
                    confidence: 0.95,
                  })
                ),
                detectedAt: new Date(),
                source: this.name,
              },
            });
          } else {
            results.push({
              domain,
              result: {
                domain,
                technologies: [],
                detectedAt: new Date(),
                source: this.name,
              },
            });
          }
        });
      } catch (error) {
        batch.forEach((domain) => {
          results.push({
            domain,
            error: {
              provider: this.name,
              error: error instanceof Error ? error.message : 'Unknown error',
              retryable: true,
            },
          });
        });
      }
    }

    return results;
  }

  private mapCategory(builtWithTag: string | undefined): string {
    if (!builtWithTag) return 'other';

    const categoryMap: Record<string, string> = {
      analytics: 'analytics',
      'marketing-automation': 'marketing_automation',
      crm: 'crm',
      ecommerce: 'ecommerce',
      'email-hosting': 'communication',
      'web-hosting': 'infrastructure',
      cdn: 'infrastructure',
      'ssl-certificates': 'security',
      'programming-languages': 'dev_tools',
      'ui-frameworks': 'dev_tools',
      'ad-networks': 'marketing',
      'social-tools': 'marketing',
    };

    return categoryMap[builtWithTag.toLowerCase()] || 'other';
  }
}
