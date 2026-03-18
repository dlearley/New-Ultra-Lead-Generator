import { PrismaClient } from '@prisma/client';
import { CrmAdapterFactory } from '../adapters';
import { BusinessLeadData, FieldMappingData, CrmPushResult } from '../types';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class CrmService {
  async pushLeadsToCrm(
    organizationId: string,
    crmType: 'SALESFORCE' | 'HUBSPOT' | 'PIPEDRIVE',
    leadIds: string[] | null,
    leads: BusinessLeadData[] | null,
    runImmediately: boolean = false
  ): Promise<{ success: boolean; message: string; jobIds?: string[] }> {
    try {
      // Get CRM configuration
      const crmConfig = await prisma.crmConfiguration.findFirst({
        where: {
          organizationId,
          crmType,
          isActive: true,
        },
      });

      if (!crmConfig) {
        throw new Error(`No active CRM configuration found for ${crmType}`);
      }

      // Get field mappings
      const fieldMappings = await prisma.fieldMapping.findMany({
        where: {
          organizationId,
          crmType,
        },
      });

      if (fieldMappings.length === 0) {
        throw new Error(`No field mappings found for ${crmType}`);
      }

      // Process leads
      const leadsToProcess: BusinessLeadData[] = [];

      if (leadIds && leadIds.length > 0) {
        // Fetch existing leads from database
        const existingLeads = await prisma.businessLead.findMany({
          where: {
            id: { in: leadIds },
            organizationId,
          },
        });

        leadsToProcess.push(...existingLeads.map(lead => ({
          email: lead.email,
          firstName: lead.firstName || undefined,
          lastName: lead.lastName || undefined,
          phone: lead.phone || undefined,
          company: lead.company || undefined,
          jobTitle: lead.jobTitle || undefined,
          source: lead.source || undefined,
          customFields: lead.customFields as any || undefined,
        })));
      }

      if (leads && leads.length > 0) {
        // Create new leads in database
        for (const leadData of leads) {
          const newLead = await prisma.businessLead.create({
            data: {
              organizationId,
              email: leadData.email,
              firstName: leadData.firstName,
              lastName: leadData.lastName,
              phone: leadData.phone,
              company: leadData.company,
              jobTitle: leadData.jobTitle,
              source: leadData.source,
              customFields: leadData.customFields,
            },
          });

          leadsToProcess.push({
            ...leadData,
            id: newLead.id,
          });
        }
      }

      if (leadsToProcess.length === 0) {
        throw new Error('No leads to process');
      }

      // Create sync jobs
      const syncJobs = [];
      const jobIds: string[] = [];

      for (const lead of leadsToProcess) {
        const syncJob = await prisma.syncJob.create({
          data: {
            organizationId,
            businessLeadId: (lead as any).id || lead.email, // Fallback for leads without ID
            crmType,
            status: 'PENDING',
          },
        });

        syncJobs.push(syncJob);
        jobIds.push(syncJob.id);

        if (runImmediately) {
          // Process immediately (synchronous)
          await this.processSyncJob(syncJob.id, organizationId, crmType, lead, fieldMappings);
        } else {
          // Queue for async processing
          const { crmSyncQueue } = await import('../queues/crmQueue');
          await crmSyncQueue.add(
            'crm-sync',
            {
              id: syncJob.id,
              organizationId,
              businessLeadId: (lead as any).id || lead.email,
              crmType,
            },
            {
              delay: 0,
              removeOnComplete: 100,
              removeOnFail: 50,
            }
          );
        }
      }

      logger.info(`CRM push initiated`, {
        organizationId,
        crmType,
        leadCount: leadsToProcess.length,
        runImmediately,
        jobIds,
      });

      return {
        success: true,
        message: `Successfully queued ${leadsToProcess.length} leads for ${crmType} sync`,
        jobIds,
      };
    } catch (error: any) {
      logger.error('Error in pushLeadsToCrm', {
        organizationId,
        crmType,
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }

  private async processSyncJob(
    jobId: string,
    organizationId: string,
    crmType: string,
    leadData: BusinessLeadData,
    fieldMappings: any[]
  ): Promise<void> {
    try {
      // Get CRM configuration
      const crmConfig = await prisma.crmConfiguration.findFirst({
        where: {
          organizationId,
          crmType: crmType as any,
          isActive: true,
        },
      });

      if (!crmConfig) {
        throw new Error(`No active CRM configuration found for ${crmType}`);
      }

      // Create adapter and authenticate
      const adapter = CrmAdapterFactory.createAdapter(crmType as any);
      const isAuthenticated = await adapter.authenticate(crmConfig.credentials as any);

      if (!isAuthenticated) {
        throw new Error(`Failed to authenticate with ${crmType}`);
      }

      // Convert field mappings
      const mappings: FieldMappingData[] = fieldMappings.map(mapping => ({
        sourceField: mapping.sourceField,
        targetField: mapping.targetField,
        fieldType: mapping.fieldType as any,
        isRequired: mapping.isRequired,
        defaultValue: mapping.defaultValue || undefined,
      }));

      // Push lead to CRM
      const result = await adapter.pushLead(leadData, mappings);

      // Update sync job
      const updateData: any = {
        status: result.success ? 'COMPLETED' : 'FAILED',
        completedAt: new Date(),
        requestData: leadData,
        responseData: result.responseData,
      };

      if (!result.success) {
        updateData.errorMessage = result.errorMessage;
      }

      await prisma.syncJob.update({
        where: { id: jobId },
        data: updateData,
      });

      // Update business lead status if successful
      if (result.success) {
        await prisma.businessLead.updateMany({
          where: { 
            organizationId,
            email: leadData.email,
          },
          data: { status: 'CONTACTED' },
        });
      }
    } catch (error: any) {
      // Update sync job with error
      await prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error.message,
        },
      });

      throw error;
    }
  }

  async getSyncJobs(
    organizationId: string,
    page: number = 1,
    limit: number = 20,
    status?: string,
    crmType?: string
  ): Promise<{ jobs: any[]; total: number; page: number; limit: number }> {
    const where: any = { organizationId };

    if (status) {
      where.status = status;
    }

    if (crmType) {
      where.crmType = crmType;
    }

    const [jobs, total] = await Promise.all([
      prisma.syncJob.findMany({
        where,
        include: {
          businessLead: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              company: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.syncJob.count({ where }),
    ]);

    return {
      jobs,
      total,
      page,
      limit,
    };
  }

  async getSyncJobById(organizationId: string, jobId: string): Promise<any> {
    const job = await prisma.syncJob.findFirst({
      where: {
        id: jobId,
        organizationId,
      },
      include: {
        businessLead: true,
      },
    });

    if (!job) {
      throw new Error('Sync job not found');
    }

    return job;
  }

  async testCrmConnection(
    organizationId: string,
    crmType: 'SALESFORCE' | 'HUBSPOT' | 'PIPEDRIVE'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const crmConfig = await prisma.crmConfiguration.findFirst({
        where: {
          organizationId,
          crmType,
          isActive: true,
        },
      });

      if (!crmConfig) {
        throw new Error(`No active CRM configuration found for ${crmType}`);
      }

      const adapter = CrmAdapterFactory.createAdapter(crmType);
      const isAuthenticated = await adapter.authenticate(crmConfig.credentials as any);

      if (isAuthenticated) {
        return {
          success: true,
          message: `Successfully connected to ${crmType}`,
        };
      } else {
        return {
          success: false,
          message: `Failed to authenticate with ${crmType}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || `Connection test failed for ${crmType}`,
      };
    }
  }
}