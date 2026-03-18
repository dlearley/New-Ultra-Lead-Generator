import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LeadScoringService } from './scoring.service';
import { RuleBuilderService } from './rules/rule-builder.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateScoringModelDto,
  UpdateScoringModelDto,
  BatchScoreDto,
  LeadQualificationDto,
} from './dto/scoring.dto';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
}

@Controller('scoring')
@UseGuards(JwtAuthGuard)
export class LeadScoringController {
  constructor(
    private readonly scoringService: LeadScoringService,
    private readonly ruleBuilderService: RuleBuilderService,
  ) {}

  // ============================================================
  // SCORING MODELS
  // ============================================================

  @Post('models')
  async createScoringModel(
    @Body() dto: CreateScoringModelDto,
    @CurrentUser() user: UserPayload,
  ) {
    const model = await this.scoringService.createScoringModel(user.organizationId, dto);
    return { id: model.id };
  }

  @Get('models')
  async getScoringModels(@CurrentUser() user: UserPayload) {
    return this.scoringService.getScoringModels(user.organizationId);
  }

  @Get('models/:id')
  async getScoringModel(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.scoringService.getScoringModel(user.organizationId, id);
  }

  @Put('models/:id')
  async updateScoringModel(
    @Param('id') id: string,
    @Body() dto: UpdateScoringModelDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.scoringService.updateScoringModel(user.organizationId, id, dto);
  }

  // ============================================================
  // LEAD SCORING
  // ============================================================

  @Post('calculate/:contactId')
  async calculateScore(
    @Param('contactId') contactId: string,
    @Query('modelId') modelId: string | undefined,
    @CurrentUser() user: UserPayload,
  ) {
    return this.scoringService.calculateLeadScore(
      user.organizationId,
      contactId,
      modelId,
    );
  }

  @Post('batch')
  async batchScore(
    @Body() dto: BatchScoreDto,
    @Query('modelId') modelId: string | undefined,
    @CurrentUser() user: UserPayload,
  ) {
    return this.scoringService.batchScoreLeads(
      user.organizationId,
      modelId,
      dto.filter,
    );
  }

  @Get('contacts/:contactId')
  async getLeadScore(
    @Param('contactId') contactId: string,
    @Query('modelId') modelId: string | undefined,
    @CurrentUser() user: UserPayload,
  ) {
    return this.scoringService.getLeadScore(
      user.organizationId,
      contactId,
      modelId,
    );
  }

  @Get('contacts/:contactId/history')
  async getScoreHistory(
    @Param('contactId') contactId: string,
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: UserPayload,
  ) {
    return this.scoringService.getScoreHistory(
      user.organizationId,
      contactId,
      limit ? parseInt(limit) : undefined,
    );
  }

  // ============================================================
  // HOT/WARM/COLD LEADS
  // ============================================================

  @Get('leads/hot')
  async getHotLeads(
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: UserPayload,
  ) {
    return this.scoringService.getHotLeads(
      user.organizationId,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get('leads/by-category/:category')
  async getLeadsByCategory(
    @Param('category') category: string,
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: UserPayload,
  ) {
    return this.scoringService.getLeadsByCategory(
      user.organizationId,
      category,
      limit ? parseInt(limit) : undefined,
    );
  }

  // ============================================================
  // RULE BUILDER
  // ============================================================

  @Get('rules/templates')
  async getRuleTemplates() {
    return this.ruleBuilderService.getRuleTemplates();
  }

  @Get('rules/templates/:category')
  async getRulesByCategory(@Param('category') category: string) {
    return this.ruleBuilderService.getRulesByCategory(category);
  }

  // ============================================================
  // DASHBOARD
  // ============================================================

  @Get('dashboard')
  async getScoreDashboard(
    @Query('days') days: string | undefined,
    @CurrentUser() user: UserPayload,
  ) {
    return this.scoringService.getScoreDashboard(
      user.organizationId,
      days ? parseInt(days) : undefined,
    );
  }

  @Get('dashboard/trends')
  async getScoreTrends(
    @Query('days') days: string | undefined,
    @CurrentUser() user: UserPayload,
  ) {
    return this.scoringService.getScoreTrends(
      user.organizationId,
      days ? parseInt(days) : 30,
    );
  }

  // ============================================================
  // QUALIFICATION
  // ============================================================

  @Post('qualify/:contactId')
  async qualifyLead(
    @Param('contactId') contactId: string,
    @Body() dto: LeadQualificationDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.scoringService.qualifyLead(
      user.organizationId,
      contactId,
      dto,
    );
  }

  @Get('qualification/questions')
  async getQualificationQuestions(@CurrentUser() user: UserPayload) {
    return this.scoringService.getQualificationQuestions(user.organizationId);
  }

  // ============================================================
  // SALES ROUTING
  // ============================================================

  @Post('routing')
  async createRoutingRule(
    @Body() dto: any,
    @CurrentUser() user: UserPayload,
  ) {
    return this.scoringService.createRoutingRule(user.organizationId, dto);
  }

  @Post('route-leads')
  async routeLeads(
    @Body() dto: { leadIds: string[] },
    @CurrentUser() user: UserPayload,
  ) {
    return this.scoringService.routeLeads(user.organizationId, dto.leadIds);
  }
}
