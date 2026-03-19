import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RateLimitingService } from './rate-limiting.service';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
  role?: string;
}

@Controller('rate-limit')
@UseGuards(JwtAuthGuard)
export class RateLimitingController {
  constructor(private readonly rateLimiting: RateLimitingService) {}

  @Get('status')
  async getRateLimitStatus(@CurrentUser() user: UserPayload) {
    return this.rateLimiting.getRateLimitStatus(user.organizationId);
  }

  @Get('tier')
  async getCurrentTier(@CurrentUser() user: UserPayload) {
    const tier = await this.rateLimiting.getTierForOrganization(user.organizationId);
    return {
      tier: tier.name,
      limits: {
        requestsPerMinute: tier.requestsPerMinute,
        requestsPerHour: tier.requestsPerHour,
        requestsPerDay: tier.requestsPerDay,
        concurrentRequests: tier.concurrentRequests,
      },
    };
  }
}
