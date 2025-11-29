import { IsString, IsOptional, IsUUID, IsObject } from 'class-validator';

export class CreateSavedSearchDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsObject()
  query: Record<string, any>;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}

export class UpdateSavedSearchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  query?: Record<string, any>;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}

export class SavedSearchResponseDto {
  id: string;
  name: string;
  description?: string;
  userId?: string;
  organizationId?: string;
  query: Record<string, any>;
  filters?: Record<string, any>;
  resultsCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
