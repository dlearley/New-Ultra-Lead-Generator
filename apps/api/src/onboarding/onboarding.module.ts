import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './tours/onboarding.service';
import { HelpBubblesService } from './help/help-bubbles.service';

@Module({
  controllers: [OnboardingController],
  providers: [OnboardingService, HelpBubblesService],
  exports: [OnboardingService, HelpBubblesService],
})
export class OnboardingModule {}
