import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export interface JobOptions {
  priority?: number; // 1-10, lower is higher priority
  delay?: number; // milliseconds to delay
  attempts?: number; // retry attempts
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  timeout?: number; // job timeout in ms
  removeOnComplete?: boolean | number; // keep last N completed jobs
  removeOnFail?: boolean | number; // keep last N failed jobs
}

export interface BulkJobData {
  jobType: string;
  organizationId: string;
  userId: string;
  payload: any;
  metadata?: {
    totalItems?: number;
    batchSize?: number;
    startedAt?: Date;
  };
}

export interface JobStatus {
  id: string;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
  progress: number;
  attemptsMade: number;
  failedReason?: string;
  processedAt?: Date;
  finishedAt?: Date;
  data: any;
  result?: any;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('bulk-operations') private readonly bulkQueue: Queue,
    @InjectQueue('email-sending') private readonly emailQueue: Queue,
    @InjectQueue('data-processing') private readonly dataQueue: Queue,
    @InjectQueue('ai-processing') private readonly aiQueue: Queue,
  ) {}

  // ============================================================
  // QUEUE MANAGEMENT
  // ============================================================

  async addJob(
    queueName: 'bulk-operations' | 'email-sending' | 'data-processing' | 'ai-processing',
    jobType: string,
    data: BulkJobData,
    options: JobOptions = {},
  ): Promise<{ jobId: string }> {
    const queue = this.getQueue(queueName);
    
    const job = await queue.add(jobType, data, {
      priority: options.priority || 5,
      delay: options.delay,
      attempts: options.attempts || 3,
      backoff: options.backoff || { type: 'exponential', delay: 5000 },
      timeout: options.timeout || 300000, // 5 min default
      removeOnComplete: options.removeOnComplete ?? 100,
      removeOnFail: options.removeOnFail ?? 50,
    });

    // Log job creation
    await this.prisma.jobLog.create({
      data: {
        jobId: job.id.toString(),
        organizationId: data.organizationId,
        queueName,
        jobType,
        status: 'pending',
        data: data as any,
        createdAt: new Date(),
      },
    });

    return { jobId: job.id.toString() };
  }

  async addBulkJobs(
    queueName: 'bulk-operations' | 'email-sending' | 'data-processing' | 'ai-processing',
    jobType: string,
    jobs: BulkJobData[],
    options: JobOptions = {},
  ): Promise<{ jobIds: string[] }> {
    const queue = this.getQueue(queueName);
    
    const bullJobs = await queue.addBulk(
      jobs.map((data) => ({
        name: jobType,
        data,
        opts: {
          priority: options.priority || 5,
          attempts: options.attempts || 3,
          backoff: options.backoff || { type: 'exponential', delay: 5000 },
        },
      })),
    );

    const jobIds = bullJobs.map((j) => j.id.toString());

    // Log all jobs
    await this.prisma.jobLog.createMany({
      data: jobs.map((data, index) => ({
        jobId: jobIds[index],
        organizationId: data.organizationId,
        queueName,
        jobType,
        status: 'pending',
        data: data as any,
        createdAt: new Date(),
      })),
    });

    return { jobIds };
  }

  async getJobStatus(
    queueName: string,
    jobId: string,
  ): Promise<JobStatus | null> {
    const queue = this.getQueue(queueName as any);
    const job = await queue.getJob(jobId);

    if (!job) {
      // Check completed/failed sets
      const completed = await queue.getCompleted();
      const found = completed.find((j) => j.id.toString() === jobId);
      if (found) {
        return {
          id: found.id.toString(),
          state: 'completed',
          progress: 100,
          attemptsMade: found.attemptsMade,
          processedAt: found.processedOn ? new Date(found.processedOn) : undefined,
          finishedAt: found.finishedOn ? new Date(found.finishedOn) : undefined,
          data: found.data,
          result: found.returnvalue,
        };
      }
      return null;
    }

    const state = await job.getState();

    return {
      id: job.id.toString(),
      state: state as any,
      progress: job.progress() as number,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      data: job.data,
      result: job.returnvalue,
    };
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName as any);
    await queue.pause();
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName as any);
    await queue.resume();
  }

  async cleanQueue(
    queueName: string,
    status: 'completed' | 'failed' | 'wait' | 'active' | 'delayed' | 'paused',
    before: Date,
  ): Promise<{ removed: number }> {
    const queue = this.getQueue(queueName as any);
    const removed = await queue.clean(before.getTime(), status);
    return { removed: removed.length };
  }

  // ============================================================
  // BULK OPERATIONS
  // ============================================================

  async bulkImportContacts(
    organizationId: string,
    userId: string,
    contacts: any[],
  ): Promise<{ jobId: string }> {
    return this.addJob(
      'bulk-operations',
      'import-contacts',
      {
        jobType: 'import-contacts',
        organizationId,
        userId,
        payload: { contacts },
        metadata: {
          totalItems: contacts.length,
          batchSize: 100,
          startedAt: new Date(),
        },
      },
      {
        priority: 3, // Higher priority
        attempts: 5,
        timeout: 600000, // 10 minutes
      },
    );
  }

  async bulkUpdateContacts(
    organizationId: string,
    userId: string,
    contactIds: string[],
    updateData: any,
  ): Promise<{ jobId: string }> {
    return this.addJob(
      'bulk-operations',
      'update-contacts',
      {
        jobType: 'update-contacts',
        organizationId,
        userId,
        payload: { contactIds, updateData },
        metadata: {
          totalItems: contactIds.length,
          batchSize: 50,
          startedAt: new Date(),
        },
      },
      {
        priority: 4,
        timeout: 300000,
      },
    );
  }

  async bulkDeleteContacts(
    organizationId: string,
    userId: string,
    contactIds: string[],
  ): Promise<{ jobId: string }> {
    return this.addJob(
      'bulk-operations',
      'delete-contacts',
      {
        jobType: 'delete-contacts',
        organizationId,
        userId,
        payload: { contactIds },
        metadata: {
          totalItems: contactIds.length,
          startedAt: new Date(),
        },
      },
      {
        priority: 2, // Lower priority for destructive operations
        timeout: 300000,
      },
    );
  }

  async bulkEnrichContacts(
    organizationId: string,
    userId: string,
    contactIds: string[],
  ): Promise<{ jobId: string }> {
    return this.addJob(
      'data-processing',
      'enrich-contacts',
      {
        jobType: 'enrich-contacts',
        organizationId,
        userId,
        payload: { contactIds },
        metadata: {
          totalItems: contactIds.length,
          batchSize: 10, // Smaller batches for API calls
          startedAt: new Date(),
        },
      },
      {
        priority: 5,
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
        timeout: 1800000, // 30 minutes
      },
    );
  }

  // ============================================================
  // EMAIL QUEUE
  // ============================================================

  async queueEmails(
    organizationId: string,
    userId: string,
    emails: Array<{
      contactId: string;
      subject: string;
      body: string;
      fromEmail: string;
    }>,
  ): Promise<{ jobId: string }> {
    return this.addJob(
      'email-sending',
      'send-emails',
      {
        jobType: 'send-emails',
        organizationId,
        userId,
        payload: { emails },
        metadata: {
          totalItems: emails.length,
          batchSize: 50,
          startedAt: new Date(),
        },
      },
      {
        priority: 4,
        attempts: 5,
        backoff: { type: 'fixed', delay: 60000 }, // 1 minute between retries
        timeout: 3600000, // 1 hour
      },
    );
  }

  async scheduleEmail(
    organizationId: string,
    userId: string,
    emailData: any,
    sendAt: Date,
  ): Promise<{ jobId: string }> {
    const delay = sendAt.getTime() - Date.now();
    
    return this.addJob(
      'email-sending',
      'schedule-email',
      {
        jobType: 'schedule-email',
        organizationId,
        userId,
        payload: emailData,
      },
      {
        delay: Math.max(0, delay),
        priority: 5,
        attempts: 3,
      },
    );
  }

  // ============================================================
  // AI PROCESSING QUEUE
  // ============================================================

  async queueAIAnalysis(
    organizationId: string,
    userId: string,
    analysisType: 'sentiment' | 'intent' | 'churn-prediction' | 'best-time',
    entityIds: string[],
  ): Promise<{ jobId: string }> {
    return this.addJob(
      'ai-processing',
      `ai-${analysisType}`,
      {
        jobType: `ai-${analysisType}`,
        organizationId,
        userId,
        payload: { entityIds, analysisType },
        metadata: {
          totalItems: entityIds.length,
          batchSize: 20,
          startedAt: new Date(),
        },
      },
      {
        priority: 6, // Lower priority than real-time operations
        attempts: 2,
        timeout: 1800000, // 30 minutes
      },
    );
  }

  // ============================================================
  // QUEUE STATS
  // ============================================================

  async getQueueStats(organizationId?: string): Promise<{
    queues: Array<{
      name: string;
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
      paused: number;
    }>;
  }> {
    const queues = [
      { name: 'bulk-operations', queue: this.bulkQueue },
      { name: 'email-sending', queue: this.emailQueue },
      { name: 'data-processing', queue: this.dataQueue },
      { name: 'ai-processing', queue: this.aiQueue },
    ];

    const stats = await Promise.all(
      queues.map(async ({ name, queue }) => {
        const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
          queue.getPausedCount(),
        ]);

        return {
          name,
          waiting,
          active,
          completed,
          failed,
          delayed,
          paused,
        };
      }),
    );

    return { queues: stats };
  }

  async getOrganizationJobs(
    organizationId: string,
    status?: string,
    limit: number = 50,
  ) {
    const where: any = { organizationId };
    if (status) where.status = status;

    return this.prisma.jobLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private getQueue(
    name: 'bulk-operations' | 'email-sending' | 'data-processing' | 'ai-processing',
  ): Queue {
    switch (name) {
      case 'bulk-operations':
        return this.bulkQueue;
      case 'email-sending':
        return this.emailQueue;
      case 'data-processing':
        return this.dataQueue;
      case 'ai-processing':
        return this.aiQueue;
    }
  }
}
