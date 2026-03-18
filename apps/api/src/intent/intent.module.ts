import { Module } from '@nestjs/common';
import { IntentMonitoringService } from './intent-monitoring.service';
import { IntentController } from './intent.controller';
import { IntentWebhookController } from './webhooks/intent-webhook.controller';

@Module({
  providers: [IntentMonitoringService],
  controllers: [IntentController, IntentWebhookController],
  exports: [IntentMonitoringService],
})
export class IntentModule {}
