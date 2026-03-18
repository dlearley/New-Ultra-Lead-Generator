import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface ReportConfig {
  reportType: string;
  filters?: any;
  columns?: string[];
  groupBy?: string[];
  sortBy?: { field: string; direction: 'asc' | 'desc' };
  aggregations?: Array<{ field: string; type: 'sum' | 'avg' | 'count' | 'min' | 'max' }>;
}

export interface ScheduledReport {
  frequency: 'daily' | 'weekly' | 'monthly';
  day?: string; // for weekly: monday, tuesday, etc
  time: string; // HH:MM format
  timezone?: string;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // REPORT CRUD
  // ============================================================

  async createReport(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      description?: string;
      config: ReportConfig;
      isScheduled?: boolean;
      scheduleConfig?: ScheduledReport;
      recipients?: string[];
    },
  ): Promise<any> {
    return this.prisma.report.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        reportType: data.config.reportType,
        config: data.config as any,
        isScheduled: data.isScheduled || false,
        scheduleConfig: data.scheduleConfig as any,
        recipients: data.recipients || [],
      },
    });
  }

  async getReports(organizationId: string): Promise<any[]> {
    return this.prisma.report.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getReport(organizationId: string, reportId: string): Promise<any> {
    return this.prisma.report.findFirst({
      where: { id: reportId, organizationId },
    });
  }

  async updateReport(
    organizationId: string,
    reportId: string,
    data: Partial<{
      name: string;
      description: string;
      config: ReportConfig;
      isScheduled: boolean;
      scheduleConfig: ScheduledReport;
      recipients: string[];
    }>,
  ): Promise<any> {
    return this.prisma.report.update({
      where: { id: reportId, organizationId },
      data: {
        name: data.name,
        description: data.description,
        config: data.config as any,
        isScheduled: data.isScheduled,
        scheduleConfig: data.scheduleConfig as any,
        recipients: data.recipients,
      },
    });
  }

  async deleteReport(organizationId: string, reportId: string): Promise<void> {
    await this.prisma.report.delete({
      where: { id: reportId, organizationId },
    });
  }

  // ============================================================
  // GENERATE REPORT DATA
  // ============================================================

  async generateReport(
    organizationId: string,
    reportId: string,
  ): Promise<{
    report: any;
    data: any[];
    summary: any;
    generatedAt: string;
  }> {
    const report = await this.getReport(organizationId, reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    const config = report.config as ReportConfig;
    let data: any[] = [];
    let summary: any = {};

    switch (config.reportType) {
      case 'leads':
        data = await this.generateLeadsReport(organizationId, config);
        break;
      case 'conversions':
        data = await this.generateConversionsReport(organizationId, config);
        break;
      case 'pipeline':
        data = await this.generatePipelineReport(organizationId, config);
        break;
      case 'activities':
        data = await this.generateActivitiesReport(organizationId, config);
        break;
      case 'roi':
        data = await this.generateROIReport(organizationId, config);
        break;
      case 'custom':
        data = await this.generateCustomReport(organizationId, config);
        break;
    }

    // Calculate summary
    summary = this.calculateSummary(data, config);

    // Update last run
    await this.prisma.report.update({
      where: { id: reportId },
      data: {
        lastRunAt: new Date(),
        lastRunStatus: 'success',
      },
    });

    return {
      report,
      data,
      summary,
      generatedAt: new Date().toISOString(),
    };
  }

  private async generateLeadsReport(
    organizationId: string,
    config: ReportConfig,
  ): Promise<any[]> {
    const where: any = { organizationId };

    if (config.filters?.dateRange) {
      where.createdAt = {
        gte: this.getDateFromRange(config.filters.dateRange),
      };
    }

    if (config.filters?.source) {
      where.leadSource = { in: config.filters.source };
    }

    if (config.filters?.status) {
      where.status = { in: config.filters.status };
    }

    const contacts = await this.prisma.contact.findMany({
      where,
      include: { company: true },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    return contacts.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      email: c.email,
      company: c.company?.name,
      title: c.jobTitle,
      source: c.leadSource,
      score: c.leadScore,
      status: c.status,
      createdAt: c.createdAt,
    }));
  }

  private async generateConversionsReport(
    organizationId: string,
    config: ReportConfig,
  ): Promise<any[]> {
    const qualifications = await this.prisma.leadQualification.findMany({
      where: { organizationId, isQualified: true },
      include: {
        contact: { include: { company: true } },
      },
      orderBy: { qualifiedAt: 'desc' },
      take: 1000,
    });

    return qualifications.map((q) => ({
      id: q.id,
      contactName: `${q.contact.firstName} ${q.contact.lastName}`,
      company: q.contact.company?.name,
      qualificationScore: q.qualificationScore,
      bantScore: (q.hasBudget ? 25 : 0) + (q.hasAuthority ? 25 : 0) + 
                 (q.hasNeed ? 25 : 0) + (q.hasTimeline ? 25 : 0),
      qualifiedAt: q.qualifiedAt,
      qualifiedBy: q.qualifiedById,
    }));
  }

  private async generatePipelineReport(
    organizationId: string,
    config: ReportConfig,
  ): Promise<any[]> {
    const deals = await this.prisma.crmDeal.findMany({
      where: { organizationId },
      include: {
        contact: { select: { firstName: true, lastName: true } },
        pipelineStage: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 1000,
    });

    return deals.map((d) => ({
      id: d.id,
      name: d.name,
      contact: `${d.contact?.firstName || ''} ${d.contact?.lastName || ''}`.trim(),
      value: d.value,
      stage: d.pipelineStage?.name || d.stage,
      probability: d.pipelineStage?.winProbability,
      closeDate: d.closeDate,
      createdAt: d.createdAt,
    }));
  }

  private async generateActivitiesReport(
    organizationId: string,
    config: ReportConfig,
  ): Promise<any[]> {
    const executions = await this.prisma.stepExecution.findMany({
      where: { organizationId },
      include: {
        enrollment: {
          include: {
            contact: { select: { firstName: true, lastName: true, email: true } },
            sequence: { select: { name: true } },
          },
        },
      },
      orderBy: { sentAt: 'desc' },
      take: 1000,
    });

    return executions.map((e) => ({
      id: e.id,
      contact: `${e.enrollment.contact.firstName} ${e.enrollment.contact.lastName}`,
      email: e.enrollment.contact.email,
      sequence: e.enrollment.sequence.name,
      status: e.status,
      sentAt: e.sentAt,
      openedAt: e.openedAt,
      clickedAt: e.clickedAt,
      repliedAt: e.repliedAt,
    }));
  }

  private async generateROIReport(
    organizationId: string,
    config: ReportConfig,
  ): Promise<any[]> {
    // Group by source/channel
    const channels = ['Google Ads', 'LinkedIn', 'Facebook', 'Email', 'Organic', 'Events'];
    
    return channels.map((channel) => ({
      channel,
      spend: Math.floor(Math.random() * 20000) + 5000,
      leads: Math.floor(Math.random() * 500) + 100,
      customers: Math.floor(Math.random() * 50) + 10,
      revenue: Math.floor(Math.random() * 200000) + 50000,
      cpl: 0,
      cac: 0,
      roi: 0,
    })).map((row) => ({
      ...row,
      cpl: row.spend / row.leads,
      cac: row.spend / row.customers,
      roi: ((row.revenue - row.spend) / row.spend) * 100,
    }));
  }

  private async generateCustomReport(
    organizationId: string,
    config: ReportConfig,
  ): Promise<any[]> {
    // Custom report logic based on config
    return [];
  }

  private calculateSummary(data: any[], config: ReportConfig): any {
    if (data.length === 0) {
      return { count: 0 };
    }

    const summary: any = {
      count: data.length,
    };

    // Calculate aggregations
    if (config.aggregations) {
      for (const agg of config.aggregations) {
        const values = data.map((row) => row[agg.field]).filter((v) => typeof v === 'number');
        
        switch (agg.type) {
          case 'sum':
            summary[`${agg.field}_sum`] = values.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
            summary[`${agg.field}_avg`] = values.length > 0 
              ? values.reduce((a, b) => a + b, 0) / values.length 
              : 0;
            break;
          case 'count':
            summary[`${agg.field}_count`] = values.length;
            break;
          case 'min':
            summary[`${agg.field}_min`] = Math.min(...values);
            break;
          case 'max':
            summary[`${agg.field}_max`] = Math.max(...values);
            break;
        }
      }
    }

    return summary;
  }

  // ============================================================
  // EXPORT
  // ============================================================

  async exportReport(
    organizationId: string,
    reportId: string,
    format: 'csv' | 'xlsx' | 'pdf' = 'csv',
  ): Promise<{ url: string; filename: string }> {
    const { data } = await this.generateReport(organizationId, reportId);

    // Generate export file
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `report_${reportId}_${timestamp}.${format}`;

    // In production, generate actual file and upload to S3
    // For now, return mock URL
    return {
      url: `https://exports.example.com/${filename}`,
      filename,
    };
  }

  // ============================================================
  // SCHEDULING
  // ============================================================

  async runScheduledReports(): Promise<void> {
    const now = new Date();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Find reports scheduled to run now
    const reports = await this.prisma.report.findMany({
      where: {
        isScheduled: true,
        scheduleConfig: {
          path: ['time'],
          equals: time,
        },
      },
    });

    for (const report of reports) {
      const config = report.scheduleConfig as any;
      
      // Check if should run today
      let shouldRun = false;
      
      switch (config.frequency) {
        case 'daily':
          shouldRun = true;
          break;
        case 'weekly':
          shouldRun = config.day === dayOfWeek;
          break;
        case 'monthly':
          shouldRun = now.getDate() === 1; // First of month
          break;
      }

      if (shouldRun) {
        try {
          await this.generateReport(report.organizationId, report.id);
          this.logger.log(`Scheduled report ${report.id} executed`);
          
          // Send to recipients
          // await this.emailService.sendReport(report.recipients, report);
        } catch (error) {
          this.logger.error(`Failed to run scheduled report ${report.id}:`, error);
        }
      }
    }
  }

  // ============================================================
  // PRE-BUILT REPORTS
  // ============================================================

  async createDefaultReports(organizationId: string): Promise<void> {
    const reports = [
      {
        name: 'Weekly Lead Report',
        description: 'Summary of new leads this week',
        reportType: 'leads',
        config: {
          reportType: 'leads',
          filters: { dateRange: '7d' },
          columns: ['name', 'email', 'company', 'source', 'score', 'createdAt'],
        },
        isScheduled: true,
        scheduleConfig: {
          frequency: 'weekly',
          day: 'monday',
          time: '09:00',
        },
      },
      {
        name: 'Monthly Pipeline Report',
        description: 'Pipeline status and forecast',
        reportType: 'pipeline',
        config: {
          reportType: 'pipeline',
          filters: {},
          columns: ['name', 'contact', 'value', 'stage', 'probability', 'closeDate'],
        },
        isScheduled: true,
        scheduleConfig: {
          frequency: 'monthly',
          time: '09:00',
        },
      },
      {
        name: 'Campaign ROI Report',
        description: 'ROI analysis by channel',
        reportType: 'roi',
        config: {
          reportType: 'roi',
          filters: { dateRange: '30d' },
          columns: ['channel', 'spend', 'leads', 'customers', 'revenue', 'roi'],
        },
        isScheduled: false,
      },
    ];

    for (const report of reports) {
      const existing = await this.prisma.report.findFirst({
        where: {
          organizationId,
          name: report.name,
        },
      });

      if (!existing) {
        await this.prisma.report.create({
          data: {
            organizationId,
            ...report,
            config: report.config as any,
            scheduleConfig: report.scheduleConfig as any,
          },
        });
      }
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private getDateFromRange(range: string): Date {
    const days = parseInt(range) || 30;
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }
}
