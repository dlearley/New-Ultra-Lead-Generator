import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CrmSyncService } from './sync/crm-sync.service';
import { WebhookService } from './webhooks/webhook.service';
import { SalesforceAdapter } from './adapters/salesforce.adapter';
import { HubSpotAdapter } from './adapters/hubspot.adapter';
import {
  CreateCrmConnectionDto,
  UpdateCrmConnectionDto,
  CreateFieldMappingDto,
  RunSyncDto,
  CreateWebhookDto,
} from './dto/integration.dto';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
}

@Controller('integrations')
@UseGuards(JwtAuthGuard)
export class IntegrationsController {
  constructor(
    private readonly crmSyncService: CrmSyncService,
    private readonly webhookService: WebhookService,
    private readonly salesforceAdapter: SalesforceAdapter,
    private readonly hubspotAdapter: HubSpotAdapter,
  ) {}

  // ============================================================
  // CRM CONNECTIONS
  // ============================================================

  @Get('crm/providers')
  async getCrmProviders() {
    return [
      { id: 'salesforce', name: 'Salesforce', authType: 'oauth2', icon: 'salesforce' },
      { id: 'hubspot', name: 'HubSpot', authType: 'oauth2', icon: 'hubspot' },
      { id: 'dynamics', name: 'Microsoft Dynamics 365', authType: 'oauth2', icon: 'microsoft' },
      { id: 'pipedrive', name: 'Pipedrive', authType: 'api_key', icon: 'pipedrive' },
      { id: 'zoho', name: 'Zoho CRM', authType: 'oauth2', icon: 'zoho' },
    ];
  }

  @Post('crm/connections')
  async createConnection(
    @Body() dto: CreateCrmConnectionDto,
    @CurrentUser() user: UserPayload,
  ) {
    // This would normally handle OAuth flow
    // For now, return placeholder
    return { id: 'temp-connection-id', status: 'connected' };
  }

  @Get('crm/connections')
  async getConnections(@CurrentUser() user: UserPayload) {
    return [];
  }

  @Get('crm/connections/:id')
  async getConnection(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return { id };
  }

  @Put('crm/connections/:id')
  async updateConnection(
    @Param('id') id: string,
    @Body() dto: UpdateCrmConnectionDto,
    @CurrentUser() user: UserPayload,
  ) {
    return { id, ...dto };
  }

  @Delete('crm/connections/:id')
  async deleteConnection(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return { success: true };
  }

  // ============================================================
  // CRM SYNC
  // ============================================================

  @Post('crm/connections/:id/sync')
  async runSync(
    @Param('id') connectionId: string,
    @Body() dto: RunSyncDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.crmSyncService.runFullSync(
      user.organizationId,
      connectionId,
      dto.entityType,
    );
  }

  @Get('crm/connections/:id/sync-jobs')
  async getSyncJobs(
    @Param('id') connectionId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return [];
  }

