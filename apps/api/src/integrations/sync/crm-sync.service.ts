import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import { SalesforceAdapter } from '../adapters/salesforce.adapter';
import { HubSpotAdapter } from '../adapters/hubspot.adapter';
import { CrmAdapter, CrmCredentials } from '../adapters/crm-adapter.interface';

export interface SyncConfig {
  contacts: { enabled: boolean; direction: 'to_crm' | 'from_crm' | 'bidirectional' };
  companies: { enabled: boolean; direction: 'to_crm' | 'from_crm' | 'bidirectional' };
  deals: { enabled: boolean; direction: 'to_crm' | 'from_crm' | 'bidirectional' };
  tasks: { enabled: boolean; direction: 'to_crm' | 'from_crm' | 'bidirectional' };
}

@Injectable()
export class CrmSyncService {
  private readonly logger = new Logger(CrmSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly salesforceAdapter: SalesforceAdapter,
    private readonly hubspotAdapter: HubSpotAdapter,
  ) {}

  // ============================================================
  // ADAPTER FACTORY
  // ============================================================

  private getAdapter(provider: string): CrmAdapter | null {
    switch (provider.toLowerCase()) {
      case 'salesforce':
        return this.salesforceAdapter;
      case 'hubspot':
        return this.hubspotAdapter;
      default:
        return null;
    }
  }

  private async connectAdapter(
    adapter: CrmAdapter,
    credentials: CrmCredentials,
  ): Promise<boolean> {
    try {
      return await adapter.connect(credentials);
    } catch (error) {
      this.logger.error(`Failed to connect adapter:`, error);
      return false;
    }
  }

  // ============================================================
  // FULL SYNC
  // ============================================================

  async runFullSync(
    organizationId: string,
    connectionId: string,
    entityType?: string,
  ): Promise<{ success: boolean; jobId: string; message?: string }> {
    const connection = await this.prisma.crmConnection.findFirst({
      where: { id: connectionId, organizationId },
    });

    if (!connection) {
      return { success: false, jobId: '', message: 'Connection not found' };
    }

    // Create sync job
    const job = await this.prisma.crmSyncJob.create({
      data: {
        connectionId,
        organizationId,
        jobType: 'full_sync',
        entityType: entityType || 'all',
        status: 'pending',
      },
    });

    // Start sync asynchronously
    this.executeFullSync(job.id, connection).catch((error) => {
      this.logger.error(`Full sync failed for job ${job.id}:`, error);
    });

    return { success: true, jobId: job.id };
  }

  private async executeFullSync(
    jobId: string,
    connection: any,
  ): Promise<void> {
    const adapter = this.getAdapter(connection.provider);
    if (!adapter) {
      await this.updateJobStatus(jobId, 'failed', 0, 0, 0, 'Unsupported provider');
      return;
    }

    const credentials = connection.credentials as CrmCredentials;
    const connected = await this.connectAdapter(adapter, credentials);
    
    if (!connected) {
      await this.updateJobStatus(jobId, 'failed', 0, 0, 0, 'Failed to connect');
      return;
    }

    const syncConfig = (connection.syncConfig as SyncConfig) || this.getDefaultSyncConfig();
    
    await this.updateJobStatus(jobId, 'running');

    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalErrors = 0;

    try {
      // Sync Contacts
      if (syncConfig.contacts?.enabled && (!connection.entityType || connection.entityType === 'all' || connection.entityType === 'contact')) {
        const result = await this.syncContacts(adapter, connection, syncConfig.contacts.direction);
        totalProcessed += result.processed;
        totalSuccess += result.success;
        totalErrors += result.errors;
      }

      // Sync Companies
      if (syncConfig.companies?.enabled && (!connection.entityType || connection.entityType === 'all' || connection.entityType === 'company')) {
        const result = await this.syncCompanies(adapter, connection, syncConfig.companies.direction);
        totalProcessed += result.processed;
        totalSuccess += result.success;
        totalErrors += result.errors;
      }

      // Sync Deals
      if (syncConfig.deals?.enabled && (!connection.entityType || connection.entityType === 'all' || connection.entityType === 'deal')) {
        const result = await this.syncDeals(adapter, connection, syncConfig.deals.direction);
        totalProcessed += result.processed;
        totalSuccess += result.success;
        totalErrors += result.errors;
      }

      await this.updateJobStatus(
        jobId,
        'completed',
        totalProcessed,
        totalSuccess,
        totalErrors,
      );

      // Update connection stats
      await this.prisma.crmConnection.update({
        where: { id: connection.id },
        data: {
          lastSyncAt: new Date(),
          totalSynced: { increment: totalSuccess },
        },
      });

    } catch (error: any) {
      await this.updateJobStatus(jobId, 'failed', totalProcessed, totalSuccess, totalErrors, error.message);
    }
  }

