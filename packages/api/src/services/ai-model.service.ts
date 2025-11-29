import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiModelEntity, ModelStatus, ModelProvider } from '../entities/ai-model.entity';
import { CreateAiModelDto, UpdateAiModelDto, AiModelMetricsDto } from '../dtos/ai-model.dto';
import { AuditLogService } from './audit-log.service';
import { AuditAction, AuditResourceType } from '../entities/audit-log.entity';

@Injectable()
export class AiModelService {
  constructor(
    @InjectRepository(AiModelEntity)
    private aiModelRepository: Repository<AiModelEntity>,
    private auditLogService: AuditLogService,
  ) {}

  async createModel(dto: CreateAiModelDto, userId?: string): Promise<AiModelEntity> {
    const model = this.aiModelRepository.create({
      ...dto,
      status: dto.status || ModelStatus.BETA,
      isActive: dto.isActive || false,
      config: dto.config ? JSON.stringify(dto.config) : null,
      metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
    });

    const saved = await this.aiModelRepository.save(model);

    await this.auditLogService.createLog({
      organizationId: dto.organizationId,
      userId,
      action: AuditAction.CREATE,
      resourceType: AuditResourceType.AI_MODEL,
      resourceId: saved.id,
      description: `Created AI model: ${dto.name} (${dto.provider})`,
      status: 'success',
    });

    return saved;
  }

  async getModelById(id: string): Promise<AiModelEntity> {
    const model = await this.aiModelRepository.findOne({ where: { id } });

    if (!model) {
      throw new NotFoundException(`AI model with ID ${id} not found`);
    }

    return model;
  }

  async getModelsByOrganization(organizationId: string): Promise<AiModelEntity[]> {
    return this.aiModelRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async getActiveModel(organizationId: string): Promise<AiModelEntity> {
    const model = await this.aiModelRepository.findOne({
      where: {
        organizationId,
        isActive: true,
      },
    });

    if (!model) {
      throw new NotFoundException(`No active AI model found for organization ${organizationId}`);
    }

    return model;
  }

  async switchActiveModel(
    organizationId: string,
    modelId: string,
    userId?: string,
  ): Promise<AiModelEntity> {
    const model = await this.getModelById(modelId);

    if (model.organizationId !== organizationId) {
      throw new BadRequestException('Model does not belong to this organization');
    }

    // Deactivate all other models
    await this.aiModelRepository.update(
      { organizationId, isActive: true },
      { isActive: false },
    );

    // Activate the new model
    model.isActive = true;
    const updated = await this.aiModelRepository.save(model);

    await this.auditLogService.createLog({
      organizationId,
      userId,
      action: AuditAction.MODEL_SWITCH,
      resourceType: AuditResourceType.AI_MODEL,
      resourceId: modelId,
      description: `Switched active AI model to: ${model.name} v${model.version}`,
      status: 'success',
    });

    return updated;
  }

  async updateModel(
    id: string,
    dto: UpdateAiModelDto,
    userId?: string,
  ): Promise<AiModelEntity> {
    const model = await this.getModelById(id);

    const updated = this.aiModelRepository.merge(model, {
      ...dto,
      config: dto.config ? JSON.stringify(dto.config) : model.config,
    });

    const saved = await this.aiModelRepository.save(updated);

    await this.auditLogService.createLog({
      organizationId: model.organizationId,
      userId,
      action: AuditAction.UPDATE,
      resourceType: AuditResourceType.AI_MODEL,
      resourceId: id,
      description: `Updated AI model: ${model.name}`,
      changes: JSON.stringify(dto),
      status: 'success',
    });

    return saved;
  }

  async toggleProvider(
    organizationId: string,
    provider: ModelProvider,
    enabled: boolean,
    userId?: string,
  ): Promise<AiModelEntity[]> {
    const models = await this.aiModelRepository.find({
      where: {
        organizationId,
        provider,
      },
    });

    if (models.length === 0) {
      throw new NotFoundException(`No models found for provider ${provider}`);
    }

    for (const model of models) {
      model.status = enabled ? ModelStatus.ACTIVE : ModelStatus.INACTIVE;
      await this.aiModelRepository.save(model);

      await this.auditLogService.createLog({
        organizationId,
        userId,
        action: AuditAction.UPDATE,
        resourceType: AuditResourceType.AI_MODEL,
        resourceId: model.id,
        description: `${enabled ? 'Enabled' : 'Disabled'} provider: ${provider}`,
        status: 'success',
      });
    }

    return models;
  }

  async getModelMetrics(organizationId: string): Promise<AiModelMetricsDto[]> {
    const models = await this.getModelsByOrganization(organizationId);

    return models.map((model) => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
      version: model.version,
      isActive: model.isActive,
      averageLatencyMs: Number(model.averageLatencyMs),
      errorRate: Number(model.errorRate),
      totalRequests: model.totalRequests,
      failedRequests: model.failedRequests,
      successRate: model.totalRequests > 0 ? 1 - model.failedRequests / model.totalRequests : 0,
    }));
  }

  async recordModelMetrics(
    modelId: string,
    latencyMs: number,
    success: boolean,
  ): Promise<void> {
    const model = await this.getModelById(modelId);

    const totalRequests = model.totalRequests + 1;
    const failedRequests = success ? model.failedRequests : model.failedRequests + 1;

    // Calculate running average for latency
    const currentTotal = model.averageLatencyMs * model.totalRequests;
    const averageLatencyMs = (currentTotal + latencyMs) / totalRequests;

    const errorRate = (failedRequests / totalRequests) * 100;

    await this.aiModelRepository.update(
      { id: modelId },
      {
        totalRequests,
        failedRequests,
        averageLatencyMs,
        errorRate,
      },
    );
  }

  async deleteModel(id: string, userId?: string): Promise<void> {
    const model = await this.getModelById(id);

    if (model.isActive) {
      throw new BadRequestException('Cannot delete an active model. Switch to a different model first.');
    }

    await this.auditLogService.createLog({
      organizationId: model.organizationId,
      userId,
      action: AuditAction.DELETE,
      resourceType: AuditResourceType.AI_MODEL,
      resourceId: id,
      description: `Deleted AI model: ${model.name}`,
      status: 'success',
    });

    await this.aiModelRepository.remove(model);
  }
}
