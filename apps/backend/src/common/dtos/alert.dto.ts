import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsUUID,
  IsObject,
} from 'class-validator';
import { AlertCadence, DeliveryChannel, SavedSearchConfig } from '@/database/entities';

export class CreateAlertDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  territoryId: string;

  @IsObject()
  savedSearch: SavedSearchConfig;

  @IsEnum(AlertCadence)
  cadence: AlertCadence;

  @IsArray()
  @IsEnum(DeliveryChannel, { each: true })
  deliveryChannels: DeliveryChannel[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];
}

export class UpdateAlertDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  savedSearch?: SavedSearchConfig;

  @IsEnum(AlertCadence)
  @IsOptional()
  cadence?: AlertCadence;

  @IsOptional()
  @IsArray()
  @IsEnum(DeliveryChannel, { each: true })
  deliveryChannels?: DeliveryChannel[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];
}

export class AlertResponseDto {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  territoryId: string;
  savedSearch: SavedSearchConfig;
  cadence: AlertCadence;
  deliveryChannels: DeliveryChannel[];
  recipients?: string[];
  isActive: boolean;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class AlertRunResponseDto {
  id: string;
  alertId: string;
  status: string;
  newLeadsCount: number;
  queueJobId?: string;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}