  // ============================================================
  // CONTACT SYNC
  // ============================================================

  private async syncContacts(
    adapter: CrmAdapter,
    connection: any,
    direction: string,
  ): Promise<{ processed: number; success: number; errors: number }> {
    let processed = 0;
    let success = 0;
    let errors = 0;

    const lastSync = connection.lastSyncAt;

    if (direction === 'to_crm' || direction === 'bidirectional') {
      // Push local contacts to CRM
      const localContacts = await this.prisma.contact.findMany({
        where: {
          organizationId: connection.organizationId,
          updatedAt: { gt: lastSync || new Date(0) },
        },
        take: 1000,
      });

      for (const contact of localContacts) {
        processed++;
        const result = await adapter.createContact({
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          title: contact.jobTitle,
        });

        if (result.success) {
          success++;
          // Track mapping
          await this.createEntityMapping(connection.id, 'contact', contact.id, result.id!);
        } else {
          errors++;
        }
      }
    }

    if (direction === 'from_crm' || direction === 'bidirectional') {
      // Pull CRM contacts to local
      const crmContacts = await adapter.listContacts(lastSync || undefined);

      for (const crmContact of crmContacts) {
        processed++;
        try {
          // Check if contact exists
          const existing = await this.prisma.contact.findFirst({
            where: {
              organizationId: connection.organizationId,
              email: crmContact.email,
            },
          });

          if (existing) {
            // Update existing
            await this.prisma.contact.update({
              where: { id: existing.id },
              data: {
                firstName: crmContact.firstName || existing.firstName,
                lastName: crmContact.lastName || existing.lastName,
                phone: crmContact.phone || existing.phone,
                jobTitle: crmContact.title || existing.jobTitle,
              },
            });
          } else {
            // Create new
            await this.prisma.contact.create({
              data: {
                organizationId: connection.organizationId,
                firstName: crmContact.firstName || '',
                lastName: crmContact.lastName || '',
                email: crmContact.email!,
                phone: crmContact.phone,
                jobTitle: crmContact.title,
              },
            });
          }
          success++;
        } catch (error) {
          errors++;
        }
      }
    }

    return { processed, success, errors };
  }

  // ============================================================
  // COMPANY SYNC
  // ============================================================

