import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IntegrationsController } from './integrations.controller';
import { CrmSyncService } from './sync/crm-sync.service';
import { WebhookService } from './webhooks/webhook.service';
import { SalesforceAdapter } from './adapters/salesforce.adapter';
import { HubSpotAdapter } from './adapters/hubspot.adapter';

@Module({
  imports: [HttpModule],
  controllers: [IntegrationsController],
  providers: [CrmSyncService, WebhookService, SalesforceAdapter, HubSpotAdapter],
  exports: [CrmSyncService, WebhookService],
})
export class IntegrationsModule {}
