import { describe, it, expect, beforeEach } from 'vitest';
import { MockProvider } from '../../src/providers/mock.js';

describe('MockProvider', () => {
  let provider: MockProvider;

  beforeEach(() => {
    provider = new MockProvider();
  });

  describe('generate', () => {
    it('should generate a response', async () => {
      const response = await provider.generate([
        { role: 'user', content: 'Hello' },
      ]);

      expect(response.content).toBeDefined();
      expect(response.content.length).toBeGreaterThan(0);
      expect(response.usage).toBeDefined();
      expect(response.usage.totalTokens).toBeGreaterThan(0);
    });

    it('should respond to classification prompts', async () => {
      const response = await provider.generate([
        { role: 'user', content: 'classify this text' },
      ]);

      expect(response.content).toContain('Category');
    });

    it('should respond to summarization prompts', async () => {
      const response = await provider.generate([
        { role: 'user', content: 'summarize the text' },
      ]);

      expect(response.content).toContain('summary');
    });

    it('should support custom response override', async () => {
      const customProvider = new MockProvider({}, { responseOverride: 'Custom response' });
      const response = await customProvider.generate([
        { role: 'user', content: 'test' },
      ]);

      expect(response.content).toBe('Custom response');
    });

    it('should handle delay option', async () => {
      const delayProvider = new MockProvider({}, { delay: 30 });
      const start = Date.now();
      await delayProvider.generate([{ role: 'user', content: 'test' }]);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(25);
    });

    it('should throw error when shouldFail is true', async () => {
      const failProvider = new MockProvider(
        {},
        { shouldFail: true, failureMessage: 'Test failure' }
      );

      await expect(
        failProvider.generate([{ role: 'user', content: 'test' }])
      ).rejects.toThrow('Test failure');
    });

    it('should include message content in token estimation', async () => {
      const response = await provider.generate([
        { role: 'user', content: 'This is a test message with multiple words' },
      ]);

      expect(response.usage?.promptTokens).toBeGreaterThan(0);
      expect(response.usage?.completionTokens).toBeGreaterThan(0);
    });
  });

  describe('stream', () => {
    it('should stream a response', async () => {
      let chunks = '';
      for await (const chunk of provider.stream([
        { role: 'user', content: 'Hello' },
      ])) {
        chunks += chunk;
      }

      expect(chunks).toBeDefined();
      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should yield individual characters', async () => {
      const chunks: string[] = [];
      for await (const chunk of provider.stream([
        { role: 'user', content: 'test', role: 'user' },
      ])) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach((chunk) => {
        expect(chunk.length).toBeGreaterThan(0);
      });
    });

    it('should throw error in stream when shouldFail is true', async () => {
      const failProvider = new MockProvider(
        {},
        { shouldFail: true, failureMessage: 'Stream failed' }
      );

      const streamGenerator = failProvider.stream([{ role: 'user', content: 'test' }]);

      await expect(async () => {
        for await (const _chunk of streamGenerator) {
          // consume stream
        }
      }).rejects.toThrow('Stream failed');
    });

    it('should respect delay in streaming', async () => {
      const delayProvider = new MockProvider({}, { delay: 30 });
      const start = Date.now();

      let chunkCount = 0;
      for await (const _chunk of delayProvider.stream([
        { role: 'user', content: 'test' },
      ])) {
        chunkCount++;
      }

      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(30);
      expect(chunkCount).toBeGreaterThan(0);
    });
  });

  describe('sanitize', () => {
    it('should trim and normalize whitespace', () => {
      const result = provider.sanitize('  hello   world  ');
      expect(result).toBe('hello world');
    });

    it('should truncate content to max length', () => {
      const longString = 'a'.repeat(60000);
      const result = provider.sanitize(longString);
      expect(result.length).toBeLessThanOrEqual(50000);
    });
  });

  describe('validateSchema', () => {
    it('should validate correct schema', () => {
      const data = { name: 'test', value: 123 };
      const schema = { name: 'string', value: 'number' };

      const result = provider.validateSchema(data, schema);
      expect(result).toBe(true);
    });

    it('should reject missing fields', () => {
      const data = { name: 'test' };
      const schema = { name: 'string', value: 'number' };

      const result = provider.validateSchema(data, schema);
      expect(result).toBe(false);
    });

    it('should reject non-objects', () => {
      const result = provider.validateSchema('string', { key: 'value' });
      expect(result).toBe(false);
    });
  });
});
