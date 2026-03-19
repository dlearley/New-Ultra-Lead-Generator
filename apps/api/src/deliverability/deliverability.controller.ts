import { Controller, Get, Post, Body, UseGuards, Query, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DeliverabilityService } from './deliverability.service';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
  role?: string;
}

@Controller('deliverability')
@UseGuards(JwtAuthGuard)
export class DeliverabilityController {
  constructor(private readonly deliverability: DeliverabilityService) {}

  @Get('metrics')
  async getMetrics(
    @CurrentUser() user: UserPayload,
    @Query('period') period: '24h' | '7d' | '30d' = '7d',
  ) {
    return this.deliverability.getDeliverabilityMetrics(user.organizationId, period);
  }

  @Get('reputation')
  async getReputation(@CurrentUser() user: UserPayload) {
    return this.deliverability.getSenderReputation(user.organizationId);
  }

  @Get('domain/:domain')
  async getDomainReputation(
    @CurrentUser() user: UserPayload,
    @Param('domain') domain: string,
  ) {
    return this.deliverability.getDomainReputation(user.organizationId, domain);
  }

  @Post('spam-check')
  async checkSpamScore(
    @Body() content: { subject: string; body: string; fromEmail: string },
  ) {
    return this.deliverability.checkSpamScore(content);
  }

  @Get('suppression-list')
  async getSuppressionList(
    @CurrentUser() user: UserPayload,
    @Query('source') source?: string,
    @Query('limit') limit?: string,
  ) {
    return this.deliverability.getSuppressionList(user.organizationId, {
      source,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post('suppression-list/check')
  async checkSuppression(
    @CurrentUser() user: UserPayload,
    @Body() data: { email: string },
  ) {
    return this.deliverability.checkSuppressionList(user.organizationId, data.email);
  }
}
