import { describe, it, expect } from 'vitest';
import { AIError, ErrorNormalizer, createErrorNormalizer, formatError } from '../../src/errors/index.js';

describe('Error Handling', () => {
  describe('AIError', () => {
    it('should create AIError with context', () => {
      const context = {
        provider: 'openai',
        code: 'RATE_LIMIT',
        message: 'Rate limit exceeded',
        retryable: true,
        statusCode: 429,
      };

      const error = new AIError(context);
      expect(error.context).toEqual(context);
      expect(error.message).toBe('Rate limit exceeded');
    });

    it('should create AIError with custom message', () => {
      const context = {
        provider: 'openai',
        message: 'Original message',
        retryable: false,
      };

      const error = new AIError(context, 'Custom message');
      expect(error.message).toBe('Custom message');
      expect(error.context.message).toBe('Original message');
    });

    it('should have correct name', () => {
      const error = new AIError({
        provider: 'openai',
        message: 'Test',
        retryable: false,
      });

      expect(error.name).toBe('AIError');
    });

    it('should be instanceof Error', () => {
      const error = new AIError({
        provider: 'openai',
        message: 'Test',
        retryable: false,
      });

      expect(error instanceof Error).toBe(true);
    });
  });

  describe('ErrorNormalizer', () => {
    let normalizer: ErrorNormalizer;

    beforeEach(() => {
      normalizer = new ErrorNormalizer();
    });

    it('should normalize standard Error', () => {
      const error = new Error('Test error');
      const normalized = normalizer.normalize(error, 'openai', 'gpt-4');

      expect(normalized.normalizedError).toBeDefined();
      expect(normalized.normalizedError instanceof AIError).toBe(true);
      expect(normalized.normalizedError.context.provider).toBe('openai');
    });

    it('should detect timeout as retryable', () => {
      const error = new Error('Request timeout');
      const normalized = normalizer.normalize(error, 'openai');

      expect(normalized.isRetryable).toBe(true);
    });

    it('should detect rate limit as retryable', () => {
      const error = new Error('Rate limit exceeded');
      const normalized = normalizer.normalize(error, 'openai');

      expect(normalized.isRetryable).toBe(true);
    });

    it('should detect 429 status as retryable', () => {
      const error: any = new Error('Too many requests');
      error.status = 429;
      const normalized = normalizer.normalize(error, 'openai');

      expect(normalized.isRetryable).toBe(true);
    });

    it('should detect 503 status as retryable', () => {
      const error: any = new Error('Service unavailable');
      error.statusCode = 503;
      const normalized = normalizer.normalize(error, 'openai');

      expect(normalized.isRetryable).toBe(true);
    });

    it('should detect non-retryable errors', () => {
      const error = new Error('Invalid request');
      const normalized = normalizer.normalize(error, 'openai');

      expect(normalized.isRetryable).toBe(false);
    });

    it('should extract status code from error.status', () => {
      const error: any = new Error('Error');
      error.status = 500;
      const normalized = normalizer.normalize(error, 'openai');

      expect(normalized.statusCode).toBe(500);
    });

    it('should extract status code from error.statusCode', () => {
      const error: any = new Error('Error');
      error.statusCode = 401;
      const normalized = normalizer.normalize(error, 'openai');

      expect(normalized.statusCode).toBe(401);
    });

    it('should extract error code', () => {
      const error: any = new Error('Error');
      error.code = 'ECONNREFUSED';
      const normalized = normalizer.normalize(error, 'openai');

      expect(normalized.normalizedError.context.code).toBe('ECONNREFUSED');
    });

    it('should use createErrorNormalizer', () => {
      const normalizer = createErrorNormalizer();
      expect(normalizer).toBeDefined();
      expect(normalizer instanceof ErrorNormalizer).toBe(true);
    });

    it('should accept custom config', () => {
      const customNormalizer = new ErrorNormalizer({
        retryableStatuses: [500, 502],
      });

      const error: any = new Error('Error');
      error.status = 500;
      const normalized = customNormalizer.normalize(error, 'openai');

      expect(normalized.isRetryable).toBe(true);
    });
  });

  describe('formatError', () => {
    it('should format error with provider and code', () => {
      const error = new AIError({
        provider: 'openai',
        code: 'RATE_LIMIT',
        message: 'Rate limit exceeded',
        retryable: true,
        statusCode: 429,
      });

      const formatted = formatError(error);
      expect(formatted).toContain('OPENAI');
      expect(formatted).toContain('RATE_LIMIT');
      expect(formatted).toContain('Rate limit exceeded');
    });

    it('should format error without code', () => {
      const error = new AIError({
        provider: 'anthropic',
        message: 'API error',
        retryable: false,
      });

      const formatted = formatError(error);
      expect(formatted).toContain('ANTHROPIC');
      expect(formatted).toContain('ERROR');
      expect(formatted).toContain('API error');
    });

    it('should uppercase provider name', () => {
      const error = new AIError({
        provider: 'openai',
        message: 'Test',
        retryable: false,
      });

      const formatted = formatError(error);
      expect(formatted).toContain('[OPENAI]');
    });
  });

  describe('error normalization flow', () => {
    it('should preserve stack trace information', () => {
      const originalError = new Error('Original error');
      const normalizer = new ErrorNormalizer();
      const normalized = normalizer.normalize(originalError, 'openai');

      expect(normalized.originalError).toBe(originalError);
      expect(normalized.normalizedError.message).toBe('Original error');
    });

    it('should handle non-Error objects', () => {
      const normalizer = new ErrorNormalizer();
      const normalized = normalizer.normalize('String error', 'openai');

      expect(normalized.normalizedError).toBeDefined();
      expect(normalized.normalizedError.message).toContain('String error');
    });

    it('should identify retryable vs non-retryable', () => {
      const normalizer = new ErrorNormalizer();

      const retryableError = new Error('Service temporarily unavailable');
      const retryableNormalized = normalizer.normalize(retryableError, 'openai');

      const nonRetryableError = new Error('Invalid API key');
      const nonRetryableNormalized = normalizer.normalize(nonRetryableError, 'openai');

      expect(retryableNormalized.isRetryable).toBe(true);
      expect(nonRetryableNormalized.isRetryable).toBe(false);
    });
  });
});
