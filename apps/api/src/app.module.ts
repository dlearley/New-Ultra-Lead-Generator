import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AIModule } from './ai/ai.module';
import { PrismaService } from './services/prisma.service';

@Module({
  imports: [AuthModule, AIModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
