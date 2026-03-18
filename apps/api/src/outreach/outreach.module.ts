import { Module } from '@nestjs/common';
import { OutreachController } from './outreach.controller';
import { SequenceService } from './sequences/sequence.service';
import { AIEmailWriterService } from './ai/ai-email-writer.service';
import { LinkedInService } from './channels/linkedin.service';
import { ABTestingService } from './ab-testing/ab-testing.service';

@Module({
  controllers: [OutreachController],
  providers: [
    SequenceService,
    AIEmailWriterService,
    LinkedInService,
    ABTestingService,
  ],
  exports: [
    SequenceService,
    AIEmailWriterService,
    LinkedInService,
    ABTestingService,
  ],
})
export class OutreachModule {}
