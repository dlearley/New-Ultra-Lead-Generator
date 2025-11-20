import { IsEnum, IsString, IsNumber, IsOptional, IsUUID, IsBoolean, IsObject } from 'class-validator';
import { ModelProvider, ModelStatus } from '../entities/ai-model.entity';

export class CreateAiModelDto {
  @IsUUID()
  organizationId: string;

  @IsString()
  name: string;

  @IsEnum(ModelProvider)
  provider: ModelProvider;

  @IsString()
  version: string;

  @IsEnum(ModelStatus)
  @IsOptional()
  status?: ModelStatus;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateAiModelDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(ModelStatus)
  @IsOptional()
  status?: ModelStatus;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  averageLatencyMs?: number;

  @IsNumber()
  @IsOptional()
  errorRate?: number;

  @IsNumber()
  @IsOptional()
  totalRequests?: number;

  @IsNumber()
  @IsOptional()
  failedRequests?: number;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}

export class AiModelResponseDto {
  id: string;
  organizationId: string;
  name: string;
  provider: ModelProvider;
  version: string;
  status: ModelStatus;
  isActive: boolean;
  averageLatencyMs: number;
  errorRate: number;
  totalRequests: number;
  failedRequests: number;
  config?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deployedAt?: Date;
}

export class AiModelMetricsDto {
  id: string;
  name: string;
  provider: ModelProvider;
  version: string;
  isActive: boolean;
  averageLatencyMs: number;
  errorRate: number;
  totalRequests: number;
  failedRequests: number;
  successRate: number;
}

export class ToggleAiProviderDto {
  @IsEnum(ModelProvider)
  provider: ModelProvider;

  @IsBoolean()
  enabled: boolean;
}

export class SwitchActiveModelDto {
  @IsUUID()
  modelId: string;
}
