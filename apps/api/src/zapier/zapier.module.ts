import { Module } from '@nestjs/common';
import { ZapierService } from './zapier.service';
import { ZapierController } from './zapier.controller';

@Module({
  controllers: [ZapierController],
  providers: [ZapierService],
  exports: [ZapierService],
})
export class ZapierModule {}
