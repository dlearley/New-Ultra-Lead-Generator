import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnboardingData, OrgICP } from '@/database/entities';
import { UpdateOrgICPDto, OnboardingDataResponseDto, CompleteOnboardingDto } from '@/common/dtos';

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(OnboardingData)
    private onboardingRepository: Repository<OnboardingData>,
  ) {}

  async getOrCreate(organizationId: string): Promise<OnboardingDataResponseDto> {
    let onboarding = await this.onboardingRepository.findOne({
      where: { organizationId },
    });

    if (!onboarding) {
      onboarding = this.onboardingRepository.create({
        organizationId,
        orgICP: {
          industries: [],
          geographies: [],
          dealSizes: [],
          personas: [],
        },
        isCompleted: false,
      });

      onboarding = await this.onboardingRepository.save(onboarding);
    }

    return this.toResponseDto(onboarding);
  }

  async get(organizationId: string): Promise<OnboardingDataResponseDto> {
    const onboarding = await this.onboardingRepository.findOne({
      where: { organizationId },
    });

    if (!onboarding) {
      throw new NotFoundException(`Onboarding data for organization ${organizationId} not found`);
    }

    return this.toResponseDto(onboarding);
  }

  async updateOrgICP(
    organizationId: string,
    updateDto: UpdateOrgICPDto,
  ): Promise<OnboardingDataResponseDto> {
    let onboarding = await this.onboardingRepository.findOne({
      where: { organizationId },
    });

    if (!onboarding) {
      return this.getOrCreate(organizationId);
    }

    const currentICP = onboarding.orgICP;
    const updatedICP: OrgICP = {
      industries: updateDto.industries ?? currentICP.industries,
      geographies: updateDto.geographies ?? currentICP.geographies,
      dealSizes: updateDto.dealSizes ?? currentICP.dealSizes,
      personas: updateDto.personas ?? currentICP.personas,
      aiScoring: currentICP.aiScoring,
    };

    // Recalculate AI scoring based on the updated ICP
    updatedICP.aiScoring = await this.calculateAIScoring(updatedICP);

    await this.onboardingRepository.update(
      { organizationId },
      { orgICP: updatedICP },
    );

    return this.get(organizationId);
  }

  async complete(
    organizationId: string,
    completeDto: CompleteOnboardingDto,
  ): Promise<OnboardingDataResponseDto> {
    let onboarding = await this.onboardingRepository.findOne({
      where: { organizationId },
    });

    if (!onboarding) {
      onboarding = this.onboardingRepository.create({
        organizationId,
        orgICP: completeDto.orgICP,
        isCompleted: true,
        completedAt: new Date(),
      });

      onboarding = await this.onboardingRepository.save(onboarding);
    } else {
      const orgICP = completeDto.orgICP;
      orgICP.aiScoring = await this.calculateAIScoring(orgICP);

      await this.onboardingRepository.update(
        { organizationId },
        {
          orgICP,
          isCompleted: true,
          completedAt: new Date(),
        },
      );
    }

    return this.get(organizationId);
  }

  private async calculateAIScoring(
    icp: OrgICP,
  ): Promise<{
    score: number;
    updatedAt: Date;
    factors: Record<string, number>;
  }> {
    // Mock AI scoring - in production, call an ML service
    const factors: Record<string, number> = {};

    // Score based on industry diversity
    factors.industryScore = Math.min(icp.industries.length * 10, 100);

    // Score based on geography coverage
    factors.geoScore = Math.min(icp.geographies.length * 15, 100);

    // Score based on deal size range
    factors.dealSizeScore = Math.min(icp.dealSizes.length * 20, 100);

    // Score based on persona specificity
    factors.personaScore = Math.min(icp.personas.length * 10, 100);

    // Calculate weighted average
    const totalScore = Object.values(factors).reduce((a, b) => a + b, 0) / Object.keys(factors).length;

    return {
      score: Math.round(totalScore),
      updatedAt: new Date(),
      factors,
    };
  }

  private toResponseDto(onboarding: OnboardingData): OnboardingDataResponseDto {
    return {
      id: onboarding.id,
      organizationId: onboarding.organizationId,
      orgICP: onboarding.orgICP,
      isCompleted: onboarding.isCompleted,
      completedAt: onboarding.completedAt,
      createdAt: onboarding.createdAt,
      updatedAt: onboarding.updatedAt,
    };
  }
}