  private async syncCompanies(
    adapter: CrmAdapter,
    connection: any,
    direction: string,
  ): Promise<{ processed: number; success: number; errors: number }> {
    let processed = 0;
    let success = 0;
    let errors = 0;

    const lastSync = connection.lastSyncAt;

    if (direction === 'to_crm' || direction === 'bidirectional') {
      const localCompanies = await this.prisma.company.findMany({
        where: {
          organizationId: connection.organizationId,
          updatedAt: { gt: lastSync || new Date(0) },
        },
        take: 1000,
      });

      for (const company of localCompanies) {
        processed++;
        const result = await adapter.createCompany({
          name: company.name,
          industry: company.industry,
          size: company.employeeCount?.toString(),
          website: company.website,
        });

        if (result.success) {
          success++;
          await this.createEntityMapping(connection.id, 'company', company.id, result.id!);
        } else {
          errors++;
        }
      }
    }

    if (direction === 'from_crm' || direction === 'bidirectional') {
      const crmCompanies = await adapter.listCompanies(lastSync || undefined);

      for (const crmCompany of crmCompanies) {
        processed++;
        try {
          const existing = await this.prisma.company.findFirst({
            where: {
              organizationId: connection.organizationId,
              name: crmCompany.name,
            },
          });

          if (existing) {
            await this.prisma.company.update({
              where: { id: existing.id },
              data: {
                industry: crmCompany.industry || existing.industry,
                employeeCount: crmCompany.size ? parseInt(crmCompany.size) : existing.employeeCount,
                website: crmCompany.website || existing.website,
              },
            });
          } else {
            await this.prisma.company.create({
              data: {
                organizationId: connection.organizationId,
                name: crmCompany.name,
                industry: crmCompany.industry,
                employeeCount: crmCompany.size ? parseInt(crmCompany.size) : null,
                website: crmCompany.website,
              },
            });
          }
          success++;
        } catch (error) {
          errors++;
        }
      }
    }

    return { processed, success, errors };
  }

  // ============================================================
  // DEAL SYNC
  // ============================================================

  private async syncDeals(
    adapter: CrmAdapter,
    connection: any,
    direction: string,
  ): Promise<{ processed: number; success: number; errors: number }> {
    let processed = 0;
    let success = 0;
    let errors = 0;

    // Deals typically sync from CRM to local
    if (direction === 'from_crm' || direction === 'bidirectional') {
      const lastSync = connection.lastSyncAt;
      const crmDeals = await adapter.listDeals(lastSync || undefined);

      for (const crmDeal of crmDeals) {
        processed++;
        try {
          await this.prisma.crmDeal.upsert({
            where: {
              connectionId_crmDealId: {
                connectionId: connection.id,
                crmDealId: crmDeal.id!,
              },
            },
            create: {
              connectionId: connection.id,
              organizationId: connection.organizationId,
              crmDealId: crmDeal.id!,
              name: crmDeal.name,
              value: crmDeal.value,
              stage: crmDeal.stage,
              closeDate: crmDeal.closeDate,
              crmData: crmDeal as any,
            },
            update: {
              name: crmDeal.name,
              value: crmDeal.value,
              stage: crmDeal.stage,
              closeDate: crmDeal.closeDate,
              crmData: crmDeal as any,
              lastSyncedAt: new Date(),
            },
          });
          success++;
        } catch (error) {
          errors++;
        }
      }
    }

    return { processed, success, errors };
  }

  // ============================================================
  // ENRICHMENT FLOW
  // ============================================================

