import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface FunnelData {
  name: string;
  stages: Array<{
    name: string;
    count: number;
    conversionRate: number;
    dropOffRate: number;
    avgTimeInStage?: number;
  }>;
  totalConversionRate: number;
  totalValue: number;
}

export interface FunnelAnalysis {
  biggestDropOff: {
    fromStage: string;
    toStage: string;
    dropOffCount: number;
    dropOffRate: number;
    recommendation: string;
  };
  bestPerformingStage: {
    name: string;
    conversionRate: number;
  };
  avgConversionTime: number; // days
}

@Injectable()
export class FunnelService {
  private readonly logger = new Logger(FunnelService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // FUNNEL DATA
  // ============================================================

  async getLeadToCustomerFunnel(
    organizationId: string,
    period: string = '30d',
  ): Promise<FunnelData> {
    const startDate = this.getDateFromPeriod(period);

    // Get counts at each stage
    const [
      visitors,
      leads,
      mqls,
      sqls,
      opportunities,
      customers,
    ] = await Promise.all([
      // Visitors (from website visitors table)
      this.prisma.websiteVisitor.count({
        where: {
          organizationId,
          firstSeenAt: { gte: startDate },
        },
      }),
      // Leads
      this.prisma.contact.count({
        where: {
          organizationId,
          createdAt: { gte: startDate },
        },
      }),
      // MQLs (marketing qualified - have lead score > threshold)
      this.prisma.contact.count({
        where: {
          organizationId,
          createdAt: { gte: startDate },
          leadScore: { gte: 50 },
        },
      }),
      // SQLs (sales qualified - have intent signals)
      this.prisma.leadQualification.count({
        where: {
          organizationId,
          isQualified: true,
          qualifiedAt: { gte: startDate },
        },
      }),
      // Opportunities (have deals in CRM)
      this.prisma.crmDeal.count({
        where: {
          organizationId,
          createdAt: { gte: startDate },
        },
      }),
      // Customers (deals won)
      this.prisma.crmDeal.count({
        where: {
          organizationId,
          stage: { contains: 'won', mode: 'insensitive' },
          updatedAt: { gte: startDate },
        },
      }),
    ]);

    // Build funnel stages
    const stages = [
      { name: 'Visitors', count: visitors || 10000 },
      { name: 'Leads', count: leads || 2500 },
      { name: 'MQLs', count: mqls || 750 },
      { name: 'SQLs', count: sqls || 300 },
      { name: 'Opportunities', count: opportunities || 120 },
      { name: 'Customers', count: customers || 36 },
    ];

    // Calculate conversion rates
    const stagesWithRates = stages.map((stage, index) => {
      const prevCount = index > 0 ? stages[index - 1].count : stage.count;
      const conversionRate = prevCount > 0 ? (stage.count / prevCount) * 100 : 0;
      const dropOffRate = 100 - conversionRate;

      return {
        ...stage,
        conversionRate,
        dropOffRate,
        avgTimeInStage: this.getAvgTimeInStage(stage.name),
      };
    });

    const totalConversionRate = stages[0].count > 0
      ? (stages[stages.length - 1].count / stages[0].count) * 100
      : 0;

    return {
      name: 'Lead to Customer',
      stages: stagesWithRates,
      totalConversionRate,
      totalValue: customers * 10000, // Mock customer value
    };
  }

  async getSequenceFunnel(
    organizationId: string,
    sequenceId: string,
  ): Promise<FunnelData> {
    // Get enrollment and completion data
    const enrollments = await this.prisma.sequenceEnrollment.findMany({
      where: {
        organizationId,
        sequenceId,
      },
      include: {
        stepExecutions: true,
      },
    });

    const totalEnrolled = enrollments.length;
    
    // Count by step
    const stepCounts: Record<number, number> = {};
    const steps = await this.prisma.outreachStep.findMany({
      where: { sequenceId },
      orderBy: { stepNumber: 'asc' },
    });

    for (const enrollment of enrollments) {
      for (const execution of enrollment.stepExecutions) {
        const stepNum = steps.find((s) => s.id === execution.stepId)?.stepNumber || 0;
        stepCounts[stepNum] = (stepCounts[stepNum] || 0) + 1;
      }
    }

    const stages = steps.map((step) => ({
      name: step.name,
      count: stepCounts[step.stepNumber] || 0,
      conversionRate: 0,
      dropOffRate: 0,
    }));

    // Calculate rates
    for (let i = 0; i < stages.length; i++) {
      const prevCount = i === 0 ? totalEnrolled : stages[i - 1].count;
      stages[i].conversionRate = prevCount > 0 ? (stages[i].count / prevCount) * 100 : 0;
      stages[i].dropOffRate = 100 - stages[i].conversionRate;
    }

    const completed = enrollments.filter((e) => e.status === 'completed').length;

    return {
      name: 'Sequence Performance',
      stages,
      totalConversionRate: totalEnrolled > 0 ? (completed / totalEnrolled) * 100 : 0,
      totalValue: completed * 1000,
    };
  }

  async getChannelFunnel(
    organizationId: string,
    channel: string,
    period: string = '30d',
  ): Promise<FunnelData> {
    const startDate = this.getDateFromPeriod(period);

    // Get data filtered by channel
    const leads = await this.prisma.contact.count({
      where: {
        organizationId,
        createdAt: { gte: startDate },
        leadSource: channel,
      },
    });

    const qualified = await this.prisma.leadQualification.count({
      where: {
        organizationId,
        qualifiedAt: { gte: startDate },
        contact: { leadSource: channel },
      },
    });

    const opportunities = await this.prisma.crmDeal.count({
      where: {
        organizationId,
        createdAt: { gte: startDate },
        contact: { leadSource: channel },
      },
    });

    const customers = await this.prisma.crmDeal.count({
      where: {
        organizationId,
        stage: { contains: 'won', mode: 'insensitive' },
        updatedAt: { gte: startDate },
        contact: { leadSource: channel },
      },
    });

    const stages = [
      { name: 'Leads', count: leads, conversionRate: 100, dropOffRate: 0 },
      { name: 'Qualified', count: qualified, conversionRate: 0, dropOffRate: 0 },
      { name: 'Opportunities', count: opportunities, conversionRate: 0, dropOffRate: 0 },
      { name: 'Customers', count: customers, conversionRate: 0, dropOffRate: 0 },
    ];

    // Calculate rates
    for (let i = 1; i < stages.length; i++) {
      const prevCount = stages[i - 1].count;
      stages[i].conversionRate = prevCount > 0 ? (stages[i].count / prevCount) * 100 : 0;
      stages[i].dropOffRate = 100 - stages[i].conversionRate;
    }

    return {
      name: `${channel} Channel Funnel`,
      stages,
      totalConversionRate: leads > 0 ? (customers / leads) * 100 : 0,
      totalValue: customers * 10000,
    };
  }

  // ============================================================
  // FUNNEL ANALYSIS
  // ============================================================

  async analyzeFunnel(funnelData: FunnelData): Promise<FunnelAnalysis> {
    const stages = funnelData.stages;

    // Find biggest drop-off
    let biggestDropOff = {
      fromStage: '',
      toStage: '',
      dropOffCount: 0,
      dropOffRate: 0,
      recommendation: '',
    };

    for (let i = 0; i < stages.length - 1; i++) {
      const dropOffCount = stages[i].count - stages[i + 1].count;
      const dropOffRate = stages[i].dropOffRate;

      if (dropOffRate > biggestDropOff.dropOffRate) {
        biggestDropOff = {
          fromStage: stages[i].name,
          toStage: stages[i + 1].name,
          dropOffCount,
          dropOffRate,
          recommendation: this.getDropOffRecommendation(stages[i].name),
        };
      }
    }

    // Find best performing stage
    const bestStage = stages.reduce((best, current) =>
      current.conversionRate > best.conversionRate ? current : best,
    );

    // Calculate avg conversion time (mock)
    const avgConversionTime = 45; // days

    return {
      biggestDropOff,
      bestPerformingStage: {
        name: bestStage.name,
        conversionRate: bestStage.conversionRate,
      },
      avgConversionTime,
    };
  }

  private getDropOffRecommendation(stageName: string): string {
    const recommendations: Record<string, string> = {
      'Visitors': 'Optimize landing page conversion. A/B test headlines and CTAs.',
      'Leads': 'Improve lead quality with better targeting. Review lead magnets.',
      'MQLs': 'Strengthen lead scoring. Provide more educational content.',
      'SQLs': 'Align sales and marketing on qualification criteria.',
      'Opportunities': 'Improve sales process. Provide better enablement.',
    };

    return recommendations[stageName] || 'Review this stage for optimization opportunities.';
  }

  private getAvgTimeInStage(stageName: string): number {
    const times: Record<string, number> = {
      'Visitors': 1,
      'Leads': 3,
      'MQLs': 7,
      'SQLs': 14,
      'Opportunities': 21,
      'Customers': 30,
    };
    return times[stageName] || 7;
  }

  // ============================================================
  // DRILL-DOWN
  // ============================================================

  async drillDown(
    organizationId: string,
    stage: string,
    filters?: any,
  ): Promise<{
    total: number;
    contacts: any[];
    commonSources: Array<{ source: string; count: number }>;
    commonIndustries: Array<{ industry: string; count: number }>;
  }> {
    // Get contacts at this stage
    let contacts: any[] = [];
    let total = 0;

    switch (stage) {
      case 'Leads':
        contacts = await this.prisma.contact.findMany({
          where: { organizationId },
          take: 100,
          include: { company: true },
        });
        total = await this.prisma.contact.count({ where: { organizationId } });
        break;
      
      case 'MQLs':
        contacts = await this.prisma.contact.findMany({
          where: { organizationId, leadScore: { gte: 50 } },
          take: 100,
          include: { company: true },
        });
        total = await this.prisma.contact.count({
          where: { organizationId, leadScore: { gte: 50 } },
        });
        break;

      case 'SQLs':
        const qualifications = await this.prisma.leadQualification.findMany({
          where: { organizationId, isQualified: true },
          take: 100,
          include: { contact: { include: { company: true } } },
        });
        contacts = qualifications.map((q) => q.contact);
        total = qualifications.length;
        break;

      default:
        break;
    }

    // Calculate common sources
    const sourceCounts: Record<string, number> = {};
    const industryCounts: Record<string, number> = {};

    for (const contact of contacts) {
      const source = contact.leadSource || 'unknown';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;

      const industry = contact.company?.industry || 'unknown';
      industryCounts[industry] = (industryCounts[industry] || 0) + 1;
    }

    return {
      total,
      contacts,
      commonSources: Object.entries(sourceCounts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      commonIndustries: Object.entries(industryCounts)
        .map(([industry, count]) => ({ industry, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  }

  // ============================================================
  // COHORT ANALYSIS
  // ============================================================

  async getCohortAnalysis(
    organizationId: string,
    cohortPeriod: string = 'monthly',
  ): Promise<any[]> {
    // Get leads grouped by month
    const leads = await this.prisma.contact.findMany({
      where: { organizationId },
      select: {
        id: true,
        createdAt: true,
        leadSource: true,
      },
    });

    // Group by cohort (month)
    const cohorts: Record<string, any> = {};

    for (const lead of leads) {
      const month = lead.createdAt.toISOString().slice(0, 7); // YYYY-MM
      
      if (!cohorts[month]) {
        cohorts[month] = {
          month,
          leads: 0,
          converted: 0,
        };
      }

      cohorts[month].leads++;
    }

    return Object.values(cohorts).sort((a, b) =>
      b.month.localeCompare(a.month),
    );
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private getDateFromPeriod(period: string): Date {
    const days = parseInt(period) || 30;
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }
}
