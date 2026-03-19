import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';

export interface RateLimitTier {
  name: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  concurrentRequests: number;
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  tier: string;
  limit: number;
  window: string;
}

@Injectable()
export class RateLimitingService {
  private readonly logger = new Logger(RateLimitingService.name);

  // Tier definitions
  private readonly tiers: Record<string, RateLimitTier> = {
    free: {
      name: 'Free',
      requestsPerMinute: 60,
      requestsPerHour: 500,
      requestsPerDay: 2000,
      concurrentRequests: 5,
    },
    pro: {
      name: 'Pro',
      requestsPerMinute: 300,
      requestsPerHour: 5000,
      requestsPerDay: 50000,
      concurrentRequests: 20,
    },
    enterprise: {
      name: 'Enterprise',
      requestsPerMinute: 1000,
      requestsPerHour: 50000,
      requestsPerDay: 500000,
      concurrentRequests: 100,
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // GET TIER FOR ORGANIZATION
  // ============================================================

  async getTierForOrganization(organizationId: string): Promise<RateLimitTier> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionTier: true, customRateLimit: true },
    });

    if (!org) {
      return this.tiers.free;
    }

    // Check for custom rate limits
    if (org.customRateLimit) {
      return org.customRateLimit as RateLimitTier;
    }

    return this.tiers[org.subscriptionTier || 'free'] || this.tiers.free;
  }

  // ============================================================
  // CHECK RATE LIMIT
  // ============================================================

  async checkRateLimit(
    organizationId: string,
    endpoint: string,
    window: 'minute' | 'hour' | 'day' = 'minute',
  ): Promise<RateLimitStatus> {
    const tier = await this.getTierForOrganization(organizationId);
    const now = new Date();
    
    let limit: number;
    let windowMs: number;
    
    switch (window) {
      case 'minute':
        limit = tier.requestsPerMinute;
        windowMs = 60000;
        break;
      case 'hour':
        limit = tier.requestsPerHour;
        windowMs = 3600000;
        break;
      case 'day':
        limit = tier.requestsPerDay;
        windowMs = 86400000;
        break;
    }

    // Get current usage from database
    const key = `ratelimit:${organizationId}:${endpoint}:${window}:${this.getWindowKey(now, window)}`;
    
    const usage = await this.prisma.rateLimitUsage.findUnique({
      where: { key },
    });

    const currentCount = usage?.count || 0;
    const allowed = currentCount < limit;
    const remaining = Math.max(0, limit - currentCount - 1);
    const resetAt = this.getResetTime(now, window);

    // Record this request
    if (allowed) {
      await this.prisma.rateLimitUsage.upsert({
        where: { key },
        create: {
          key,
          organizationId,
          endpoint,
          window,
          count: 1,
          resetAt,
        },
        update: {
          count: { increment: 1 },
        },
      });
    }

    return {
      allowed,
      remaining,
      resetAt,
      tier: tier.name,
      limit,
      window,
    };
  }

  // ============================================================
  // GET RATE LIMIT STATUS
  // ============================================================

  async getRateLimitStatus(organizationId: string): Promise<{
    tier: RateLimitTier;
    minute: { used: number; remaining: number; resetAt: Date };
    hour: { used: number; remaining: number; resetAt: Date };
    day: { used: number; remaining: number; resetAt: Date };
  }> {
    const tier = await this.getTierForOrganization(organizationId);
    const now = new Date();

    const [minuteUsage, hourUsage, dayUsage] = await Promise.all([
      this.getUsageForWindow(organizationId, 'minute', now),
      this.getUsageForWindow(organizationId, 'hour', now),
      this.getUsageForWindow(organizationId, 'day', now),
    ]);

    return {
      tier,
      minute: {
        used: minuteUsage,
        remaining: Math.max(0, tier.requestsPerMinute - minuteUsage),
        resetAt: this.getResetTime(now, 'minute'),
      },
      hour: {
        used: hourUsage,
        remaining: Math.max(0, tier.requestsPerHour - hourUsage),
        resetAt: this.getResetTime(now, 'hour'),
      },
      day: {
        used: dayUsage,
        remaining: Math.max(0, tier.requestsPerDay - dayUsage),
        resetAt: this.getResetTime(now, 'day'),
      },
    };
  }

  // ============================================================
  // CHECK CONCURRENT REQUESTS
  // ============================================================

  async checkConcurrentLimit(organizationId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
    const tier = await this.getTierForOrganization(organizationId);
    
    const current = await this.prisma.concurrentRequest.count({
      where: {
        organizationId,
        startedAt: { gte: new Date(Date.now() - 30000) }, // Active in last 30s
      },
    });

    return {
      allowed: current < tier.concurrentRequests,
      current,
      limit: tier.concurrentRequests,
    };
  }

  async startConcurrentRequest(organizationId: string, requestId: string): Promise<void> {
    await this.prisma.concurrentRequest.create({
      data: {
        id: requestId,
        organizationId,
        startedAt: new Date(),
      },
    });
  }

  async endConcurrentRequest(requestId: string): Promise<void> {
    await this.prisma.concurrentRequest.deleteMany({
      where: { id: requestId },
    });
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private getWindowKey(date: Date, window: string): string {
    switch (window) {
      case 'minute':
        return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
      case 'hour':
        return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${String(date.getHours()).padStart(2, '0')}`;
      case 'day':
        return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
      default:
        return '';
    }
  }

  private getResetTime(date: Date, window: string): Date {
    const reset = new Date(date);
    switch (window) {
      case 'minute':
        reset.setSeconds(0, 0);
        reset.setMinutes(reset.getMinutes() + 1);
        break;
      case 'hour':
        reset.setMinutes(0, 0, 0);
        reset.setHours(reset.getHours() + 1);
        break;
      case 'day':
        reset.setHours(0, 0, 0, 0);
        reset.setDate(reset.getDate() + 1);
        break;
    }
    return reset;
  }

  private async getUsageForWindow(
    organizationId: string,
    window: string,
    now: Date,
  ): Promise<number> {
    const key = `ratelimit:${organizationId}:*:${window}:${this.getWindowKey(now, window)}`;
    
    const result = await this.prisma.rateLimitUsage.aggregate({
      where: {
        organizationId,
        window,
        resetAt: { gte: now },
      },
      _sum: { count: true },
    });

    return result._sum.count || 0;
  }

  // ============================================================
  // CLEANUP
  // ============================================================

  async cleanupOldRateLimitData(): Promise<{ deleted: number }> {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    const [rateLimitResult, concurrentResult] = await Promise.all([
      this.prisma.rateLimitUsage.deleteMany({
        where: { resetAt: { lt: cutoff } },
      }),
      this.prisma.concurrentRequest.deleteMany({
        where: { startedAt: { lt: cutoff } },
      }),
    ]);

    return {
      deleted: rateLimitResult.count + concurrentResult.count,
    };
  }
}
