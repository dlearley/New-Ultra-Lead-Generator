# @ai/core - AI Provider Abstraction

A provider-agnostic abstraction layer for integrating multiple AI models (OpenAI, Anthropic, and future providers) with built-in support for rate limiting, streaming, error normalization, and tracing.

## Features

- **Provider-Agnostic Architecture**: Unified interface for OpenAI, Anthropic, and easily extensible to new providers
- **Configuration-Driven Registry**: Configure providers via environment variables or code
- **Rate Limiting**: Built-in request and token-based rate limiting with concurrency control
- **Streaming Helpers**: Utilities for processing AI streams (collection, filtering, mapping, batching)
- **Prompt Templates**: Pre-built prompt templates for common tasks (classification, summarization, extraction, etc.)
- **Error Normalization**: Consistent error handling with automatic retry detection
- **Tracing & Monitoring**: Hooks for tracking requests, tokens, and errors
- **Guardrails**: Content validation, schema enforcement, and model/filter whitelisting
- **Dependency Injection**: First-class DI support for API services
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Tested**: Comprehensive Vitest unit tests with mocked providers

## Installation

```bash
npm install @ai/core
```

### Optional Dependencies

For provider-specific features:

```bash
# OpenAI support
npm install openai

# Anthropic support
npm install @anthropic-ai/sdk
```

## Quick Start

### 1. Environment Configuration

```bash
# OpenAI
export OPENAI_API_KEY=sk-...
export OPENAI_MODEL=gpt-4-turbo

# Anthropic
export ANTHROPIC_API_KEY=sk-ant-...
export ANTHROPIC_MODEL=claude-3-opus-20240229

# Provider selection
export AI_PROVIDER=openai

# Rate limiting
export AI_RATE_LIMIT_RPM=100
```

### 2. Basic Usage

```typescript
import { createRegistry, loadConfigFromEnv } from '@ai/core';

// Create registry from environment config
const config = loadConfigFromEnv();
const registry = createRegistry(config);

// Generate response
const response = await registry.generate([
  { role: 'user', content: 'Hello, how are you?' }
]);

console.log(response.content);
```

### 3. Using Prompt Templates

```typescript
import { PromptBuilder, createRegistry, loadConfigFromEnv } from '@ai/core';

const registry = createRegistry(loadConfigFromEnv());

// Build prompt from template
const messages = PromptBuilder.create('classification')
  .set('text', 'This product is amazing!')
  .set('categories', 'positive, negative, neutral')
  .build();

const response = await registry.generate(messages);
console.log(response.content); // "positive"
```

### 4. Streaming Responses

```typescript
import { createRegistry, loadConfigFromEnv } from '@ai/core';

const registry = createRegistry(loadConfigFromEnv());

for await (const chunk of registry.stream([
  { role: 'user', content: 'Write a short story' }
])) {
  process.stdout.write(chunk);
}
```

### 5. Dependency Injection Setup

```typescript
import { createDIContainer } from '@ai/core';

// Create DI container for your service
const container = createDIContainer({
  defaultProvider: 'openai',
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: 'gpt-4-turbo',
    },
  },
});

// Use in your services
const registry = container.getRegistry();
const response = await registry.generate([
  { role: 'user', content: 'test' }
]);
```

## Available Prompt Templates

- **classification**: Classify text into categories
- **summarization**: Summarize text content
- **extraction**: Extract structured information
- **generation**: Generate creative content
- **reasoning**: Multi-step reasoning tasks
- **jsonGeneration**: Generate structured JSON output

## API Reference

### Registry

#### `createRegistry(config: AIRegistryConfig): AIRegistry`

Creates a registry with configured providers.

```typescript
const registry = createRegistry({
  defaultProvider: 'openai',
  providers: {
    openai: {
      apiKey: 'sk-...',
      model: 'gpt-4-turbo',
    },
  },
  rateLimit: {
    requestsPerMinute: 100,
    tokensPerMinute: 90000,
    concurrency: 10,
  },
  guardrails: {
    maxContentLength: 1000000,
    allowedModels: ['gpt-4-turbo', 'gpt-4'],
  },
});
```

#### `registry.generate(messages, provider?, options?)`

Generate a single response.

```typescript
const response = await registry.generate(
  [{ role: 'user', content: 'Hello' }],
  'openai', // optional provider name
  { temperature: 0.7, maxTokens: 500 }
);
```

#### `registry.stream(messages, provider?, options?)`

Stream a response.

```typescript
for await (const chunk of registry.stream([
  { role: 'user', content: 'Hello' }
])) {
  console.log(chunk);
}
```

### Prompt Builder

#### `PromptBuilder.create(templateId: string): PromptBuilder`

Create a builder for a template.

```typescript
const builder = PromptBuilder.create('classification');
```

#### `builder.set(key: string, value: string): PromptBuilder`

Set template variables.

```typescript
builder.set('text', 'sample text').set('categories', 'A, B, C');
```

#### `builder.build(): AIMessage[]`

Build final message array.

```typescript
const messages = builder.build();
```

