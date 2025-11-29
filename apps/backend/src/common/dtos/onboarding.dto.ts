import { IsArray, IsOptional, IsObject, IsString } from 'class-validator';
import { OrgICP } from '@/database/entities';

export class UpdateOrgICPDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industries?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  geographies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dealSizes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  personas?: string[];
}

export class OnboardingDataResponseDto {
  id: string;
  organizationId: string;
  orgICP: OrgICP;
  isCompleted: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class CompleteOnboardingDto {
  @IsObject()
  orgICP: OrgICP;
}
