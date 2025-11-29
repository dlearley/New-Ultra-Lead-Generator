/**
 * BullMQ Worker for computing embeddings
 */

import { Worker, Job, UnrecoverableError } from 'bullmq';
import type { AIRegistry } from '@ai/core';
import { EmbeddingJobData, BusinessEmbedding } from '../types.js';
import { EmbeddingsRepository } from '../db/embeddings-repo.js';
import { Pool } from 'pg';

export interface ComputeEmbeddingsWorkerOptions {
  pool: Pool;
  aiRegistry: AIRegistry;
  concurrency?: number;
  defaultProvider?: string;
  defaultModel?: string;
}

export class ComputeEmbeddingsWorker {
  private worker: Worker<EmbeddingJobData> | null = null;
  private embeddingsRepo: EmbeddingsRepository;

  constructor(
    private redisConnection: { host: string; port: number },
    private options: ComputeEmbeddingsWorkerOptions
  ) {
    this.embeddingsRepo = new EmbeddingsRepository(options.pool);
  }

  async start(): Promise<void> {
    this.worker = new Worker<EmbeddingJobData>(
      'compute-embeddings',
      async (job: Job<EmbeddingJobData>) => this.processJob(job),
      {
        connection: this.redisConnection,
        concurrency: this.options.concurrency || 5,
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });

    console.log('ComputeEmbeddingsWorker started');
  }

  async stop(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
    console.log('ComputeEmbeddingsWorker stopped');
  }

  private async processJob(job: Job<EmbeddingJobData>): Promise<any> {
    const { businessId, content, contentHash, provider, model } = job.data;

    try {
      // Check if content has changed
      const existingEmbedding = await this.embeddingsRepo.getEmbedding(
        businessId,
        provider,
        model
      );

      if (existingEmbedding && existingEmbedding.contentHash === contentHash) {
        return {
          status: 'skipped',
          reason: 'content_unchanged',
          embeddingId: existingEmbedding.id,
        };
      }

      // Update job progress
      job.updateProgress(50);

      // Call embedding provider
      const startTime = Date.now();

      const result = await this.options.aiRegistry.embedText(content, {
        provider,
        model,
      });

      const embeddingTime = Date.now() - startTime;

      if (!result.embedding) {
        throw new Error('No embedding returned from provider');
      }

      // Generate unique ID
      const randomId = Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      // Save embedding
      const embedding: BusinessEmbedding = {
        id: randomId,
        businessId,
        contentHash,
        embedding: result.embedding,
        provider,
        model,
        embeddingDimension: result.embedding.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.embeddingsRepo.saveEmbedding(embedding);

      job.updateProgress(100);

      return {
        status: 'success',
        embeddingId: embedding.id,
        embeddingTime,
        dimension: result.embedding.length,
      };
    } catch (error) {
      const err = error as Error;

      // Retry logic
      if (job.attemptsMade < (job.data.maxRetries || 3)) {
        const delay = Math.pow(2, job.attemptsMade) * 1000;
        throw new Error(`${err.message} (will retry in ${delay}ms)`);
      }

      // Final failure
      throw new UnrecoverableError(`Failed to compute embedding: ${err.message}`);
    }
  }
}

/**
 * Create and start worker
 */
export async function createComputeEmbeddingsWorker(
  redisConnection: { host: string; port: number },
  options: ComputeEmbeddingsWorkerOptions
): Promise<ComputeEmbeddingsWorker> {
  const worker = new ComputeEmbeddingsWorker(redisConnection, options);
  await worker.start();
  return worker;
}
