import { IsOptional, IsString, IsUUID } from 'class-validator';

export class RebuildSearchIndexJobData {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  batchSize?: number;
}

export class IncrementalSyncJobData {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsString()
  entityType: string;

  @IsString()
  operation: 'index' | 'update' | 'delete';

  @IsOptional()
  entityId?: string;

  @IsOptional()
  data?: Record<string, any>;
}

export interface SearchIndexDocument {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  geopoint?: number[];
  revenue?: number;
  employees?: number;
  hiring?: number;
  techStack?: string[];
  aiScore?: number;
  metadata?: Record<string, any>;
  tenantId?: string;
  organizationId?: string;
  indexedAt: number;
}

export interface SearchSyncMetrics {
  successCount: number;
  failureCount: number;
  totalCount: number;
  duration: number;
  timestamp: number;
  jobId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface SearchSyncAlert {
  type: 'success' | 'warning' | 'error';
  message: string;
  metrics?: SearchSyncMetrics;
  timestamp: number;
}
