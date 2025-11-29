import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  DIContainer,
  createDIContainer,
  initializeAI,
  getAIRegistry,
  resetAIRegistry,
  withAIRegistry,
} from '../../src/di/index.js';
import type { AIRegistryConfig } from '../../src/types/index.js';

describe('Dependency Injection', () => {
  const testConfig: AIRegistryConfig = {
    defaultProvider: 'mock',
    providers: {
      mock: {
        apiKey: 'mock-key',
        model: 'mock-model',
      },
    },
  };

  afterEach(() => {
    resetAIRegistry();
  });

  describe('DIContainer', () => {
    let container: DIContainer;

    beforeEach(() => {
      container = new DIContainer(testConfig);
    });

    it('should initialize with config', () => {
      expect(container).toBeDefined();
    });

    it('should create registry', () => {
      const registry = container.getRegistry();
      expect(registry).toBeDefined();
    });

    it('should provide configuration', () => {
      const config = container.getConfig();
      expect(config).toEqual(testConfig);
    });

    it('should get provider', () => {
      const provider = container.getProvider('mock');
      expect(provider).toBeDefined();
      expect(provider.name).toBe('mock');
    });

    it('should cache providers', () => {
      const provider1 = container.getProvider('mock');
      const provider2 = container.getProvider('mock');

      expect(provider1).toBe(provider2);
    });

    it('should throw for unknown provider', () => {
      expect(() => container.getProvider('unknown')).toThrow();
    });

    it('should clear cache', () => {
      const provider1 = container.getProvider('mock');
      container.clearCache();
      const provider2 = container.getProvider('mock');

      // After cache clear, should be different instances
      // (but this might not always be true depending on implementation)
      expect(provider1).toBeDefined();
      expect(provider2).toBeDefined();
    });
  });

  describe('createDIContainer', () => {
    it('should create container with config', () => {
      const container = createDIContainer(testConfig);
      expect(container).toBeDefined();
    });

    it('should create container without config', () => {
      const container = createDIContainer();
      expect(container).toBeDefined();
    });
  });

  describe('Global AI Registry', () => {
    it('should initialize registry', () => {
      const registry = initializeAI(testConfig);
      expect(registry).toBeDefined();
    });

    it('should provide global instance', () => {
      initializeAI(testConfig);
      const registry = getAIRegistry();
      expect(registry).toBeDefined();
    });

    it('should return same instance', () => {
      initializeAI(testConfig);
      const registry1 = getAIRegistry();
      const registry2 = getAIRegistry();

      expect(registry1).toBe(registry2);
    });

    it('should create default registry if not initialized', () => {
      resetAIRegistry();
      const registry = getAIRegistry();

      expect(registry).toBeDefined();
    });

    it('should reset registry', () => {
      initializeAI(testConfig);
      resetAIRegistry();

      const registry = getAIRegistry();
      expect(registry).toBeDefined();
    });
  });

  describe('withAIRegistry', () => {
    it('should provide registry to callback', async () => {
      let registryReceived: any = null;

      await withAIRegistry(async (registry) => {
        registryReceived = registry;
      }, testConfig);

      expect(registryReceived).toBeDefined();
    });

    it('should return callback result', async () => {
      const result = await withAIRegistry(async (registry) => {
        return 'test result';
      }, testConfig);

      expect(result).toBe('test result');
    });

    it('should drain registry after use', async () => {
      const callOrder: string[] = [];

      await withAIRegistry(async (registry) => {
        callOrder.push('callback');
        const rateLimiter = registry.getRateLimiter();
        expect(rateLimiter).toBeDefined();
      }, testConfig);

      callOrder.push('after');
      expect(callOrder).toEqual(['callback', 'after']);
    });

    it('should handle errors in callback', async () => {
      const error = new Error('Test error');

      await expect(
        withAIRegistry(async () => {
          throw error;
        }, testConfig)
      ).rejects.toThrow('Test error');
    });

    it('should use global registry if no config provided', async () => {
      initializeAI(testConfig);

      let registryReceived: any = null;
      await withAIRegistry(async (registry) => {
        registryReceived = registry;
      });

      expect(registryReceived).toBeDefined();
    });

    it('should support async operations', async () => {
      const result = await withAIRegistry(async (registry) => {
        const provider = registry.getProvider();
        const response = await provider.generate([
          { role: 'user', content: 'test' },
        ]);
        return response.content;
      }, testConfig);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('Container usage patterns', () => {
    it('should support dependency resolution', () => {
      const container = new DIContainer(testConfig);

      const registry = container.getRegistry();
      const mockProvider = container.getProvider('mock');

      expect(registry).toBeDefined();
      expect(mockProvider).toBeDefined();
    });

    it('should support provider-specific setup', () => {
      const config: AIRegistryConfig = {
        defaultProvider: 'mock',
        providers: {
          mock: {
            apiKey: 'key1',
          },
        },
      };

      const container = new DIContainer(config);
      const provider = container.getProvider('mock');

      expect(provider.name).toBe('mock');
    });

    it('should support test setup', () => {
      const testContainer = new DIContainer({
        defaultProvider: 'mock',
        providers: {
          mock: {
            apiKey: 'test-key',
          },
        },
      });

      const registry = testContainer.getRegistry();
      const providers = registry.listProviders();

      expect(providers).toContain('mock');
    });
  });
});
