import type { AIMessage, AIGenerationResponse, AIEmbeddingResponse } from '../types/index.js';
import { BaseProvider } from './base.js';

export interface MockProviderOptions {
  delay?: number;
  shouldFail?: boolean;
  failureMessage?: string;
  responseOverride?: string;
}

export class MockProvider extends BaseProvider {
  name = 'mock';
  version = '1.0.0';

  private options: MockProviderOptions;

  constructor(config: any = {}, options: MockProviderOptions = {}) {
    super({
      apiKey: 'mock-key',
      model: 'mock-model',
      ...config,
    });
    this.options = options;
  }

  async generate(
    messages: AIMessage[]
  ): Promise<AIGenerationResponse> {
    await this.simulateDelay();

    if (this.options.shouldFail) {
      throw new Error(this.options.failureMessage || 'Mock provider failed');
    }

    const response = this.options.responseOverride || this.generateMockResponse(messages);

    return {
      content: response,
      finishReason: 'stop',
      usage: {
        promptTokens: this.estimateTokens(messages),
        completionTokens: this.estimateTokens([{ role: 'assistant', content: response }]),
        totalTokens:
          this.estimateTokens(messages) +
          this.estimateTokens([{ role: 'assistant', content: response }]),
      },
    };
  }

  async *stream(
    messages: AIMessage[]
  ): AsyncGenerator<string> {
    await this.simulateDelay();

    if (this.options.shouldFail) {
      throw new Error(this.options.failureMessage || 'Mock provider stream failed');
    }

    const response = this.options.responseOverride || this.generateMockResponse(messages);

    for (const char of response) {
      yield char;
      await this.sleep(10);
    }
  }

  async embedText(text: string): Promise<AIEmbeddingResponse> {
    await this.simulateDelay();

    if (this.options.shouldFail) {
      throw new Error(this.options.failureMessage || 'Mock provider embedding failed');
    }

    // Generate deterministic embedding based on text hash
    const embedding = this.generateMockEmbedding(text);

    return {
      embedding,
      dimension: 1536,
      model: 'mock-embedding-3-small',
      usage: {
        promptTokens: Math.ceil(text.length / 4),
      },
    };
  }

  private generateMockEmbedding(text: string): number[] {
    // Generate deterministic embedding using simple hash
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Seed random generator with hash
    const seeded = Math.sin(hash) * 10000;
    const seed = seeded - Math.floor(seeded);

    const embedding: number[] = [];
    for (let i = 0; i < 1536; i++) {
      // Deterministic pseudo-random using seeded value
      const x = Math.sin(seed * (i + 1)) * 10000;
      embedding.push(x - Math.floor(x));
    }

    return embedding;
  }

  private generateMockResponse(messages: AIMessage[]): string {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) {
      return 'Mock response with no input';
    }

    const content = lastMessage.content.toLowerCase();

    if (content.includes('classify') || content.includes('category')) {
      return 'Category A';
    }
    if (content.includes('summarize') || content.includes('summary')) {
      return 'This is a brief summary of the provided text.';
    }
    if (content.includes('extract') || content.includes('information')) {
      return 'Extracted information: Key details found in the text.';
    }
    if (content.includes('generate') || content.includes('create')) {
      return 'Generated content as requested.';
    }
    if (content.includes('json')) {
      return '{"result": "success", "data": "mock data"}';
    }

    return `Mock response to: "${lastMessage.content.substring(0, 50)}"`;
  }

  private async simulateDelay(): Promise<void> {
    const delay = this.options.delay || 10;
    return this.sleep(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private estimateTokens(messages: AIMessage[]): number {
    return messages.reduce((total, msg) => total + Math.ceil(msg.content.length / 4), 0);
  }
}
