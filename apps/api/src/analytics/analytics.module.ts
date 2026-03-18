import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { DashboardService } from './dashboards/dashboard.service';
import { AIInsightsService } from './insights/ai-insights.service';
import { AttributionService } from './attribution/attribution.service';
import { FunnelService } from './funnels/funnel.service';
import { ReportsService } from './reports/reports.service';
import { BenchmarkingService } from './benchmarks/benchmarking.service';
import { ForecastingService } from './forecasts/forecasting.service';
import { SavedFiltersService } from './filters/saved-filters.service';

@Module({
  controllers: [AnalyticsController],
  providers: [
    DashboardService,
    AIInsightsService,
    AttributionService,
    FunnelService,
    ReportsService,
    BenchmarkingService,
    ForecastingService,
    SavedFiltersService,
  ],
  exports: [
    DashboardService,
    AIInsightsService,
    AttributionService,
    FunnelService,
    ReportsService,
    BenchmarkingService,
    ForecastingService,
    SavedFiltersService,
  ],
})
export class AnalyticsModule {}
