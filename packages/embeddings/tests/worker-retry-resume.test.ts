/**
 * Tests for worker retry and resume behavior
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import pg from 'pg';
import { setupTestDb, cleanupTestDb } from './setup.js';
import { EmbeddingJobsRepository } from '../src/db/jobs-repo.js';

describe('Worker Retry and Resume', () => {
  let pool: pg.Pool;
  let jobsRepo: EmbeddingJobsRepository;

  beforeAll(async () => {
    pool = await setupTestDb();
    jobsRepo = new EmbeddingJobsRepository(pool);
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM embedding_metrics');
    await pool.query('DELETE FROM embedding_jobs');
  });

  it('should create and track embedding jobs', async () => {
    const jobId = await jobsRepo.createJob('test-backfill', 100, 'openai', 'text-embedding-3-small');

    const job = await jobsRepo.getJob(jobId);

    expect(job).toBeDefined();
    expect(job!.totalBusinesses).toBe(100);
    expect(job!.processedBusinesses).toBe(0);
    expect(job!.status).toBe('processing');
  });

  it('should update job progress', async () => {
    const jobId = await jobsRepo.createJob('test-backfill', 100, 'openai', 'text-embedding-3-small');

    // Update progress
    await jobsRepo.updateJobProgress(jobId, 50, 5, 0);

    const job = await jobsRepo.getJob(jobId);

    expect(job!.processedBusinesses).toBe(50);
    expect(job!.failedBusinesses).toBe(5);
    expect(job!.skippedBusinesses).toBe(0);
  });

  it('should mark job as completed', async () => {
    const jobId = await jobsRepo.createJob('test-backfill', 100, 'openai', 'text-embedding-3-small');

    // Complete job
    await jobsRepo.completeJob(jobId);

    const job = await jobsRepo.getJob(jobId);

    expect(job!.status).toBe('completed');
    expect(job!.completedAt).toBeDefined();
  });

  it('should mark job as failed with error message', async () => {
    const jobId = await jobsRepo.createJob('test-backfill', 100, 'openai', 'text-embedding-3-small');

    // Fail job
    const errorMsg = 'Database connection error';
    await jobsRepo.completeJob(jobId, errorMsg);

    const job = await jobsRepo.getJob(jobId);

    expect(job!.status).toBe('failed');
  });

  it('should record metrics for jobs', async () => {
    const jobId = await jobsRepo.createJob('test-backfill', 100, 'openai', 'text-embedding-3-small');

    // Record metrics
    await jobsRepo.recordMetric(jobId, 'embedding_time_ms', 245.5);
    await jobsRepo.recordMetric(jobId, 'throughput_per_minute', 120, {
      window: '1m',
    });

    const metrics = await jobsRepo.getJobMetrics(jobId);

    expect(metrics.length).toBe(2);
    expect(metrics[0].metric_name).toBe('throughput_per_minute');
    expect(metrics[1].metric_name).toBe('embedding_time_ms');
  });

  it('should retrieve specific metrics', async () => {
    const jobId = await jobsRepo.createJob('test-backfill', 100, 'openai', 'text-embedding-3-small');

    // Record mixed metrics
    await jobsRepo.recordMetric(jobId, 'embedding_time_ms', 100);
    await jobsRepo.recordMetric(jobId, 'embedding_time_ms', 150);
    await jobsRepo.recordMetric(jobId, 'error_count', 2);

    const timingMetrics = await jobsRepo.getJobMetrics(jobId, 'embedding_time_ms');

    expect(timingMetrics).toHaveLength(2);
    expect(timingMetrics.every((m) => m.metric_name === 'embedding_time_ms')).toBe(true);
  });

  it('should retrieve recent jobs', async () => {
    // Create multiple jobs
    const jobIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const id = await jobsRepo.createJob(
        `backfill-${i}`,
        100,
        'openai',
        'text-embedding-3-small'
      );
      jobIds.push(id);
      // Small delay to ensure different creation times
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    const recent = await jobsRepo.getRecentJobs(3);

    expect(recent).toHaveLength(3);
    // Should be in reverse chronological order
    expect(recent[0].jobId).toBe(jobIds[4]);
    expect(recent[1].jobId).toBe(jobIds[3]);
    expect(recent[2].jobId).toBe(jobIds[2]);
  });

  it('should track incomplete jobs for resumption', async () => {
    const provider = 'openai';
    const model = 'text-embedding-3-small';

    // Create jobs with different statuses
    const job1Id = await jobsRepo.createJob('backfill-1', 100, provider, model);
    await jobsRepo.updateJobProgress(job1Id, 50, 0, 0);

    const job2Id = await jobsRepo.createJob('backfill-2', 100, provider, model);
    await jobsRepo.updateJobProgress(job2Id, 75, 5, 0);

    const job3Id = await jobsRepo.createJob('backfill-3', 100, provider, model);
    // Mark as complete
    await jobsRepo.completeJob(job3Id);

    // Query incomplete jobs
    const result = await pool.query(
      `SELECT id, total_count, processed_count 
       FROM embedding_jobs 
       WHERE status IN ('pending', 'processing') 
       AND provider = $1 
       AND model = $2
       ORDER BY created_at DESC`,
      [provider, model]
    );

    expect(result.rows).toHaveLength(2);
    const incomplete = result.rows.map((r) => r.id);
    expect(incomplete).toContain(job1Id);
    expect(incomplete).toContain(job2Id);
    expect(incomplete).not.toContain(job3Id);
  });

  it('should calculate remaining tasks for job', async () => {
    const jobId = await jobsRepo.createJob('test-backfill', 1000, 'openai', 'text-embedding-3-small');

    // Update progress
    await jobsRepo.updateJobProgress(jobId, 500, 50, 20);

    const job = await jobsRepo.getJob(jobId);

    const remaining =
      job!.totalBusinesses -
      job!.processedBusinesses -
      job!.failedBusinesses -
      job!.skippedBusinesses;

    expect(remaining).toBe(430); // 1000 - 500 - 50 - 20
  });

  it('should handle concurrent job updates', async () => {
    const jobId = await jobsRepo.createJob('test-backfill', 1000, 'openai', 'text-embedding-3-small');

    // Simulate multiple workers updating progress concurrently
    const updates = Array(10)
      .fill(null)
      .map((_, i) =>
        jobsRepo.updateJobProgress(
          jobId,
          (i + 1) * 50, // processed
          i * 5, // failed
          0 // skipped
        )
      );

    await Promise.all(updates);

    const job = await jobsRepo.getJob(jobId);

    // Last update should be persisted
    expect(job!.processedBusinesses).toBe(500);
    expect(job!.failedBusinesses).toBe(45);
  });

  it('should preserve job metadata through updates', async () => {
    const jobId = await jobsRepo.createJob('test-backfill-final', 500, 'anthropic', 'claude-embedding');

    // Get initial job
    const initial = await jobsRepo.getJob(jobId);
    expect(initial!.status).toBe('processing');

    // Update progress multiple times
    await jobsRepo.updateJobProgress(jobId, 100, 0, 0);
    await jobsRepo.updateJobProgress(jobId, 250, 5, 10);

    // Complete job
    await jobsRepo.completeJob(jobId);

    const final = await jobsRepo.getJob(jobId);

    expect(final!.status).toBe('completed');
    expect(final!.processedBusinesses).toBe(250); // Last update
    expect(final!.failedBusinesses).toBe(5);
    expect(final!.skippedBusinesses).toBe(10);
  });
});
