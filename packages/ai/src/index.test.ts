import { describe, it, expect } from 'vitest';
import { version, AIService, createAIService } from './index';

describe('@monorepo/ai', () => {
  it('should export version', () => {
    expect(version).toBe('0.0.1');
  });

  it('should create AIService', () => {
    const service = createAIService({ model: 'gpt-4' });
    expect(service).toBeDefined();
  });

  it('should complete request', async () => {
    const service = createAIService();
    const response = await service.complete({ prompt: 'Hello' });
    expect(response.text).toBe('AI response placeholder');
    expect(response.tokensUsed).toBe(0);
  });

  it('should embed text', async () => {
    const service = createAIService();
    const embedding = await service.embed('test text');
    expect(Array.isArray(embedding)).toBe(true);
  });
});
