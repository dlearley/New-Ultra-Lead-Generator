import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Alert, AlertRun } from '@/database/entities';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { AlertsProcessor } from './alerts.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert, AlertRun]),
    BullModule.registerQueue({
      name: 'alerts',
    }),
  ],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsProcessor],
  exports: [AlertsService],
})
export class AlertsModule {}
