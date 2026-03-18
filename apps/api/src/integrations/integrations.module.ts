import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IntegrationsController } from './integrations.controller';
import { CrmSyncService } from './sync/crm-sync.service';
import { ConflictResolutionService } from './sync/conflict-resolution.service';
import { DataMappingService } from './sync/data-mapping.service';
import { WebhookService } from './webhooks/webhook.service';
import { SalesforceAdapter } from './adapters/salesforce.adapter';
import { HubSpotAdapter } from './adapters/hubspot.adapter';

@Module({
  imports: [HttpModule],
  controllers: [IntegrationsController],
  providers: [
    CrmSyncService,
    ConflictResolutionService,
    DataMappingService,
    WebhookService,
    SalesforceAdapter,
    HubSpotAdapter,
  ],
  exports: [CrmSyncService, ConflictResolutionService, DataMappingService, WebhookService],
})
export class IntegrationsModule {}
