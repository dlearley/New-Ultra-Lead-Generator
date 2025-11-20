import type { ErrorContext } from '../types/index.js';
import { AIError } from '../types/index.js';

export { AIError };

export interface NormalizedError {
  originalError: Error;
  normalizedError: AIError;
  isRetryable: boolean;
  statusCode?: number;
}

export interface ErrorNormalizerConfig {
  retryableStatuses?: number[];
  retryableMessages?: RegExp[];
}

export class ErrorNormalizer {
  private config: ErrorNormalizerConfig;
  private static readonly DEFAULT_RETRYABLE_STATUSES = [408, 429, 500, 502, 503, 504];
  private static readonly DEFAULT_RETRYABLE_MESSAGES = [
    /timeout/i,
    /rate limit/i,
    /temporarily unavailable/i,
    /service unavailable/i,
  ];

  constructor(config?: ErrorNormalizerConfig) {
    this.config = {
      retryableStatuses: config?.retryableStatuses || ErrorNormalizer.DEFAULT_RETRYABLE_STATUSES,
      retryableMessages: config?.retryableMessages || ErrorNormalizer.DEFAULT_RETRYABLE_MESSAGES,
    };
  }

  normalize(error: unknown, provider: string): NormalizedError {
    const originalError = error instanceof Error ? error : new Error(String(error));
    const isRetryable = this.isRetryable(originalError);
    const statusCode = this.extractStatusCode(originalError);
    const code = this.extractCode(originalError);

    const context: ErrorContext = {
      provider,
      code,
      message: originalError.message,
      retryable: isRetryable,
      statusCode,
    };

    const normalizedError = new AIError(context, originalError.message);

    return {
      originalError,
      normalizedError,
      isRetryable,
      statusCode,
    };
  }

  private isRetryable(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    for (const pattern of this.config.retryableMessages || []) {
      if (pattern.test(message)) {
        return true;
      }
    }

    const statusCode = this.extractStatusCode(error);
    if (statusCode && this.config.retryableStatuses?.includes(statusCode)) {
      return true;
    }

    return false;
  }

  private extractStatusCode(error: Error): number | undefined {
    const anyError = error as unknown as Record<string, unknown>;
    
    if (typeof anyError.status === 'number') {
      return anyError.status;
    }
    
    if (typeof anyError.statusCode === 'number') {
      return anyError.statusCode;
    }

    const match = error.message.match(/(\d{3})/);
    if (match) {
      return parseInt(match[1], 10);
    }

    return undefined;
  }

  private extractCode(error: Error): string | undefined {
    const anyError = error as unknown as Record<string, unknown>;
    
    if (typeof anyError.code === 'string') {
      return anyError.code;
    }

    if (typeof anyError.type === 'string') {
      return anyError.type;
    }

    return undefined;
  }
}

export const createErrorNormalizer = (config?: ErrorNormalizerConfig): ErrorNormalizer => {
  return new ErrorNormalizer(config);
};

export function formatError(error: AIError): string {
  const { context } = error;
  return `[${context.provider.toUpperCase()}] ${context.code || 'ERROR'}: ${context.message}`;
}
