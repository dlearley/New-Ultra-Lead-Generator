import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { OpenSearchService } from './opensearch.service';
import { GeocodingService } from '@common/services/geocoding.service';

@Module({
  controllers: [SearchController],
  providers: [SearchService, OpenSearchService, GeocodingService],
  exports: [SearchService, OpenSearchService],
})
export class SearchModule {}
