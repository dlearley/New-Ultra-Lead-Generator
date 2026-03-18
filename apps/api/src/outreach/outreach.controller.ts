import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SequenceService } from './sequences/sequence.service';
import { AIEmailWriterService } from './ai/ai-email-writer.service';
import { LinkedInService } from './channels/linkedin.service';
import { ABTestingService } from './ab-testing/ab-testing.service';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
}

@Controller('outreach')
@UseGuards(JwtAuthGuard)
export class OutreachController {
  constructor(
    private readonly sequenceService: SequenceService,
    private readonly aiEmailWriter: AIEmailWriterService,
    private readonly linkedInService: LinkedInService,
    private readonly abTestingService: ABTestingService,
  ) {}

  // ============================================================
  // SEQUENCES
  // ============================================================

  @Post('sequences')
  async createSequence(
    @Body() dto: any,
    @CurrentUser() user: UserPayload,
  ) {
    return this.sequenceService.createSequence(user.organizationId, dto);
  }

  @Get('sequences')
  async getSequences(
    @Query('status') status: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.sequenceService.getSequences(user.organizationId, status);
  }

  @Get('sequences/:id')
  async getSequence(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.sequenceService.getSequence(user.organizationId, id);
  }

  @Put('sequences/:id')
  async updateSequence(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: UserPayload,
  ) {
    return this.sequenceService.updateSequence(user.organizationId, id, dto);
  }

  @Delete('sequences/:id')
  async deleteSequence(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.sequenceService.deleteSequence(user.organizationId, id);
    return { success: true };
  }

  @Post('sequences/:id/activate')
  async activateSequence(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.sequenceService.activateSequence(user.organizationId, id);
  }

  @Post('sequences/:id/pause')
  async pauseSequence(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.sequenceService.pauseSequence(user.organizationId, id);
  }

  @Post('sequences/:id/enroll')
  async enrollContacts(
    @Param('id') sequenceId: string,
    @Body() dto: { contactIds: string[]; assignedToId?: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.sequenceService.enrollContacts(
      user.organizationId,
      sequenceId,
      dto.contactIds,
      dto.assignedToId,
    );
  }

  @Post('sequences/:id/unenroll/:contactId')
  async unenrollContact(
    @Param('id') sequenceId: string,
    @Param('contactId') contactId: string,
    @Body() dto: { reason?: string },
    @CurrentUser() user: UserPayload,
  ) {
    await this.sequenceService.unenrollContact(
      user.organizationId,
      sequenceId,
      contactId,
      dto.reason,
    );
    return { success: true };
  }

  @Get('sequences/:id/stats')
  async getSequenceStats(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.sequenceService.getSequenceStats(user.organizationId, id);
  }

  // ============================================================
  // TEMPLATES
  // ============================================================

  @Post('templates')
  async createTemplate(
    @Body() dto: any,
    @CurrentUser() user: UserPayload,
  ) {
    return this.sequenceService.createTemplate(user.organizationId, dto);
  }

  @Get('templates')
  async getTemplates(
    @Query('channel') channel: string,
    @Query('category') category: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.sequenceService.getTemplates(user.organizationId, { channel, category });
  }

  // ============================================================
  // PERSONALIZATION
  // ============================================================

  @Post('personalize')
  async personalizeContent(
    @Body() dto: { content: string; contactId: string },
    @CurrentUser() user: UserPayload,
  ) {
    const contact = await this.sequenceService['prisma'].contact.findFirst({
      where: { id: dto.contactId, organizationId: user.organizationId },
      include: { company: true },
    });

    if (!contact) {
      return { error: 'Contact not found' };
    }

    return {
      original: dto.content,
      personalized: this.sequenceService.personalizeContent(
        dto.content,
        contact,
        contact.company,
      ),
    };
  }

  // ============================================================
  // AI EMAIL WRITER
  // ============================================================

  @Post('ai/generate-email')
  async generateAIEmail(
    @Body() dto: {
      purpose: 'intro' | 'follow_up' | 'breakup' | 'meeting_request' | 'value_proposition';
      contactId: string;
      tone?: 'professional' | 'casual' | 'friendly' | 'formal' | 'enthusiastic';
      length?: 'short' | 'medium' | 'long';
      customInstructions?: string;
    },
    @CurrentUser() user: UserPayload,
  ) {
    const contact = await this.sequenceService['prisma'].contact.findFirst({
      where: { id: dto.contactId, organizationId: user.organizationId },
      include: { company: true },
    });

    if (!contact) {
      return { error: 'Contact not found' };
    }

    return this.aiEmailWriter.generateEmail({
      purpose: dto.purpose,
      contact: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        jobTitle: contact.jobTitle,
        company: contact.company?.name,
      },
      company: contact.company ? {
        name: contact.company.name,
        industry: contact.company.industry,
        size: contact.company.employeeCount?.toString(),
      } : undefined,
      tone: dto.tone,
      length: dto.length,
      customInstructions: dto.customInstructions,
    });
  }

