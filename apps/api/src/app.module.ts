import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AIModule } from './ai/ai.module';
import { SearchModule } from './search/search.module';
import { EnrichmentModule } from './enrichment/enrichment.module';
import { AdvancedSearchModule } from './advanced-search/advanced-search.module';
import { IntentModule } from './intent/intent.module';
import { BulkImportModule } from './bulk-import/bulk-import.module';
import { CaptureModule } from './capture/capture.module';
import { ScoringModule } from './scoring/scoring.module';
import { PrismaService } from './services/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    AIModule,
    SearchModule,
    EnrichmentModule,
    AdvancedSearchModule,
    IntentModule,
    BulkImportModule,
    CaptureModule,
    ScoringModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
