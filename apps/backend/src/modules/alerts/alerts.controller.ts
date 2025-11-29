import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateAlertDto, UpdateAlertDto, AlertResponseDto, AlertRunResponseDto } from '@/common/dtos';

class AuthGuard {
  canActivate(context: any): boolean {
    return true;
  }
}

@Controller('api/alerts')
@UseGuards(AuthGuard)
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  @Post()
  async create(
    @Req() req: any,
    @Body() createAlertDto: CreateAlertDto,
  ): Promise<AlertResponseDto> {
    const organizationId = req.organizationId || 'default-org';
    return this.alertsService.create(organizationId, createAlertDto);
  }

  @Get()
  async findAll(@Req() req: any): Promise<AlertResponseDto[]> {
    const organizationId = req.organizationId || 'default-org';
    return this.alertsService.findAll(organizationId);
  }

  @Get(':id')
  async findOne(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<AlertResponseDto> {
    const organizationId = req.organizationId || 'default-org';
    return this.alertsService.findOne(id, organizationId);
  }

  @Put(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateAlertDto: UpdateAlertDto,
  ): Promise<AlertResponseDto> {
    const organizationId = req.organizationId || 'default-org';
    return this.alertsService.update(id, organizationId, updateAlertDto);
  }

  @Delete(':id')
  async delete(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    const organizationId = req.organizationId || 'default-org';
    await this.alertsService.delete(id, organizationId);
    return { message: 'Alert deleted successfully' };
  }

  @Post(':id/trigger')
  async trigger(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<AlertRunResponseDto> {
    const organizationId = req.organizationId || 'default-org';
    return this.alertsService.triggerAlert(id, organizationId);
  }

  @Get(':id/runs')
  async getRuns(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<AlertRunResponseDto[]> {
    const organizationId = req.organizationId || 'default-org';
    return this.alertsService.getRuns(id, organizationId);
  }

  @Get(':alertId/runs/:runId')
  async getRunStatus(
    @Req() req: any,
    @Param('alertId') alertId: string,
    @Param('runId') runId: string,
  ): Promise<AlertRunResponseDto> {
    const organizationId = req.organizationId || 'default-org';
    return this.alertsService.getRunStatus(alertId, runId, organizationId);
  }
}
