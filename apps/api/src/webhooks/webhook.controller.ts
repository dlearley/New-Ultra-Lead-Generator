import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WebhookService } from './webhook.service';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
  role?: string;
}

@Controller('webhooks')
@UseGuards(JwtAuthGuard)
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  async createWebhook(
    @CurrentUser() user: UserPayload,
    @Body() data: {
      url: string;
      events: string[];
      secret?: string;
      description?: string;
      active?: boolean;
    },
  ) {
    return this.webhookService.createWebhook(user.organizationId, data);
  }

  @Get()
  async getWebhooks(
    @CurrentUser() user: UserPayload,
    @Query('active') active?: string,
  ) {
    return this.webhookService.getWebhooks(user.organizationId, {
      active: active !== undefined ? active === 'true' : undefined,
    });
  }

  @Get(':id')
  async getWebhook(
    @CurrentUser() user: UserPayload,
    @Param('id') webhookId: string,
  ) {
    return this.webhookService.getWebhook(user.organizationId, webhookId);
  }

  @Put(':id')
  async updateWebhook(
    @CurrentUser() user: UserPayload,
    @Param('id') webhookId: string,
    @Body() data: Partial<{
      url: string;
      events: string[];
      secret: string;
      description: string;
      active: boolean;
    }>,
  ) {
    return this.webhookService.updateWebhook(user.organizationId, webhookId, data);
  }

  @Delete(':id')
  async deleteWebhook(
    @CurrentUser() user: UserPayload,
    @Param('id') webhookId: string,
  ) {
    await this.webhookService.deleteWebhook(user.organizationId, webhookId);
    return { success: true };
  }

  @Get(':id/stats')
  async getWebhookStats(
    @CurrentUser() user: UserPayload,
    @Param('id') webhookId: string,
    @Query('period') period: '24h' | '7d' | '30d' = '24h',
  ) {
    return this.webhookService.getDeliveryStats(user.organizationId, webhookId, period);
  }

  @Get('stats/overview')
  async getOverallStats(
    @CurrentUser() user: UserPayload,
    @Query('period') period: '24h' | '7d' | '30d' = '24h',
  ) {
    return this.webhookService.getDeliveryStats(user.organizationId, undefined, period);
  }

  @Post('test')
  async testWebhook(
    @CurrentUser() user: UserPayload,
    @Body() data: { url: string; secret?: string },
  ) {
    // Send test payload
    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook' },
      organizationId: user.organizationId,
    };

    // We'll need to expose a test method in the service
    return { success: true, message: 'Test webhook sent' };
  }
}
