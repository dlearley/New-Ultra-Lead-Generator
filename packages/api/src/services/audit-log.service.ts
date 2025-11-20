import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AuditLogEntity, AuditAction } from '../entities/audit-log.entity';
import { CreateAuditLogDto, AuditLogSearchDto } from '../dtos/audit-log.dto';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  async createLog(dto: CreateAuditLogDto): Promise<AuditLogEntity> {
    const log = this.auditLogRepository.create(dto);
    return this.auditLogRepository.save(log);
  }

  async searchLogs(criteria: AuditLogSearchDto): Promise<{ data: AuditLogEntity[]; total: number }> {
    const query = this.auditLogRepository.createQueryBuilder('audit');

    if (criteria.organizationId) {
      query.andWhere('audit.organizationId = :organizationId', {
        organizationId: criteria.organizationId,
      });
    }

    if (criteria.userId) {
      query.andWhere('audit.userId = :userId', { userId: criteria.userId });
    }

    if (criteria.action) {
      query.andWhere('audit.action = :action', { action: criteria.action });
    }

    if (criteria.resourceType) {
      query.andWhere('audit.resourceType = :resourceType', { resourceType: criteria.resourceType });
    }

    if (criteria.startDate && criteria.endDate) {
      query.andWhere('audit.createdAt BETWEEN :startDate AND :endDate', {
        startDate: criteria.startDate,
        endDate: criteria.endDate,
      });
    } else if (criteria.startDate) {
      query.andWhere('audit.createdAt >= :startDate', { startDate: criteria.startDate });
    } else if (criteria.endDate) {
      query.andWhere('audit.createdAt <= :endDate', { endDate: criteria.endDate });
    }

    const page = criteria.page || 1;
    const limit = criteria.limit || 20;
    const skip = (page - 1) * limit;

    const sortBy = criteria.sortBy || 'createdAt';
    const sortOrder = criteria.sortOrder || 'DESC';

    query.skip(skip).take(limit).orderBy(`audit.${sortBy}`, sortOrder as 'ASC' | 'DESC');

    const [data, total] = await query.getManyAndCount();

    return { data, total };
  }

  async getLogsByOrganization(
    organizationId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ data: AuditLogEntity[]; total: number }> {
    return this.searchLogs({
      organizationId,
      limit,
      page: offset / limit + 1,
    });
  }

  async getLogsByUser(
    organizationId: string,
    userId: string,
    limit: number = 50,
  ): Promise<AuditLogEntity[]> {
    return this.auditLogRepository.find({
      where: {
        organizationId,
        userId,
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getLogsByAction(
    organizationId: string,
    action: AuditAction,
    limit: number = 50,
  ): Promise<AuditLogEntity[]> {
    return this.auditLogRepository.find({
      where: {
        organizationId,
        action,
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async exportLogs(
    organizationId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      action?: AuditAction;
      userId?: string;
    },
    format: string = 'json',
  ): Promise<string> {
    const where: any = { organizationId };

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.startDate && filters.endDate) {
      where.createdAt = Between(filters.startDate, filters.endDate);
    }

    const logs = await this.auditLogRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else if (format === 'csv') {
      return this.convertToCsv(logs);
    }

    return JSON.stringify(logs);
  }

  async getAuditStats(organizationId: string): Promise<Record<string, any>> {
    const totalLogs = await this.auditLogRepository.count({ where: { organizationId } });

    const actionCounts = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .where('audit.organizationId = :organizationId', { organizationId })
      .groupBy('audit.action')
      .getRawMany();

    const recentLogs = await this.auditLogRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      totalLogs,
      actionCounts,
      recentActivity: recentLogs,
    };
  }

  private convertToCsv(logs: AuditLogEntity[]): string {
    if (logs.length === 0) return '';

    const headers = [
      'ID',
      'Organization ID',
      'User ID',
      'Action',
      'Resource Type',
      'Resource ID',
      'Description',
      'Status',
      'IP Address',
      'Created At',
    ];

    const rows = logs.map((log) => [
      log.id,
      log.organizationId,
      log.userId || '',
      log.action,
      log.resourceType,
      log.resourceId || '',
      log.description,
      log.status || '',
      log.ipAddress || '',
      log.createdAt.toISOString(),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }
}
