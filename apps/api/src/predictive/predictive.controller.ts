import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PredictiveService } from './predictive.service';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
  role?: string;
}

@Controller('predictive')
@UseGuards(JwtAuthGuard)
export class PredictiveController {
  constructor(private readonly predictive: PredictiveService) {}

  @Get('churn-risk/:contactId')
  async predictChurnRisk(
    @CurrentUser() user: UserPayload,
    @Param('contactId') contactId: string,
  ) {
    return this.predictive.predictChurnRisk(user.organizationId, contactId);
  }

  @Get('churn-risk/high-risk/list')
  async getHighRiskContacts(
    @CurrentUser() user: UserPayload,
    @Query('minScore') minScore?: string,
    @Query('limit') limit?: string,
  ) {
    return this.predictive.getHighRiskContacts(
      user.organizationId,
      minScore ? parseInt(minScore) : 70,
      limit ? parseInt(limit) : 50,
    );
  }

  @Post('churn-risk/bulk')
  async predictChurnRiskBulk(
    @CurrentUser() user: UserPayload,
    @Body() data: { contactIds: string[] },
  ) {
    const results = [];
    for (const contactId of data.contactIds) {
      try {
        const risk = await this.predictive.predictChurnRisk(user.organizationId, contactId);
        results.push(risk);
      } catch (error) {
        results.push({ contactId, error: 'Contact not found' });
      }
    }
    return results;
  }

  @Get('best-time/:contactId')
  async predictBestTime(
    @CurrentUser() user: UserPayload,
    @Param('contactId') contactId: string,
  ) {
    return this.predictive.predictBestTimeToContact(user.organizationId, contactId);
  }

  @Post('best-time/bulk')
  async predictBestTimeBulk(
    @CurrentUser() user: UserPayload,
    @Body() data: { contactIds: string[] },
  ) {
    return this.predictive.getBestTimesForContacts(user.organizationId, data.contactIds);
  }

  @Get('conversion/:contactId')
  async predictConversion(
    @CurrentUser() user: UserPayload,
    @Param('contactId') contactId: string,
  ) {
    return this.predictive.predictConversionProbability(user.organizationId, contactId);
  }
}
