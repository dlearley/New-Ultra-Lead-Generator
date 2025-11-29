/**
 * Service for backfilling embeddings
 */

import { Queue } from 'bullmq';
import { Pool } from 'pg';
import { EmbeddingJobData } from '../types.js';
import { EmbeddingJobsRepository } from '../db/jobs-repo.js';
import { generateContentHash } from '../utils/content-hash.js';

export interface BackfillOptions {
  provider: string;
  model: string;
  batchSize?: number;
  filter?: {
    ids?: string[];
    categories?: string[];
    createdAfter?: Date;
    createdBefore?: Date;
  };
}

export class BackfillService {
  private jobsRepo: EmbeddingJobsRepository;

  constructor(
    private pool: Pool,
    private embeddingsQueue: Queue<EmbeddingJobData>
  ) {
    this.jobsRepo = new EmbeddingJobsRepository(pool);
  }

  async startBackfill(jobName: string, options: BackfillOptions): Promise<string> {
    const { provider, model, batchSize = 100, filter } = options;

    // Get count of businesses to process
    const businesses = await this.getBusinessesToEmbed(filter);
    const totalCount = businesses.length;

    console.log(`Starting backfill: ${totalCount} businesses to embed`);

    // Create job tracking record
    const jobId = await this.jobsRepo.createJob(jobName, totalCount, provider, model);

    // Queue embedding jobs
    const jobs: EmbeddingJobData[] = businesses.map((business: any) => ({
      businessId: business.id,
      content: this.buildContent(business),
      contentHash: generateContentHash([
        { type: 'name', content: business.name || '' },
        { type: 'description', content: business.description || '' },
        { type: 'website', content: business.website || '' },
      ]),
      provider,
      model,
      priority: 5,
      retryCount: 0,
      maxRetries: 3,
    }));

    // Add jobs to queue in batches
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      await this.embeddingsQueue.addBulk(
        batch.map((data) => ({
          name: `embed-${data.businessId}`,
          data,
          opts: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: true,
            removeOnFail: false,
          },
        }))
      );
    }

    console.log(`Backfill job ${jobId} started with ${jobs.length} embedding tasks`);
    return jobId;
  }

  async getJobProgress(jobId: string): Promise<EmbeddingJobProgress | null> {
    return await this.jobsRepo.getJob(jobId);
  }

  async resumeIncompleteJobs(provider: string, model: string): Promise<string[]> {
    // Find incomplete jobs
    const result = await this.pool.query(
      `SELECT id, total_count, processed_count 
       FROM embedding_jobs 
       WHERE status IN ('pending', 'processing') 
       AND provider = $1 
       AND model = $2
       ORDER BY created_at DESC`,
      [provider, model]
    );

    const jobIds: string[] = [];

    for (const row of result.rows) {
      const jobId = row.id;
      const remaining = row.total_count - row.processed_count;

      if (remaining > 0) {
        console.log(`Resuming job ${jobId} with ${remaining} pending tasks`);
        jobIds.push(jobId);
      }
    }

    return jobIds;
  }

  private async getBusinessesToEmbed(
    filter?: BackfillOptions['filter']
  ): Promise<any[]> {
    let query = `SELECT id, name, description, website FROM businesses WHERE TRUE`;
    const params: unknown[] = [];

    if (filter?.ids && filter.ids.length > 0) {
      query += ` AND id = ANY($${params.length + 1}::uuid[])`;
      params.push(filter.ids);
    }

    if (filter?.categories && filter.categories.length > 0) {
      query += ` AND category = ANY($${params.length + 1}::text[])`;
      params.push(filter.categories);
    }

    if (filter?.createdAfter) {
      query += ` AND created_at >= $${params.length + 1}`;
      params.push(filter.createdAfter);
    }

    if (filter?.createdBefore) {
      query += ` AND created_at <= $${params.length + 1}`;
      params.push(filter.createdBefore);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  private buildContent(business: any): string {
    const parts: string[] = [];

    if (business.name) {
      parts.push(`Name: ${business.name}`);
    }

    if (business.description) {
      parts.push(`Description: ${business.description}`);
    }

    if (business.website) {
      parts.push(`Website: ${business.website}`);
    }

    return parts.join('\n\n');
  }
}
