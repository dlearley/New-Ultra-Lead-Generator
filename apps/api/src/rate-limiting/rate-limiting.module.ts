import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RateLimitingService } from './rate-limiting.service';
import { RateLimitingController } from './rate-limiting.controller';
import { CustomThrottlerGuard } from './custom-throttler.guard';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): ThrottlerModuleOptions => ({
        throttlers: [
          // Default: 100 requests per minute
          {
            name: 'default',
            ttl: 60000, // 1 minute
            limit: config.get('RATE_LIMIT_DEFAULT', 100),
          },
          // Short burst: 20 requests per 10 seconds
          {
            name: 'short',
            ttl: 10000, // 10 seconds
            limit: config.get('RATE_LIMIT_SHORT', 20),
          },
          // Long window: 1000 requests per hour
          {
            name: 'hourly',
            ttl: 3600000, // 1 hour
            limit: config.get('RATE_LIMIT_HOURLY', 1000),
          },
        ],
      }),
    }),
  ],
  controllers: [RateLimitingController],
  providers: [
    RateLimitingService,
    CustomThrottlerGuard,
  ],
  exports: [RateLimitingService, CustomThrottlerGuard],
})
export class RateLimitingModule {}
