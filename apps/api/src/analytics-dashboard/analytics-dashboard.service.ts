import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';

export interface FunnelStage {
  name: string;
  count: number;
  conversionRate: number; // from previous stage
  dropOffRate: number;
  avgTimeInStage: number; // days
}

export interface FunnelAnalytics {
  funnelName: string;
  totalEntries: number;
  totalConversions: number;
  overallConversionRate: number;
  stages: FunnelStage[];
  trends: Array<{
    date: string;
    stageName: string;
    count: number;
  }>;
}

export interface ROIMetrics {
  totalRevenue: number;
  totalCost: number;
  roi: number; // percentage
  cac: number; // Customer Acquisition Cost
  ltv: number; // Lifetime Value
  ltvCacRatio: number;
  paybackPeriod: number; // days
  revenuePerLead: number;
}

export interface CampaignPerformance {
  campaignId: string;
  campaignName: string;
  channel: string;
  leads: number;
  qualifiedLeads: number;
  opportunities: number;
  closedWon: number;
  revenue: number;
  cost: number;
  roi: number;
  cac: number;
  conversionRate: number;
}

@Injectable()
export class AnalyticsDashboardService {
  private readonly logger = new Logger(AnalyticsDashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // FUNNEL ANALYTICS
  // ============================================================

  async getLeadFunnel(
    organizationId: string,
    period: '7d' | '30d' | '90d' | '1y' = '30d',
  ): Promise<FunnelAnalytics> {
    const periodMap = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000,
    };

    const since = new Date(Date.now() - periodMap[period]);

    // Get counts for each stage
    const [
      totalLeads,
      qualified,
      opportunities,
      proposals,
      closedWon,
    ] = await Promise.all([
      this.prisma.contact.count({
        where: {
          organizationId,
          createdAt: { gte: since },
        },
      }),
      this.prisma.contact.count({
        where: {
          organizationId,
          leadScore: { gte: 70 },
          createdAt: { gte: since },
        },
      }),
      this.prisma.contact.count({
        where: {
          organizationId,
          status: 'qualified',
          createdAt: { gte: since },
        },
      }),
      this.prisma.deal.count({
        where: {
          organizationId,
          stage: { in: ['proposal', 'negotiation'] },
          createdAt: { gte: since },
        },
      }),
      this.prisma.deal.count({
        where: {
          organizationId,
          stage: 'closed_won',
          closedAt: { gte: since },
        },
      }),
    ]);

    const stages: FunnelStage[] = [
      {
        name: 'New Leads',
        count: totalLeads,
        conversionRate: 100,
        dropOffRate: 0,
        avgTimeInStage: 2,
      },
      {
        name: 'Marketing Qualified',
        count: qualified,
        conversionRate: totalLeads > 0 ? (qualified / totalLeads) * 100 : 0,
        dropOffRate: totalLeads > 0 ? ((totalLeads - qualified) / totalLeads) * 100 : 0,
        avgTimeInStage: 5,
      },
      {
        name: 'Sales Qualified',
        count: opportunities,
        conversionRate: qualified > 0 ? (opportunities / qualified) * 100 : 0,
        dropOffRate: qualified > 0 ? ((qualified - opportunities) / qualified) * 100 : 0,
        avgTimeInStage: 7,
      },
      {
        name: 'Proposal',
        count: proposals,
        conversionRate: opportunities > 0 ? (proposals / opportunities) * 100 : 0,
        dropOffRate: opportunities > 0 ? ((opportunities - proposals) / opportunities) * 100 : 0,
        avgTimeInStage: 10,
      },
      {
        name: 'Closed Won',
        count: closedWon,
        conversionRate: proposals > 0 ? (closedWon / proposals) * 100 : 0,
        dropOffRate: proposals > 0 ? ((proposals - closedWon) / proposals) * 100 : 0,
        avgTimeInStage: 14,
      },
    ];

    return {
      funnelName: 'Lead to Customer',
      totalEntries: totalLeads,
      totalConversions: closedWon,
      overallConversionRate: totalLeads > 0 ? (closedWon / totalLeads) * 100 : 0,
      stages,
      trends: [], // Would need time-series data
    };
  }

