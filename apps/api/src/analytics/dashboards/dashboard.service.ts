import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';

export interface DashboardWidget {
  id: string;
  type: 'chart_line' | 'chart_bar' | 'chart_pie' | 'metric' | 'table' | 'funnel' | 'leaderboard';
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config: any;
}

export interface DashboardData {
  name: string;
  description?: string;
  dashboardType?: string;
  layout?: { widgets: DashboardWidget[] };
  defaultFilters?: any;
  allowedRoles?: string[];
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // DASHBOARD CRUD
  // ============================================================

  async createDashboard(
    organizationId: string,
    userId: string,
    data: DashboardData,
  ): Promise<any> {
    return this.prisma.dashboard.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        dashboardType: data.dashboardType || 'custom',
        layout: data.layout || { widgets: [] },
        defaultFilters: data.defaultFilters || {},
        allowedRoles: data.allowedRoles || ['admin', 'sales', 'marketing'],
      },
    });
  }

  async getDashboard(organizationId: string, dashboardId: string): Promise<any> {
    return this.prisma.dashboard.findFirst({
      where: { id: dashboardId, organizationId },
    });
  }

  async getDashboards(
    organizationId: string,
    userRole?: string,
  ): Promise<any[]> {
    const where: any = { organizationId };
    
    if (userRole) {
      where.allowedRoles = { has: userRole };
    }

    return this.prisma.dashboard.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateDashboard(
    organizationId: string,
    dashboardId: string,
    data: Partial<DashboardData>,
  ): Promise<any> {
    return this.prisma.dashboard.update({
      where: { id: dashboardId, organizationId },
      data: {
        name: data.name,
        description: data.description,
        layout: data.layout,
        defaultFilters: data.defaultFilters,
        allowedRoles: data.allowedRoles,
        updatedAt: new Date(),
      },
    });
  }

  async deleteDashboard(organizationId: string, dashboardId: string): Promise<void> {
    await this.prisma.dashboard.delete({
      where: { id: dashboardId, organizationId },
    });
  }

  // ============================================================
  // PRE-BUILT DASHBOARDS
  // ============================================================

  async createDefaultDashboards(organizationId: string): Promise<void> {
    const dashboards = [
      {
        name: 'Lead Generation Overview',
        dashboardType: 'lead_gen',
        description: 'Track lead sources, conversion rates, and pipeline health',
        layout: {
          widgets: [
            { id: 'w1', type: 'metric', title: 'Total Leads', x: 0, y: 0, w: 3, h: 2, config: { metric: 'total_leads', period: '30d' } },
            { id: 'w2', type: 'metric', title: 'Conversion Rate', x: 3, y: 0, w: 3, h: 2, config: { metric: 'conversion_rate', period: '30d' } },
            { id: 'w3', type: 'metric', title: 'Cost per Lead', x: 6, y: 0, w: 3, h: 2, config: { metric: 'cost_per_lead', period: '30d' } },
            { id: 'w4', type: 'metric', title: 'Qualified Leads', x: 9, y: 0, w: 3, h: 2, config: { metric: 'qualified_leads', period: '30d' } },
            { id: 'w5', type: 'chart_line', title: 'Leads Over Time', x: 0, y: 2, w: 8, h: 4, config: { metric: 'leads', groupBy: 'date', period: '30d' } },
            { id: 'w6', type: 'chart_pie', title: 'Leads by Source', x: 8, y: 2, w: 4, h: 4, config: { metric: 'leads', groupBy: 'source' } },
            { id: 'w7', type: 'funnel', title: 'Conversion Funnel', x: 0, y: 6, w: 6, h: 4, config: { funnelType: 'lead_to_customer' } },
            { id: 'w8', type: 'table', title: 'Top Performing Sources', x: 6, y: 6, w: 6, h: 4, config: { metric: 'leads_by_source', limit: 10 } },
          ],
        },
        allowedRoles: ['admin', 'marketing', 'executive'],
      },
      {
        name: 'Sales Pipeline',
        dashboardType: 'sales',
        description: 'Pipeline visibility, deal progression, and rep performance',
        layout: {
          widgets: [
            { id: 'w1', type: 'metric', title: 'Pipeline Value', x: 0, y: 0, w: 3, h: 2, config: { metric: 'pipeline_value' } },
            { id: 'w2', type: 'metric', title: 'Deals Won', x: 3, y: 0, w: 3, h: 2, config: { metric: 'deals_won', period: '30d' } },
            { id: 'w3', type: 'metric', title: 'Win Rate', x: 6, y: 0, w: 3, h: 2, config: { metric: 'win_rate', period: '30d' } },
            { id: 'w4', type: 'metric', title: 'Avg Deal Size', x: 9, y: 0, w: 3, h: 2, config: { metric: 'avg_deal_size', period: '30d' } },
            { id: 'w5', type: 'chart_bar', title: 'Pipeline by Stage', x: 0, y: 2, w: 6, h: 4, config: { metric: 'deals', groupBy: 'stage' } },
            { id: 'w6', type: 'leaderboard', title: 'Rep Performance', x: 6, y: 2, w: 6, h: 4, config: { metric: 'deals_won', groupBy: 'rep', limit: 10 } },
          ],
        },
        allowedRoles: ['admin', 'sales', 'executive'],
      },
      {
        name: 'Marketing ROI',
        dashboardType: 'marketing',
        description: 'Campaign performance, attribution, and ROI analysis',
        layout: {
          widgets: [
            { id: 'w1', type: 'metric', title: 'Marketing ROI', x: 0, y: 0, w: 3, h: 2, config: { metric: 'roi', period: '30d' } },
            { id: 'w2', type: 'metric', title: 'Spend', x: 3, y: 0, w: 3, h: 2, config: { metric: 'marketing_spend', period: '30d' } },
            { id: 'w3', type: 'metric', title: 'Revenue Attribution', x: 6, y: 0, w: 3, h: 2, config: { metric: 'attributed_revenue', period: '30d' } },
            { id: 'w4', type: 'metric', title: 'CAC', x: 9, y: 0, w: 3, h: 2, config: { metric: 'customer_acquisition_cost', period: '30d' } },
            { id: 'w5', type: 'chart_bar', title: 'ROI by Channel', x: 0, y: 2, w: 6, h: 4, config: { metric: 'roi', groupBy: 'channel', period: '30d' } },
            { id: 'w6', type: 'chart_pie', title: 'Attribution Model', x: 6, y: 2, w: 6, h: 4, config: { metric: 'attribution', model: 'first_touch' } },
          ],
        },
        allowedRoles: ['admin', 'marketing', 'executive'],
      },
      {
        name: 'Executive Summary',
        dashboardType: 'executive',
        description: 'High-level KPIs and trends for leadership',
        layout: {
          widgets: [
            { id: 'w1', type: 'metric', title: 'MRR', x: 0, y: 0, w: 3, h: 2, config: { metric: 'mrr' } },
            { id: 'w2', type: 'metric', title: 'New Customers', x: 3, y: 0, w: 3, h: 2, config: { metric: 'new_customers', period: '30d' } },
            { id: 'w3', type: 'metric', title: 'Churn Rate', x: 6, y: 0, w: 3, h: 2, config: { metric: 'churn_rate', period: '30d' } },
            { id: 'w4', type: 'metric', title: 'LTV:CAC', x: 9, y: 0, w: 3, h: 2, config: { metric: 'ltv_cac_ratio' } },
            { id: 'w5', type: 'chart_line', title: 'Revenue Trend', x: 0, y: 2, w: 12, h: 4, config: { metric: 'revenue', period: '90d' } },
          ],
        },
        allowedRoles: ['admin', 'executive'],
      },
    ];

    for (const dashboard of dashboards) {
      const existing = await this.prisma.dashboard.findFirst({
        where: { organizationId, dashboardType: dashboard.dashboardType },
      });

      if (!existing) {
        await this.prisma.dashboard.create({
          data: {
            organizationId,
            ...dashboard,
          },
        });
      }
    }
  }

  // ============================================================
  // WIDGET DATA
  // ============================================================

  async getWidgetData(
    organizationId: string,
    widgetId: string,
    filters?: any,
  ): Promise<any> {
    // Get widget config
    const widget = await this.prisma.widget.findFirst({
      where: { id: widgetId, organizationId },
    });

    if (!widget) {
      throw new Error('Widget not found');
    }

    // Fetch data based on widget type
    switch (widget.widgetType) {
      case 'metric':
        return this.getMetricData(organizationId, widget.config, filters);
      case 'chart_line':
      case 'chart_bar':
        return this.getChartData(organizationId, widget.config, filters);
      case 'chart_pie':
        return this.getPieData(organizationId, widget.config, filters);
      case 'funnel':
        return this.getFunnelData(organizationId, widget.config, filters);
      case 'table':
        return this.getTableData(organizationId, widget.config, filters);
      case 'leaderboard':
        return this.getLeaderboardData(organizationId, widget.config, filters);
      default:
        return null;
    }
  }

  private async getMetricData(
    organizationId: string,
    config: any,
    filters?: any,
  ): Promise<any> {
    const period = filters?.period || config.period || '30d';
    
    const metrics: Record<string, () => Promise<any>> = {
      total_leads: async () => {
        const count = await this.prisma.contact.count({
          where: {
            organizationId,
            createdAt: { gte: this.getDateFromPeriod(period) },
          },
        });
        return { value: count, label: 'Total Leads', change: 12.5 };
      },
      conversion_rate: async () => {
        return { value: 24.5, label: 'Conversion Rate', change: 3.2, format: 'percent' };
      },
      qualified_leads: async () => {
        const count = await this.prisma.leadQualification.count({
          where: {
            organizationId,
            isQualified: true,
            createdAt: { gte: this.getDateFromPeriod(period) },
          },
        });
        return { value: count, label: 'Qualified Leads', change: 8.1 };
      },
      pipeline_value: async () => {
        return { value: 1250000, label: 'Pipeline Value', change: 15.3, format: 'currency' };
      },
      deals_won: async () => {
        return { value: 45, label: 'Deals Won', change: 5.7 };
      },
    };

    const metricFn = metrics[config.metric];
    return metricFn ? await metricFn() : { value: 0, label: config.metric };
  }

  private async getChartData(
    organizationId: string,
    config: any,
    filters?: any,
  ): Promise<any> {
    const period = filters?.period || config.period || '30d';
    const days = this.getDaysFromPeriod(period);

    // Generate mock time series data
    const data = [];
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.floor(Math.random() * 50) + 20,
      });
    }

    return {
      labels: data.map((d) => d.date),
      datasets: [{
        label: config.metric,
        data: data.map((d) => d.value),
      }],
    };
  }

  private async getPieData(
    organizationId: string,
    config: any,
    filters?: any,
  ): Promise<any> {
    return {
      labels: ['Organic Search', 'Paid Ads', 'Social Media', 'Email', 'Direct', 'Referral'],
      data: [35, 25, 20, 10, 7, 3],
    };
  }

  private async getFunnelData(
    organizationId: string,
    config: any,
    filters?: any,
  ): Promise<any> {
    return {
      stages: [
        { name: 'Visitors', count: 10000, conversionRate: 100 },
        { name: 'Leads', count: 2500, conversionRate: 25 },
        { name: 'MQLs', count: 750, conversionRate: 30 },
        { name: 'SQLs', count: 300, conversionRate: 40 },
        { name: 'Opportunities', count: 120, conversionRate: 40 },
        { name: 'Customers', count: 36, conversionRate: 30 },
      ],
    };
  }

  private async getTableData(
    organizationId: string,
    config: any,
    filters?: any,
  ): Promise<any> {
    return {
      columns: ['Source', 'Leads', 'Conversion Rate', 'Revenue'],
      rows: [
        ['Google Ads', 450, '28%', '$125,000'],
        ['LinkedIn', 320, '32%', '$98,000'],
        ['Organic', 280, '22%', '$76,000'],
        ['Email', 180, '35%', '$54,000'],
        ['Events', 120, '45%', '$87,000'],
      ],
    };
  }

  private async getLeaderboardData(
    organizationId: string,
    config: any,
    filters?: any,
  ): Promise<any> {
    return {
      columns: ['Rank', 'Name', 'Deals Won', 'Revenue'],
      rows: [
        [1, 'Sarah Johnson', 12, '$145,000'],
        [2, 'Mike Chen', 10, '$128,000'],
        [3, 'Emily Davis', 9, '$115,000'],
        [4, 'Alex Turner', 8, '$98,000'],
        [5, 'Jordan Lee', 7, '$87,000'],
      ],
    };
  }

  // ============================================================
  // REAL-TIME UPDATES
  // ============================================================

  async getRealtimeMetrics(organizationId: string): Promise<any> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      leadsToday,
      leadsThisHour,
      activeSequences,
      emailsSent,
    ] = await Promise.all([
      this.prisma.contact.count({
        where: { organizationId, createdAt: { gte: today } },
      }),
      this.prisma.contact.count({
        where: {
          organizationId,
          createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) },
        },
      }),
      this.prisma.sequenceEnrollment.count({
        where: { organizationId, status: 'active' },
      }),
      this.prisma.stepExecution.count({
        where: {
          organizationId,
          status: 'sent',
          sentAt: { gte: today },
        },
      }),
    ]);

    return {
      leadsToday,
      leadsThisHour,
      activeSequences,
      emailsSent,
      lastUpdated: now.toISOString(),
    };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private getDateFromPeriod(period: string): Date {
    const days = this.getDaysFromPeriod(period);
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  private getDaysFromPeriod(period: string): number {
    const mapping: Record<string, number> = {
      '24h': 1,
      '7d': 7,
      '14d': 14,
      '30d': 30,
      '90d': 90,
      'mtd': new Date().getDate(),
      'ytd': Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)),
    };
    return mapping[period] || 30;
  }
}
