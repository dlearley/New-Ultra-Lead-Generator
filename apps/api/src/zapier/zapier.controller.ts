import { Controller, Get, Post, Delete, Body, Param, UseGuards, Headers } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZapierService } from './zapier.service';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
  role?: string;
}

@Controller('zapier')
export class ZapierController {
  constructor(private readonly zapier: ZapierService) {}

  // ============================================================
  // ZAPIER AUTH ENDPOINTS (Public - for Zapier platform)
  // ============================================================

  @Post('auth/validate')
  async validateApiKey(@Headers('x-api-key') apiKey: string) {
    const result = await this.zapier.validateApiKey(apiKey);
    return { valid: result.valid };
  }

  // ============================================================
  // TRIGGERS (Outgoing to Zapier)
  // ============================================================

  @Get('triggers')
  getTriggers() {
    return this.zapier.getTriggers();
  }

  @Get('triggers/:id/sample')
  getTriggerSample(@Param('id') triggerId: string) {
    const trigger = this.zapier.getTrigger(triggerId);
    return trigger?.sampleData || {};
  }

  // ============================================================
  // ACTIONS (Incoming from Zapier)
  // ============================================================

  @Get('actions')
  getActions() {
    return this.zapier.getActions();
  }

  @Get('actions/:id')
  getAction(@Param('id') actionId: string) {
    return this.zapier.getAction(actionId);
  }

  @Post('actions/:id/execute')
  async executeAction(
    @Headers('x-api-key') apiKey: string,
    @Param('id') actionId: string,
    @Body() data: any,
  ) {
    const auth = await this.zapier.validateApiKey(apiKey);
    if (!auth.valid) {
      return { error: 'Invalid API key' };
    }

    return this.zapier.executeAction(auth.organizationId!, actionId, data);
  }

  // ============================================================
  // CONNECTION MANAGEMENT (Authenticated)
  // ============================================================

  @Post('connections')
  @UseGuards(JwtAuthGuard)
  async createConnection(
    @CurrentUser() user: UserPayload,
    @Body() data: {
      zapId: string;
      triggerId?: string;
      actionId?: string;
      webhookUrl: string;
      isActive: boolean;
    },
  ) {
    return this.zapier.createConnection(user.organizationId, data);
  }

  @Get('connections')
  @UseGuards(JwtAuthGuard)
  async getConnections(@CurrentUser() user: UserPayload) {
    return this.zapier.getConnections(user.organizationId);
  }

  @Delete('connections/:id')
  @UseGuards(JwtAuthGuard)
  async deactivateConnection(
    @CurrentUser() user: UserPayload,
    @Param('id') connectionId: string,
  ) {
    await this.zapier.deactivateConnection(user.organizationId, connectionId);
    return { success: true };
  }
}
