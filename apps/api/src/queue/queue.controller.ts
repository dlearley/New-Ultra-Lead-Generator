import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { QueueService } from './queue.service';

interface UserPayload {
  userId: string;
  email: string;
  organizationId: string;
  role?: string;
}

@Controller('queue')
@UseGuards(JwtAuthGuard)
export class QueueController {
  constructor(private readonly queue: QueueService) {}

  @Get('stats')
  async getQueueStats(@CurrentUser() user: UserPayload) {
    // Only admins can see global stats
    return this.queue.getQueueStats(user.organizationId);
  }

  @Get('jobs')
  async getOrganizationJobs(
    @CurrentUser() user: UserPayload,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.queue.getOrganizationJobs(
      user.organizationId,
      status,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('jobs/:queueName/:jobId')
  async getJobStatus(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ) {
    return this.queue.getJobStatus(queueName, jobId);
  }

  @Post('bulk/import-contacts')
  async bulkImportContacts(
    @CurrentUser() user: UserPayload,
    @Body() data: { contacts: any[] },
  ) {
    return this.queue.bulkImportContacts(
      user.organizationId,
      user.userId,
      data.contacts,
    );
  }

  @Post('bulk/update-contacts')
  async bulkUpdateContacts(
    @CurrentUser() user: UserPayload,
    @Body() data: { contactIds: string[]; updateData: any },
  ) {
    return this.queue.bulkUpdateContacts(
      user.organizationId,
      user.userId,
      data.contactIds,
      data.updateData,
    );
  }

  @Post('bulk/enrich')
  async bulkEnrichContacts(
    @CurrentUser() user: UserPayload,
    @Body() data: { contactIds: string[] },
  ) {
    return this.queue.bulkEnrichContacts(
      user.organizationId,
      user.userId,
      data.contactIds,
    );
  }
}
