import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { DashboardService } from './dashboards/dashboard.service';
import { AIInsightsService } from './insights/ai-insights.service';
import { AttributionService } from './attribution/attribution.service';
import { FunnelService } from './funnels/funnel.service';

@Module({
  controllers: [AnalyticsController],
  providers: [
    DashboardService,
    AIInsightsService,
    AttributionService,
    FunnelService,
  ],
  exports: [
    DashboardService,
    AIInsightsService,
    AttributionService,
    FunnelService,
  ],
})
export class AnalyticsModule {}
