import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '@database/entities/business.entity';
import { OpenSearchService } from '@api/search/opensearch.service';
import { SearchIndexTransformerService } from './search-index-transformer.service';
import { SearchSyncMetricsService } from './search-sync-metrics.service';
import { RebuildSearchIndexJobData, SearchSyncMetrics } from './search-sync.dto';

@Injectable()
export class RebuildSearchIndexJob {
  private readonly logger = new Logger(RebuildSearchIndexJob.name);
  private readonly DEFAULT_BATCH_SIZE = 1000;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;

  constructor(
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    private openSearchService: OpenSearchService,
    private transformerService: SearchIndexTransformerService,
    private metricsService: SearchSyncMetricsService,
  ) {}

  async execute(
    jobData: RebuildSearchIndexJobData,
    jobId?: string,
  ): Promise<SearchSyncMetrics> {
    const metrics = this.metricsService.createMetrics(jobId);
    metrics.status = 'processing';

    try {
      this.logger.log(
        `Starting rebuild search index job${jobData.tenantId ? ` for tenant ${jobData.tenantId}` : ''}`,
      );

      // Ensure index exists
      await this.openSearchService.createIndex();

      const batchSize = jobData.batchSize || this.DEFAULT_BATCH_SIZE;
      let totalProcessed = 0;
      let totalSuccess = 0;
      let totalFailure = 0;

      // Get total count
      let query = this.businessRepository.createQueryBuilder('business');

      if (jobData.tenantId) {
        // If tenantId is provided, filter by it
        // For now, we'll process all businesses (assuming single-tenant for this implementation)
      }

      const totalCount = await query.getCount();
      metrics.totalCount = totalCount;

      if (totalCount === 0) {
        this.logger.warn('No businesses found to index');
        this.metricsService.emitWarningAlert('No businesses found to index', metrics);
        return this.metricsService.completeMetrics(metrics, 'completed');
      }

      // Process in batches
      for (let offset = 0; offset < totalCount; offset += batchSize) {
        const businesses = await this.businessRepository.find({
          take: batchSize,
          skip: offset,
        });

        if (businesses.length === 0) {
          break;
        }

        try {
          await this.processBatch(
            businesses,
            jobData.tenantId,
            jobData.organizationId,
            metrics,
          );
          totalSuccess += businesses.length;
        } catch (error) {
          this.logger.error(
            `Error processing batch at offset ${offset}: ${error.message}`,
          );
          totalFailure += businesses.length;
        }

        totalProcessed += businesses.length;
        this.logger.log(`Processed ${totalProcessed}/${totalCount} businesses`);
      }

      const finalMetrics = this.metricsService.updateMetrics(
        metrics,
        totalSuccess,
        totalFailure,
        totalCount,
      );

      this.logger.log(
        `Rebuild search index job completed: ${totalSuccess} success, ${totalFailure} failures`,
      );

      this.metricsService.emitSuccessAlert(
        `Rebuild search index job completed successfully`,
        finalMetrics,
      );

      return this.metricsService.completeMetrics(finalMetrics, 'completed');
    } catch (error) {
      this.logger.error(`Rebuild search index job failed: ${error.message}`);
      this.metricsService.emitErrorAlert(
        `Rebuild search index job failed: ${error.message}`,
        metrics,
      );
      return this.metricsService.completeMetrics(metrics, 'failed');
    }
  }

  private async processBatch(
    businesses: Business[],
    tenantId?: string,
    organizationId?: string,
    metrics?: SearchSyncMetrics,
  ): Promise<void> {
    const documents = this.transformerService.transformBusinessesToIndexDocuments(
      businesses,
      tenantId,
      organizationId,
    );

    // Filter out invalid documents
    const validDocuments = documents.filter((doc) =>
      this.transformerService.validateIndexDocument(doc),
    );

    if (validDocuments.length === 0) {
      this.logger.warn(`No valid documents to index in batch`);
      return;
    }

    // Retry logic
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        await this.openSearchService.bulkIndex(validDocuments);
        return;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Bulk index attempt ${attempt + 1} failed: ${error.message}`,
        );

        if (attempt < this.MAX_RETRIES - 1) {
          const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Failed to bulk index documents after ${this.MAX_RETRIES} attempts: ${lastError?.message}`,
    );
  }
}
