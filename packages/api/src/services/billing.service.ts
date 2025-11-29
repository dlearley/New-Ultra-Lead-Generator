import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingEntity, BillingStatus } from '../entities/billing.entity';
import { CreateBillingDto, UpdateBillingDto, BillingSearchDto } from '../dtos/billing.dto';
import { AuditLogService } from './audit-log.service';
import { AuditAction, AuditResourceType } from '../entities/audit-log.entity';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(BillingEntity)
    private billingRepository: Repository<BillingEntity>,
    private auditLogService: AuditLogService,
  ) {}

  async createBilling(dto: CreateBillingDto, userId?: string): Promise<BillingEntity> {
    const existingBilling = await this.billingRepository.findOne({
      where: { organizationId: dto.organizationId },
    });

    if (existingBilling) {
      throw new BadRequestException('Billing record already exists for this organization');
    }

    const billing = this.billingRepository.create(dto);
    const saved = await this.billingRepository.save(billing);

    await this.auditLogService.createLog({
      organizationId: dto.organizationId,
      userId,
      action: AuditAction.CREATE,
      resourceType: AuditResourceType.BILLING,
      resourceId: saved.id,
      description: `Created billing record with status: ${dto.status}`,
      status: 'success',
    });

    return saved;
  }

  async getBillingByOrganization(organizationId: string): Promise<BillingEntity> {
    const billing = await this.billingRepository.findOne({
      where: { organizationId },
    });

    if (!billing) {
      throw new NotFoundException('Billing record not found for this organization');
    }

    return billing;
  }

  async updateBilling(
    organizationId: string,
    dto: UpdateBillingDto,
    userId?: string,
  ): Promise<BillingEntity> {
    const billing = await this.getBillingByOrganization(organizationId);

    const updatedBilling = this.billingRepository.merge(billing, dto);
    const saved = await this.billingRepository.save(updatedBilling);

    await this.auditLogService.createLog({
      organizationId,
      userId,
      action: AuditAction.UPDATE,
      resourceType: AuditResourceType.BILLING,
      resourceId: billing.id,
      description: `Updated billing record`,
      changes: JSON.stringify(dto),
      status: 'success',
    });

    return saved;
  }

  async searchBillings(criteria: BillingSearchDto): Promise<{ data: BillingEntity[]; total: number }> {
    const query = this.billingRepository.createQueryBuilder('billing');

    if (criteria.status) {
      query.andWhere('billing.status = :status', { status: criteria.status });
    }

    if (criteria.plan) {
      query.andWhere('billing.plan = :plan', { plan: criteria.plan });
    }

    if (criteria.minMonthlySpend !== undefined) {
      query.andWhere('billing.monthlySpend >= :minSpend', { minSpend: criteria.minMonthlySpend });
    }

    if (criteria.maxMonthlySpend !== undefined) {
      query.andWhere('billing.monthlySpend <= :maxSpend', { maxSpend: criteria.maxMonthlySpend });
    }

    const page = criteria.page || 1;
    const limit = criteria.limit || 10;
    const skip = (page - 1) * limit;

    query.skip(skip).take(limit).orderBy('billing.createdAt', 'DESC');

    const [data, total] = await query.getManyAndCount();

    return { data, total };
  }

  async updateBillingStatus(
    organizationId: string,
    status: BillingStatus,
    userId?: string,
  ): Promise<BillingEntity> {
    return this.updateBilling(organizationId, { status }, userId);
  }

  async updateApiUsage(
    organizationId: string,
    apiCallsUsed: number,
    userId?: string,
  ): Promise<BillingEntity> {
    return this.updateBilling(organizationId, { apiCallsUsed }, userId);
  }

  async getOrganizationsNearLimit(threshold: number = 0.8): Promise<BillingEntity[]> {
    return this.billingRepository
      .createQueryBuilder('billing')
      .where(
        'CAST(billing.apiCallsUsed AS FLOAT) / CAST(billing.apiCallsLimit AS FLOAT) >= :threshold',
        { threshold },
      )
      .orderBy('billing.apiCallsUsed / billing.apiCallsLimit', 'DESC')
      .getMany();
  }

  async exportBillingData(organizationIds: string[], format: string = 'json'): Promise<string> {
    const billings = await this.billingRepository.find({
      where: organizationIds.length > 0 ? { organizationId: organizationIds[0] } : undefined,
    });

    if (format === 'json') {
      return JSON.stringify(billings, null, 2);
    } else if (format === 'csv') {
      return this.convertToCsv(billings);
    }

    return JSON.stringify(billings);
  }

  private convertToCsv(data: BillingEntity[]): string {
    if (data.length === 0) return '';

    const headers = [
      'ID',
      'Organization ID',
      'Status',
      'Plan',
      'Monthly Spend',
      'API Calls Used',
      'API Calls Limit',
      'Users',
      'Projects',
      'Created At',
    ];

    const rows = data.map((billing) => [
      billing.id,
      billing.organizationId,
      billing.status,
      billing.plan,
      billing.monthlySpend,
      billing.apiCallsUsed,
      billing.apiCallsLimit,
      billing.usersCount,
      billing.projectsCount,
      billing.createdAt.toISOString(),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }
}
