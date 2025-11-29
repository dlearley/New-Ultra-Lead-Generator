import type { AIMessage, AIGenerationOptions, AIGenerationResponse } from '../types/index.js';
import { BaseProvider } from './base.js';

export class AnthropicProvider extends BaseProvider {
  name = 'anthropic';
  version = '1.0.0';

  private client: any;

  constructor(config: any) {
    super(config);
    try {
      const Anthropic = require('@anthropic-ai/sdk').default;
      this.client = new Anthropic({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
        timeout: config.timeout || 30000,
      });
    } catch (error) {
      throw new Error('Anthropic SDK not installed. Install with: npm install @anthropic-ai/sdk');
    }
  }

  async generate(
    messages: AIMessage[],
    options?: AIGenerationOptions
  ): Promise<AIGenerationResponse> {
    this.checkApiKey();

    const anthropicMessages = this.transformMessages(messages);
    const systemMessage = this.extractSystemMessage(messages);

    const response = await this.client.messages.create({
      model: this.getModel(),
      max_tokens: options?.maxTokens || 1024,
      system: systemMessage,
      messages: anthropicMessages,
      temperature: options?.temperature,
      top_p: options?.topP,
    });

    const content = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');

    return {
      content,
      finishReason: response.stop_reason,
      usage: {
        promptTokens: response.usage?.input_tokens || 0,
        completionTokens: response.usage?.output_tokens || 0,
        totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      },
    };
  }

  async *stream(
    messages: AIMessage[],
    options?: AIGenerationOptions
  ): AsyncGenerator<string> {
    this.checkApiKey();

    const anthropicMessages = this.transformMessages(messages);
    const systemMessage = this.extractSystemMessage(messages);

    const stream = await this.client.messages.create({
      model: this.getModel(),
      max_tokens: options?.maxTokens || 1024,
      system: systemMessage,
      messages: anthropicMessages,
      temperature: options?.temperature,
      top_p: options?.topP,
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  private transformMessages(
    messages: AIMessage[]
  ): Array<{ role: string; content: string }> {
    return messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      }));
  }

  private extractSystemMessage(messages: AIMessage[]): string {
    const systemMsg = messages.find((msg) => msg.role === 'system');
    return systemMsg?.content || '';
  }
}
