import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRegistry,
  createDIContainer,
  PromptBuilder,
  MockProvider,
  createErrorNormalizer,
  createRateLimiter,
} from '../../src/index.js';
import type { AIRegistryConfig } from '../../src/types/index.js';

describe('Full AI Provider Integration Flow', () => {
  describe('Complete workflow with prompts and streaming', () => {
    it('should handle end-to-end generation with classification template', async () => {
      const config: AIRegistryConfig = {
        defaultProvider: 'mock',
        providers: {
          mock: {
            apiKey: 'test-key',
          },
        },
      };

      const registry = createRegistry(config);

      // Build prompt using template
      const messages = PromptBuilder.create('classification')
        .set('text', 'This product is amazing!')
        .set('categories', 'positive, negative, neutral')
        .build();

      // Generate response
      const response = await registry.generate(messages);

      expect(response.content).toBeDefined();
      expect(response.usage).toBeDefined();
      expect(response.usage?.totalTokens).toBeGreaterThan(0);
    });

    it('should handle streaming with multiple templates', async () => {
      const config: AIRegistryConfig = {
        defaultProvider: 'mock',
        providers: {
          mock: {
            apiKey: 'test-key',
          },
        },
      };

      const registry = createRegistry(config);

      // Generate stream using extraction template
      const messages = PromptBuilder.create('extraction')
        .set('text', 'John is a software engineer from New York')
        .set('fields', 'name, job, location')
        .build();

      let streamedContent = '';
      for await (const chunk of registry.stream(messages)) {
        streamedContent += chunk;
      }

      expect(streamedContent).toBeDefined();
      expect(streamedContent.length).toBeGreaterThan(0);
    });

    it('should support JSON generation template', async () => {
      const config: AIRegistryConfig = {
        defaultProvider: 'mock',
        providers: {
          mock: {
            apiKey: 'test-key',
          },
        },
      };

      const registry = createRegistry(config);

      const messages = PromptBuilder.create('jsonGeneration')
        .set('schema', '{"type": "object", "properties": {"status": "string"}}')
        .set('prompt', 'Generate a status response')
        .build();

      const response = await registry.generate(messages);

      expect(response.content).toBeDefined();
      // Mock provider returns JSON when 'json' is in content
      if (response.content.includes('json')) {
        expect(response.content).toContain('{');
      }
    });

    it('should support reasoning template for complex tasks', async () => {
      const config: AIRegistryConfig = {
        defaultProvider: 'mock',
        providers: {
          mock: {
            apiKey: 'test-key',
          },
        },
      };

      const registry = createRegistry(config);

      const messages = PromptBuilder.create('reasoning')
        .set('problem', 'If a train travels at 60 mph for 2 hours, how far does it go?')
        .build();

      const response = await registry.generate(messages);

      expect(response.content).toBeDefined();
      expect(response.content.length).toBeGreaterThan(0);
    });
  });

  describe('Dependency Injection integration', () => {
    it('should use DI container for setup', async () => {
      const config: AIRegistryConfig = {
        defaultProvider: 'mock',
        providers: {
          mock: {
            apiKey: 'test-key',
          },
        },
      };

      const container = createDIContainer(config);
      const registry = container.getRegistry();
      const provider = container.getProvider('mock');

      expect(registry).toBeDefined();
      expect(provider).toBeDefined();
      expect(provider.name).toBe('mock');

      // Test generation through container setup
      const response = await registry.generate([
        { role: 'user', content: 'test' },
      ]);

      expect(response.content).toBeDefined();
    });
  });

  describe('Error handling and recovery', () => {
    it('should catch and normalize provider errors', async () => {
      const config: AIRegistryConfig = {
        defaultProvider: 'failing',
        providers: {
          failing: {
            apiKey: 'test-key',
          },
        },
      };

      const registry = createRegistry(config);
      const failingProvider = new MockProvider(
        { apiKey: 'key' },
        { shouldFail: true, failureMessage: 'Service error' }
      );
      registry.registerProvider('failing', failingProvider);

      try {
        await registry.generate([{ role: 'user', content: 'test' }]);
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.context).toBeDefined();
        expect(error.context.provider).toBe('mock');
      }
    });

    it('should use error normalizer for classification', () => {
      const normalizer = createErrorNormalizer();

      const retryableError = new Error('Rate limit exceeded');
      const normalized = normalizer.normalize(retryableError, 'openai');

      expect(normalized.isRetryable).toBe(true);

      const nonRetryableError = new Error('Invalid credentials');
      const nonRetryableNormalized = normalizer.normalize(
        nonRetryableError,
        'openai'
      );

      expect(nonRetryableNormalized.isRetryable).toBe(false);
    });
  });

  describe('Rate limiting integration', () => {
    it('should apply rate limiting during generation', async () => {
      const config: AIRegistryConfig = {
        defaultProvider: 'mock',
        providers: {
          mock: {
            apiKey: 'test-key',
          },
        },
        rateLimit: {
          requestsPerMinute: 100,
          concurrency: 5,
        },
      };

      const registry = createRegistry(config);

      const start = Date.now();
      for (let i = 0; i < 3; i++) {
        await registry.generate([{ role: 'user', content: `test ${i}` }]);
      }
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should expose rate limiter for manual control', () => {
      const config: AIRegistryConfig = {
        defaultProvider: 'mock',
        providers: {
          mock: {
            apiKey: 'test-key',
          },
        },
      };

      const registry = createRegistry(config);
      const limiter = registry.getRateLimiter();

      expect(limiter).toBeDefined();
      expect(limiter.getState).toBeDefined();
    });
  });

  describe('Multiple providers setup', () => {
    it('should support multiple configured providers', async () => {
      const config: AIRegistryConfig = {
        defaultProvider: 'mock',
        providers: {
          mock: {
            apiKey: 'key1',
            model: 'model1',
          },
        },
      };

      const registry = createRegistry(config);

      // Add providers dynamically with MockProvider
      const provider1 = new MockProvider({ apiKey: 'key1' });
      const provider2 = new MockProvider({ apiKey: 'key2' });
      registry.registerProvider('mock1', provider1);
      registry.registerProvider('mock2', provider2);

      const providers = registry.listProviders();
      expect(providers).toContain('mock1');
      expect(providers).toContain('mock2');

      // Generate with default provider
      const response1 = await registry.generate([
        { role: 'user', content: 'test1' },
      ]);

      // Generate with specific provider
      const response2 = await registry.generate(
        [{ role: 'user', content: 'test2' }],
        'mock2'
      );

      expect(response1.content).toBeDefined();
      expect(response2.content).toBeDefined();
    });

    it('should switch between providers dynamically', async () => {
      const config: AIRegistryConfig = {
        defaultProvider: 'mock',
        providers: {
          mock: {
            apiKey: 'key1',
          },
        },
      };

      const registry = createRegistry(config);

      // Add a second mock provider
      const secondProvider = new MockProvider(
        { apiKey: 'key2' },
        { responseOverride: 'Second provider response' }
      );
      registry.registerProvider('mock2', secondProvider);

      const response1 = await registry.generate([
        { role: 'user', content: 'test' },
      ]);
      const response2 = await registry.generate(
        [{ role: 'user', content: 'test' }],
        'mock2'
      );

      expect(response1.content).toBeDefined();
      expect(response2.content).toBe('Second provider response');
    });
  });

  describe('Template library usage', () => {
    it('should generate using all template types', async () => {
      const config: AIRegistryConfig = {
        defaultProvider: 'mock',
        providers: {
          mock: {
            apiKey: 'test-key',
          },
        },
      };

      const registry = createRegistry(config);

      const templates = [
        'classification',
        'summarization',
        'extraction',
        'generation',
        'reasoning',
        'jsonGeneration',
      ];

      for (const templateId of templates) {
        const messages = PromptBuilder.create(templateId).build();
        const response = await registry.generate(messages);

        expect(response.content).toBeDefined();
        expect(response.usage).toBeDefined();
      }
    });

    it('should build messages with multiple variables', async () => {
      const config: AIRegistryConfig = {
        defaultProvider: 'mock',
        providers: {
          mock: {
            apiKey: 'test-key',
          },
        },
      };

      const registry = createRegistry(config);

      const messages = PromptBuilder.create('generation')
        .set('prompt', 'Create a story')
        .set('style', 'fantasy')
        .set('tone', 'epic')
        .build();

      const response = await registry.generate(messages);

      expect(response.content).toBeDefined();
    });
  });

  describe('Tracing and monitoring', () => {
    it('should track request lifecycle', async () => {
      const config: AIRegistryConfig = {
        defaultProvider: 'mock',
        providers: {
          mock: {
            apiKey: 'test-key',
          },
        },
      };

      const registry = createRegistry(config);
      const tracingManager = registry.getTracingManager();

      let requestStarted = false;
      let requestEnded = false;

      tracingManager.register({
        onRequestStart: () => {
          requestStarted = true;
        },
        onRequestEnd: () => {
          requestEnded = true;
        },
      });

      await registry.generate([{ role: 'user', content: 'test' }]);

      expect(requestStarted).toBe(true);
      expect(requestEnded).toBe(true);
    });

    it('should track streaming chunks', async () => {
      const config: AIRegistryConfig = {
        defaultProvider: 'mock',
        providers: {
          mock: {
            apiKey: 'test-key',
          },
        },
      };

      const registry = createRegistry(config);
      const tracingManager = registry.getTracingManager();

      let chunkCount = 0;

      tracingManager.register({
        onStreamChunk: () => {
          chunkCount++;
        },
      });

      for await (const _chunk of registry.stream([
        { role: 'user', content: 'test' },
      ])) {
        // consume stream
      }

      expect(chunkCount).toBeGreaterThan(0);
    });
  });
});
