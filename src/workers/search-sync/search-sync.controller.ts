import { Controller, Get, Post, Query, Body, Param, Logger } from '@nestjs/common';
import { SearchSyncService } from './search-sync.service';
import { RebuildSearchIndexJobData, IncrementalSyncJobData } from './search-sync.dto';

@Controller('api/search-sync')
export class SearchSyncController {
  private readonly logger = new Logger(SearchSyncController.name);

  constructor(private searchSyncService: SearchSyncService) {}

  @Post('rebuild')
  async rebuildSearchIndex(@Body() jobData: RebuildSearchIndexJobData): Promise<any> {
    return this.searchSyncService.rebuildSearchIndex(jobData);
  }

  @Post('rebuild-tenant/:tenantId')
  async rebuildSearchIndexForTenant(
    @Param('tenantId') tenantId: string,
    @Query('organizationId') organizationId?: string,
  ): Promise<any> {
    return this.searchSyncService.rebuildSearchIndexForTenant(tenantId, organizationId);
  }

  @Post('rebuild-corpus')
  async rebuildEntireCorpus(
    @Query('batchSize') batchSize?: number,
  ): Promise<any> {
    return this.searchSyncService.rebuildEntireCorpus(batchSize);
  }

  @Post('sync')
  async syncIncremental(@Body() jobData: IncrementalSyncJobData): Promise<any> {
    return this.searchSyncService.syncIncrementalUpdate(jobData);
  }

  @Post('index/:businessId')
  async indexBusiness(
    @Param('businessId') businessId: string,
    @Query('tenantId') tenantId?: string,
    @Query('organizationId') organizationId?: string,
  ): Promise<any> {
    return this.searchSyncService.indexBusiness(businessId, tenantId, organizationId);
  }

  @Post('update/:businessId')
  async updateBusiness(
    @Param('businessId') businessId: string,
    @Query('tenantId') tenantId?: string,
    @Query('organizationId') organizationId?: string,
  ): Promise<any> {
    return this.searchSyncService.updateBusiness(businessId, tenantId, organizationId);
  }

  @Post('delete/:businessId')
  async deleteBusiness(
    @Param('businessId') businessId: string,
    @Query('tenantId') tenantId?: string,
    @Query('organizationId') organizationId?: string,
  ): Promise<any> {
    return this.searchSyncService.deleteBusiness(businessId, tenantId, organizationId);
  }

  @Get('job-status/:jobId')
  async getJobStatus(@Param('jobId') jobId: string): Promise<any> {
    return this.searchSyncService.getJobStatus(jobId);
  }

  @Get('stats')
  async getQueueStats(): Promise<any> {
    return this.searchSyncService.getQueueStats();
  }

  @Post('pause')
  async pauseQueue(): Promise<any> {
    await this.searchSyncService.pauseQueue();
    return { message: 'Queue paused successfully' };
  }

  @Post('resume')
  async resumeQueue(): Promise<any> {
    await this.searchSyncService.resumeQueue();
    return { message: 'Queue resumed successfully' };
  }

  @Post('clear')
  async clearQueue(): Promise<any> {
    await this.searchSyncService.clearQueue();
    return { message: 'Queue cleared successfully' };
  }
}
