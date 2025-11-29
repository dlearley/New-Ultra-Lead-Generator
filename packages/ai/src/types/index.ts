export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
}

export interface AIGenerationResponse {
  content: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIStreamResponse {
  [Symbol.asyncIterator](): AsyncIterator<string>;
}

export interface AIProvider {
  name: string;
  version: string;
  
  generate(
    messages: AIMessage[],
    options?: AIGenerationOptions
  ): Promise<AIGenerationResponse>;
  
  stream(
    messages: AIMessage[],
    options?: AIGenerationOptions
  ): AsyncIterable<string>;
  
  validateSchema(data: unknown, schema: Record<string, unknown>): boolean;
  
  sanitize(content: string): string;
}

export interface ProviderConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  timeout?: number;
  [key: string]: unknown;
}

export interface RateLimitConfig {
  requestsPerMinute?: number;
  tokensPerMinute?: number;
  concurrency?: number;
}

export interface TracingHook {
  onRequestStart?: (context: TracingContext) => void;
  onRequestEnd?: (context: TracingContext, response: AIGenerationResponse) => void;
  onRequestError?: (context: TracingContext, error: Error) => void;
  onStreamChunk?: (context: TracingContext, chunk: string) => void;
}

export interface TracingContext {
  requestId: string;
  provider: string;
  model: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface GuardrailsConfig {
  allowedFilters?: string[];
  enforceJsonSchema?: boolean;
  maxContentLength?: number;
  allowedModels?: string[];
}

export interface ErrorContext {
  provider: string;
  code?: string;
  message: string;
  retryable: boolean;
  statusCode?: number;
}

export class AIError extends Error {
  constructor(
    public context: ErrorContext,
    message?: string
  ) {
    super(message || context.message);
    this.name = 'AIError';
  }
}

export interface AIRegistryConfig {
  defaultProvider: string;
  providers: Record<string, ProviderConfig>;
  rateLimit?: RateLimitConfig;
  tracing?: TracingHook;
  guardrails?: GuardrailsConfig;
}
