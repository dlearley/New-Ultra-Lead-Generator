import type { AIMessage, AIGenerationOptions, AIGenerationResponse, AIProvider, ProviderConfig } from '../types/index.js';
import { AIError } from '../types/index.js';

export abstract class BaseProvider implements AIProvider {
  abstract name: string;
  abstract version: string;

  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    if (!config.apiKey) {
      throw new Error(`${this.constructor.name} requires apiKey in config`);
    }
    this.config = config;
  }

  abstract generate(
    messages: AIMessage[],
    options?: AIGenerationOptions
  ): Promise<AIGenerationResponse>;

  abstract stream(
    messages: AIMessage[],
    options?: AIGenerationOptions
  ): AsyncIterable<string>;

  validateSchema(data: unknown, schema: Record<string, unknown>): boolean {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const dataObj = data as Record<string, unknown>;

    for (const key in schema) {
      if (!(key in dataObj)) {
        return false;
      }
    }

    return true;
  }

  sanitize(content: string): string {
    return content
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, this.config.model ? 50000 : 10000);
  }

  protected checkApiKey(): void {
    if (!this.config.apiKey) {
      throw new AIError(
        {
          provider: this.name,
          message: 'API key not configured',
          retryable: false,
        },
        'API key not configured'
      );
    }
  }

  protected getTimeout(): number {
    return this.config.timeout || 30000;
  }

  protected getModel(): string {
    return this.config.model || 'default';
  }
}
