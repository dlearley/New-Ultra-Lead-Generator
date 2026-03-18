import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SequenceService } from './sequences/sequence.service';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
}

@Controller('outreach')
@UseGuards(JwtAuthGuard)
export class OutreachController {
  constructor(private readonly sequenceService: SequenceService) {}

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
}
