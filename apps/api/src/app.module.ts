import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AIModule } from './ai/ai.module';
import { SearchModule } from './search/search.module';
import { EnrichmentModule } from './enrichment/enrichment.module';
import { AdvancedSearchModule } from './advanced-search/advanced-search.module';
import { IntentModule } from './intent/intent.module';
import { BulkImportModule } from './bulk-import/bulk-import.module';
import { CaptureModule } from './capture/capture.module';
import { ScoringModule } from './scoring/scoring.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { OutreachModule } from './outreach/outreach.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AIEngineModule } from './ai-engine/ai-engine.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { ComplianceModule } from './compliance/compliance.module';
import { RateLimitingModule } from './rate-limiting/rate-limiting.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { DeliverabilityModule } from './deliverability/deliverability.module';
import { CalendarModule } from './calendar/calendar.module';
import { SlackModule } from './slack/slack.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { PrismaService } from './services/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    AIModule,
    SearchModule,
    EnrichmentModule,
    AdvancedSearchModule,
    IntentModule,
    BulkImportModule,
    CaptureModule,
    ScoringModule,
    IntegrationsModule,
    OutreachModule,
    AnalyticsModule,
    AIEngineModule,
    OnboardingModule,
    ComplianceModule,
    RateLimitingModule,
    WebhooksModule,
    DeliverabilityModule,
    CalendarModule,
    SlackModule,
    CustomFieldsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
