import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { UpdateOrgICPDto, OnboardingDataResponseDto, CompleteOnboardingDto } from '@/common/dtos';

class AuthGuard {
  canActivate(context: any): boolean {
    return true;
  }
}

@Controller('api/onboarding')
@UseGuards(AuthGuard)
export class OnboardingController {
  constructor(private onboardingService: OnboardingService) {}

  @Get()
  async get(@Req() req: any): Promise<OnboardingDataResponseDto> {
    const organizationId = req.organizationId || 'default-org';
    return this.onboardingService.getOrCreate(organizationId);
  }

  @Put('icp')
  async updateOrgICP(
    @Req() req: any,
    @Body() updateDto: UpdateOrgICPDto,
  ): Promise<OnboardingDataResponseDto> {
    const organizationId = req.organizationId || 'default-org';
    return this.onboardingService.updateOrgICP(organizationId, updateDto);
  }

  @Post('complete')
  async complete(
    @Req() req: any,
    @Body() completeDto: CompleteOnboardingDto,
  ): Promise<OnboardingDataResponseDto> {
    const organizationId = req.organizationId || 'default-org';
    return this.onboardingService.complete(organizationId, completeDto);
  }
}
