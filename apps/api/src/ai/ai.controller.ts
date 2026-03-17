// apps/api/src/ai/ai.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AIService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GenerateOutreachDto, OutreachResponseDto } from './dto/outreach.dto';
import { GenerateSummaryDto, SummaryResponseDto } from './dto/summary.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Post('outreach')
  @HttpCode(HttpStatus.OK)
  async generateOutreach(
    @Body() dto: GenerateOutreachDto,
  ): Promise<OutreachResponseDto> {
    return this.aiService.generateOutreach(dto);
  }

  @Post('summary')
  @HttpCode(HttpStatus.OK)
  async generateSummary(
    @Body() dto: GenerateSummaryDto,
  ): Promise<SummaryResponseDto> {
    return this.aiService.generateSummary(dto);
  }

  @Post('outreach/email')
  @HttpCode(HttpStatus.OK)
  async generateEmail(
    @Body() dto: Omit<GenerateOutreachDto, 'type'>,
  ): Promise<OutreachResponseDto> {
    return this.aiService.generateOutreach({
      ...dto,
      type: 'email' as any,
    });
  }

  @Post('outreach/linkedin')
  @HttpCode(HttpStatus.OK)
  async generateLinkedIn(
    @Body() dto: Omit<GenerateOutreachDto, 'type'>,
  ): Promise<OutreachResponseDto> {
    return this.aiService.generateOutreach({
      ...dto,
      type: 'linkedin' as any,
    });
  }
}
