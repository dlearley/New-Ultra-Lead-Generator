import { describe, it, expect, beforeEach } from 'vitest';
import { AIRegistry, createRegistry } from '../../src/registry/index.js';
import { MockProvider } from '../../src/providers/mock.js';
import type { AIRegistryConfig } from '../../src/types/index.js';

describe('AIRegistry', () => {
  let registry: AIRegistry;
  let config: AIRegistryConfig;

  beforeEach(() => {
    config = {
      defaultProvider: 'mock',
      providers: {
        mock: {
          apiKey: 'mock-key',
          model: 'mock-model',
        },
      },
    };
    registry = createRegistry(config);
  });

  describe('initialization', () => {
    it('should initialize with config', () => {
      expect(registry).toBeDefined();
    });

    it('should load default provider', () => {
      const provider = registry.getProvider();
      expect(provider).toBeDefined();
      expect(provider.name).toBe('mock');
    });

    it('should list providers', () => {
      const providers = registry.listProviders();
      expect(providers).toContain('mock');
    });
  });

  describe('getProvider', () => {
    it('should return default provider when no name specified', () => {
      const provider = registry.getProvider();
      expect(provider).toBeDefined();
      expect(provider.name).toBe('mock');
    });

    it('should throw error for unknown provider', () => {
      expect(() => registry.getProvider('unknown')).toThrow('not found');
    });
  });

  describe('generate', () => {
    it('should generate response with default provider', async () => {
      const response = await registry.generate([
        { role: 'user', content: 'test' },
      ]);

      expect(response.content).toBeDefined();
      expect(response.usage).toBeDefined();
    });

    it('should apply guardrails validation', async () => {
      const guardedRegistry = createRegistry({
        defaultProvider: 'mock',
        providers: {
          mock: { apiKey: 'mock-key' },
        },
        guardrails: {
          maxContentLength: 10,
        },
      });

      await expect(
        guardedRegistry.generate([
          { role: 'user', content: 'This is a very long message that exceeds the limit' },
        ])
      ).rejects.toThrow();
    });

    it('should use rate limiter', async () => {
      const ratedRegistry = createRegistry({
        defaultProvider: 'mock',
        providers: {
          mock: { apiKey: 'mock-key' },
        },
        rateLimit: {
          requestsPerMinute: 100,
          concurrency: 2,
        },
      });

      const rateLimiter = ratedRegistry.getRateLimiter();
      const initialState = rateLimiter.getState();
      
      await ratedRegistry.generate([{ role: 'user', content: 'test 1' }]);
      await ratedRegistry.generate([{ role: 'user', content: 'test 2' }]);
      
      const finalState = rateLimiter.getState();
      expect(finalState.requestsThisMinute).toBeGreaterThan(initialState.requestsThisMinute);
    });

    it('should provide trace context', async () => {
      const tracingRegistry = createRegistry(config);
      const tracingManager = tracingRegistry.getTracingManager();

      let traceCalled = false;
      tracingManager.register({
        onRequestStart: () => {
          traceCalled = true;
        },
      });

      await tracingRegistry.generate([{ role: 'user', content: 'test' }]);
      expect(traceCalled).toBe(true);
    });
  });

  describe('stream', () => {
    it('should stream response from default provider', async () => {
      let content = '';
      for await (const chunk of registry.stream([
        { role: 'user', content: 'test' },
      ])) {
        content += chunk;
      }

      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(0);
    });

    it('should apply guardrails during streaming', async () => {
      const guardedRegistry = createRegistry({
        defaultProvider: 'mock',
        providers: {
          mock: { apiKey: 'mock-key' },
        },
        guardrails: {
          maxContentLength: 10,
        },
      });

      const streamGen = guardedRegistry.stream([
        { role: 'user', content: 'This is a very long message that exceeds the limit' },
      ]);

      await expect(async () => {
        for await (const _chunk of streamGen) {
          // consume stream
        }
      }).rejects.toThrow();
    });

    it('should track stream chunks', async () => {
      const tracingRegistry = createRegistry(config);
      const tracingManager = tracingRegistry.getTracingManager();

      let chunkCount = 0;
      tracingManager.register({
        onStreamChunk: () => {
          chunkCount++;
        },
      });

      for await (const _chunk of tracingRegistry.stream([
        { role: 'user', content: 'test' },
      ])) {
        // consume stream
      }

      expect(chunkCount).toBeGreaterThan(0);
    });
  });

  describe('registerProvider', () => {
    it('should register custom provider', () => {
      const customProvider = new MockProvider({}, { responseOverride: 'Custom' });
      registry.registerProvider('custom', customProvider);

      const provider = registry.getProvider('custom');
      expect(provider).toBe(customProvider);
    });

    it('should override existing provider', async () => {
      const customProvider = new MockProvider({}, { responseOverride: 'Override' });
      registry.registerProvider('mock', customProvider);

      const response = await registry.generate([
        { role: 'user', content: 'test' },
      ]);

      expect(response.content).toBe('Override');
    });
  });

  describe('utilities', () => {
    it('should provide tracing manager', () => {
      const tracingManager = registry.getTracingManager();
      expect(tracingManager).toBeDefined();
    });

    it('should provide rate limiter', () => {
      const rateLimiter = registry.getRateLimiter();
      expect(rateLimiter).toBeDefined();
    });

    it('should provide guardrails', () => {
      const guardrails = registry.getGuardrails();
      expect(guardrails).toBeDefined();
    });

    it('should drain rate limiter', async () => {
      await expect(registry.drain()).resolves.toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle provider errors', async () => {
      const failingProvider = new MockProvider(
        {},
        { shouldFail: true, failureMessage: 'Provider error' }
      );
      registry.registerProvider('failing', failingProvider);

      await expect(
        registry.generate([{ role: 'user', content: 'test' }], 'failing')
      ).rejects.toThrow();
    });

    it('should normalize error context', async () => {
      const failingProvider = new MockProvider(
        {},
        { shouldFail: true }
      );
      registry.registerProvider('failing', failingProvider);

      try {
        await registry.generate([{ role: 'user', content: 'test' }], 'failing');
      } catch (error: any) {
        expect(error.context).toBeDefined();
        expect(error.context.provider).toBe('mock');
        expect(error.context.retryable).toBe(false);
      }
    });
  });
});
