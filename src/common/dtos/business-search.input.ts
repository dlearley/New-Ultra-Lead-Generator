import { IsString, IsOptional, IsNumber, IsArray, IsEnum, Min, Max } from 'class-validator';

export enum SortField {
  RELEVANCE = 'relevance',
  NAME = 'name',
  REVENUE = 'revenue',
  EMPLOYEES = 'employees',
  HIRING = 'hiring',
  DISTANCE = 'distance',
  CREATED = 'createdAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GeoLocationFilter {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsNumber()
  distanceKm?: number = 50;

  @IsOptional()
  @IsString()
  address?: string;
}

export class BusinessSearchInput {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsArray()
  industries?: string[];

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsArray()
  locations?: string[];

  @IsOptional()
  geoLocation?: GeoLocationFilter;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minRevenue?: number;

  @IsOptional()
  @IsNumber()
  maxRevenue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minEmployees?: number;

  @IsOptional()
  @IsNumber()
  maxEmployees?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minHiring?: number;

  @IsOptional()
  @IsNumber()
  maxHiring?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  techStack?: string[];

  @IsOptional()
  @IsEnum(SortField)
  sortBy?: SortField = SortField.RELEVANCE;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsNumber()
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  take?: number = 20;

  @IsOptional()
  @IsString()
  fuzzyMatching?: string;
}
