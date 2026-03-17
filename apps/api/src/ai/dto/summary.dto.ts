// apps/api/src/ai/dto/summary.dto.ts
import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';

export enum SummaryType {
  BUSINESS = 'business',
  LEAD = 'lead',
  CONVERSATION = 'conversation',
  RESEARCH = 'research',
}

export class GenerateSummaryDto {
  @IsEnum(SummaryType)
  type: SummaryType;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  maxLength?: string = 'medium'; // short, medium, long

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keyPoints?: string[];

  @IsString()
  @IsOptional()
  focus?: string; // What to focus on in the summary
}

export class SummaryResponseDto {
  summary: string;
  type: SummaryType;
  keyPoints: string[];
  metadata?: {
    originalLength: number;
    summaryLength: number;
    compressionRatio: string;
  };
}
