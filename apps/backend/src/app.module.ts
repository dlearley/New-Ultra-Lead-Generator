import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import {
  Territory,
  Alert,
  AlertRun,
  OnboardingData,
  Organization,
  User,
} from '@/database/entities';
import { TerritoriesModule } from '@/modules/territories/territories.module';
import { AlertsModule } from '@/modules/alerts/alerts.module';
import { OnboardingModule } from '@/modules/onboarding/onboarding.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'map_alerts',
      entities: [Territory, Alert, AlertRun, OnboardingData, Organization, User],
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.DATABASE_LOGGING === 'true',
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    TerritoriesModule,
    AlertsModule,
    OnboardingModule,
  ],
})
export class AppModule {}
