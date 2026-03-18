import { Module } from '@nestjs/common';
import { AIEngineController } from './ai-engine.controller';
import { AccountResearchService } from './research/account-research.service';
import { HyperPersonalizationService } from './personalization/hyper-personalization.service';
import { BuyingGroupService } from './buying-group/buying-group.service';
import { AnomalyDetectionService } from './insights/anomaly-detection.service';
import { AIChatService } from './chat/ai-chat.service';

@Module({
  controllers: [AIEngineController],
  providers: [
    AccountResearchService,
    HyperPersonalizationService,
    BuyingGroupService,
    AnomalyDetectionService,
    AIChatService,
  ],
  exports: [
    AccountResearchService,
    HyperPersonalizationService,
    BuyingGroupService,
    AnomalyDetectionService,
    AIChatService,
  ],
})
export class AIEngineModule {}
