import { IsString, IsEnum, IsOptional, IsArray, IsNumber, IsUUID } from 'class-validator';
import { TerritoryType, PolygonCoordinates, RadiusGeometry } from '@/database/entities';

export class CreateTerritoryDto {
  @IsString()
  name: string;

  @IsEnum(TerritoryType)
  type: TerritoryType;

  @IsOptional()
  @IsArray()
  polygonCoordinates?: PolygonCoordinates[];

  @IsOptional()
  radiusGeometry?: RadiusGeometry;

  @IsOptional()
  @IsString()
  stateCode?: string;

  @IsOptional()
  @IsString()
  countyCode?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  ownerIds?: string[];
}

export class UpdateTerritoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  polygonCoordinates?: PolygonCoordinates[];

  @IsOptional()
  radiusGeometry?: RadiusGeometry;

  @IsOptional()
  @IsString()
  stateCode?: string;

  @IsOptional()
  @IsString()
  countyCode?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  ownerIds?: string[];
}

export class TerritoryResponseDto {
  id: string;
  organizationId: string;
  name: string;
  type: TerritoryType;
  polygonCoordinates?: PolygonCoordinates[];
  radiusGeometry?: RadiusGeometry;
  stateCode?: string;
  countyCode?: string;
  ownerId?: string;
  ownerIds?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
