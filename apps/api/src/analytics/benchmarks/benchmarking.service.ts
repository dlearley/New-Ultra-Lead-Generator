import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface BenchmarkComparison {
  metric: string;
  yourValue: number;
  industry: string;
  companySize: string;
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  yourPercentile: number;
  comparison: 'above_average' | 'average' | 'below_average';
  recommendation: string;
}

@Injectable()
export class BenchmarkingService {
  private readonly logger = new Logger(BenchmarkingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // BENCHMARK DATA
  // ============================================================

  async seedBenchmarkData(): Promise<void> {
    const benchmarks = [
      // Email metrics
      {
        metric: 'email_open_rate',
        industry: 'saas',
        companySize: 'mid_market',
        p10: 15,
        p25: 19,
        p50: 24,
        p75: 29,
        p90: 35,
      },
      {
        metric: 'email_open_rate',
        industry: 'saas',
        companySize: 'enterprise',
        p10: 18,
        p25: 22,
        p50: 27,
        p75: 32,
        p90: 38,
      },
      {
        metric: 'email_click_rate',
        industry: 'saas',
        companySize: 'mid_market',
        p10: 1.5,
        p25: 2.2,
        p50: 3.0,
        p75: 4.0,
        p90: 5.5,
      },
      {
        metric: 'email_reply_rate',
        industry: 'saas',
        companySize: 'mid_market',
        p10: 0.5,
        p25: 0.8,
        p50: 1.2,
        p75: 1.8,
        p90: 2.5,
      },
      // Conversion metrics
      {
        metric: 'lead_to_mql_rate',
        industry: 'saas',
        companySize: 'mid_market',
        p10: 15,
        p25: 22,
        p50: 30,
        p75: 40,
        p90: 50,
      },
      {
        metric: 'mql_to_sql_rate',
        industry: 'saas',
        companySize: 'mid_market',
        p10: 20,
        p25: 28,
        p50: 35,
        p75: 45,
        p90: 55,
      },
      {
        metric: 'sql_to_customer_rate',
        industry: 'saas',
        companySize: 'mid_market',
        p10: 10,
        p25: 15,
        p50: 22,
        p75: 30,
        p90: 40,
      },
      {
        metric: 'overall_conversion_rate',
        industry: 'saas',
        companySize: 'mid_market',
        p10: 1,
        p25: 2,
        p50: 3,
        p75: 5,
        p90: 8,
      },
      // Sales metrics
      {
        metric: 'average_deal_size',
        industry: 'saas',
        companySize: 'mid_market',
        p10: 5000,
        p25: 10000,
        p50: 20000,
        p75: 40000,
        p90: 75000,
      },
      {
        metric: 'sales_cycle_length',
        industry: 'saas',
        companySize: 'mid_market',
        p10: 20,
        p25: 35,
        p50: 60,
        p75: 90,
        p90: 120,
      },
      // Marketing metrics
      {
        metric: 'cost_per_lead',
        industry: 'saas',
        companySize: 'mid_market',
        p10: 50,
        p25: 100,
        p50: 200,
        p75: 350,
        p90: 600,
      },
      {
        metric: 'customer_acquisition_cost',
        industry: 'saas',
        companySize: 'mid_market',
        p10: 500,
        p25: 1000,
        p50: 2500,
        p75: 5000,
        p90: 10000,
      },
      {
        metric: 'ltv_cac_ratio',
        industry: 'saas',
        companySize: 'mid_market',
        p10: 2,
        p25: 3,
        p50: 4,
        p75: 6,
        p90: 10,
      },
    ];

    for (const benchmark of benchmarks) {
      await this.prisma.benchmarkData.upsert({
        where: {
          metric_industry_companySize: {
            metric: benchmark.metric,
            industry: benchmark.industry,
            companySize: benchmark.companySize,
          },
        },
        create: benchmark,
        update: benchmark,
      });
    }

    this.logger.log('Benchmark data seeded');
  }

  // ============================================================
  // COMPARE TO BENCHMARKS
  // ============================================================

  async compareToBenchmarks(
    organizationId: string,
    options?: {
      industry?: string;
      companySize?: string;
      metrics?: string[];
    },
  ): Promise<BenchmarkComparison[]> {
    const industry = options?.industry || 'saas';
    const companySize = options?.companySize || 'mid_market';
    const metrics = options?.metrics || this.getDefaultMetrics();

    const results: BenchmarkComparison[] = [];

    for (const metric of metrics) {
      // Get benchmark data
      const benchmark = await this.prisma.benchmarkData.findFirst({
        where: {
          metric,
          industry,
          companySize,
        },
      });

      if (!benchmark) continue;

      // Get organization's value
      const yourValue = await this.getMetricValue(organizationId, metric);

      // Calculate percentile
      const percentile = this.calculatePercentile(yourValue, benchmark);

      // Determine comparison
      let comparison: 'above_average' | 'average' | 'below_average';
      if (percentile >= 75) {
        comparison = 'above_average';
      } else if (percentile >= 25) {
        comparison = 'average';
      } else {
        comparison = 'below_average';
      }

      results.push({
        metric,
        yourValue,
        industry,
        companySize,
        percentiles: {
          p10: benchmark.p10,
          p25: benchmark.p25,
          p50: benchmark.p50,
          p75: benchmark.p75,
          p90: benchmark.p90,
        },
        yourPercentile: percentile,
        comparison,
        recommendation: this.getRecommendation(metric, comparison, percentile),
      });
    }

    return results;
  }

  private async getMetricValue(organizationId: string, metric: string): Promise<number> {
    // Fetch actual metric value from database
    switch (metric) {
      case 'email_open_rate':
        const opens = await this.prisma.stepExecution.count({
          where: { organizationId, openedAt: { not: null } },
        });
        const sent = await this.prisma.stepExecution.count({
          where: { organizationId },
        });
        return sent > 0 ? (opens / sent) * 100 : 0;

      case 'email_click_rate':
        const clicks = await this.prisma.stepExecution.count({
          where: { organizationId, clickedAt: { not: null } },
        });
        const totalSent = await this.prisma.stepExecution.count({
          where: { organizationId },
        });
        return totalSent > 0 ? (clicks / totalSent) * 100 : 0;

      case 'overall_conversion_rate':
        const leads = await this.prisma.contact.count({ where: { organizationId } });
        const customers = await this.prisma.crmDeal.count({
          where: { organizationId, stage: { contains: 'won', mode: 'insensitive' } },
        });
        return leads > 0 ? (customers / leads) * 100 : 0;

      default:
        // Return mock value for demo
        return Math.random() * 50 + 10;
    }
  }

  private calculatePercentile(value: number, benchmark: any): number {
    if (value <= benchmark.p10) return 10;
    if (value <= benchmark.p25) return 25;
    if (value <= benchmark.p50) return 50;
    if (value <= benchmark.p75) return 75;
    if (value <= benchmark.p90) return 90;
    return 95;
  }

  private getRecommendation(
    metric: string,
    comparison: string,
    percentile: number,
  ): string {
    const recommendations: Record<string, Record<string, string>> = {
      email_open_rate: {
        above_average: 'Your open rates are excellent! Document your subject line strategies and scale them.',
        average: 'Your open rates are solid. Test personalization and send-time optimization to improve further.',
        below_average: 'Your open rates need attention. Review subject lines for spam triggers, improve list hygiene, and segment more effectively.',
      },
      email_click_rate: {
        above_average: 'Great engagement! Your content is resonating with your audience.',
        average: 'Consider stronger CTAs and more relevant content to boost clicks.',
        below_average: 'Review your email content. Try clearer CTAs, better design, and more targeted messaging.',
      },
      overall_conversion_rate: {
        above_average: 'Excellent conversion rates! Your funnel is highly optimized.',
        average: 'Your conversion is on par. Focus on the biggest drop-off stage for improvement.',
        below_average: 'Significant opportunity here. Audit your lead scoring, sales handoff, and follow-up processes.',
      },
    };

    return recommendations[metric]?.[comparison] || 
      `Your ${metric} is ${comparison.replace('_', ' ')}. Review and optimize this metric.`;
  }

  private getDefaultMetrics(): string[] {
    return [
      'email_open_rate',
      'email_click_rate',
      'email_reply_rate',
      'lead_to_mql_rate',
      'mql_to_sql_rate',
      'sql_to_customer_rate',
      'overall_conversion_rate',
      'cost_per_lead',
      'customer_acquisition_cost',
      'ltv_cac_ratio',
    ];
  }

  // ============================================================
  // COMPETITOR BENCHMARKING
  // ============================================================

  async getCompetitorBenchmarks(
    industry: string,
  ): Promise<Array<{
    competitor: string;
    metric: string;
    value: number;
    yourValue: number;
    vsYou: number; // percentage difference
  }>> {
    // In production, this would come from competitive intelligence tools
    // For now, return mock data
    
    return [
      { competitor: 'Competitor A', metric: 'email_open_rate', value: 28, yourValue: 24, vsYou: 16 },
      { competitor: 'Competitor B', metric: 'email_open_rate', value: 22, yourValue: 24, vsYou: -9 },
      { competitor: 'Competitor A', metric: 'conversion_rate', value: 3.5, yourValue: 3.0, vsYou: 16 },
      { competitor: 'Competitor B', metric: 'conversion_rate', value: 2.8, yourValue: 3.0, vsYou: -7 },
    ];
  }

  // ============================================================
  // TREND COMPARISON
  // ============================================================

  async getBenchmarkTrends(
    metric: string,
    industry: string,
    periods: number = 4, // quarters
  ): Promise<Array<{
    period: string;
    p50: number;
    p75: number;
    yourValue?: number;
  }>> {
    // Return trend data over time
    const trends = [];
    
    for (let i = periods - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i * 3);
      const quarter = `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
      
      trends.push({
        period: quarter,
        p50: 24 + Math.random() * 5 - 2.5,
        p75: 30 + Math.random() * 5 - 2.5,
        yourValue: 24 + Math.random() * 8 - 4,
      });
    }

    return trends;
  }

  // ============================================================
  // BENCHMARK SUMMARY
  // ============================================================

  async getBenchmarkSummary(
    organizationId: string,
  ): Promise<{
    aboveAverage: number;
    average: number;
    belowAverage: number;
    topMetrics: string[];
    improvementAreas: string[];
  }> {
    const comparisons = await this.compareToBenchmarks(organizationId);

    const aboveAverage = comparisons.filter((c) => c.comparison === 'above_average').length;
    const average = comparisons.filter((c) => c.comparison === 'average').length;
    const belowAverage = comparisons.filter((c) => c.comparison === 'below_average').length;

    const sortedByPercentile = [...comparisons].sort((a, b) => b.yourPercentile - a.yourPercentile);
    
    return {
      aboveAverage,
      average,
      belowAverage,
      topMetrics: sortedByPercentile.slice(0, 3).map((c) => c.metric),
      improvementAreas: sortedByPercentile.slice(-3).map((c) => c.metric),
    };
  }
}
