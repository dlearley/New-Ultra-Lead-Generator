import { Controller, Get, UseGuards, Query, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AnalyticsDashboardService } from './analytics-dashboard.service';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
  role?: string;
}

@Controller('analytics-dashboard')
@UseGuards(JwtAuthGuard)
export class AnalyticsDashboardController {
  constructor(private readonly analytics: AnalyticsDashboardService) {}

  @Get('summary')
  async getDashboardSummary(@CurrentUser() user: UserPayload) {
    return this.analytics.getDashboardSummary(user.organizationId);
  }

  @Get('funnel/lead')
  async getLeadFunnel(
    @CurrentUser() user: UserPayload,
    @Query('period') period: '7d' | '30d' | '90d' | '1y' = '30d',
  ) {
    return this.analytics.getLeadFunnel(user.organizationId, period);
  }

  @Get('funnel/sequence/:sequenceId')
  async getSequenceFunnel(
    @CurrentUser() user: UserPayload,
    @Param('sequenceId') sequenceId: string,
    @Query('period') period: '7d' | '30d' | '90d' = '30d',
  ) {
    return this.analytics.getSequenceFunnel(user.organizationId, sequenceId, period);
  }

  @Get('roi')
  async getROIMetrics(
    @CurrentUser() user: UserPayload,
    @Query('period') period: '30d' | '90d' | '1y' = '30d',
  ) {
    return this.analytics.getROIMetrics(user.organizationId, period);
  }

  @Get('campaigns')
  async getCampaignPerformance(
    @CurrentUser() user: UserPayload,
    @Query('period') period: '30d' | '90d' = '30d',
  ) {
    return this.analytics.getCampaignPerformance(user.organizationId, period);
  }

  @Get('trends/revenue')
  async getRevenueTrend(
    @CurrentUser() user: UserPayload,
    @Query('days') days: string = '30',
  ) {
    return this.analytics.getRevenueTrend(user.organizationId, parseInt(days));
  }

  @Get('leads/sources')
  async getLeadSourceBreakdown(@CurrentUser() user: UserPayload) {
    return this.analytics.getLeadSourceBreakdown(user.organizationId);
  }
}
