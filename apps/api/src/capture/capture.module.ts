import { Module } from '@nestjs/common';
import { LeadCaptureService } from './capture.service';
import { LeadCaptureController } from './capture.controller';
import { EnrichmentModule } from '../enrichment/enrichment.module';

@Module({
  imports: [EnrichmentModule],
  providers: [LeadCaptureService],
  controllers: [LeadCaptureController],
  exports: [LeadCaptureService],
})
export class CaptureModule {}
