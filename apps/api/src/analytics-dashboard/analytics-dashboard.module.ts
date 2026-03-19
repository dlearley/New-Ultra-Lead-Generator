import { Module } from '@nestjs/common';
import { AnalyticsDashboardService } from './analytics-dashboard.service';
import { AnalyticsDashboardController } from './analytics-dashboard.controller';

@Module({
  controllers: [AnalyticsDashboardController],
  providers: [AnalyticsDashboardService],
  exports: [AnalyticsDashboardService],
})
export class AnalyticsDashboardModule {}
