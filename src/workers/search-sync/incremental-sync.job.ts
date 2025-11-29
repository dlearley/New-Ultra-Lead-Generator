import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '@database/entities/business.entity';
import { OpenSearchService } from '@api/search/opensearch.service';
import { SearchIndexTransformerService } from './search-index-transformer.service';
import { SearchSyncMetricsService } from './search-sync-metrics.service';
import { IncrementalSyncJobData, SearchSyncMetrics } from './search-sync.dto';

@Injectable()
export class IncrementalSyncJob {
  private readonly logger = new Logger(IncrementalSyncJob.name);
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
    jobData: IncrementalSyncJobData,
    jobId?: string,
  ): Promise<SearchSyncMetrics> {
    const metrics = this.metricsService.createMetrics(jobId);
    metrics.status = 'processing';
    metrics.totalCount = 1;

    try {
      this.logger.log(
        `Starting incremental sync job for ${jobData.operation} on ${jobData.entityType}`,
      );

      // Ensure index exists
      await this.openSearchService.createIndex();

      switch (jobData.operation) {
        case 'index':
          await this.handleIndexOperation(jobData, metrics);
          break;
        case 'update':
          await this.handleUpdateOperation(jobData, metrics);
          break;
        case 'delete':
          await this.handleDeleteOperation(jobData, metrics);
          break;
        default:
          throw new Error(`Unknown operation: ${jobData.operation}`);
      }

      this.metricsService.emitSuccessAlert(
        `Incremental sync job completed successfully for ${jobData.operation}`,
        metrics,
      );

      return this.metricsService.completeMetrics(metrics, 'completed');
    } catch (error) {
      this.logger.error(`Incremental sync job failed: ${error.message}`);
      this.metricsService.emitErrorAlert(
        `Incremental sync job failed: ${error.message}`,
        metrics,
      );
      return this.metricsService.completeMetrics(metrics, 'failed');
    }
  }

  private async handleIndexOperation(
    jobData: IncrementalSyncJobData,
    metrics: SearchSyncMetrics,
  ): Promise<void> {
    if (!jobData.entityId) {
      throw new Error('entityId is required for index operation');
    }

    const business = await this.businessRepository.findOne({
      where: { id: jobData.entityId },
    });

    if (!business) {
      throw new Error(`Business not found: ${jobData.entityId}`);
    }

    const document = this.transformerService.transformBusinessToIndexDocument(
      business,
      jobData.tenantId,
      jobData.organizationId,
    );

    if (!this.transformerService.validateIndexDocument(document)) {
      throw new Error(`Invalid document for indexing: ${jobData.entityId}`);
    }

    await this.retryOperation(async () => {
      await this.openSearchService.indexDocument(document);
      metrics.successCount = 1;
    });
  }

  private async handleUpdateOperation(
    jobData: IncrementalSyncJobData,
    metrics: SearchSyncMetrics,
  ): Promise<void> {
    if (!jobData.entityId) {
      throw new Error('entityId is required for update operation');
    }

    const business = await this.businessRepository.findOne({
      where: { id: jobData.entityId },
    });

    if (!business) {
      throw new Error(`Business not found: ${jobData.entityId}`);
    }

    const document = this.transformerService.transformBusinessToIndexDocument(
      business,
      jobData.tenantId,
      jobData.organizationId,
    );

    if (!this.transformerService.validateIndexDocument(document)) {
      throw new Error(`Invalid document for updating: ${jobData.entityId}`);
    }

    await this.retryOperation(async () => {
      await this.openSearchService.indexDocument(document);
      metrics.successCount = 1;
    });
  }

  private async handleDeleteOperation(
    jobData: IncrementalSyncJobData,
    metrics: SearchSyncMetrics,
  ): Promise<void> {
    if (!jobData.entityId) {
      throw new Error('entityId is required for delete operation');
    }

    await this.retryOperation(async () => {
      await this.openSearchService.deleteDocument(jobData.entityId as string);
      metrics.successCount = 1;
    });
  }

  private async retryOperation(operation: () => Promise<void>): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        await operation();
        return;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Operation attempt ${attempt + 1} failed: ${error.message}`,
        );

        if (attempt < this.MAX_RETRIES - 1) {
          const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Operation failed after ${this.MAX_RETRIES} attempts: ${lastError?.message}`,
    );
  }
}
