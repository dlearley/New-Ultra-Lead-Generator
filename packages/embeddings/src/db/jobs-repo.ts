/**
 * Repository for embedding job tracking
 */

import { Pool } from 'pg';
import { EmbeddingJobProgress } from '../types.js';

export class EmbeddingJobsRepository {
  constructor(private pool: Pool) {}

  async createJob(
    jobName: string,
    totalCount: number,
    provider: string,
    model: string
  ): Promise<string> {
    const result = await this.pool.query(
      `INSERT INTO embedding_jobs (job_name, status, total_count, provider, model, started_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [jobName, 'processing', totalCount, provider, model, new Date()]
    );

    return result.rows[0].id;
  }

  async getJob(jobId: string): Promise<EmbeddingJobProgress | null> {
    const result = await this.pool.query(
      `SELECT * FROM embedding_jobs WHERE id = $1`,
      [jobId]
    );

    return result.rows.length > 0 ? this.parseJobProgress(result.rows[0]) : null;
  }

  async updateJobProgress(
    jobId: string,
    processed: number,
    failed: number,
    skipped: number
  ): Promise<void> {
    await this.pool.query(
      `UPDATE embedding_jobs 
       SET processed_count = $1, failed_count = $2, skipped_count = $3, updated_at = $4
       WHERE id = $5`,
      [processed, failed, skipped, new Date(), jobId]
    );
  }

  async completeJob(jobId: string, errorMessage?: string): Promise<void> {
    await this.pool.query(
      `UPDATE embedding_jobs 
       SET status = $1, completed_at = $2, error_message = $3, updated_at = $4
       WHERE id = $5`,
      [errorMessage ? 'failed' : 'completed', new Date(), errorMessage || null, new Date(), jobId]
    );
  }

  async recordMetric(
    jobId: string,
    metricName: string,
    metricValue: number,
    tags?: Record<string, string>
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO embedding_metrics (job_id, metric_name, metric_value, tags)
       VALUES ($1, $2, $3, $4)`,
      [jobId, metricName, metricValue, tags ? JSON.stringify(tags) : null]
    );
  }

  async getJobMetrics(jobId: string, metricName?: string): Promise<any[]> {
    let query = 'SELECT * FROM embedding_metrics WHERE job_id = $1';
    const params: unknown[] = [jobId];

    if (metricName) {
      query += ` AND metric_name = $2`;
      params.push(metricName);
    }

    query += ' ORDER BY timestamp DESC';
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getRecentJobs(limit: number = 10): Promise<EmbeddingJobProgress[]> {
    const result = await this.pool.query(
      `SELECT * FROM embedding_jobs ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );

    return result.rows.map((row) => this.parseJobProgress(row));
  }

  private parseJobProgress(row: Record<string, any>): EmbeddingJobProgress {
    return {
      jobId: row.id,
      totalBusinesses: row.total_count,
      processedBusinesses: row.processed_count,
      failedBusinesses: row.failed_count,
      skippedBusinesses: row.skipped_count,
      startedAt: new Date(row.started_at),
      updatedAt: new Date(row.updated_at),
      status: row.status,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    };
  }
}
