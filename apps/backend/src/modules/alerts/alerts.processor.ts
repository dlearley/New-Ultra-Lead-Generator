import { Processor, Process } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertRunStatus } from '@/database/entities';

@Injectable()
@Processor('alerts')
export class AlertsProcessor {
  private readonly logger = new Logger(AlertsProcessor.name);

  constructor(private alertsService: AlertsService) {}

  @Process('process-alert')
  async processAlert(job: Job<any>): Promise<void> {
    this.logger.log(`Processing alert job: ${job.id}`);
    const { alertId, alertRunId, organizationId } = job.data;

    try {
      // Simulate processing - in production, this would:
      // 1. Query the saved search criteria
      // 2. Execute search against the leads database
      // 3. Find new leads matching the territory and search criteria
      // 4. Trigger delivery channel notifications (email, in-app)
      // 5. Count new leads

      // Mock data - in production, fetch real leads
      const newLeadsCount = Math.floor(Math.random() * 50);

      // Update the run status
      await this.alertsService.updateRunStatus(
        alertRunId,
        AlertRunStatus.SUCCESS,
        newLeadsCount,
      );

      this.logger.log(`Alert ${alertId} processed successfully. New leads: ${newLeadsCount}`);
    } catch (error) {
      this.logger.error(`Error processing alert ${alertId}:`, error);

      await this.alertsService.updateRunStatus(
        alertRunId,
        AlertRunStatus.FAILED,
        0,
        error instanceof Error ? error.message : 'Unknown error',
      );

      throw error;
    }
  }
}
