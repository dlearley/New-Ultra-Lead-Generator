import { Module } from '@nestjs/common';
import { AdvancedSearchService } from './advanced-search.service';
import { AdvancedSearchController } from './advanced-search.controller';

@Module({
  providers: [AdvancedSearchService],
  controllers: [AdvancedSearchController],
  exports: [AdvancedSearchService],
})
export class AdvancedSearchModule {}
