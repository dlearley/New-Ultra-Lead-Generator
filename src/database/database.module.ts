import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Business } from './entities/business.entity';
import { SavedSearch } from './entities/saved-search.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USER', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', 'password'),
        database: configService.get('DATABASE_NAME', 'engine_labs'),
        entities: [Business, SavedSearch],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('DATABASE_LOGGING', false),
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Business, SavedSearch]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
