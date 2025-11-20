import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Alert, AlertRun, AlertRunStatus } from '@/database/entities';
import { CreateAlertDto, UpdateAlertDto, AlertResponseDto, AlertRunResponseDto } from '@/common/dtos';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private alertsRepository: Repository<Alert>,
    @InjectRepository(AlertRun)
    private alertRunsRepository: Repository<AlertRun>,
    @InjectQueue('alerts')
    private alertsQueue: Queue,
  ) {}

  async create(
    organizationId: string,
    createAlertDto: CreateAlertDto,
  ): Promise<AlertResponseDto> {
    const alert = this.alertsRepository.create({
      organizationId,
      ...createAlertDto,
    });

    const saved = await this.alertsRepository.save(alert);
    return this.toResponseDto(saved);
  }

  async findAll(organizationId: string): Promise<AlertResponseDto[]> {
    const alerts = await this.alertsRepository.find({
      where: { organizationId, isActive: true },
      relations: ['territory'],
    });

    return alerts.map((a) => this.toResponseDto(a));
  }

  async findOne(id: string, organizationId: string): Promise<AlertResponseDto> {
    const alert = await this.alertsRepository.findOne({
      where: { id, organizationId },
      relations: ['territory'],
    });

    if (!alert) {
      throw new NotFoundException(`Alert with id ${id} not found`);
    }

    return this.toResponseDto(alert);
  }

  async update(
    id: string,
    organizationId: string,
    updateAlertDto: UpdateAlertDto,
  ): Promise<AlertResponseDto> {
    await this.findOne(id, organizationId);

    await this.alertsRepository.update(
      { id, organizationId },
      updateAlertDto,
    );

    return this.findOne(id, organizationId);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const result = await this.alertsRepository.update(
      { id, organizationId },
      { isActive: false },
    );

    if (result.affected === 0) {
      throw new NotFoundException(`Alert with id ${id} not found`);
    }
  }

  async triggerAlert(id: string, organizationId: string): Promise<AlertRunResponseDto> {
    const alert = await this.findOne(id, organizationId);

    // Create a new alert run record
    const alertRun = this.alertRunsRepository.create({
      alertId: id,
      status: AlertRunStatus.PENDING,
      newLeadsCount: 0,
    });

    const savedRun = await this.alertRunsRepository.save(alertRun);

    // Queue the alert job
    const job = await this.alertsQueue.add(
      'process-alert',
      {
        alertId: id,
        alertRunId: savedRun.id,
        organizationId,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    // Update alert run with job ID
    await this.alertRunsRepository.update(
      { id: savedRun.id },
      { queueJobId: job.id },
    );

    return this.toAlertRunResponseDto(savedRun);
  }

  async getRuns(alertId: string, organizationId: string): Promise<AlertRunResponseDto[]> {
    const alert = await this.findOne(alertId, organizationId);

    const runs = await this.alertRunsRepository.find({
      where: { alertId },
      order: { createdAt: 'DESC' },
    });

    return runs.map((r) => this.toAlertRunResponseDto(r));
  }

  async getRunStatus(
    alertId: string,
    runId: string,
    organizationId: string,
  ): Promise<AlertRunResponseDto> {
    const alert = await this.findOne(alertId, organizationId);

    const run = await this.alertRunsRepository.findOne({
      where: { id: runId, alertId },
    });

    if (!run) {
      throw new NotFoundException(`Alert run with id ${runId} not found`);
    }

    return this.toAlertRunResponseDto(run);
  }

  async updateRunStatus(
    runId: string,
    status: AlertRunStatus,
    newLeadsCount?: number,
    errorMessage?: string,
  ): Promise<void> {
    const updateData: any = {
      status,
      completedAt: new Date(),
    };

    if (newLeadsCount !== undefined) {
      updateData.newLeadsCount = newLeadsCount;
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    await this.alertRunsRepository.update({ id: runId }, updateData);

    // Update the alert's lastRunAt
    const run = await this.alertRunsRepository.findOne({ where: { id: runId } });
    if (run) {
      await this.alertsRepository.update(
        { id: run.alertId },
        { lastRunAt: new Date() },
      );
    }
  }

  private toResponseDto(alert: Alert): AlertResponseDto {
    return {
      id: alert.id,
      organizationId: alert.organizationId,
      name: alert.name,
      description: alert.description,
      territoryId: alert.territoryId,
      savedSearch: alert.savedSearch,
      cadence: alert.cadence,
      deliveryChannels: alert.deliveryChannels,
      recipients: alert.recipients,
      isActive: alert.isActive,
      lastRunAt: alert.lastRunAt,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }

  private toAlertRunResponseDto(run: AlertRun): AlertRunResponseDto {
    return {
      id: run.id,
      alertId: run.alertId,
      status: run.status,
      newLeadsCount: run.newLeadsCount,
      queueJobId: run.queueJobId,
      errorMessage: run.errorMessage,
      createdAt: run.createdAt,
      completedAt: run.completedAt,
    };
  }
}
