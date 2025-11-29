import type { AIMessage, AIGenerationResponse } from '../types/index.js';
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
