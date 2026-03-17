// apps/api/src/ai/dto/outreach.dto.ts
import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';

export enum OutreachType {
  EMAIL = 'email',
  LINKEDIN = 'linkedin',
  SMS = 'sms',
}

export class GenerateOutreachDto {
  @IsEnum(OutreachType)
  type: OutreachType;

  @IsString()
  leadName: string;

  @IsString()
  leadCompany: string;

  @IsString()
  @IsOptional()
  leadTitle?: string;

  @IsString()
  @IsOptional()
  productName?: string;

  @IsString()
  @IsOptional()
  valueProposition?: string;

  @IsString()
  @IsOptional()
  tone?: 'professional' | 'casual' | 'friendly' = 'professional';

  @IsObject()
  @IsOptional()
  additionalContext?: Record<string, string>;
}

export class OutreachResponseDto {
  subject: string;
  body: string;
  type: OutreachType;
  metadata?: {
    tone: string;
    wordCount: number;
    estimatedReadTime: string;
  };
}
