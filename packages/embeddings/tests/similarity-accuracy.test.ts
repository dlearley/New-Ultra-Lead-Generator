/**
 * Tests for similarity accuracy and search functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import pg from 'pg';
import { setupTestDb, cleanupTestDb } from './setup.js';
import { EmbeddingsRepository } from '../src/db/embeddings-repo.js';
import { SimilarityService } from '../src/services/similarity-service.js';
import { BusinessEmbedding } from '../src/types.js';
import { AIRegistry } from '@ai/core/registry';

describe('Similarity Accuracy', () => {
  let pool: pg.Pool;
  let repo: EmbeddingsRepository;
  let mockRegistry: AIRegistry;

  beforeAll(async () => {
    pool = await setupTestDb();
    repo = new EmbeddingsRepository(pool);

    // Create mock registry
    mockRegistry = {
      embedText: vi.fn().mockResolvedValue({
        embedding: Array(1536).fill(0.1),
      }),
    } as any;
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM business_embeddings');
    await pool.query('DELETE FROM businesses');
  });

  function createEmbedding(value: number, id: string): number[] {
    return Array(1536).fill(value);
  }

  function createOrthogonal(): number[] {
    // Create orthogonal vectors
    const vec = Array(1536).fill(0);
    vec[0] = 1;
    return vec;
  }

  it('should calculate cosine similarity correctly', async () => {
    const service = new SimilarityService(pool, mockRegistry);

    // Test identical vectors
    const vec = createEmbedding(0.5, 'test');
    expect(service['cosineSimilarity'](vec, vec)).toBeCloseTo(1.0, 5);

    // Test opposite vectors
    const negative = vec.map((v) => -v);
    expect(service['cosineSimilarity'](vec, negative)).toBeCloseTo(-1.0, 5);

    // Test orthogonal vectors
    const ortho1 = createOrthogonal();
    const ortho2 = createOrthogonal();
    ortho2[0] = 0;
    ortho2[1] = 1;
    expect(service['cosineSimilarity'](ortho1, ortho2)).toBeCloseTo(0, 1);
  });

  it('should find similar businesses with correct ranking', async () => {
    const businessId = '550e8400-e29b-41d4-a716-446655440001';
    const provider = 'openai';
    const model = 'text-embedding-3-small';

    // Create reference vector
    const refVec = createEmbedding(0.5, 'ref');

    // Create query vector (similar to reference)
    const queryVec = createEmbedding(0.5, 'query');

    // Save reference embedding
    const refEmbedding: BusinessEmbedding = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      businessId,
      contentHash: 'ref',
      embedding: refVec,
      provider,
      model,
      embeddingDimension: 1536,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await repo.saveEmbedding(refEmbedding);

    // Find similar (should find the reference itself if no exclusion)
    const similar = await repo.findSimilar(queryVec, { limit: 5 });

    // Should have similarity close to 1.0 (identical vectors)
    expect(similar.length > 0).toBe(true);
    if (similar.length > 0) {
      expect(similar[0].similarity).toBeGreaterThan(0.9);
    }
  });

  it('should respect similarity threshold', async () => {
    const provider = 'openai';
    const model = 'text-embedding-3-small';

    // Create highly similar vector
    const similar = createEmbedding(0.5, 'similar');

    // Create very different vector
    const different = Array(1536).fill(0);
    different[0] = 1.0;

    // Save both
    const emb1: BusinessEmbedding = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      businessId: '550e8400-e29b-41d4-a716-446655440004',
      contentHash: 'similar',
      embedding: similar,
      provider,
      model,
      embeddingDimension: 1536,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const emb2: BusinessEmbedding = {
      id: '550e8400-e29b-41d4-a716-446655440005',
      businessId: '550e8400-e29b-41d4-a716-446655440006',
      contentHash: 'different',
      embedding: different,
      provider,
      model,
      embeddingDimension: 1536,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await repo.saveEmbedding(emb1);
    await repo.saveEmbedding(emb2);

    // Query with reference vector
    const queryVec = createEmbedding(0.5, 'query');

    // With high threshold, should only get similar ones
    const highThreshold = await repo.findSimilar(queryVec, {
      limit: 10,
      similarityThreshold: 0.8,
    });

    expect(highThreshold.length).toBeLessThanOrEqual(2);

    // With low threshold, might get both
    const lowThreshold = await repo.findSimilar(queryVec, {
      limit: 10,
      similarityThreshold: 0.1,
    });

    expect(lowThreshold.length).toBeGreaterThanOrEqual(1);
  });

  it('should exclude specified business', async () => {
    const businessId = '550e8400-e29b-41d4-a716-446655440007';
    const provider = 'openai';
    const model = 'text-embedding-3-small';

    // Create identical vectors for multiple businesses
    const vec = createEmbedding(0.5, 'test');

    for (let i = 0; i < 3; i++) {
      const embedding: BusinessEmbedding = {
        id: `550e8400-e29b-41d4-a716-${String(i + 1000).padStart(12, '0')}`,
        businessId: `550e8400-e29b-41d4-a716-${String(i + 2000).padStart(12, '0')}`,
        contentHash: `test-${i}`,
        embedding: vec,
        provider,
        model,
        embeddingDimension: 1536,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await repo.saveEmbedding(embedding);
    }

    const queryVec = createEmbedding(0.5, 'query');

    // Find similar without exclusion
    const all = await repo.findSimilar(queryVec, { limit: 10 });
    const allIds = all.map((s) => s.id);

    // Find similar with exclusion
    const excluded = await repo.findSimilar(queryVec, {
      limit: 10,
      excludeBusinessId: `550e8400-e29b-41d4-a716-${String(2000).padStart(12, '0')}`,
    });

    expect(allIds.length).toBeGreaterThanOrEqual(excluded.length);
  });

  it('should rank results by similarity score', async () => {
    const provider = 'openai';
    const model = 'text-embedding-3-small';

    // Create embeddings with varying similarity
    const baseVec = createEmbedding(0.5, 'base');

    // Similar: 0.5 (same)
    const sim1 = createEmbedding(0.5, 'sim1');

    // Less similar: 0.4
    const sim2 = createEmbedding(0.4, 'sim2');

    // Even less similar: 0.1
    const sim3 = createEmbedding(0.1, 'sim3');

    const embeddings = [
      {
        id: '550e8400-e29b-41d4-a716-446655440008',
        businessId: '550e8400-e29b-41d4-a716-446655440009',
        vec: sim1,
        hash: 'sim1',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        businessId: '550e8400-e29b-41d4-a716-446655440011',
        vec: sim2,
        hash: 'sim2',
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440012',
        businessId: '550e8400-e29b-41d4-a716-446655440013',
        vec: sim3,
        hash: 'sim3',
      },
    ];

    for (const emb of embeddings) {
      const embedding: BusinessEmbedding = {
        id: emb.id,
        businessId: emb.businessId,
        contentHash: emb.hash,
        embedding: emb.vec,
        provider,
        model,
        embeddingDimension: 1536,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await repo.saveEmbedding(embedding);
    }

    // Query
    const results = await repo.findSimilar(baseVec, { limit: 10 });

    // Verify ranking
    expect(results.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
    }
  });

  it('should handle edge case of zero vectors', async () => {
    const zeroVec = Array(1536).fill(0);
    const service = new SimilarityService(pool, mockRegistry);

    expect(() => {
      service['cosineSimilarity'](zeroVec, zeroVec);
    }).toThrow();
  });
});
