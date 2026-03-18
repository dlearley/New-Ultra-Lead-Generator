import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DashboardService } from './dashboards/dashboard.service';
import { AIInsightsService } from './insights/ai-insights.service';
import { AttributionService } from './attribution/attribution.service';
import { FunnelService } from './funnels/funnel.service';

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
}
