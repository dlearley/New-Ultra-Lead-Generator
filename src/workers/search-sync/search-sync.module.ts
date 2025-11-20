import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Business } from '@database/entities/business.entity';
import { SearchModule } from '@api/search/search.module';
import { SearchSyncService } from './search-sync.service';
import { SearchSyncController } from './search-sync.controller';
import { SearchSyncProcessor, SEARCH_SYNC_QUEUE } from './search-sync.processor';
import { SearchSyncMetricsService } from './search-sync-metrics.service';
import { SearchIndexTransformerService } from './search-index-transformer.service';
import { RebuildSearchIndexJob } from './rebuild-search-index.job';
import { IncrementalSyncJob } from './incremental-sync.job';
import { SearchSyncCli } from './search-sync.cli';

@Module({
  imports: [
    BullModule.registerQueue({
      name: SEARCH_SYNC_QUEUE,
    }),
    TypeOrmModule.forFeature([Business]),
    SearchModule,
  ],
  controllers: [SearchSyncController],
  providers: [
    SearchSyncService,
    SearchSyncProcessor,
    SearchSyncMetricsService,
    SearchIndexTransformerService,
    RebuildSearchIndexJob,
    IncrementalSyncJob,
    SearchSyncCli,
  ],
  exports: [SearchSyncService, SearchSyncMetricsService, SearchSyncCli],
})
export class SearchSyncModule {}
