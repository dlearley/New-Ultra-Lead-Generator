import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
import {
  RebuildSearchIndexJobData,
  IncrementalSyncJobData,
  SearchSyncMetrics,
} from './search-sync.dto';
import {
  SEARCH_SYNC_QUEUE,
  REBUILD_SEARCH_INDEX_JOB,
  INCREMENTAL_SYNC_JOB,
} from './search-sync.processor';
import { SearchSyncMetricsService } from './search-sync-metrics.service';

@Injectable()
export class SearchSyncService {
  private readonly logger = new Logger(SearchSyncService.name);
  private jobStatusMap: Map<string, any> = new Map();

  constructor(
    @InjectQueue(SEARCH_SYNC_QUEUE) private searchSyncQueue: Queue,
    private metricsService: SearchSyncMetricsService,
  ) {
    this.setupQueueListeners();
  }

  private setupQueueListeners(): void {
    this.searchSyncQueue.on('completed', (job: Job) => {
      this.logger.log(`Job ${job.id} completed`);
      this.jobStatusMap.set(job.id?.toString() || '', {
        status: 'completed',
        result: job.returnvalue,
        timestamp: Date.now(),
      });
    });

    this.searchSyncQueue.on('failed', (job: Job, err: Error) => {
      this.logger.error(`Job ${job.id} failed: ${err.message}`);
      this.jobStatusMap.set(job.id?.toString() || '', {
        status: 'failed',
        error: err.message,
        timestamp: Date.now(),
      });
    });

    this.searchSyncQueue.on('error', (err: Error) => {
      this.logger.error(`Queue error: ${err.message}`);
    });

    this.searchSyncQueue.on('stalled', (job: Job) => {
      this.logger.warn(`Job ${job.id} stalled`);
    });
  }

  async rebuildSearchIndex(
    jobData: RebuildSearchIndexJobData,
  ): Promise<{ jobId: string; message: string }> {
    try {
      const job = await this.searchSyncQueue.add(
        REBUILD_SEARCH_INDEX_JOB,
        jobData,
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: false,
          removeOnFail: false,
        },
      );

      this.logger.log(
        `Rebuild search index job queued with ID ${job.id}${
          jobData.tenantId ? ` for tenant ${jobData.tenantId}` : ''
        }`,
      );

      return {
        jobId: job.id?.toString() || '',
        message: `Rebuild search index job queued successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to queue rebuild search index job: ${error.message}`);
      throw error;
    }
  }

  async rebuildSearchIndexForTenant(
    tenantId: string,
    organizationId?: string,
  ): Promise<{ jobId: string; message: string }> {
    return this.rebuildSearchIndex({
      tenantId,
      organizationId,
    });
  }

  async rebuildEntireCorpus(
    batchSize?: number,
  ): Promise<{ jobId: string; message: string }> {
    return this.rebuildSearchIndex({
      batchSize,
    });
  }

  async syncIncrementalUpdate(
    jobData: IncrementalSyncJobData,
  ): Promise<{ jobId: string; message: string }> {
    try {
      const job = await this.searchSyncQueue.add(INCREMENTAL_SYNC_JOB, jobData, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      });

      this.logger.log(
        `Incremental sync job queued with ID ${job.id} for ${jobData.operation}`,
      );

      return {
        jobId: job.id?.toString() || '',
        message: `Incremental sync job queued successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to queue incremental sync job: ${error.message}`);
      throw error;
    }
  }

  async indexBusiness(
    businessId: string,
    tenantId?: string,
    organizationId?: string,
  ): Promise<{ jobId: string; message: string }> {
    return this.syncIncrementalUpdate({
      entityType: 'Business',
      operation: 'index',
      entityId: businessId,
      tenantId,
      organizationId,
    });
  }

  async updateBusiness(
    businessId: string,
    tenantId?: string,
    organizationId?: string,
  ): Promise<{ jobId: string; message: string }> {
    return this.syncIncrementalUpdate({
      entityType: 'Business',
      operation: 'update',
      entityId: businessId,
      tenantId,
      organizationId,
    });
  }

  async deleteBusiness(
    businessId: string,
    tenantId?: string,
    organizationId?: string,
  ): Promise<{ jobId: string; message: string }> {
    return this.syncIncrementalUpdate({
      entityType: 'Business',
      operation: 'delete',
      entityId: businessId,
      tenantId,
      organizationId,
    });
  }

  async getJobStatus(jobId: string): Promise<any> {
    try {
      const job = await this.searchSyncQueue.getJob(jobId);

      if (!job) {
        return {
          jobId,
          status: 'not-found',
          message: 'Job not found',
        };
      }

      const progress = job.progress();
      const state = await job.getState();
      const isActive = await job.isActive();
      const isCompleted = await job.isCompleted();
      const isFailed = await job.isFailed();

      return {
        jobId,
        status: isCompleted ? 'completed' : isFailed ? 'failed' : isActive ? 'active' : state,
        progress,
        returnValue: job.returnvalue,
        failedReason: job.failedReason,
        stacktrace: job.stacktrace,
      };
    } catch (error) {
      this.logger.error(`Failed to get job status: ${error.message}`);
      throw error;
    }
  }

  async getQueueStats(): Promise<any> {
    try {
      const counts = await this.searchSyncQueue.getJobCounts();
      const metrics = this.metricsService.getMetricsSummary();

      return {
        queue: {
          active: counts.active,
          completed: counts.completed,
          failed: counts.failed,
          delayed: counts.delayed,
          waiting: counts.waiting,
        },
        metrics,
      };
    } catch (error) {
      this.logger.error(`Failed to get queue stats: ${error.message}`);
      throw error;
    }
  }

  async pauseQueue(): Promise<void> {
    await this.searchSyncQueue.pause();
    this.logger.log('Search sync queue paused');
  }

  async resumeQueue(): Promise<void> {
    await this.searchSyncQueue.resume();
    this.logger.log('Search sync queue resumed');
  }

  async clearQueue(): Promise<void> {
    await this.searchSyncQueue.clean(0, 'completed');
    await this.searchSyncQueue.clean(0, 'failed');
    this.logger.log('Search sync queue cleared');
  }
}