### Streaming Utilities

```typescript
import { StreamProcessor } from '@ai/core';

// Collect entire stream
const content = await StreamProcessor.collect(stream);

// Filter chunks
const filtered = StreamProcessor.filter(stream, chunk => chunk !== ' ');

// Map chunks
const mapped = StreamProcessor.map(stream, chunk => chunk.toUpperCase());

// Batch chunks
const batched = StreamProcessor.batch(stream, 2);

// Throttle stream
const throttled = StreamProcessor.throttle(stream, 50);

// Combine multiple streams
const combined = StreamProcessor.combine(stream1, stream2);
```

### Error Handling

```typescript
import { createErrorNormalizer, AIError } from '@ai/core';

const normalizer = createErrorNormalizer();

try {
  const response = await registry.generate(messages);
} catch (error) {
  if (error instanceof AIError) {
    console.log(error.context.provider); // 'openai'
    console.log(error.context.retryable); // true/false
    console.log(error.context.statusCode); // 429, 500, etc.
  }
}
```

### Rate Limiting

```typescript
const limiter = registry.getRateLimiter();

// Manual rate limit acquisition
await limiter.acquire(tokens);

// Check state
const state = limiter.getState();
console.log(state.requestsThisMinute);
console.log(state.tokensThisMinute);

// Drain queue
await registry.drain();
```

### Tracing

```typescript
import { createTracingManager, LoggingHook, MetricsHook } from '@ai/core';

const tracingManager = registry.getTracingManager();

// Add logging
tracingManager.register(new LoggingHook());

// Add metrics
const metricsHook = new MetricsHook();
tracingManager.register(metricsHook);

// Custom hook
tracingManager.register({
  onRequestStart: (context) => {
    console.log(`Request started: ${context.requestId}`);
  },
  onRequestEnd: (context, response) => {
    console.log(`Tokens used: ${response.usage?.totalTokens}`);
  },
});

// Get metrics
const metrics = metricsHook.getMetrics();
```

### Guardrails

```typescript
const guardrails = registry.getGuardrails();

// Validate content
const result = guardrails.validateContent(text);
if (!result.valid) {
  console.log(result.errors);
}

// Validate model
const modelResult = guardrails.validateModel('gpt-4');

// Validate filters
const filterResult = guardrails.validateFilter('myFilter');

// Validate JSON schema
const schemaResult = guardrails.validateJsonSchema(data, schema);
```

## Testing

The library comes with comprehensive tests using Vitest and mocked providers:

```bash
npm test
npm test -- --ui
npm test -- --coverage
```

### Testing with Mock Provider

```typescript
import { MockProvider } from '@ai/core';

const mockProvider = new MockProvider({}, {
  responseOverride: 'Custom response',
  delay: 100,
});

const response = await mockProvider.generate([
  { role: 'user', content: 'test' }
]);
```

## Extending with Custom Providers

```typescript
import { BaseProvider } from '@ai/core';

class CustomProvider extends BaseProvider {
  name = 'custom';
  version = '1.0.0';

  async generate(messages, options) {
    // Your implementation
  }

  async *stream(messages, options) {
    // Your streaming implementation
  }
}

// Register custom provider
registry.registerProvider('custom', new CustomProvider(config));
```

## Architecture

```
packages/ai/
├── src/
│   ├── types/           # Type definitions
│   ├── config/          # Configuration loading & validation
│   ├── providers/       # Provider implementations
│   ├── registry/        # Main registry orchestration
│   ├── di/              # Dependency injection
│   ├── prompts/         # Prompt templates
│   ├── guardrails/      # Content validation
│   ├── errors/          # Error normalization
│   ├── tracing/         # Tracing & monitoring
│   ├── ratelimit/       # Rate limiting
│   ├── streaming/       # Stream utilities
│   └── index.ts         # Public API
├── tests/
│   ├── providers/       # Provider tests
│   ├── registry/        # Registry tests
│   ├── di/              # DI tests
│   ├── prompts/         # Template tests
│   ├── guardrails/      # Guardrail tests
│   ├── errors/          # Error handling tests
│   ├── tracing/         # Tracing tests
│   ├── ratelimit/       # Rate limit tests
│   ├── streaming/       # Stream utility tests
│   └── integration/     # End-to-end tests
└── README.md            # This file
```

## Best Practices

1. **Configuration**: Use environment variables for API keys, never commit credentials
2. **Error Handling**: Always check `error.context.retryable` before retrying
3. **Streaming**: Use `StreamProcessor` for complex stream transformations
4. **Rate Limiting**: Configure based on your provider's limits
5. **Testing**: Use MockProvider for deterministic unit tests
6. **Monitoring**: Register tracing hooks for observability
7. **DI**: Use DIContainer for dependency management in services

## Examples

See `/tests/integration/full-flow.test.ts` for comprehensive examples demonstrating:
- Classification with templates
- Streaming responses
- Error handling and recovery
- Rate limiting
- Multiple provider setup
- DI container usage
- Tracing and monitoring

## License

MIT
