import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SearchModule } from './api/search/search.module';
import { SavedSearchModule } from './api/saved-search/saved-search.module';
import { DatabaseModule } from '@database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    SearchModule,
    SavedSearchModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
