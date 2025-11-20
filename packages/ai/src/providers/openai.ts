import type { AIMessage, AIGenerationOptions, AIGenerationResponse } from '../types/index.js';
import { BaseProvider } from './base.js';

export class OpenAIProvider extends BaseProvider {
  name = 'openai';
  version = '1.0.0';

  private client: any;

  constructor(config: any) {
    super(config);
    try {
      const OpenAI = require('openai').default;
      this.client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
        timeout: config.timeout || 30000,
      });
    } catch (error) {
      throw new Error('OpenAI SDK not installed. Install with: npm install openai');
    }
  }

  async generate(
    messages: AIMessage[],
    options?: AIGenerationOptions
  ): Promise<AIGenerationResponse> {
    this.checkApiKey();

    const response = await this.client.chat.completions.create({
      model: this.getModel(),
      messages: this.transformMessages(messages),
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      top_p: options?.topP,
      frequency_penalty: options?.frequencyPenalty,
      presence_penalty: options?.presencePenalty,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      finishReason: response.choices[0]?.finish_reason,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }

  async *stream(
    messages: AIMessage[],
    options?: AIGenerationOptions
  ): AsyncGenerator<string> {
    this.checkApiKey();

    const stream = await this.client.chat.completions.create({
      model: this.getModel(),
      messages: this.transformMessages(messages),
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      top_p: options?.topP,
      frequency_penalty: options?.frequencyPenalty,
      presence_penalty: options?.presencePenalty,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  private transformMessages(messages: AIMessage[]): Array<{ role: string; content: string }> {
    return messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'user',
      content: msg.content,
    }));
  }
}
