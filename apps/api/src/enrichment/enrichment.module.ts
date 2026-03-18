import { Module } from '@nestjs/common';
import { EnrichmentService } from './enrichment.service';
import { EnrichmentController } from './enrichment.controller';
import { ClearbitProvider } from './providers/clearbit.provider';
import { HunterProvider } from './providers/hunter.provider';
import { BuiltWithProvider } from './providers/builtwith.provider';

@Module({
  providers: [EnrichmentService, ClearbitProvider, HunterProvider, BuiltWithProvider],
  controllers: [EnrichmentController],
  exports: [EnrichmentService],
})
export class EnrichmentModule {}
