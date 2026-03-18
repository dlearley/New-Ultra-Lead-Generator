import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IntentMonitoringService } from './intent-monitoring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateIntentAlertDto,
  CreateIntentSignalDto,
} from './dto/intent.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
}

@Controller('intent')
@UseGuards(JwtAuthGuard)
export class IntentController {
  constructor(private readonly intentService: IntentMonitoringService) {}

  // ==========================================
  // Intent Signals
  // ==========================================

  @Post('signals')
  async createIntentSignal(
    @Body() dto: CreateIntentSignalDto,
    @CurrentUser() user: UserPayload
  ) {
    return this.intentService.processIntentSignal(user.organizationId, dto);
  }

  @Get('scores/:contactId')
  async getContactIntentScore(@Param('contactId') contactId: string) {
    return this.intentService.calculateContactIntentScore(contactId);
  }

  @Get('scores/company/:companyId')
  async getCompanyIntentScore(@Param('companyId') companyId: string) {
    return this.intentService.calculateCompanyIntentScore(companyId);
  }

  // ==========================================
  // Intent Alerts
  // ==========================================

  @Post('alerts')
  async createAlert(
    @Body() dto: CreateIntentAlertDto,
    @CurrentUser() user: UserPayload
  ) {
    return this.intentService.createIntentAlert(user.organizationId, dto);
  }

  @Get('alerts')
  async getAlerts(@CurrentUser() user: UserPayload) {
    // TODO: Implement get alerts
    return { alerts: [] };
  }

  // ==========================================
  // Dashboard
  // ==========================================

  @Get('dashboard')
  async getDashboard(@CurrentUser() user: UserPayload) {
    return this.intentService.getIntentDashboard(user.organizationId);
  }

  // ==========================================
  // High Intent Prospects
  // ==========================================

  @Get('prospects/high')
  async getHighIntentProspects(
    @Query('limit') limit: string,
    @CurrentUser() user: UserPayload
  ) {
    // TODO: Implement high intent prospects query
    return { prospects: [] };
  }
}
