export { BaseProvider } from './base.js';
export { OpenAIProvider } from './openai.js';
export { AnthropicProvider } from './anthropic.js';
export { MockProvider, type MockProviderOptions } from './mock.js';

import type { AIProvider, ProviderConfig } from '../types/index.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { MockProvider } from './mock.js';

export type ProviderFactory = (config: ProviderConfig) => AIProvider;

export const PROVIDER_FACTORIES: Record<string, ProviderFactory> = {
  openai: (config) => new OpenAIProvider(config),
  anthropic: (config) => new AnthropicProvider(config),
  mock: (config) => new MockProvider(config),
};

export function createProvider(providerName: string, config: ProviderConfig): AIProvider {
  const factory = PROVIDER_FACTORIES[providerName];
  if (!factory) {
    throw new Error(`Unknown provider: ${providerName}`);
  }
  return factory(config);
}
