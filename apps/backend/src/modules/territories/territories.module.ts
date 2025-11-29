import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Territory } from '@/database/entities';
import { TerritoriesService } from './territories.service';
import { TerritoriesController } from './territories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Territory])],
  controllers: [TerritoriesController],
  providers: [TerritoriesService],
  exports: [TerritoriesService],
})
export class TerritoriesModule {}
