/**
 * Repository for business embeddings
 */

import { Pool } from 'pg';
import { BusinessEmbedding, SimilarBusiness, FindSimilarOptions } from '../types.js';

export class EmbeddingsRepository {
  constructor(private pool: Pool) {}

  async saveEmbedding(embedding: BusinessEmbedding): Promise<BusinessEmbedding> {
    const result = await this.pool.query(
      `INSERT INTO business_embeddings 
        (business_id, content_hash, embedding, provider, model, embedding_dimension, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (business_id, provider, model)
       DO UPDATE SET 
        embedding = EXCLUDED.embedding,
        content_hash = EXCLUDED.content_hash,
        updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [
        embedding.businessId,
        embedding.contentHash,
        JSON.stringify(embedding.embedding),
        embedding.provider,
        embedding.model,
        embedding.embeddingDimension,
        embedding.createdAt,
        embedding.updatedAt,
      ]
    );

    return this.parseEmbedding(result.rows[0]);
  }

  async getEmbedding(
    businessId: string,
    provider: string,
    model: string
  ): Promise<BusinessEmbedding | null> {
    const result = await this.pool.query(
      `SELECT * FROM business_embeddings 
       WHERE business_id = $1 AND provider = $2 AND model = $3`,
      [businessId, provider, model]
    );

    return result.rows.length > 0 ? this.parseEmbedding(result.rows[0]) : null;
  }

  async findSimilar(
    embedding: number[],
    options: FindSimilarOptions = {}
  ): Promise<SimilarBusiness[]> {
    const {
      limit = 10,
      similarityThreshold = 0.5,
      excludeBusinessId,
      category,
      geoRadius,
    } = options;

    const embeddingJson = JSON.stringify(embedding);
    const queryParts: string[] = [
      `SELECT 
        b.id,
        b.name,
        (1 - (be.embedding <=> $1::vector)) as similarity
       FROM business_embeddings be
       JOIN businesses b ON be.business_id = b.id
       WHERE (1 - (be.embedding <=> $1::vector)) > $2`,
    ];

    const params: unknown[] = [embeddingJson, similarityThreshold];

    if (excludeBusinessId) {
      queryParts.push(`AND be.business_id != $${params.length + 1}`);
      params.push(excludeBusinessId);
    }

    if (category) {
      queryParts.push(`AND b.category = $${params.length + 1}`);
      params.push(category);
    }

    if (geoRadius) {
      queryParts.push(
        `AND earth_distance(
          ll_to_earth(b.latitude, b.longitude),
          ll_to_earth($${params.length + 1}, $${params.length + 2})
        ) < $${params.length + 3}`
      );
      params.push(geoRadius.latitude, geoRadius.longitude, geoRadius.radiusKm * 1000);
    }

    queryParts.push(`ORDER BY similarity DESC LIMIT $${params.length + 1}`);
    params.push(limit);

    const query = queryParts.join(' ');
    const result = await this.pool.query(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      similarity: row.similarity,
    }));
  }

  async getBusinessEmbeddings(businessId: string): Promise<BusinessEmbedding[]> {
    const result = await this.pool.query(
      `SELECT * FROM business_embeddings WHERE business_id = $1 ORDER BY created_at DESC`,
      [businessId]
    );

    return result.rows.map((row) => this.parseEmbedding(row));
  }

  async deleteEmbedding(businessId: string): Promise<void> {
    await this.pool.query(`DELETE FROM business_embeddings WHERE business_id = $1`, [
      businessId,
    ]);
  }

  async countEmbeddings(provider?: string, model?: string): Promise<number> {
    let query = 'SELECT COUNT(*) as count FROM business_embeddings';
    const params: unknown[] = [];

    if (provider) {
      query += ` WHERE provider = $${params.length + 1}`;
      params.push(provider);

      if (model) {
        query += ` AND model = $${params.length + 1}`;
        params.push(model);
      }
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  private parseEmbedding(row: Record<string, any>): BusinessEmbedding {
    return {
      id: row.id,
      businessId: row.business_id,
      contentHash: row.content_hash,
      embedding: typeof row.embedding === 'string' 
        ? JSON.parse(row.embedding) 
        : row.embedding,
      provider: row.provider,
      model: row.model,
      embeddingDimension: row.embedding_dimension,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