  @Post('ai/suggest-subjects')
  async suggestSubjectLines(
    @Body() dto: {
      purpose: string;
      company?: string;
      industry?: string;
      count?: number;
    },
    @CurrentUser() user: UserPayload,
  ) {
    return this.aiEmailWriter.suggestSubjectLines(
      {
        purpose: dto.purpose,
        company: dto.company,
        industry: dto.industry,
      },
      dto.count || 5,
    );
  }

  @Post('ai/score-subject')
  async scoreSubjectLine(
    @Body() dto: { subject: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.aiEmailWriter.scoreSubjectLine(dto.subject);
  }

  @Post('ai/personalization-suggestions')
  async getPersonalizationSuggestions(
    @Body() dto: { contactId: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.aiEmailWriter.getPersonalizationSuggestions(dto.contactId);
  }

  @Post('ai/generate-variants')
  async generateVariants(
    @Body() dto: {
      baseEmail: string;
      variants: ('subject' | 'opening' | 'cta' | 'tone')[];
    },
    @CurrentUser() user: UserPayload,
  ) {
    return this.aiEmailWriter.generateVariants(dto.baseEmail, dto.variants);
  }

  // ============================================================
  // LINKEDIN
  // ============================================================

  @Post('linkedin/generate-message')
  async generateLinkedInMessage(
    @Body() dto: {
      contactId: string;
      connectionDegree: 1 | 2 | 3;
      messageType: 'connection_request' | 'message' | 'inmail';
      purpose: 'intro' | 'follow_up' | 'value_share' | 'meeting_request';
      context?: any;
    },
    @CurrentUser() user: UserPayload,
  ) {
    return this.linkedInService.generateMessage({
      contactId: dto.contactId,
      connectionDegree: dto.connectionDegree,
      messageType: dto.messageType,
      purpose: dto.purpose,
      context: dto.context,
    });
  }

  @Get('linkedin/sequence-steps')
  async getLinkedInSequenceSteps(
    @CurrentUser() user: UserPayload,
  ) {
    return this.linkedInService.getLinkedInSequenceSteps();
  }

  @Post('linkedin/enrich-profile')
  async enrichLinkedInProfile(
    @Body() dto: { contactId: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.linkedInService.enrichFromLinkedIn(dto.contactId);
  }

  @Post('linkedin/voice-note-script')
  async generateVoiceNoteScript(
    @Body() dto: { contactId: string; purpose: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.linkedInService.generateVoiceNoteScript(dto.contactId, dto.purpose);
  }

  // ============================================================
  // A/B TESTING
  // ============================================================

  @Post('ab-test/create')
  async createABTest(
    @Body() dto: {
      sequenceId: string;
      stepId: string;
      variants: any[];
      sampleSize?: number;
      duration?: number;
    },
    @CurrentUser() user: UserPayload,
  ) {
    return this.abTestingService.createABTest(
      user.organizationId,
      dto.sequenceId,
      dto.stepId,
      dto.variants,
      dto.sampleSize,
      dto.duration,
    );
  }

  @Get('sequences/:id/ab-test-results')
  async getABTestResults(
    @Param('id') sequenceId: string,
    @Query('stepId') stepId: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.abTestingService.getTestResults(
      user.organizationId,
      sequenceId,
      stepId,
    );
  }

  @Post('ab-test/winner')
  async determineWinner(
    @Body() dto: {
      sequenceId: string;
      criteria?: 'open_rate' | 'click_rate' | 'reply_rate';
    },
    @CurrentUser() user: UserPayload,
  ) {
    return this.abTestingService.determineWinner(
      user.organizationId,
      dto.sequenceId,
      dto.criteria || 'reply_rate',
    );
  }

  @Post('ab-test/auto-optimize')
  async autoOptimize(
    @Body() dto: { sequenceId: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.abTestingService.autoOptimize(
      user.organizationId,
      dto.sequenceId,
    );
  }

  @Get('ab-test/recommendations')
  async getTestRecommendations(
    @CurrentUser() user: UserPayload,
  ) {
    return this.abTestingService.getTestRecommendations(user.organizationId);
  }
}