  async pushEnrichmentToCRM(
    organizationId: string,
    connectionId: string,
    contactId: string,
  ): Promise<{ success: boolean; message?: string }> {
    const connection = await this.prisma.crmConnection.findFirst({
      where: { id: connectionId, organizationId },
    });

    if (!connection) {
      return { success: false, message: 'Connection not found' };
    }

    const adapter = this.getAdapter(connection.provider);
    if (!adapter) {
      return { success: false, message: 'Unsupported provider' };
    }

    const credentials = connection.credentials as CrmCredentials;
    const connected = await this.connectAdapter(adapter, credentials);
    
    if (!connected) {
      return { success: false, message: 'Failed to connect to CRM' };
    }

    // Get enriched contact data
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId },
      include: { company: true },
    });

    if (!contact) {
      return { success: false, message: 'Contact not found' };
    }

    // Get field mappings
    const fieldMappings = await this.prisma.crmFieldMapping.findMany({
      where: {
        connectionId,
        entityType: 'contact',
        isActive: true,
      },
    });

    // Map enriched fields to CRM format
    const crmData: any = {};
    for (const mapping of fieldMappings) {
      const localValue = (contact as any)[mapping.localField];
      if (localValue !== undefined && localValue !== null) {
        crmData[mapping.crmField] = this.transformValue(localValue, mapping.transform);
      }
    }

    // Find CRM contact
    const crmContact = await adapter.findContactByEmail(contact.email);

    if (crmContact?.id) {
      // Update existing
      const result = await adapter.updateContact(crmContact.id, crmData);
      
      if (result.success) {
        // Log activity
        await this.logIntegrationActivity(
          organizationId,
          'crm',
          'enrichment_pushed',
          'contact',
          contactId,
          { crmId: crmContact.id, fields: Object.keys(crmData) },
        );
        
        return { success: true, message: 'Contact updated in CRM' };
      } else {
        return { success: false, message: result.error };
      }
    } else {
      // Create new
      const result = await adapter.createContact({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        ...crmData,
      });
      
      if (result.success) {
        await this.createEntityMapping(connection.id, 'contact', contact.id, result.id!);
        return { success: true, message: 'Contact created in CRM' };
      } else {
        return { success: false, message: result.error };
      }
    }
  }

  // ============================================================
  // PIPELINE MANAGEMENT
  // ============================================================

  async syncPipelineStages(
    organizationId: string,
    connectionId: string,
  ): Promise<{ success: boolean; stages?: any[]; message?: string }> {
    const connection = await this.prisma.crmConnection.findFirst({
      where: { id: connectionId, organizationId },
    });

    if (!connection) {
      return { success: false, message: 'Connection not found' };
    }

    const adapter = this.getAdapter(connection.provider);
    if (!adapter) {
      return { success: false, message: 'Unsupported provider' };
    }

    const credentials = connection.credentials as CrmCredentials;
    await this.connectAdapter(adapter, credentials);

    const stages = await adapter.getPipelineStages();

    // Save stages to database
    for (const stage of stages) {
      await this.prisma.crmPipelineStage.upsert({
        where: {
          connectionId_crmStageId: {
            connectionId: connection.id,
            crmStageId: stage.id,
          },
        },
        create: {
          connectionId: connection.id,
          organizationId,
          name: stage.name,
          crmStageId: stage.id,
          displayOrder: stage.displayOrder,
          winProbability: stage.winProbability,
          category: stage.category,
        },
        update: {
          name: stage.name,
          displayOrder: stage.displayOrder,
          winProbability: stage.winProbability,
          category: stage.category,
        },
      });
    }

    return { success: true, stages };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private async updateJobStatus(
    jobId: string,
    status: string,
    processed?: number,
    success?: number,
    errors?: number,
    errorMessage?: string,
  ): Promise<void> {
    await this.prisma.crmSyncJob.update({
      where: { id: jobId },
      data: {
        status,
        processedRecords: processed,
        successCount: success,
        errorCount: errors,
        errors: errorMessage ? [{ message: errorMessage }] : undefined,
        startedAt: status === 'running' ? new Date() : undefined,
        completedAt: status === 'completed' || status === 'failed' ? new Date() : undefined,
      },
    });
  }

  private async createEntityMapping(
    connectionId: string,
    entityType: string,
    localId: string,
    crmId: string,
  ): Promise<void> {
    // Store mapping for future reference
    // This would typically be in a separate mapping table
    this.logger.log(`Mapped ${entityType}: ${localId} <-> ${crmId}`);
  }

  private transformValue(value: any, transform?: string | null): any {
    if (!transform) return value;

    switch (transform) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'phone_format':
        // Basic phone formatting
        return String(value).replace(/\D/g, '');
      default:
        return value;
    }
  }

  private getDefaultSyncConfig(): SyncConfig {
    return {
      contacts: { enabled: true, direction: 'bidirectional' },
      companies: { enabled: true, direction: 'bidirectional' },
      deals: { enabled: true, direction: 'from_crm' },
      tasks: { enabled: false, direction: 'to_crm' },
    };
  }

  private async logIntegrationActivity(
    organizationId: string,
    integrationType: string,
    action: string,
    entityType?: string,
    entityId?: string,
    details?: any,
  ): Promise<void> {
    await this.prisma.integrationActivity.create({
      data: {
        organizationId,
        integrationType,
        action,
        entityType,
        entityId,
        details,
      },
    });
  }
}
