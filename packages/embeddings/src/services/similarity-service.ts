/**
 * Service for finding similar businesses
 */

import { Pool } from 'pg';
import { EmbeddingsRepository } from '../db/embeddings-repo.js';
import { SimilarBusiness, FindSimilarOptions } from '../types.js';
import type { AIRegistry } from '@ai/core';

export class SimilarityService {
  private embeddingsRepo: EmbeddingsRepository;

  constructor(
    private pool: Pool,
    private aiRegistry: AIRegistry
  ) {
    this.embeddingsRepo = new EmbeddingsRepository(pool);
  }

  async findSimilarBusinesses(
    businessId: string,
    options: FindSimilarOptions = {}
  ): Promise<SimilarBusiness[]> {
    const { limit = 10, provider = 'openai', model = 'text-embedding-3-small' } = options;

    // Get the embedding for the target business
    const businessEmbedding = await this.embeddingsRepo.getEmbedding(
      businessId,
      provider,
      model
    );

    if (!businessEmbedding) {
      throw new Error(`No embedding found for business ${businessId}`);
    }

    // Find similar businesses
    return await this.embeddingsRepo.findSimilar(businessEmbedding.embedding, {
      limit,
      excludeBusinessId: businessId,
      ...options,
    });
  }

  async findSimilarByContent(
    content: string,
    options: FindSimilarOptions = {}
  ): Promise<SimilarBusiness[]> {
    const { limit = 10, provider = 'openai', model = 'text-embedding-3-small' } = options;

    // Generate embedding for content
    const result = await this.aiRegistry.embedText(content, {
      provider,
      model,
    });

    if (!result.embedding) {
      throw new Error('Failed to generate embedding for content');
    }

    // Find similar businesses
    return await this.embeddingsRepo.findSimilar(result.embedding, {
      limit,
      ...options,
    });
  }

  async calculateSimilarity(
    businessId1: string,
    businessId2: string,
    provider: string = 'openai',
    model: string = 'text-embedding-3-small'
  ): Promise<number> {
    const embedding1 = await this.embeddingsRepo.getEmbedding(businessId1, provider, model);
    const embedding2 = await this.embeddingsRepo.getEmbedding(businessId2, provider, model);

    if (!embedding1 || !embedding2) {
      throw new Error('One or both businesses do not have embeddings');
    }

    return this.cosineSimilarity(embedding1.embedding, embedding2.embedding);
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  async getEmbeddingStats(provider: string, model: string): Promise<{
    totalEmbeddings: number;
    averageDimension: number;
    oldestEmbedding: Date | null;
    newestEmbedding: Date | null;
  }> {
    const result = await this.pool.query(
      `SELECT 
        COUNT(*) as count,
        AVG(embedding_dimension) as avg_dimension,
        MIN(created_at) as oldest,
        MAX(created_at) as newest
       FROM business_embeddings
       WHERE provider = $1 AND model = $2`,
      [provider, model]
    );

    const row = result.rows[0];
    return {
      totalEmbeddings: parseInt(row.count, 10),
      averageDimension: Math.round(parseFloat(row.avg_dimension)),
      oldestEmbedding: row.oldest ? new Date(row.oldest) : null,
      newestEmbedding: row.newest ? new Date(row.newest) : null,
    };
  }
}
