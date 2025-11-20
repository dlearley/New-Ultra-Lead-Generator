import type { AIRegistryConfig } from '../types/index.js';
import { createRegistry, AIRegistry } from '../registry/index.js';
import { loadConfigFromEnv, createDefaultConfig } from '../config/index.js';
import { createProvider } from '../providers/index.js';
import type { AIProvider } from '../types/index.js';

export interface DIContainer {
  getRegistry(): AIRegistry;
  getProvider(name: string): AIProvider;
  getConfig(): AIRegistryConfig;
}

let globalRegistry: AIRegistry | null = null;

export function initializeAI(config?: AIRegistryConfig): AIRegistry {
  const finalConfig = config || loadConfigFromEnv() || createDefaultConfig();
  const registry = createRegistry(finalConfig);
  globalRegistry = registry;
  return registry;
}

export function getAIRegistry(): AIRegistry {
  if (!globalRegistry) {
    globalRegistry = initializeAI();
  }
  return globalRegistry;
}

export function resetAIRegistry(): void {
  globalRegistry = null;
}

export class DIContainer implements DIContainer {
  private registry: AIRegistry;
  private config: AIRegistryConfig;
  private providerCache: Map<string, AIProvider>;

  constructor(config?: AIRegistryConfig) {
    this.config = config || loadConfigFromEnv() || createDefaultConfig();
    this.registry = createRegistry(this.config);
    this.providerCache = new Map();
  }

  getRegistry(): AIRegistry {
    return this.registry;
  }

  getProvider(name: string): AIProvider {
    if (this.providerCache.has(name)) {
      return this.providerCache.get(name)!;
    }

    const providerConfig = this.config.providers[name];
    if (!providerConfig) {
      throw new Error(`Provider configuration not found: ${name}`);
    }

    const provider = createProvider(name, providerConfig);
    this.providerCache.set(name, provider);
    return provider;
  }

  getConfig(): AIRegistryConfig {
    return this.config;
  }

  clearCache(): void {
    this.providerCache.clear();
  }
}

export function createDIContainer(config?: AIRegistryConfig): DIContainer {
  return new DIContainer(config);
}

export async function withAIRegistry<T>(
  callback: (registry: AIRegistry) => Promise<T>,
  config?: AIRegistryConfig
): Promise<T> {
  const registry = config ? createRegistry(config) : getAIRegistry();
  try {
    return await callback(registry);
  } finally {
    await registry.drain();
  }
}
