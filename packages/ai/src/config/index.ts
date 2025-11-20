import { z } from 'zod';
import type { AIRegistryConfig, ProviderConfig, RateLimitConfig, GuardrailsConfig } from '../types/index.js';

const ProviderConfigSchema = z.object({
  apiKey: z.string().min(1),
  model: z.string().optional(),
  baseUrl: z.string().url().optional(),
  timeout: z.number().positive().optional(),
}).passthrough();

const RateLimitConfigSchema = z.object({
  requestsPerMinute: z.number().positive().optional(),
  tokensPerMinute: z.number().positive().optional(),
  concurrency: z.number().positive().optional(),
});

const GuardrailsConfigSchema = z.object({
  allowedFilters: z.array(z.string()).optional(),
  enforceJsonSchema: z.boolean().optional(),
  maxContentLength: z.number().positive().optional(),
  allowedModels: z.array(z.string()).optional(),
});

const AIRegistryConfigSchema = z.object({
  defaultProvider: z.string().min(1),
  providers: z.record(z.string(), ProviderConfigSchema),
  rateLimit: RateLimitConfigSchema.optional(),
  tracing: z.object({}).passthrough().optional(),
  guardrails: GuardrailsConfigSchema.optional(),
});

export function loadConfigFromEnv(): AIRegistryConfig {
  const config: AIRegistryConfig = {
    defaultProvider: process.env.AI_PROVIDER || 'openai',
    providers: {},
  };

  if (process.env.OPENAI_API_KEY) {
    config.providers.openai = {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
      baseUrl: process.env.OPENAI_BASE_URL,
      timeout: process.env.OPENAI_TIMEOUT ? parseInt(process.env.OPENAI_TIMEOUT, 10) : 30000,
    };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    config.providers.anthropic = {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229',
      baseUrl: process.env.ANTHROPIC_BASE_URL,
      timeout: process.env.ANTHROPIC_TIMEOUT ? parseInt(process.env.ANTHROPIC_TIMEOUT, 10) : 30000,
    };
  }

  if (process.env.AI_RATE_LIMIT_RPM) {
    config.rateLimit = {
      requestsPerMinute: parseInt(process.env.AI_RATE_LIMIT_RPM, 10),
    };
  }

  return config;
}

export function validateConfig(config: unknown): AIRegistryConfig {
  return AIRegistryConfigSchema.parse(config);
}

export function validateProviderConfig(config: unknown): ProviderConfig {
  return ProviderConfigSchema.parse(config);
}

export function validateRateLimitConfig(config: unknown): RateLimitConfig {
  return RateLimitConfigSchema.parse(config);
}

export function validateGuardrailsConfig(config: unknown): GuardrailsConfig {
  return GuardrailsConfigSchema.parse(config);
}

export const createDefaultConfig = (): AIRegistryConfig => ({
  defaultProvider: 'openai',
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4-turbo',
    },
  },
  rateLimit: {
    requestsPerMinute: 100,
    concurrency: 10,
  },
  guardrails: {
    enforceJsonSchema: true,
    maxContentLength: 1000000,
  },
});