  async getSequenceFunnel(
    organizationId: string,
    sequenceId: string,
    period: '7d' | '30d' | '90d' = '30d',
  ): Promise<FunnelAnalytics> {
    const periodMap = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };

    const since = new Date(Date.now() - periodMap[period]);

    const enrollments = await this.prisma.sequenceEnrollment.findMany({
      where: {
        organizationId,
        sequenceId,
        enrolledAt: { gte: since },
      },
      include: {
        stepExecutions: true,
      },
    });

    const totalEnrolled = enrollments.length;
    const opened = enrollments.filter((e) =>
      e.stepExecutions.some((s) => s.openedAt)
    ).length;
    const clicked = enrollments.filter((e) =>
      e.stepExecutions.some((s) => s.clickedAt)
    ).length;
    const replied = enrollments.filter((e) =>
      e.stepExecutions.some((s) => s.repliedAt)
    ).length;
    const met = enrollments.filter((e) => e.status === 'meeting_booked'
    ).length;

    const stages: FunnelStage[] = [
      {
        name: 'Enrolled',
        count: totalEnrolled,
        conversionRate: 100,
        dropOffRate: 0,
        avgTimeInStage: 1,
      },
      {
        name: 'Opened',
        count: opened,
        conversionRate: totalEnrolled > 0 ? (opened / totalEnrolled) * 100 : 0,
        dropOffRate: totalEnrolled > 0 ? ((totalEnrolled - opened) / totalEnrolled) * 100 : 0,
        avgTimeInStage: 2,
      },
      {
        name: 'Clicked',
        count: clicked,
        conversionRate: opened > 0 ? (clicked / opened) * 100 : 0,
        dropOffRate: opened > 0 ? ((opened - clicked) / opened) * 100 : 0,
        avgTimeInStage: 3,
      },
      {
        name: 'Replied',
        count: replied,
        conversionRate: clicked > 0 ? (replied / clicked) * 100 : 0,
        dropOffRate: clicked > 0 ? ((clicked - replied) / clicked) * 100 : 0,
        avgTimeInStage: 5,
      },
      {
        name: 'Meeting Booked',
        count: met,
        conversionRate: replied > 0 ? (met / replied) * 100 : 0,
        dropOffRate: replied > 0 ? ((replied - met) / replied) * 100 : 0,
        avgTimeInStage: 7,
      },
    ];

