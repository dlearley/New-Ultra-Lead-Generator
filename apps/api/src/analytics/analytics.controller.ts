import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DashboardService } from './dashboards/dashboard.service';
import { AIInsightsService } from './insights/ai-insights.service';
import { AttributionService } from './attribution/attribution.service';
import { FunnelService } from './funnels/funnel.service';
import { ReportsService } from './reports/reports.service';
import { BenchmarkingService } from './benchmarks/benchmarking.service';
import { ForecastingService } from './forecasts/forecasting.service';
import { SavedFiltersService } from './filters/saved-filters.service';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
  role?: string;
}

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly aiInsightsService: AIInsightsService,
    private readonly attributionService: AttributionService,
    private readonly funnelService: FunnelService,
    private readonly reportsService: ReportsService,
    private readonly benchmarkingService: BenchmarkingService,
    private readonly forecastingService: ForecastingService,
    private readonly savedFiltersService: SavedFiltersService,
  ) {}

  // ============================================================
  // DASHBOARDS
  // ============================================================

  @Post('dashboards')
  async createDashboard(
    @Body() dto: any,
    @CurrentUser() user: UserPayload,
  ) {
    return this.dashboardService.createDashboard(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Get('dashboards')
  async getDashboards(
    @CurrentUser() user: UserPayload,
  ) {
    return this.dashboardService.getDashboards(
      user.organizationId,
      user.role,
    );
  }

  @Get('dashboards/:id')
  async getDashboard(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.dashboardService.getDashboard(user.organizationId, id);
  }

  @Put('dashboards/:id')
  async updateDashboard(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: UserPayload,
  ) {
    return this.dashboardService.updateDashboard(user.organizationId, id, dto);
  }

  @Delete('dashboards/:id')
  async deleteDashboard(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.dashboardService.deleteDashboard(user.organizationId, id);
    return { success: true };
  }

  @Post('dashboards/default')
  async createDefaultDashboards(
    @CurrentUser() user: UserPayload,
  ) {
    await this.dashboardService.createDefaultDashboards(user.organizationId);
    return { success: true };
  }

  @Get('widgets/:id/data')
  async getWidgetData(
    @Param('id') widgetId: string,
    @Query() filters: any,
    @CurrentUser() user: UserPayload,
  ) {
    return this.dashboardService.getWidgetData(
      user.organizationId,
      widgetId,
      filters,
    );
  }

  @Get('realtime')
  async getRealtimeMetrics(
    @CurrentUser() user: UserPayload,
  ) {
    return this.dashboardService.getRealtimeMetrics(user.organizationId);
  }

  // ============================================================
  // AI INSIGHTS
  // ============================================================

  @Post('insights/generate')
  async generateInsights(
    @CurrentUser() user: UserPayload,
  ) {
    return this.aiInsightsService.generateInsights(user.organizationId);
  }

  @Get('insights')
  async getInsights(
    @Query() filters: any,
    @CurrentUser() user: UserPayload,
  ) {
    return this.aiInsightsService.getInsights(user.organizationId, filters);
  }

  @Post('insights/:id/acknowledge')
  async acknowledgeInsight(
    @Param('id') insightId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.aiInsightsService.acknowledgeInsight(
      user.organizationId,
      insightId,
      user.userId,
    );
    return { success: true };
  }

  @Post('insights/:id/dismiss')
  async dismissInsight(
    @Param('id') insightId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.aiInsightsService.dismissInsight(user.organizationId, insightId);
    return { success: true };
  }

  // ============================================================
  // ATTRIBUTION
  // ============================================================

  @Post('attribution/calculate/:contactId')
  async calculateAttribution(
    @Param('contactId') contactId: string,
    @Body() dto: { model: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'position_based' },
    @CurrentUser() user: UserPayload,
  ) {
    return this.attributionService.calculateAttribution(
      user.organizationId,
      contactId,
      dto.model || 'first_touch',
    );
  }

  @Get('attribution/channels')
  async getChannelPerformance(
    @Query('period') period: string,
    @Query('model') model: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.attributionService.getChannelPerformance(
      user.organizationId,
      period || '30d',
      model || 'first_touch',
    );
  }

  @Get('attribution/campaigns')
  async getCampaignAttribution(
    @Query('period') period: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.attributionService.getCampaignAttribution(
      user.organizationId,
      period || '30d',
    );
  }

  @Get('attribution/models')
  async getAttributionModels(
    @CurrentUser() user: UserPayload,
  ) {
    return this.attributionService.getAttributionModels(user.organizationId);
  }

  @Post('attribution/models/:id/default')
  async setDefaultModel(
    @Param('id') modelId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.attributionService.setDefaultModel(user.organizationId, modelId);
    return { success: true };
  }

  @Get('attribution/compare')
  async compareAttributionModels(
    @Query('period') period: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.attributionService.compareAttributionModels(
      user.organizationId,
      period || '30d',
    );
  }

  @Get('attribution/journey/:contactId')
  async getCustomerJourney(
    @Param('contactId') contactId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.attributionService.getCustomerJourney(
      user.organizationId,
      contactId,
    );
  }

  // ============================================================
  // FUNNELS
  // ============================================================

  @Get('funnels/lead-to-customer')
  async getLeadToCustomerFunnel(
    @Query('period') period: string,
    @CurrentUser() user: UserPayload,
  ) {
    const funnel = await this.funnelService.getLeadToCustomerFunnel(
      user.organizationId,
      period || '30d',
    );
    const analysis = await this.funnelService.analyzeFunnel(funnel);
    
    return { funnel, analysis };
  }

  @Get('funnels/sequences/:sequenceId')
  async getSequenceFunnel(
    @Param('sequenceId') sequenceId: string,
    @CurrentUser() user: UserPayload,
  ) {
    const funnel = await this.funnelService.getSequenceFunnel(
      user.organizationId,
      sequenceId,
    );
    const analysis = await this.funnelService.analyzeFunnel(funnel);
    
    return { funnel, analysis };
  }

  @Get('funnels/channel/:channel')
  async getChannelFunnel(
    @Param('channel') channel: string,
    @Query('period') period: string,
    @CurrentUser() user: UserPayload,
  ) {
    const funnel = await this.funnelService.getChannelFunnel(
      user.organizationId,
      channel,
      period || '30d',
    );
    const analysis = await this.funnelService.analyzeFunnel(funnel);
    
    return { funnel, analysis };
  }

  @Post('funnels/drill-down')
  async drillDown(
    @Body() dto: { stage: string; filters?: any },
    @CurrentUser() user: UserPayload,
  ) {
    return this.funnelService.drillDown(
      user.organizationId,
      dto.stage,
      dto.filters,
    );
  }

  @Get('funnels/cohorts')
  async getCohortAnalysis(
    @Query('period') period: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.funnelService.getCohortAnalysis(
      user.organizationId,
      period || 'monthly',
    );
  }

  // ============================================================
  // REPORTS
  // ============================================================

  @Post('reports')
  async createReport(
    @Body() dto: any,
    @CurrentUser() user: UserPayload,
  ) {
    return this.reportsService.createReport(user.organizationId, user.userId, dto);
  }

  @Get('reports')
  async getReports(
    @CurrentUser() user: UserPayload,
  ) {
    return this.reportsService.getReports(user.organizationId);
  }

  @Get('reports/:id')
  async getReport(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.reportsService.getReport(user.organizationId, id);
  }

  @Post('reports/:id/generate')
  async generateReport(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.reportsService.generateReport(user.organizationId, id);
  }

  @Post('reports/:id/export')
  async exportReport(
    @Param('id') id: string,
    @Body() dto: { format?: 'csv' | 'xlsx' | 'pdf' },
    @CurrentUser() user: UserPayload,
  ) {
    return this.reportsService.exportReport(
      user.organizationId,
      id,
      dto.format || 'csv',
    );
  }

  @Post('reports/defaults')
  async createDefaultReports(
    @CurrentUser() user: UserPayload,
  ) {
    await this.reportsService.createDefaultReports(user.organizationId);
    return { success: true };
  }

  // ============================================================
  // BENCHMARKING
  // ============================================================

  @Get('benchmarks/compare')
  async compareBenchmarks(
    @Query() query: { industry?: string; companySize?: string; metrics?: string[] },
    @CurrentUser() user: UserPayload,
  ) {
    return this.benchmarkingService.compareToBenchmarks(
      user.organizationId,
      {
        industry: query.industry,
        companySize: query.companySize,
        metrics: query.metrics,
      },
    );
  }

  @Get('benchmarks/summary')
  async getBenchmarkSummary(
    @CurrentUser() user: UserPayload,
  ) {
    return this.benchmarkingService.getBenchmarkSummary(user.organizationId);
  }

  @Get('benchmarks/competitors')
  async getCompetitorBenchmarks(
    @Query('industry') industry: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.benchmarkingService.getCompetitorBenchmarks(industry || 'saas');
  }

  @Get('benchmarks/trends')
  async getBenchmarkTrends(
    @Query() query: { metric: string; industry?: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.benchmarkingService.getBenchmarkTrends(
      query.metric,
      query.industry || 'saas',
    );
  }

  @Post('benchmarks/seed')
  async seedBenchmarkData(
    @CurrentUser() user: UserPayload,
  ) {
    await this.benchmarkingService.seedBenchmarkData();
    return { success: true };
  }

  // ============================================================
  // FORECASTING
  // ============================================================

  @Post('forecasts/generate')
  async generateForecast(
    @Body() dto: { months?: number },
    @CurrentUser() user: UserPayload,
  ) {
    return this.forecastingService.generateRevenueForecast(
      user.organizationId,
      dto.months || 3,
    );
  }

  @Get('forecasts')
  async getForecasts(
    @CurrentUser() user: UserPayload,
  ) {
    return this.forecastingService.getForecasts(user.organizationId);
  }

  @Post('forecasts/scenario')
  async generateScenario(
    @Body() dto: {
      name: string;
      leadGrowthRate: number;
      conversionRateChange: number;
      avgDealSizeChange: number;
    },
    @CurrentUser() user: UserPayload,
  ) {
    return this.forecastingService.generateScenarioForecast(
      user.organizationId,
      dto,
    );
  }

  @Get('forecasts/accuracy')
  async getForecastAccuracy(
    @CurrentUser() user: UserPayload,
  ) {
    return this.forecastingService.getForecastAccuracy(user.organizationId);
  }

  // ============================================================
  // SAVED FILTERS
  // ============================================================

  @Post('filters')
  async createFilter(
    @Body() dto: any,
    @CurrentUser() user: UserPayload,
  ) {
    return this.savedFiltersService.createFilter(
      user.organizationId,
      user.userId,
      dto,
    );
  }

  @Get('filters')
  async getFilters(
    @Query() query: { filterType?: string; includeShared?: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.savedFiltersService.getFilters(
      user.organizationId,
      user.userId,
      {
        filterType: query.filterType,
        includeShared: query.includeShared !== 'false',
      },
    );
  }

  @Get('filters/role-based')
  async getRoleBasedFilters(
    @CurrentUser() user: UserPayload,
  ) {
    return this.savedFiltersService.getRoleBasedFilters(
      user.organizationId,
      user.userId,
      user.role || 'sales',
    );
  }

  @Post('filters/defaults')
  async createDefaultFilters(
    @CurrentUser() user: UserPayload,
  ) {
    await this.savedFiltersService.createDefaultFiltersForUser(
      user.organizationId,
      user.userId,
      user.role || 'sales',
    );
    return { success: true };
  }

  @Get('filters/suggestions')
  async getFilterSuggestions(
    @Query('type') filterType: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.savedFiltersService.getFilterSuggestions(
      user.organizationId,
      filterType || 'leads',
    );
  }
}
