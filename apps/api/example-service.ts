/**
 * Example: Using @ai/core in an API service
 *
 * This file demonstrates how to integrate the AI provider registry
 * into your Express/Node API services.
 */

import type { AIRegistry, AIGenerationResponse } from '@ai/core';
import { createDIContainer, PromptBuilder, AIError } from '@ai/core';

/**
 * Example: Content Classification Service
 * 
 * Classifies user-submitted content into categories
 */
export class ContentClassificationService {
  private registry: AIRegistry;

  constructor(registry: AIRegistry) {
    this.registry = registry;
  }

  async classifyContent(
    text: string,
    categories: string[]
  ): Promise<{ category: string; confidence?: number }> {
    try {
      const messages = PromptBuilder.create('classification')
        .set('text', text)
        .set('categories', categories.join(', '))
        .build();

      const response = await this.registry.generate(messages);

      return {
        category: response.content.trim(),
      };
    } catch (error) {
      if (error instanceof AIError) {
        console.error(
          `Classification failed [${error.context.provider}]:`,
          error.message
        );
        if (error.context.retryable) {
          // Implement retry logic here
          throw new Error('Service temporarily unavailable, please retry');
        }
      }
      throw error;
    }
  }
}

/**
 * Example: Content Summarization Service
 *
 * Summarizes long-form content into concise summaries
 */
export class ContentSummarizationService {
  private registry: AIRegistry;

  constructor(registry: AIRegistry) {
    this.registry = registry;
  }

  async summarizeContent(
    text: string,
    maxLength: number = 200
  ): Promise<string> {
    const messages = PromptBuilder.create('summarization')
      .set('text', text)
      .set('maxLength', maxLength.toString())
      .build();

    const response = await this.registry.generate(messages);
    return response.content;
  }

  async *streamSummary(
    text: string,
    maxLength: number = 200
  ): AsyncGenerator<string> {
    const messages = PromptBuilder.create('summarization')
      .set('text', text)
      .set('maxLength', maxLength.toString())
      .build();

    for await (const chunk of this.registry.stream(messages)) {
      yield chunk;
    }
  }
}

/**
 * Example: Information Extraction Service
 *
 * Extracts specific information from unstructured text
 */
export class InformationExtractionService {
  private registry: AIRegistry;

  constructor(registry: AIRegistry) {
    this.registry = registry;
  }

  async extractInfo(
    text: string,
    fields: string[]
  ): Promise<Record<string, unknown>> {
    const messages = PromptBuilder.create('extraction')
      .set('text', text)
      .set('fields', fields.join(', '))
      .build();

    const response = await this.registry.generate(messages);

    // In real application, parse the response into structured format
    return {
      raw: response.content,
      fields: fields,
    };
  }
}

/**
 * Example: Content Generation Service
 *
 * Generates creative or technical content
 */
export class ContentGenerationService {
  private registry: AIRegistry;

  constructor(registry: AIRegistry) {
    this.registry = registry;
  }

  async generateContent(
    prompt: string,
    style: string = 'professional',
    tone: string = 'neutral'
  ): Promise<string> {
    const messages = PromptBuilder.create('generation')
      .set('prompt', prompt)
      .set('style', style)
      .set('tone', tone)
      .build();

    const response = await this.registry.generate(messages);
    return response.content;
  }

  async *streamGeneratedContent(
    prompt: string,
    style: string = 'professional',
    tone: string = 'neutral'
  ): AsyncGenerator<string> {
    const messages = PromptBuilder.create('generation')
      .set('prompt', prompt)
      .set('style', style)
      .set('tone', tone)
      .build();

    for await (const chunk of this.registry.stream(messages)) {
      yield chunk;
    }
  }
}

/**
 * Example: AI Service Factory
 *
 * Creates and manages AI services with dependency injection
 */
export class AIServiceFactory {
  private registry: AIRegistry;

  static create(): AIServiceFactory {
    const container = createDIContainer();
    const registry = container.getRegistry();

    return new AIServiceFactory(registry);
  }

  constructor(registry: AIRegistry) {
    this.registry = registry;
  }

  createClassificationService(): ContentClassificationService {
    return new ContentClassificationService(this.registry);
  }

  createSummarizationService(): ContentSummarizationService {
    return new ContentSummarizationService(this.registry);
  }

  createExtractionService(): InformationExtractionService {
    return new InformationExtractionService(this.registry);
  }

  createGenerationService(): ContentGenerationService {
    return new ContentGenerationService(this.registry);
  }

  getRegistry(): AIRegistry {
    return this.registry;
  }
}

/**
 * Example: Express Route Handler
 *
 * demonstrates integration in an Express API
 */
export async function classifyContentEndpoint(req: any, res: any) {
  try {
    const { text, categories } = req.body;

    if (!text || !categories || !Array.isArray(categories)) {
      return res.status(400).json({
        error: 'Missing required fields: text (string), categories (string[])',
      });
    }

    const factory = AIServiceFactory.create();
    const service = factory.createClassificationService();

    const result = await service.classifyContent(text, categories);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Classification endpoint error:', error);

    if (error instanceof AIError && error.context.retryable) {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        retryable: true,
      });
    }

    res.status(500).json({
      error: 'Classification failed',
      message: error.message,
    });
  }
}

export async function streamSummaryEndpoint(req: any, res: any) {
  try {
    const { text, maxLength = 200 } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Missing required field: text',
      });
    }

    const factory = AIServiceFactory.create();
    const service = factory.createSummarizationService();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of service.streamSummary(text, maxLength)) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Stream summary endpoint error:', error);
    res.status(500).json({
      error: 'Streaming failed',
      message: error.message,
    });
  }
}

/**
 * Usage in a TypeScript/Node.js application:
 *
 * ```typescript
 * import express from 'express';
 * import { classifyContentEndpoint, streamSummaryEndpoint } from './example-service';
 *
 * const app = express();
 * app.use(express.json());
 *
 * // Classification endpoint
 * app.post('/api/classify', classifyContentEndpoint);
 *
 * // Streaming summarization endpoint
 * app.post('/api/summarize/stream', streamSummaryEndpoint);
 *
 * app.listen(3000, () => {
 *   console.log('API running on port 3000');
 * });
 * ```
 */
