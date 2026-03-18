import { Module } from '@nestjs/common';
import { OutreachController } from './outreach.controller';
import { SequenceService } from './sequences/sequence.service';

@Module({
  controllers: [OutreachController],
  providers: [SequenceService],
  exports: [SequenceService],
})
export class OutreachModule {}
