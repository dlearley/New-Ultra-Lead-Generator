import type { AIProvider, AIMessage, AIGenerationOptions, AIGenerationResponse, AIRegistryConfig, AIEmbeddingResponse } from '../types/index.js';
import { AIError } from '../types/index.js';
import { createProvider } from '../providers/index.js';
import { RateLimiter } from '../ratelimit/index.js';
import { TracingManager } from '../tracing/index.js';
import { ErrorNormalizer } from '../errors/index.js';
import { Guardrails } from '../guardrails/index.js';

export class AIRegistry {
  private providers: Map<string, AIProvider>;
  private config: AIRegistryConfig;
  private rateLimiter: RateLimiter;
  private tracingManager: TracingManager;
  private errorNormalizer: ErrorNormalizer;
  private guardrails: Guardrails;
  private defaultProvider: string;

  constructor(config: AIRegistryConfig) {
    this.config = config;
    this.providers = new Map();
    this.defaultProvider = config.defaultProvider;

    this.rateLimiter = new RateLimiter(config.rateLimit);
    this.tracingManager = new TracingManager();
    this.errorNormalizer = new ErrorNormalizer();
    this.guardrails = new Guardrails(config.guardrails);

    this.initializeProviders();
  }

  private initializeProviders(): void {
    for (const [name, providerConfig] of Object.entries(this.config.providers)) {
      try {
        const provider = createProvider(name, providerConfig);
        this.providers.set(name, provider);
      } catch (error) {
        console.warn(`Failed to initialize provider '${name}':`, error);
      }
    }
  }

  getProvider(name?: string): AIProvider {
    const providerName = name || this.defaultProvider;
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new AIError(
        {
          provider: providerName,
          message: `Provider '${providerName}' not found`,
          retryable: false,
        },
        `Provider '${providerName}' not found`
      );
    }

    return provider;
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  registerProvider(name: string, provider: AIProvider): void {
    this.providers.set(name, provider);
  }

  async generate(
    messages: AIMessage[],
    provider?: string,
    options?: AIGenerationOptions
  ): Promise<AIGenerationResponse> {
    const selectedProvider = this.getProvider(provider);
    const tracingContext = this.tracingManager.createContext(
      selectedProvider.name,
      'generate'
    );

    try {
      this.tracingManager.onRequestStart(tracingContext);

      const guardResult = this.guardrails.validateContent(
        messages.map((m) => m.content).join('\n')
      );
      if (!guardResult.valid) {
        throw new AIError(
          {
            provider: selectedProvider.name,
            message: guardResult.errors.join('; '),
            retryable: false,
          },
          `Guardrail validation failed: ${guardResult.errors.join('; ')}`
        );
      }

      await this.rateLimiter.acquire();

      const response = await selectedProvider.generate(messages, options);
      this.tracingManager.onRequestEnd(tracingContext, response);

      return response;
    } catch (error) {
      const normalized = this.errorNormalizer.normalize(
        error,
        selectedProvider.name
      );
      this.tracingManager.onRequestError(tracingContext, normalized.normalizedError);

      throw normalized.normalizedError;
    }
  }

  async *stream(
    messages: AIMessage[],
    provider?: string,
    options?: AIGenerationOptions
  ): AsyncGenerator<string> {
    const selectedProvider = this.getProvider(provider);
    const tracingContext = this.tracingManager.createContext(
      selectedProvider.name,
      'stream'
    );

    try {
      this.tracingManager.onRequestStart(tracingContext);

      const guardResult = this.guardrails.validateContent(
        messages.map((m) => m.content).join('\n')
      );
      if (!guardResult.valid) {
        throw new AIError(
          {
            provider: selectedProvider.name,
            message: guardResult.errors.join('; '),
            retryable: false,
          },
          `Guardrail validation failed: ${guardResult.errors.join('; ')}`
        );
      }

      await this.rateLimiter.acquire();

      for await (const chunk of selectedProvider.stream(messages, options)) {
        this.tracingManager.onStreamChunk(tracingContext, chunk);
        yield chunk;
      }

      this.tracingManager.onRequestEnd(tracingContext, {
        content: 'stream',
        finishReason: 'stop',
      });
    } catch (error) {
      const normalized = this.errorNormalizer.normalize(
        error,
        selectedProvider.name
      );
      this.tracingManager.onRequestError(tracingContext, normalized.normalizedError);

      throw normalized.normalizedError;
    }
  }

  async embedText(
    text: string,
    provider?: string,
    options?: AIGenerationOptions
  ): Promise<AIEmbeddingResponse> {
    const selectedProvider = this.getProvider(provider);
    
    if (!selectedProvider.embedText) {
      throw new AIError(
        {
          provider: selectedProvider.name,
          message: `Provider '${selectedProvider.name}' does not support embeddings`,
          retryable: false,
        },
        `Provider '${selectedProvider.name}' does not support embeddings`
      );
    }

    const tracingContext = this.tracingManager.createContext(
      selectedProvider.name,
      'embedText'
    );

    try {
      this.tracingManager.onRequestStart(tracingContext);

      const guardResult = this.guardrails.validateContent(text);
      if (!guardResult.valid) {
        throw new AIError(
          {
            provider: selectedProvider.name,
            message: guardResult.errors.join('; '),
            retryable: false,
          },
          `Guardrail validation failed: ${guardResult.errors.join('; ')}`
        );
      }

      await this.rateLimiter.acquire();

      const response = await selectedProvider.embedText(text, options);
      this.tracingManager.onRequestEnd(tracingContext, {
        content: `embedding[${response.dimension}]`,
        finishReason: 'stop',
      });

      return response;
    } catch (error) {
      const normalized = this.errorNormalizer.normalize(
        error,
        selectedProvider.name
      );
      this.tracingManager.onRequestError(tracingContext, normalized.normalizedError);

      throw normalized.normalizedError;
    }
  }

  getTracingManager(): TracingManager {
    return this.tracingManager;
  }

  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }

  getGuardrails(): Guardrails {
    return this.guardrails;
  }

  async drain(): Promise<void> {
    await this.rateLimiter.drain();
  }
}

export function createRegistry(config: AIRegistryConfig): AIRegistry {
  return new AIRegistry(config);
}
