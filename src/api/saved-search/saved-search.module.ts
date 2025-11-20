import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedSearchController } from './saved-search.controller';
import { SavedSearchService } from './saved-search.service';
import { SavedSearch } from '@database/entities/saved-search.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SavedSearch])],
  controllers: [SavedSearchController],
  providers: [SavedSearchService],
  exports: [SavedSearchService],
})
export class SavedSearchModule {}
