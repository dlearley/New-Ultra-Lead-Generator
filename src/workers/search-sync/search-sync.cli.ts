import { Injectable, Logger } from '@nestjs/common';
import { SearchSyncService } from './search-sync.service';

/**
 * SearchSyncCli provides command-line interface methods for search sync operations.
 * These can be invoked via NestJS CLI or exposed through a CLI service.
 * 
 * Example usage:
 * - Via REST API endpoints in SearchSyncController
 * - Via custom CLI commands module
 * - Via programmatic calls in services
 */
@Injectable()
export class SearchSyncCli {
  private readonly logger = new Logger(SearchSyncCli.name);

  constructor(private searchSyncService: SearchSyncService) {}

  async rebuildIndex(options: {
    batchSize?: number;
    tenantId?: string;
  } = {}): Promise<void> {
    try {
      this.logger.log('Starting search index rebuild...');

      if (options.tenantId) {
        const result = await this.searchSyncService.rebuildSearchIndexForTenant(
          options.tenantId,
        );
        this.logger.log(`Job queued: ${result.jobId}`);
        this.logger.log(`Message: ${result.message}`);
      } else {
        const result = await this.searchSyncService.rebuildEntireCorpus(
          options.batchSize,
        );
        this.logger.log(`Job queued: ${result.jobId}`);
        this.logger.log(`Message: ${result.message}`);
      }
    } catch (error) {
      this.logger.error(`Failed to rebuild search index: ${error.message}`);
      throw error;
    }
  }

  async getJobStatus(jobId: string): Promise<void> {
    try {
      const status = await this.searchSyncService.getJobStatus(jobId);
      this.logger.log(`Job Status: ${JSON.stringify(status, null, 2)}`);
    } catch (error) {
      this.logger.error(`Failed to get job status: ${error.message}`);
      throw error;
    }
  }

  async getQueueStats(): Promise<void> {
    try {
      const stats = await this.searchSyncService.getQueueStats();
      this.logger.log(`Queue Stats: ${JSON.stringify(stats, null, 2)}`);
    } catch (error) {
      this.logger.error(`Failed to get queue stats: ${error.message}`);
      throw error;
    }
  }

  async pauseQueue(): Promise<void> {
    try {
      await this.searchSyncService.pauseQueue();
      this.logger.log('Search sync queue paused successfully');
    } catch (error) {
      this.logger.error(`Failed to pause queue: ${error.message}`);
      throw error;
    }
  }

  async resumeQueue(): Promise<void> {
    try {
      await this.searchSyncService.resumeQueue();
      this.logger.log('Search sync queue resumed successfully');
    } catch (error) {
      this.logger.error(`Failed to resume queue: ${error.message}`);
      throw error;
    }
  }

  async clearQueue(): Promise<void> {
    try {
      await this.searchSyncService.clearQueue();
      this.logger.log('Search sync queue cleared successfully');
    } catch (error) {
      this.logger.error(`Failed to clear queue: ${error.message}`);
      throw error;
    }
  }
}
