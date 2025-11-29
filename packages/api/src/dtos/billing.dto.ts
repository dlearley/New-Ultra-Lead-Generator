import { IsEnum, IsString, IsNumber, IsOptional, IsUUID, IsDate } from 'class-validator';
import { BillingStatus, BillingPlan } from '../entities/billing.entity';

export class CreateBillingDto {
  @IsUUID()
  organizationId: string;

  @IsEnum(BillingStatus)
  status: BillingStatus;

  @IsEnum(BillingPlan)
  plan: BillingPlan;

  @IsString()
  @IsOptional()
  stripeCustomerId?: string;

  @IsNumber()
  @IsOptional()
  monthlySpend?: number;

  @IsNumber()
  @IsOptional()
  apiCallsLimit?: number;
}

export class UpdateBillingDto {
  @IsEnum(BillingStatus)
  @IsOptional()
  status?: BillingStatus;

  @IsEnum(BillingPlan)
  @IsOptional()
  plan?: BillingPlan;

  @IsNumber()
  @IsOptional()
  monthlySpend?: number;

  @IsNumber()
  @IsOptional()
  apiCallsUsed?: number;

  @IsNumber()
  @IsOptional()
  apiCallsLimit?: number;

  @IsNumber()
  @IsOptional()
  usersCount?: number;

  @IsNumber()
  @IsOptional()
  projectsCount?: number;
}

export class BillingResponseDto {
  id: string;
  organizationId: string;
  status: BillingStatus;
  plan: BillingPlan;
  stripeCustomerId: string;
  monthlySpend: number;
  apiCallsUsed: number;
  apiCallsLimit: number;
  usersCount: number;
  projectsCount: number;
  createdAt: Date;
  updatedAt: Date;
  trialEndsAt?: Date;
  billingCycleStartDate?: Date;
  billingCycleEndDate?: Date;
}

export class BillingSearchDto {
  @IsOptional()
  @IsEnum(BillingStatus)
  status?: BillingStatus;

  @IsOptional()
  @IsEnum(BillingPlan)
  plan?: BillingPlan;

  @IsOptional()
  @IsNumber()
  minMonthlySpend?: number;

  @IsOptional()
  @IsNumber()
  maxMonthlySpend?: number;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class BillingExportDto {
  @IsOptional()
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsEnum(BillingStatus)
  status?: BillingStatus;

  @IsOptional()
  format?: 'csv' | 'json' | 'xlsx';
}
