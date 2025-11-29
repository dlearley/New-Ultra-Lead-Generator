import { IsEnum, IsString, IsOptional, IsUUID, IsDate, IsNumber } from 'class-validator';
import { AuditAction, AuditResourceType } from '../entities/audit-log.entity';

export class CreateAuditLogDto {
  @IsUUID()
  organizationId: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsEnum(AuditAction)
  action: AuditAction;

  @IsEnum(AuditResourceType)
  resourceType: AuditResourceType;

  @IsUUID()
  @IsOptional()
  resourceId?: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  changes?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;
}

export class AuditLogSearchDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsEnum(AuditResourceType)
  resourceType?: AuditResourceType;

  @IsOptional()
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}

export class AuditLogResponseDto {
  id: string;
  organizationId: string;
  userId?: string;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId?: string;
  description: string;
  changes?: string;
  status?: string;
  metadata?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export class AuditLogExportDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  format?: 'csv' | 'json' | 'xlsx';
}
