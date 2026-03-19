import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Extended models for Phase 1, 2 & 3 features
  rateLimitUsage: any;
  concurrentRequest: any;
  webhook: any;
  webhookDelivery: any;
  sentEmail: any;
  emailEvent: any;
  suppressedEmail: any;
  calendarConnection: any;
  bookingLink: any;
  meetingBooking: any;
  slackConnection: any;
  customField: any;
  customFieldValue: any;
  sequenceStep: any;
  contactActivity: any;
  deal: any;
  sequence: any;

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
