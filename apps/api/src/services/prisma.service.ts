import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Extended models for Phase 1 features
  rateLimitUsage: any;
  concurrentRequest: any;
  webhook: any;
  webhookDelivery: any;
  sentEmail: any;
  emailEvent: any;
  suppressedEmail: any;

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
