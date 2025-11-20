/**
 * Tests for embedding serialization and persistence
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { setupTestDb, cleanupTestDb } from './setup.js';
import { EmbeddingsRepository } from '../src/db/embeddings-repo.js';
import { BusinessEmbedding } from '../src/types.js';
import { hashContent } from '../src/utils/content-hash.js';

describe('Embedding Serialization', () => {
  let pool: Pool;
  let repo: EmbeddingsRepository;

  beforeAll(async () => {
    pool = await setupTestDb();
    repo = new EmbeddingsRepository(pool);
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM business_embeddings');
    await pool.query('DELETE FROM businesses');
  });

  it('should serialize and deserialize embedding vectors', async () => {
    // Create test vector
    const testVector = Array(1536)
      .fill(0)
      .map((_, i) => Math.sin(i) * 0.5);

    const embedding: BusinessEmbedding = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      businessId: '550e8400-e29b-41d4-a716-446655440002',
      contentHash: hashContent('test content'),
      embedding: testVector,
      provider: 'openai',
      model: 'text-embedding-3-small',
      embeddingDimension: testVector.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save embedding
    const saved = await repo.saveEmbedding(embedding);

    // Verify serialization
    expect(saved).toBeDefined();
    expect(saved.embedding).toHaveLength(1536);
    expect(saved.embedding[0]).toBeCloseTo(testVector[0], 5);
    expect(saved.embedding[1535]).toBeCloseTo(testVector[1535], 5);
  });

  it('should preserve vector precision through round-trip', async () => {
    const businessId = '550e8400-e29b-41d4-a716-446655440003';
    const provider = 'openai';
    const model = 'text-embedding-3-small';

    // Create vector with specific values
    const testVector = Array(1536)
      .fill(0)
      .map((_, i) => (Math.random() - 0.5) / 100);

    const embedding: BusinessEmbedding = {
      id: '550e8400-e29b-41d4-a716-446655440004',
      businessId,
      contentHash: 'abc123',
      embedding: testVector,
      provider,
      model,
      embeddingDimension: 1536,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save and retrieve
    await repo.saveEmbedding(embedding);
    const retrieved = await repo.getEmbedding(businessId, provider, model);

    expect(retrieved).toBeDefined();
    expect(retrieved!.embedding).toHaveLength(1536);

    // Verify precision
    for (let i = 0; i < 1536; i++) {
      expect(retrieved!.embedding[i]).toBeCloseTo(testVector[i], 6);
    }
  });

  it('should handle metadata correctly', async () => {
    const embedding: BusinessEmbedding = {
      id: '550e8400-e29b-41d4-a716-446655440005',
      businessId: '550e8400-e29b-41d4-a716-446655440006',
      contentHash: 'meta-test',
      embedding: Array(1536).fill(0.1),
      provider: 'anthropic',
      model: 'claude-embedding',
      embeddingDimension: 1536,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    };

    const saved = await repo.saveEmbedding(embedding);

    expect(saved.provider).toBe('anthropic');
    expect(saved.model).toBe('claude-embedding');
    expect(saved.contentHash).toBe('meta-test');
  });

  it('should handle concurrent embeddings for same business', async () => {
    const businessId = '550e8400-e29b-41d4-a716-446655440007';

    const embedding1: BusinessEmbedding = {
      id: '550e8400-e29b-41d4-a716-446655440008',
      businessId,
      contentHash: 'content-v1',
      embedding: Array(1536).fill(0.1),
      provider: 'openai',
      model: 'text-embedding-3-small',
      embeddingDimension: 1536,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const embedding2: BusinessEmbedding = {
      id: '550e8400-e29b-41d4-a716-446655440009',
      businessId,
      contentHash: 'content-v2',
      embedding: Array(1536).fill(0.2),
      provider: 'anthropic',
      model: 'claude-embedding',
      embeddingDimension: 1536,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save both
    await repo.saveEmbedding(embedding1);
    await repo.saveEmbedding(embedding2);

    // Verify both exist
    const result1 = await repo.getEmbedding(businessId, 'openai', 'text-embedding-3-small');
    const result2 = await repo.getEmbedding(businessId, 'anthropic', 'claude-embedding');

    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
    expect(result1!.embedding[0]).toBeCloseTo(0.1, 5);
    expect(result2!.embedding[0]).toBeCloseTo(0.2, 5);
  });

  it('should handle large batch inserts', async () => {
    const embeddings: BusinessEmbedding[] = Array(100)
      .fill(null)
      .map((_, index) => ({
        id: `550e8400-e29b-41d4-a716-${String(index).padStart(12, '0')}`,
        businessId: `550e8400-e29b-41d4-a716-${String(index + 1000).padStart(12, '0')}`,
        contentHash: `hash-${index}`,
        embedding: Array(1536).fill(Math.random() / 100),
        provider: 'openai',
        model: 'text-embedding-3-small',
        embeddingDimension: 1536,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

    // Save all
    const savedIds: string[] = [];
    for (const embedding of embeddings) {
      const saved = await repo.saveEmbedding(embedding);
      savedIds.push(saved.id);
    }

    expect(savedIds).toHaveLength(100);

    // Verify count
    const count = await repo.countEmbeddings('openai', 'text-embedding-3-small');
    expect(count).toBe(100);
  });

  it('should detect content hash changes', async () => {
    const businessId = '550e8400-e29b-41d4-a716-446655440010';
    const provider = 'openai';
    const model = 'text-embedding-3-small';

    const hash1 = hashContent('original content');
    const embedding1: BusinessEmbedding = {
      id: '550e8400-e29b-41d4-a716-446655440011',
      businessId,
      contentHash: hash1,
      embedding: Array(1536).fill(0.1),
      provider,
      model,
      embeddingDimension: 1536,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await repo.saveEmbedding(embedding1);

    // Update with new content
    const hash2 = hashContent('updated content');
    const embedding2: BusinessEmbedding = {
      id: '550e8400-e29b-41d4-a716-446655440012',
      businessId,
      contentHash: hash2,
      embedding: Array(1536).fill(0.2),
      provider,
      model,
      embeddingDimension: 1536,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await repo.saveEmbedding(embedding2);

    // Retrieve and verify update
    const retrieved = await repo.getEmbedding(businessId, provider, model);
    expect(retrieved!.contentHash).toBe(hash2);
    expect(retrieved!.embedding[0]).toBeCloseTo(0.2, 5);
  });
});
