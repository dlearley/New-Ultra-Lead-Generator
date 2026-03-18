import { Module } from '@nestjs/common';
import { LeadScoringController } from './scoring.controller';
import { LeadScoringService } from './scoring.service';
import { RuleBuilderService } from './rules/rule-builder.service';

@Module({
  controllers: [LeadScoringController],
  providers: [LeadScoringService, RuleBuilderService],
  exports: [LeadScoringService, RuleBuilderService],
})
export class ScoringModule {}
