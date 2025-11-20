import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { UsageMetricEntity, UsageMetricType } from '../entities/usage.entity';

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(UsageMetricEntity)
    private usageRepository: Repository<UsageMetricEntity>,
  ) {}

  async recordMetric(
    organizationId: string,
    metricType: UsageMetricType,
    value: number,
    cost?: number,
  ): Promise<UsageMetricEntity> {
    const metric = this.usageRepository.create({
      organizationId,
      metricType,
      value,
      cost,
      dateRecorded: new Date(),
    });

    return this.usageRepository.save(metric);
  }

  async getUsageByDateRange(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<UsageMetricEntity[]> {
    return this.usageRepository.find({
      where: {
        organizationId,
        dateRecorded: Between(startDate, endDate),
      },
      order: { dateRecorded: 'ASC' },
    });
  }

  async getLatestMetric(
    organizationId: string,
    metricType: UsageMetricType,
  ): Promise<UsageMetricEntity | null> {
    return this.usageRepository.findOne({
      where: {
        organizationId,
        metricType,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getOrganizationUsageSummary(organizationId: string): Promise<Record<string, any>> {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const metrics = await this.usageRepository.find({
      where: {
        organizationId,
        dateRecorded: Between(thirtyDaysAgo, today),
      },
    });

    const summary: Record<string, any> = {};

    for (const metricType of Object.values(UsageMetricType)) {
      const typeMetrics = metrics.filter((m) => m.metricType === metricType);
      if (typeMetrics.length > 0) {
        summary[metricType] = {
          current: typeMetrics[typeMetrics.length - 1].value,
          total: typeMetrics.reduce((sum, m) => sum + m.value, 0),
          average: typeMetrics.reduce((sum, m) => sum + m.value, 0) / typeMetrics.length,
          cost: typeMetrics.reduce((sum, m) => sum + (m.cost || 0), 0),
          count: typeMetrics.length,
        };
      }
    }

    return summary;
  }

  async getDailyUsageTrends(
    organizationId: string,
    metricType: UsageMetricType,
    days: number = 30,
  ): Promise<Array<{ date: string; value: number; cost: number }>> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const metrics = await this.usageRepository.find({
      where: {
        organizationId,
        metricType,
        dateRecorded: Between(startDate, endDate),
      },
      order: { dateRecorded: 'ASC' },
    });

    const grouped: Record<string, { value: number; cost: number }> = {};

    for (const metric of metrics) {
      const dateKey = metric.dateRecorded.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = { value: 0, cost: 0 };
      }
      grouped[dateKey].value += metric.value;
      grouped[dateKey].cost += metric.cost || 0;
    }

    return Object.entries(grouped).map(([date, { value, cost }]) => ({
      date,
      value,
      cost,
    }));
  }

  async exportUsageData(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    format: string = 'json',
  ): Promise<string> {
    const metrics = await this.getUsageByDateRange(organizationId, startDate, endDate);

    if (format === 'json') {
      return JSON.stringify(metrics, null, 2);
    } else if (format === 'csv') {
      return this.convertToCsv(metrics);
    }

    return JSON.stringify(metrics);
  }

  private convertToCsv(metrics: UsageMetricEntity[]): string {
    if (metrics.length === 0) return '';

    const headers = [
      'ID',
      'Organization ID',
      'Metric Type',
      'Value',
      'Limit',
      'Cost',
      'Date Recorded',
    ];

    const rows = metrics.map((m) => [
      m.id,
      m.organizationId,
      m.metricType,
      m.value,
      m.limit || '',
      m.cost || '',
      m.dateRecorded.toISOString(),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }
}
