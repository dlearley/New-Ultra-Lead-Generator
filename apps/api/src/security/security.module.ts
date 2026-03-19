import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';
import { IpWhitelistGuard } from './guards/ip-whitelist.guard';

@Module({
  controllers: [SecurityController],
  providers: [
    SecurityService,
    {
      provide: APP_GUARD,
      useClass: IpWhitelistGuard,
    },
  ],
  exports: [SecurityService],
})
export class SecurityModule {}
