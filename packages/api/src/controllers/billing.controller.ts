import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  Res,
  HttpCode,
} from '@nestjs/common';
import { Response } from 'express';
import { BillingService } from '../services/billing.service';
import {
  CreateBillingDto,
  UpdateBillingDto,
  BillingSearchDto,
  BillingExportDto,
  BillingResponseDto,
} from '../dtos/billing.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RbacGuard } from '../guards/rbac.guard';
import { GetUser } from '../decorators/get-user.decorator';
import { RequirePermission } from '../decorators/require-permission.decorator';

@Controller('admin/billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Post()
  @UseGuards(RbacGuard)
  @RequirePermission('billing:create')
  @HttpCode(201)
  async createBilling(
    @Body() dto: CreateBillingDto,
    @GetUser() user: any,
  ): Promise<BillingResponseDto> {
    return this.billingService.createBilling(dto, user?.id);
  }

  @Get(':organizationId')
  @UseGuards(RbacGuard)
  @RequirePermission('billing:read')
  async getBilling(@Param('organizationId') organizationId: string): Promise<BillingResponseDto> {
    return this.billingService.getBillingByOrganization(organizationId);
  }

  @Put(':organizationId')
  @UseGuards(RbacGuard)
  @RequirePermission('billing:update')
  async updateBilling(
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdateBillingDto,
    @GetUser() user: any,
  ): Promise<BillingResponseDto> {
    return this.billingService.updateBilling(organizationId, dto, user?.id);
  }

  @Get(':organizationId/status')
  @UseGuards(RbacGuard)
  @RequirePermission('billing:read')
  async getBillingStatus(
    @Param('organizationId') organizationId: string,
  ): Promise<{ status: string; plan: string }> {
    const billing = await this.billingService.getBillingByOrganization(organizationId);
    return {
      status: billing.status,
      plan: billing.plan,
    };
  }

  @Post('search')
  @UseGuards(RbacGuard)
  @RequirePermission('billing:search')
  async searchBillings(@Body() criteria: BillingSearchDto) {
    return this.billingService.searchBillings(criteria);
  }

  @Post('export')
  @UseGuards(RbacGuard)
  @RequirePermission('billing:export')
  async exportBillings(
    @Body() dto: BillingExportDto,
    @Res() res: Response,
  ): Promise<void> {
    const format = dto.format || 'json';
    const data = await this.billingService.exportBillingData([], format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="billing-export.csv"');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="billing-export.json"');
    }

    res.send(data);
  }

  @Get()
  @UseGuards(RbacGuard)
  @RequirePermission('billing:search')
  async getAllBillings(@Query() criteria: BillingSearchDto) {
    return this.billingService.searchBillings(criteria);
  }

  @Get('alerts/near-limit')
  @UseGuards(RbacGuard)
  @RequirePermission('billing:read')
  async getOrganizationsNearLimit() {
    return this.billingService.getOrganizationsNearLimit(0.8);
  }
}
