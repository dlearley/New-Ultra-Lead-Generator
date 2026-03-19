import { Controller, Post, Get, Delete, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SlackService } from './slack.service';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
  role?: string;
}

@Controller('slack')
@UseGuards(JwtAuthGuard)
export class SlackController {
  constructor(private readonly slack: SlackService) {}

  @Post('connect')
  async connectSlack(
    @CurrentUser() user: UserPayload,
    @Body() data: {
      teamId: string;
      teamName: string;
      accessToken: string;
      botToken?: string;
      webhookUrl?: string;
      channel?: string;
      channelId?: string;
    },
  ) {
    return this.slack.connectSlack(user.organizationId, {
      ...data,
      installedBy: user.userId,
    });
  }

  @Delete('disconnect')
  async disconnectSlack(@CurrentUser() user: UserPayload) {
    await this.slack.disconnectSlack(user.organizationId);
    return { success: true };
  }

  @Get('connection')
  async getConnection(@CurrentUser() user: UserPayload) {
    return this.slack.getSlackConnection(user.organizationId);
  }
}
