import { Module } from '@nestjs/common';
import { OutreachController } from './outreach.controller';
import { SequenceService } from './sequences/sequence.service';
import { AIEmailWriterService } from './ai/ai-email-writer.service';
import { LinkedInService } from './channels/linkedin.service';
import { ABTestingService } from './ab-testing/ab-testing.service';
import { DialerService } from './dialer/dialer.service';
import { SmsService } from './sms/sms.service';
import { OptimalTimeService } from './optimal-time/optimal-time.service';

@Module({
  controllers: [OutreachController],
  providers: [
    SequenceService,
    AIEmailWriterService,
    LinkedInService,
    ABTestingService,
    DialerService,
    SmsService,
    OptimalTimeService,
  ],
  exports: [
    SequenceService,
    AIEmailWriterService,
    LinkedInService,
    ABTestingService,
    DialerService,
    SmsService,
    OptimalTimeService,
  ],
})
export class OutreachModule {}
