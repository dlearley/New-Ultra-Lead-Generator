import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
  Ip,
} from '@nestjs/common';
import { LeadCaptureService } from './capture.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateLeadFormDto,
  UpdateLeadFormDto,
  SubmitFormDto,
  CreateLandingPageDto,
  UpdateLandingPageDto,
  TrackVisitorDto,
  IdentifyVisitorDto,
  CreateLeadMagnetDto,
  UpdateLeadMagnetDto,
} from './dto/capture.dto';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
}

@Controller('capture')
export class LeadCaptureController {
  constructor(private readonly captureService: LeadCaptureService) {}

  // ============================================================================
  // LEAD FORMS
  // ============================================================================

  @Post('forms')
  @UseGuards(JwtAuthGuard)
  async createLeadForm(
    @Body() dto: CreateLeadFormDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.captureService.createLeadForm(user.organizationId, dto);
  }

  @Get('forms')
  @UseGuards(JwtAuthGuard)
  async getLeadForms(
    @Query('status') status: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('offset') offset: string | undefined,
    @CurrentUser() user: UserPayload,
  ) {
    return this.captureService.getLeadForms(user.organizationId, {
      status,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('forms/:id')
  @UseGuards(JwtAuthGuard)
  async getLeadForm(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.captureService.getLeadForm(user.organizationId, id);
  }

  @Put('forms/:id')
  @UseGuards(JwtAuthGuard)
  async updateLeadForm(
    @Param('id') id: string,
    @Body() dto: UpdateLeadFormDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.captureService.updateLeadForm(user.organizationId, id, dto);
  }

  @Delete('forms/:id')
  @UseGuards(JwtAuthGuard)
  async deleteLeadForm(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.captureService.deleteLeadForm(user.organizationId, id);
  }

  @Get('forms/:id/submissions')
  @UseGuards(JwtAuthGuard)
  async getFormSubmissions(
    @Param('id') id: string,
    @Query('limit') limit: string | undefined,
    @Query('offset') offset: string | undefined,
    @CurrentUser() user: UserPayload,
  ) {
    return this.captureService.getFormSubmissions(user.organizationId, id, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('forms/:id/analytics')
  @UseGuards(JwtAuthGuard)
  async getFormAnalytics(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.captureService.getFormAnalytics(user.organizationId, id);
  }

  // ============================================================================
  // PUBLIC FORM SUBMISSION
  // ============================================================================

  @Post('public/forms/:id/submit')
  async submitForm(
    @Param('id') formId: string,
    @Body() dto: SubmitFormDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.captureService.submitForm(formId, {
      ...dto,
      pageUrl: dto.pageUrl || '',
    });
  }

  // ============================================================================
  // LANDING PAGES
  // ============================================================================

  @Post('landing-pages')
  @UseGuards(JwtAuthGuard)
  async createLandingPage(
    @Body() dto: CreateLandingPageDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.captureService.createLandingPage(user.organizationId, dto);
  }

  @Get('landing-pages')
  @UseGuards(JwtAuthGuard)
  async getLandingPages(
    @Query('status') status: string | undefined,
    @CurrentUser() user: UserPayload,
  ) {
    return this.captureService.getLandingPages(user.organizationId, { status });
  }

  @Get('landing-pages/:id')
  @UseGuards(JwtAuthGuard)
  async getLandingPage(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    // This would need a separate method to get by ID
    return { id };
  }

  // ============================================================================
  // PUBLIC LANDING PAGE
  // ============================================================================

  @Get('public/pages/:slug')
  async getPublicLandingPage(@Param('slug') slug: string) {
    return this.captureService.getLandingPageBySlug(slug);
  }

  // ============================================================================
  // WEBSITE VISITORS
  // ============================================================================

  @Post('visitors/track')
  async trackVisitor(
    @Body() dto: TrackVisitorDto,
    @Headers('x-organization-id') organizationId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.captureService.trackVisitor(organizationId, {
      ...dto,
      ipAddress: ip,
      userAgent,
    });
  }

  @Post('visitors/identify')
  async identifyVisitor(
    @Body() dto: IdentifyVisitorDto,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return this.captureService.identifyVisitor(organizationId, dto);
  }

  @Get('visitors')
  @UseGuards(JwtAuthGuard)
  async getVisitors(
    @Query('limit') limit: string | undefined,
    @Query('offset') offset: string | undefined,
    @Query('identified') identified: string | undefined,
    @CurrentUser() user: UserPayload,
  ) {
    return this.captureService.getVisitors(user.organizationId, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      identified: identified ? identified === 'true' : undefined,
    });
  }

  // ============================================================================
  // LEAD MAGNETS
  // ============================================================================

  @Post('lead-magnets')
  @UseGuards(JwtAuthGuard)
  async createLeadMagnet(
    @Body() dto: CreateLeadMagnetDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.captureService.createLeadMagnet(user.organizationId, dto);
  }

  @Get('lead-magnets')
  @UseGuards(JwtAuthGuard)
  async getLeadMagnets(@CurrentUser() user: UserPayload) {
    // Would need to implement get all method
    return [];
  }

  @Get('lead-magnets/:id')
  @UseGuards(JwtAuthGuard)
  async getLeadMagnet(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.captureService.getLeadMagnet(user.organizationId, id);
  }

  @Post('lead-magnets/:id/download')
  async downloadLeadMagnet(@Param('id') id: string) {
    await this.captureService.recordLeadMagnetDownload(id);
    return { success: true };
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  @Get('analytics/conversions')
  @UseGuards(JwtAuthGuard)
  async getConversionDashboard(
    @Query('days') days: string | undefined,
    @CurrentUser() user: UserPayload,
  ) {
    return this.captureService.getConversionDashboard(
      user.organizationId,
      days ? parseInt(days) : undefined,
    );
  }
}