  @Post('crm/enrich-and-push')
  async pushEnrichment(
    @Body() dto: { connectionId: string; contactId: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.crmSyncService.pushEnrichmentToCRM(
      user.organizationId,
      dto.connectionId,
      dto.contactId,
    );
  }

  // ============================================================
  // FIELD MAPPING
  // ============================================================

  @Get('crm/connections/:id/fields/:entityType')
  async getCrmFields(
    @Param('id') connectionId: string,
    @Param('entityType') entityType: string,
    @CurrentUser() user: UserPayload,
  ) {
    // Return available fields from CRM
    return [];
  }

  @Post('crm/field-mappings')
  async createFieldMapping(
    @Body() dto: CreateFieldMappingDto,
    @CurrentUser() user: UserPayload,
  ) {
    return { id: 'temp-mapping-id' };
  }

  @Get('crm/field-mappings')
  async getFieldMappings(
    @Query('connectionId') connectionId: string,
    @Query('entityType') entityType: string,
    @CurrentUser() user: UserPayload,
  ) {
    return [];
  }

  // ============================================================
  // PIPELINE STAGES
  // ============================================================

  @Post('crm/connections/:id/sync-pipeline')
  async syncPipelineStages(
    @Param('id') connectionId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.crmSyncService.syncPipelineStages(user.organizationId, connectionId);
  }

  @Get('crm/connections/:id/pipeline-stages')
  async getPipelineStages(
    @Param('id') connectionId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return [];
  }

  // ============================================================
  // WEBHOOKS
  // ============================================================

  @Post('webhooks')
  async createWebhook(
    @Body() dto: CreateWebhookDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.webhookService.createSubscription(user.organizationId, dto);
  }

  @Get('webhooks')
  async getWebhooks(@CurrentUser() user: UserPayload) {
    return this.webhookService.getSubscriptions(user.organizationId);
  }

  @Put('webhooks/:id')
  async updateWebhook(
    @Param('id') id: string,
    @Body() dto: Partial<CreateWebhookDto>,
    @CurrentUser() user: UserPayload,
  ) {
    return this.webhookService.updateSubscription(user.organizationId, id, dto);
  }

  @Delete('webhooks/:id')
  async deleteWebhook(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.webhookService.deleteSubscription(user.organizationId, id);
    return { success: true };
  }

  @Get('webhooks/:id/deliveries')
  async getWebhookDeliveries(
    @Param('id') subscriptionId: string,
    @Query('limit') limit: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.webhookService.getDeliveryHistory(
      user.organizationId,
      subscriptionId,
      limit ? parseInt(limit) : 50,
    );
  }

  @Post('webhooks/deliveries/:id/retry')
  async retryDelivery(
    @Param('id') deliveryId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.webhookService.retryDelivery(user.organizationId, deliveryId);
  }

  // ============================================================
  // ZAPIER
  // ============================================================

  @Get('zapier/triggers')
  async getZapierTriggers() {
    return [
      { key: 'new_lead', label: 'New Lead Created', description: 'Triggers when a new lead is captured' },
      { key: 'lead_scored', label: 'Lead Scored', description: 'Triggers when a lead score changes' },
      { key: 'lead_qualified', label: 'Lead Qualified', description: 'Triggers when a lead is qualified' },
      { key: 'deal_won', label: 'Deal Won', description: 'Triggers when a deal is marked as won' },
      { key: 'form_submitted', label: 'Form Submitted', description: 'Triggers when a form is submitted' },
    ];
  }

  @Get('zapier/actions')
  async getZapierActions() {
    return [
      { key: 'create_contact', label: 'Create Contact', description: 'Creates a new contact' },
      { key: 'update_contact', label: 'Update Contact', description: 'Updates an existing contact' },
      { key: 'create_task', label: 'Create Task', description: 'Creates a follow-up task' },
      { key: 'add_to_list', label: 'Add to List', description: 'Adds contact to a list' },
    ];
  }

  // ============================================================
  // DASHBOARD
  // ============================================================

  @Get('dashboard')
  async getDashboard(@CurrentUser() user: UserPayload) {
    return {
      connections: [],
      recentSyncs: [],
      webhookStats: {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        totalDelivered: 0,
        totalFailed: 0,
      },
    };
  }

  // ============================================================
  // TEST CONNECTION
  // ============================================================

  @Post('crm/test-connection')
  async testConnection(
    @Body() dto: { provider: string; credentials: any },
    @CurrentUser() user: UserPayload,
  ) {
    let adapter;
    switch (dto.provider) {
      case 'salesforce':
        adapter = this.salesforceAdapter;
        break;
      case 'hubspot':
        adapter = this.hubspotAdapter;
        break;
      default:
        return { success: false, error: 'Unsupported provider' };
    }

    const connected = await adapter.connect(dto.credentials);
    if (connected) {
      return adapter.testConnection();
    }
    return { success: false, error: 'Failed to connect' };
  }
}
