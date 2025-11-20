import { describe, it, expect } from 'vitest';
import { version, SearchEngine, createSearchEngine } from './index';

describe('@monorepo/search', () => {
  it('should export version', () => {
    expect(version).toBe('0.0.1');
  });

  it('should create SearchEngine', () => {
    const engine = createSearchEngine();
    expect(engine).toBeDefined();
  });

  it('should return empty search results', async () => {
    const engine = createSearchEngine();
    const results = await engine.search({ q: 'test' });
    expect(results.items).toEqual([]);
    expect(results.total).toBe(0);
    expect(results.hasMore).toBe(false);
  });

  it('should index document', async () => {
    const engine = createSearchEngine();
    await expect(engine.index('doc1', { title: 'Test' })).resolves.toBeUndefined();
  });
});
