import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { RebuildSearchIndexJob } from './rebuild-search-index.job';
import { IncrementalSyncJob } from './incremental-sync.job';
import { RebuildSearchIndexJobData, IncrementalSyncJobData } from './search-sync.dto';

export const SEARCH_SYNC_QUEUE = 'search-sync';
export const REBUILD_SEARCH_INDEX_JOB = 'rebuild-search-index';
export const INCREMENTAL_SYNC_JOB = 'incremental-sync';

@Processor(SEARCH_SYNC_QUEUE)
export class SearchSyncProcessor {
  private readonly logger = new Logger(SearchSyncProcessor.name);

  constructor(
    private rebuildSearchIndexJob: RebuildSearchIndexJob,
    private incrementalSyncJob: IncrementalSyncJob,
  ) {}

  @Process(REBUILD_SEARCH_INDEX_JOB)
  async handleRebuildSearchIndex(job: Job<RebuildSearchIndexJobData>) {
    this.logger.log(`Processing rebuild search index job ${job.id}`);

    try {
      const metrics = await this.rebuildSearchIndexJob.execute(
        job.data,
        job.id?.toString(),
      );

      this.logger.log(`Rebuild search index job ${job.id} completed successfully`);
      return {
        success: true,
        metrics,
        jobId: job.id,
      };
    } catch (error) {
      this.logger.error(
        `Rebuild search index job ${job.id} failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Process(INCREMENTAL_SYNC_JOB)
  async handleIncrementalSync(job: Job<IncrementalSyncJobData>) {
    this.logger.log(`Processing incremental sync job ${job.id}`);

    try {
      const metrics = await this.incrementalSyncJob.execute(
        job.data,
        job.id?.toString(),
      );

      this.logger.log(`Incremental sync job ${job.id} completed successfully`);
      return {
        success: true,
        metrics,
        jobId: job.id,
      };
    } catch (error) {
      this.logger.error(
        `Incremental sync job ${job.id} failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
