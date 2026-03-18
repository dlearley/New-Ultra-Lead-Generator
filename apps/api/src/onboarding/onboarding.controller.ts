import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OnboardingService } from './tours/onboarding.service';
import { HelpBubblesService } from './help/help-bubbles.service';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
  role?: string;
}

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly helpService: HelpBubblesService,
  ) {}

  // ============================================================
  // TOURS
  // ============================================================

  @Get('tours')
  async getAvailableTours(
    @CurrentUser() user: UserPayload,
  ) {
    return this.onboardingService.getAvailableTours(
      user.organizationId,
      user.userId,
      user.role || 'sales',
    );
  }

  @Get('tours/:id')
  async getTour(
    @Param('id') tourId: string,
  ) {
    return this.onboardingService.getTour(tourId);
  }

  @Post('tours/:id/start')
  async startTour(
    @Param('id') tourId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.onboardingService.startTour(
      user.organizationId,
      user.userId,
      tourId,
    );
  }

  @Post('tours/:id/progress')
  async updateProgress(
    @Param('id') tourId: string,
    @Body() dto: { step: number },
    @CurrentUser() user: UserPayload,
  ) {
    await this.onboardingService.updateTourProgress(
      user.organizationId,
      user.userId,
      tourId,
      dto.step,
    );
    return { success: true };
  }

  @Post('tours/:id/complete')
  async completeTour(
    @Param('id') tourId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.onboardingService.completeTour(
      user.organizationId,
      user.userId,
      tourId,
    );
    return { success: true };
  }

  @Post('tours/:id/skip')
  async skipTour(
    @Param('id') tourId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.onboardingService.skipTour(
      user.organizationId,
      user.userId,
      tourId,
    );
    return { success: true };
  }

  @Get('tours/triggers')
  async checkTriggers(
    @Query() query: { type: string; page?: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.onboardingService.checkTriggers(
      user.organizationId,
      user.userId,
      { type: query.type as any, page: query.page },
    );
  }

  @Get('tours/analytics')
  async getTourAnalytics(
    @CurrentUser() user: UserPayload,
  ) {
    return this.onboardingService.getTourAnalytics(user.organizationId);
  }

  // ============================================================
  // HELP BUBBLES
  // ============================================================

  @Get('help/bubbles')
  async getHelpBubbles(
    @Query('page') page: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.helpService.getHelpBubblesForPage(
      page || '/',
      user.role,
    );
  }

  @Get('help/bubbles/:id')
  async getHelpBubble(
    @Param('id') id: string,
  ) {
    return this.helpService.getHelpBubble(id);
  }

  @Get('help/contextual')
  async getContextualHelp(
    @Query() query: { page: string; section?: string },
  ) {
    return this.helpService.getContextualHelp(
      query.page,
      query.section,
    );
  }

  @Get('help/search')
  async searchHelp(
    @Query('q') query: string,
  ) {
    return this.helpService.searchHelp(query || '');
  }

  @Get('help/shortcuts')
  async getKeyboardShortcuts() {
    return this.helpService.getKeyboardShortcuts();
  }
}
