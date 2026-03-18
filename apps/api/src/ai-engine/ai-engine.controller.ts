import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccountResearchService } from './research/account-research.service';
import { HyperPersonalizationService } from './personalization/hyper-personalization.service';
import { BuyingGroupService } from './buying-group/buying-group.service';
import { AnomalyDetectionService } from './insights/anomaly-detection.service';
import { AIChatService } from './chat/ai-chat.service';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
  role?: string;
}

@Controller('ai-engine')
@UseGuards(JwtAuthGuard)
export class AIEngineController {
  constructor(
    private readonly accountResearch: AccountResearchService,
    private readonly personalization: HyperPersonalizationService,
    private readonly buyingGroup: BuyingGroupService,
    private readonly anomalyDetection: AnomalyDetectionService,
    private readonly aiChat: AIChatService,
  ) {}

  // ============================================================
  // ACCOUNT RESEARCH
  // ============================================================

  @Post('research/account/:companyId')
  async researchAccount(
    @Param('companyId') companyId: string,
    @Body() dto: { scope?: any },
    @CurrentUser() user: UserPayload,
  ) {
    return this.accountResearch.researchAccount(
      user.organizationId,
      companyId,
      dto.scope,
    );
  }

  @Get('research/intelligence/:companyId')
  async getIntelligence(
    @Param('companyId') companyId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.accountResearch.getAccountIntelligence(
      user.organizationId,
      companyId,
    );
  }

  @Get('research/recent')
  async getRecentIntelligence(
    @Query('limit') limit: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.accountResearch.getRecentIntelligence(
      user.organizationId,
      parseInt(limit) || 10,
    );
  }

  @Post('research/batch')
  async batchResearch(
    @Body() dto: { companyIds: string[]; scope?: any },
    @CurrentUser() user: UserPayload,
  ) {
    return this.accountResearch.batchResearch(
      user.organizationId,
      dto.companyIds,
      dto.scope || { news: true, techStack: true },
    );
  }

  // ============================================================
  // HYPER-PERSONALIZATION
  // ============================================================

  @Post('content/generate')
  async generateContent(
    @Body() dto: {
      contactId: string;
      channel: 'email' | 'linkedin' | 'sms';
      contentType: 'intro' | 'follow_up' | 'value_prop' | 'case_study' | 'breakup';
      tone?: 'professional' | 'casual' | 'friendly' | 'formal' | 'enthusiastic';
      length?: 'short' | 'medium' | 'long';
    },
    @CurrentUser() user: UserPayload,
  ) {
    return this.personalization.generateContent(user.organizationId, dto);
  }

  @Get('content/:id/actions')
  async getOneClickActions(
    @Param('id') contentId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.personalization.getOneClickActions(
      user.organizationId,
      contentId,
    );
  }

  @Post('content/:id/apply')
  async applyAction(
    @Param('id') contentId: string,
    @Body() dto: { actionType: string; config?: any },
    @CurrentUser() user: UserPayload,
  ) {
    return this.personalization.applyOneClickAction(
      user.organizationId,
      contentId,
      dto.actionType,
      dto.config,
    );
  }

  // ============================================================
  // BUYING GROUPS
  // ============================================================

  @Get('buying-group/:companyId')
  async getBuyingGroup(
    @Param('companyId') companyId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.buyingGroup.getBuyingGroup(user.organizationId, companyId);
  }

  @Post('buying-group/detect/:companyId')
  async detectBuyingGroup(
    @Param('companyId') companyId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.buyingGroup.detectBuyingGroup(user.organizationId, companyId);
  }

  @Get('buying-groups')
  async getBuyingGroups(
    @Query() filters: any,
    @CurrentUser() user: UserPayload,
  ) {
    return this.buyingGroup.getBuyingGroups(user.organizationId, filters);
  }

  // ============================================================
  // ANOMALY DETECTION
  // ============================================================

  @Get('anomalies')
  async getAnomalies(
    @Query() filters: any,
    @CurrentUser() user: UserPayload,
  ) {
    return this.anomalyDetection.getAlerts(user.organizationId, filters);
  }

  @Post('anomalies/detect')
  async detectAnomalies(
    @Body() dto: { config?: any },
    @CurrentUser() user: UserPayload,
  ) {
    return this.anomalyDetection.detectAnomalies(
      user.organizationId,
      dto.config,
    );
  }

  @Post('anomalies/:id/acknowledge')
  async acknowledgeAlert(
    @Param('id') alertId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.anomalyDetection.acknowledgeAlert(
      user.organizationId,
      alertId,
      user.userId,
    );
    return { success: true };
  }

  @Post('anomalies/:id/act')
  async actOnAlert(
    @Param('id') alertId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.anomalyDetection.actOnAlert(user.organizationId, alertId);
    return { success: true };
  }

  // ============================================================
  // AI CHAT
  // ============================================================

  @Post('chat/sessions')
  async createChatSession(
    @Body() dto: { title?: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.aiChat.createSession(
      user.organizationId,
      user.userId,
      dto.title,
    );
  }

  @Get('chat/sessions')
  async getChatSessions(
    @CurrentUser() user: UserPayload,
  ) {
    return this.aiChat.getActiveSessions(user.organizationId, user.userId);
  }

  @Get('chat/sessions/:id')
  async getChatSession(
    @Param('id') sessionId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.aiChat.getSession(
      user.organizationId,
      user.userId,
      sessionId,
    );
  }

  @Post('chat/sessions/:id/messages')
  async sendMessage(
    @Param('id') sessionId: string,
    @Body() dto: { message: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.aiChat.sendMessage(
      user.organizationId,
      user.userId,
      sessionId,
      dto.message,
    );
  }

  @Delete('chat/sessions/:id')
  async closeChatSession(
    @Param('id') sessionId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.aiChat.closeSession(
      user.organizationId,
      user.userId,
      sessionId,
    );
    return { success: true };
  }
}
