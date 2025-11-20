import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingEntity } from './entities/billing.entity';
import { UsageMetricEntity } from './entities/usage.entity';
import { AuditLogEntity } from './entities/audit-log.entity';
import { AiModelEntity } from './entities/ai-model.entity';
import { BillingController } from './controllers/billing.controller';
import { AuditLogController } from './controllers/audit-log.controller';
import { AiModelController } from './controllers/ai-model.controller';
import { BillingService } from './services/billing.service';
import { AuditLogService } from './services/audit-log.service';
import { AiModelService } from './services/ai-model.service';
import { UsageService } from './services/usage.service';
import { StripeService } from './services/stripe.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'admin_billing',
      entities: [BillingEntity, UsageMetricEntity, AuditLogEntity, AiModelEntity],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    TypeOrmModule.forFeature([
      BillingEntity,
      UsageMetricEntity,
      AuditLogEntity,
      AiModelEntity,
    ]),
  ],
  controllers: [BillingController, AuditLogController, AiModelController],
  providers: [BillingService, AuditLogService, AiModelService, UsageService, StripeService],
})
export class AppModule {}
