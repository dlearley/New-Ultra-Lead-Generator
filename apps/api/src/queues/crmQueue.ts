import { Queue, Worker, Job, QueueScheduler } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { CrmAdapterFactory } from '../adapters';
import { SyncJobData, BusinessLeadData, FieldMappingData } from '../types';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Redis connection
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
});

// Queue configuration
export const crmSyncQueue = new Queue('crm-sync', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Queue scheduler to handle delayed retries
export const crmSyncScheduler = new QueueScheduler('crm-sync', {
  connection: redisConnection,
});

// Worker to process CRM sync jobs
export const crmSyncWorker = new Worker(
  'crm-sync',
  async (job: Job<SyncJobData>) => {
    const { organizationId, businessLeadId, crmType } = job.data;
    
    logger.info(`Processing CRM sync job`, {
      jobId: job.id,
      organizationId,
      businessLeadId,
      crmType,
    });

    try {
      // Update job status to processing
      await prisma.syncJob.update({
        where: { id: job.data.id || '' },
        data: { status: 'PROCESSING' },
      });

      // Fetch organization and CRM configuration
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          crmConfigurations: {
            where: { crmType, isActive: true },
          },
        },
      });

      if (!organization || organization.crmConfigurations.length === 0) {
        throw new Error(`No active CRM configuration found for ${crmType}`);
      }

      const crmConfig = organization.crmConfigurations[0];

      // Fetch business lead
      const businessLead = await prisma.businessLead.findUnique({
        where: { id: businessLeadId },
      });

      if (!businessLead) {
        throw new Error(`Business lead not found: ${businessLeadId}`);
      }

      // Fetch field mappings
      const fieldMappings = await prisma.fieldMapping.findMany({
        where: {
          organizationId,
          crmType,
        },
      });

      if (fieldMappings.length === 0) {
        throw new Error(`No field mappings found for ${crmType}`);
      }

      // Create CRM adapter and authenticate
      const adapter = CrmAdapterFactory.createAdapter(crmType);
      const isAuthenticated = await adapter.authenticate(crmConfig.credentials as any);

      if (!isAuthenticated) {
        throw new Error(`Failed to authenticate with ${crmType}`);
      }

      // Prepare lead data
      const leadData: BusinessLeadData = {
        email: businessLead.email,
        firstName: businessLead.firstName || undefined,
        lastName: businessLead.lastName || undefined,
        phone: businessLead.phone || undefined,
        company: businessLead.company || undefined,
        jobTitle: businessLead.jobTitle || undefined,
        source: businessLead.source || undefined,
        customFields: businessLead.customFields as any || undefined,
      };

      // Convert field mappings to the expected format
      const mappings: FieldMappingData[] = fieldMappings.map(mapping => ({
        sourceField: mapping.sourceField,
        targetField: mapping.targetField,
        fieldType: mapping.fieldType as any,
        isRequired: mapping.isRequired,
        defaultValue: mapping.defaultValue || undefined,
      }));

      // Push lead to CRM
      const result = await adapter.pushLead(leadData, mappings);

      // Update sync job with result
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
        where: { id: job.data.id || '' },
        data: updateData,
      });

      // Update business lead status if successful
      if (result.success) {
        await prisma.businessLead.update({
          where: { id: businessLeadId },
          data: { status: 'CONTACTED' },
        });
      }

      logger.info(`CRM sync job completed`, {
        jobId: job.id,
        success: result.success,
        crmId: result.crmId,
        errorMessage: result.errorMessage,
      });

      return result;

    } catch (error: any) {
      logger.error(`CRM sync job failed`, {
        jobId: job.id,
        error: error.message,
        stack: error.stack,
      });

      // Update job status to failed
      await prisma.syncJob.update({
        where: { id: job.data.id || '' },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error.message,
        },
      });

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.CRM_WORKER_CONCURRENCY || '5'),
  }
);

// Worker event handlers
crmSyncWorker.on('completed', (job: Job, result: any) => {
  logger.info(`CRM sync job completed successfully`, {
    jobId: job.id,
    result,
  });
});

crmSyncWorker.on('failed', (job: Job | undefined, error: Error) => {
  logger.error(`CRM sync job failed`, {
    jobId: job?.id,
    error: error.message,
  });
});

crmSyncWorker.on('error', (error: Error) => {
  logger.error(`CRM sync worker error`, {
    error: error.message,
    stack: error.stack,
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down CRM sync worker...');
  await crmSyncWorker.close();
  await crmSyncScheduler.close();
  await crmSyncQueue.close();
  await redisConnection.quit();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down CRM sync worker...');
  await crmSyncWorker.close();
  await crmSyncScheduler.close();
  await crmSyncQueue.close();
  await redisConnection.quit();
  await prisma.$disconnect();
  process.exit(0);
});

export { redisConnection };