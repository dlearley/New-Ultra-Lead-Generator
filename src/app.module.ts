import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { SearchModule } from './api/search/search.module';
import { SavedSearchModule } from './api/saved-search/saved-search.module';
import { DatabaseModule } from '@database/database.module';
import { SearchSyncModule } from './workers/search-sync/search-sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    SearchModule,
    SavedSearchModule,
    SearchSyncModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