    return {
      funnelName: 'Sequence Performance',
      totalEntries: totalEnrolled,
      totalConversions: met,
      overallConversionRate: totalEnrolled > 0 ? (met / totalEnrolled) * 100 : 0,
      stages,
      trends: [],
    };
  }

  // ============================================================
  // ROI & CAC METRICS
  // ============================================================

  async getROIMetrics(
    organizationId: string,
    period: '30d' | '90d' | '1y' = '30d',
  ): Promise<ROIMetrics> {
    const periodMap = {
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000,
    };

    const since = new Date(Date.now() - periodMap[period]);

    // Get closed deals revenue
    const deals = await this.prisma.deal.findMany({
      where: {
        organizationId,
        stage: 'closed_won',
        closedAt: { gte: since },
      },
      include: {
        company: true,
      },
    });

    const totalRevenue = deals.reduce((sum, d) => sum + (d.value || 0), 0);

    // Get costs (marketing spend + tool costs)
    // This would integrate with your billing/marketing spend tracking
    const estimatedMonthlySpend = 5000; // Placeholder
    const totalCost = estimatedMonthlySpend * (periodMap[period] / (30 * 24 * 60 * 60 * 1000));

    // Get new customers
    const newCustomers = deals.length;

    // Calculate LTV (use historical data)
    const allDeals = await this.prisma.deal.findMany({
      where: {
        organizationId,
        stage: 'closed_won',
      },
    });

    const avgDealSize = allDeals.length > 0
      ? allDeals.reduce((sum, d) => sum + (d.value || 0), 0) / allDeals.length
      : 0;

    // Assume 3 year customer lifetime with 2 deals per year
    const ltv = avgDealSize * 6;

    // Calculate metrics
    const cac = newCustomers > 0 ? totalCost / newCustomers : 0;
    const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

    // Get total leads
    const totalLeads = await this.prisma.contact.count({
      where: {
        organizationId,
        createdAt: { gte: since },
      },
    });

    return {
      totalRevenue,
      totalCost,
      roi,
      cac,
      ltv,
      ltvCacRatio: cac > 0 ? ltv / cac : 0,
      paybackPeriod: cac > 0 ? (cac / (ltv / 1095)) : 0, // days (3 years)
      revenuePerLead: totalLeads > 0 ? totalRevenue / totalLeads : 0,
    };
  }

  // ============================================================
  // CAMPAIGN PERFORMANCE
  // ============================================================

  async getCampaignPerformance(
    organizationId: string,
    period: '30d' | '90d' = '30d',
  ): Promise<CampaignPerformance[]> {
    const periodMap = {
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };

    const since = new Date(Date.now() - periodMap[period]);

    // Get sequences as campaigns
    const sequences = await this.prisma.sequence.findMany({
      where: {
        organizationId,
        createdAt: { gte: since },
      },
      include: {
        enrollments: {
          where: {
            enrolledAt: { gte: since },
          },
          include: {
            stepExecutions: true,
          },
        },
      },
    });

    const campaigns: CampaignPerformance[] = [];

    for (const seq of sequences) {
      const enrollments = seq.enrollments;
      const leads = enrollments.length;
      const qualified = enrollments.filter((e) =>
        e.stepExecutions.some((s) => s.repliedAt)
      ).length;
      const opportunities = enrollments.filter((e) => e.status === 'meeting_booked'
      ).length;
      const closed = enrollments.filter((e) => e.status === 'completed'
      ).length;

      // Estimate revenue based on closed deals
      const estimatedRevenue = closed * 5000; // Placeholder
      const cost = leads * 10; // Estimated cost per lead

      campaigns.push({
        campaignId: seq.id,
        campaignName: seq.name,
        channel: seq.channel || 'email',
        leads,
        qualifiedLeads: qualified,
        opportunities,
        closedWon: closed,
        revenue: estimatedRevenue,
        cost,
        roi: cost > 0 ? ((estimatedRevenue - cost) / cost) * 100 : 0,
        cac: closed > 0 ? cost / closed : 0,
        conversionRate: leads > 0 ? (closed / leads) * 100 : 0,
      });
    }

    return campaigns.sort((a, b) => b.roi - a.roi);
  }

  // ============================================================
  // DASHBOARD SUMMARY
  // ============================================================

  async getDashboardSummary(organizationId: string) {
    const [funnel, roi, campaigns] = await Promise.all([
      this.getLeadFunnel(organizationId, '30d'),
      this.getROIMetrics(organizationId, '30d'),
      this.getCampaignPerformance(organizationId, '30d'),
    ]);

    return {
      funnel,
      roi,
      topCampaigns: campaigns.slice(0, 5),
      kpis: {
        totalLeads: funnel.totalEntries,
        leadConversionRate: funnel.overallConversionRate,
        totalRevenue: roi.totalRevenue,
        cac: roi.cac,
        ltvCacRatio: roi.ltvCacRatio,
        roi: roi.roi,
      },
    };
  }

  // ============================================================
  // TRENDS & CHARTS
  // ============================================================

  async getRevenueTrend(
    organizationId: string,
    days: number = 30,
  ): Promise<Array<{ date: string; revenue: number; deals: number }>> {
    const trends: Array<{ date: string; revenue: number; deals: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayStart = new Date(`${dateStr}T00:00:00Z`);
      const dayEnd = new Date(`${dateStr}T23:59:59Z`);

      const deals = await this.prisma.deal.findMany({
        where: {
          organizationId,
          stage: 'closed_won',
          closedAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      });

      const revenue = deals.reduce((sum, d) => sum + (d.value || 0), 0);

      trends.push({
        date: dateStr,
        revenue,
        deals: deals.length,
      });
    }

    return trends;
  }

  async getLeadSourceBreakdown(organizationId: string) {
    const sources = await this.prisma.contact.groupBy({
      by: ['source'],
      where: { organizationId },
      _count: { source: true },
    });

    return sources.map((s) => ({
      source: s.source || 'unknown',
      count: s._count.source,
    }));
  }
}
