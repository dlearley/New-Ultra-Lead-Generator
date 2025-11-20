import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
  HttpCode,
} from '@nestjs/common';
import { Response } from 'express';
import { AuditLogService } from '../services/audit-log.service';
import {
  AuditLogSearchDto,
  AuditLogExportDto,
  AuditLogResponseDto,
} from '../dtos/audit-log.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RbacGuard } from '../guards/rbac.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { GetUser } from '../decorators/get-user.decorator';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogController {
  constructor(private auditLogService: AuditLogService) {}

  @Post('search')
  @UseGuards(RbacGuard)
  @RequirePermission('audit:search')
  @HttpCode(200)
  async searchLogs(@Body() criteria: AuditLogSearchDto) {
    return this.auditLogService.searchLogs(criteria);
  }

  @Get('organization/:organizationId')
  @UseGuards(RbacGuard)
  @RequirePermission('audit:read')
  async getOrganizationLogs(
    @Param('organizationId') organizationId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    return this.auditLogService.getLogsByOrganization(organizationId, parsedLimit, parsedOffset);
  }

  @Get('user/:organizationId/:userId')
  @UseGuards(RbacGuard)
  @RequirePermission('audit:read')
  async getUserLogs(
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.auditLogService.getLogsByUser(organizationId, userId, parsedLimit);
  }

  @Get('action/:organizationId/:action')
  @UseGuards(RbacGuard)
  @RequirePermission('audit:read')
  async getLogsByAction(
    @Param('organizationId') organizationId: string,
    @Param('action') action: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.auditLogService.getLogsByAction(organizationId, action as any, parsedLimit);
  }

  @Post('export')
  @UseGuards(RbacGuard)
  @RequirePermission('audit:export')
  async exportLogs(
    @Body() dto: AuditLogExportDto,
    @Res() res: Response,
  ): Promise<void> {
    const format = dto.format || 'json';
    const data = await this.auditLogService.exportLogs(
      dto.organizationId,
      {
        startDate: dto.startDate,
        endDate: dto.endDate,
        action: dto.action,
      },
      format,
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs-export.csv"');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-logs-export.json"');
    }

    res.send(data);
  }

  @Get('stats/:organizationId')
  @UseGuards(RbacGuard)
  @RequirePermission('audit:read')
  async getAuditStats(@Param('organizationId') organizationId: string) {
    return this.auditLogService.getAuditStats(organizationId);
  }
}
