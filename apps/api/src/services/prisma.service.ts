import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Extended models for Phase 1 & 2 features
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
  sequenceStep: any;
  contactActivity: any;
  customField: any;
  customFieldValue: any;

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
