import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface RevenueForecast {
  forecastDate: Date;
  predictedRevenue: number;
  confidenceLow: number;
  confidenceHigh: number;
  bySource: Record<string, number>;
  byChannel: Record<string, number>;
  factors: Array<{
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
    description: string;
  }>;
}

@Injectable()
export class ForecastingService {
  private readonly logger = new Logger(ForecastingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // REVENUE FORECAST
  // ============================================================

  async generateRevenueForecast(
    organizationId: string,
    months: number = 3,
  ): Promise<RevenueForecast[]> {
    const forecasts: RevenueForecast[] = [];
    
    // Get historical data
    const historicalData = await this.getHistoricalRevenue(organizationId, 12);
    
    // Get pipeline data
    const pipelineValue = await this.getPipelineValue(organizationId);
    
    // Get lead velocity
    const leadVelocity = await this.getLeadVelocity(organizationId);
    
    // Generate forecasts
    const baseRevenue = historicalData[historicalData.length - 1]?.revenue || 100000;
    const growthRate = this.calculateGrowthRate(historicalData);
    
    for (let i = 1; i <= months; i++) {
      const forecastDate = new Date();
      forecastDate.setMonth(forecastDate.getMonth() + i);
      
      // Calculate predicted revenue
      const predictedRevenue = baseRevenue * Math.pow(1 + growthRate, i);
      const confidenceInterval = predictedRevenue * 0.15; // 15% variance
      
      // Break down by source
      const bySource = await this.forecastBySource(
        organizationId,
        predictedRevenue,
        historicalData,
      );
      
      // Break down by channel
      const byChannel = await this.forecastByChannel(
        organizationId,
        predictedRevenue,
        historicalData,
      );
      
      // Identify factors
      const factors = this.identifyForecastFactors(
        historicalData,
        pipelineValue,
        leadVelocity,
      );
      
      forecasts.push({
        forecastDate,
        predictedRevenue,
        confidenceLow: predictedRevenue - confidenceInterval,
        confidenceHigh: predictedRevenue + confidenceInterval,
        bySource,
        byChannel,
        factors,
      });
    }

    // Save forecasts
    for (const forecast of forecasts) {
      await this.prisma.revenueForecast.create({
        data: {
          organizationId,
          forecastDate: forecast.forecastDate,
          predictedRevenue: forecast.predictedRevenue,
          confidenceLow: forecast.confidenceLow,
          confidenceHigh: forecast.confidenceHigh,
          bySource: forecast.bySource,
          byChannel: forecast.byChannel,
          factors: forecast.factors,
        },
      });
    }

    return forecasts;
  }

  private async getHistoricalRevenue(
    organizationId: string,
    months: number,
  ): Promise<Array<{ month: string; revenue: number }>> {
    // In production, get actual revenue data
    // For now, generate realistic mock data
    const data = [];
    const baseRevenue = 80000;
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      // Add some growth and seasonality
      const growth = (months - i) * 0.02;
      const seasonality = Math.sin((date.getMonth() / 12) * 2 * Math.PI) * 0.1;
      const random = (Math.random() - 0.5) * 0.1;
      
      data.push({
        month: date.toISOString().slice(0, 7),
        revenue: baseRevenue * (1 + growth + seasonality + random),
      });
    }

    return data;
  }

  private async getPipelineValue(organizationId: string): Promise<number> {
    const deals = await this.prisma.crmDeal.aggregate({
      where: { organizationId },
      _sum: { value: true },
    });

    return deals._sum.value || 500000;
  }

  private async getLeadVelocity(organizationId: string): Promise<{
    leadsPerMonth: number;
    growthRate: number;
}> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    const thisMonthLeads = await this.prisma.contact.count({
      where: {
        organizationId,
        createdAt: { gte: lastMonth },
      },
    });

    const lastMonthLeads = await this.prisma.contact.count({
      where: {
        organizationId,
        createdAt: { gte: twoMonthsAgo, lt: lastMonth },
      },
    });

    return {
      leadsPerMonth: thisMonthLeads,
      growthRate: lastMonthLeads > 0 
        ? (thisMonthLeads - lastMonthLeads) / lastMonthLeads 
        : 0,
    };
  }

  private calculateGrowthRate(
    historicalData: Array<{ month: string; revenue: number }>,
  ): number {
    if (historicalData.length < 2) return 0.05; // Default 5% growth

    const first = historicalData[0].revenue;
    const last = historicalData[historicalData.length - 1].revenue;
    const periods = historicalData.length - 1;

    // CAGR calculation
    return Math.pow(last / first, 1 / periods) - 1;
  }

  private async forecastBySource(
    organizationId: string,
    totalRevenue: number,
    historicalData: any[],
  ): Promise<Record<string, number>> {
    // Get source distribution from historical data
    const sources = ['Organic', 'Paid Search', 'Paid Social', 'Email', 'Events', 'Referral'];
    const distribution = [0.25, 0.20, 0.20, 0.15, 0.15, 0.05];
    
    const bySource: Record<string, number> = {};
    
    sources.forEach((source, i) => {
      bySource[source] = totalRevenue * distribution[i];
    });

    return bySource;
  }

  private async forecastByChannel(
    organizationId: string,
    totalRevenue: number,
    historicalData: any[],
  ): Promise<Record<string, number>> {
    const channels = ['Inbound', 'Outbound', 'Partner', 'Self-Service'];
    const distribution = [0.40, 0.35, 0.15, 0.10];
    
    const byChannel: Record<string, number> = {};
    
    channels.forEach((channel, i) => {
      byChannel[channel] = totalRevenue * distribution[i];
    });

    return byChannel;
  }

  private identifyForecastFactors(
    historicalData: any[],
    pipelineValue: number,
    leadVelocity: any,
  ): Array<{
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
    description: string;
  }> {
    const factors = [];

    // Pipeline health
    if (pipelineValue > 500000) {
      factors.push({
        factor: 'Strong Pipeline',
        impact: 'positive',
        weight: 0.25,
        description: 'Healthy pipeline provides revenue visibility',
      });
    }

    // Lead velocity
    if (leadVelocity.growthRate > 0.1) {
      factors.push({
        factor: 'Accelerating Lead Growth',
        impact: 'positive',
        weight: 0.20,
        description: `Lead volume growing at ${(leadVelocity.growthRate * 100).toFixed(0)}% MoM`,
      });
    } else if (leadVelocity.growthRate < -0.1) {
      factors.push({
        factor: 'Declining Lead Volume',
        impact: 'negative',
        weight: 0.20,
        description: `Lead volume declining at ${(Math.abs(leadVelocity.growthRate) * 100).toFixed(0)}% MoM`,
      });
    }

    // Historical trend
    const growthRate = this.calculateGrowthRate(historicalData);
    if (growthRate > 0.05) {
      factors.push({
        factor: 'Positive Revenue Trend',
        impact: 'positive',
        weight: 0.30,
        description: `Historical growth rate of ${(growthRate * 100).toFixed(1)}%`,
      });
    }

    // Seasonality
    const month = new Date().getMonth();
    if (month === 11 || month === 0) {
      factors.push({
        factor: 'Holiday Season',
        impact: 'negative',
        weight: 0.10,
        description: 'Typical seasonal slowdown expected',
      });
    }

    return factors;
  }

  // ============================================================
  // GET FORECASTS
  // ============================================================

  async getForecasts(organizationId: string): Promise<any[]> {
    return this.prisma.revenueForecast.findMany({
      where: { organizationId },
      orderBy: { forecastDate: 'asc' },
    });
  }

  async getLatestForecast(organizationId: string): Promise<any> {
    return this.prisma.revenueForecast.findFirst({
      where: { organizationId },
      orderBy: { forecastDate: 'desc' },
    });
  }

  // ============================================================
  // UPDATE ACTUAL
  // ============================================================

  async updateActualRevenue(
    organizationId: string,
    forecastId: string,
    actualRevenue: number,
  ): Promise<void> {
    const forecast = await this.prisma.revenueForecast.findFirst({
      where: { id: forecastId, organizationId },
    });

    if (!forecast) {
      throw new Error('Forecast not found');
    }

    const accuracy = forecast.predictedRevenue > 0
      ? 1 - Math.abs(actualRevenue - forecast.predictedRevenue) / forecast.predictedRevenue
      : 0;

    await this.prisma.revenueForecast.update({
      where: { id: forecastId },
      data: {
        actualRevenue,
        accuracy,
      },
    });
  }

  // ============================================================
  // SCENARIO PLANNING
  // ============================================================

  async generateScenarioForecast(
    organizationId: string,
    scenario: {
      name: string;
      leadGrowthRate: number;
      conversionRateChange: number;
      avgDealSizeChange: number;
    },
  ): Promise<{
    scenario: string;
    predictedRevenue: number;
    vsBaseline: number;
    assumptions: string[];
  }> {
    // Get baseline forecast
    const baselineForecast = await this.getLatestForecast(organizationId);
    const baselineRevenue = baselineForecast?.predictedRevenue || 100000;

    // Apply scenario adjustments
    const leadMultiplier = 1 + scenario.leadGrowthRate;
    const conversionMultiplier = 1 + scenario.conversionRateChange;
    const dealSizeMultiplier = 1 + scenario.avgDealSizeChange;

    const predictedRevenue = baselineRevenue * leadMultiplier * conversionMultiplier * dealSizeMultiplier;

    return {
      scenario: scenario.name,
      predictedRevenue,
      vsBaseline: ((predictedRevenue - baselineRevenue) / baselineRevenue) * 100,
      assumptions: [
        `Lead volume ${scenario.leadGrowthRate >= 0 ? 'increases' : 'decreases'} by ${Math.abs(scenario.leadGrowthRate * 100).toFixed(0)}%`,
        `Conversion rate ${scenario.conversionRateChange >= 0 ? 'improves' : 'declines'} by ${Math.abs(scenario.conversionRateChange * 100).toFixed(0)}%`,
        `Average deal size ${scenario.avgDealSizeChange >= 0 ? 'increases' : 'decreases'} by ${Math.abs(scenario.avgDealSizeChange * 100).toFixed(0)}%`,
      ],
    };
  }

  // ============================================================
  // FORECAST ACCURACY
  // ============================================================

  async getForecastAccuracy(
    organizationId: string,
  ): Promise<{
    overallAccuracy: number;
    byMonth: Array<{ month: string; predicted: number; actual: number; accuracy: number }>;
    trend: 'improving' | 'stable' | 'declining';
  }> {
    const forecasts = await this.prisma.revenueForecast.findMany({
      where: {
        organizationId,
        actualRevenue: { not: null },
      },
      orderBy: { forecastDate: 'desc' },
      take: 6,
    });

    if (forecasts.length === 0) {
      return {
        overallAccuracy: 0,
        byMonth: [],
        trend: 'stable',
      };
    }

    const byMonth = forecasts.map((f) => ({
      month: f.forecastDate.toISOString().slice(0, 7),
      predicted: f.predictedRevenue,
      actual: f.actualRevenue || 0,
      accuracy: f.accuracy || 0,
    }));

    const overallAccuracy = byMonth.reduce((sum, m) => sum + m.accuracy, 0) / byMonth.length;

    // Determine trend
    const recent = byMonth.slice(0, 3).reduce((sum, m) => sum + m.accuracy, 0) / 3;
    const older = byMonth.slice(-3).reduce((sum, m) => sum + m.accuracy, 0) / 3;
    
    let trend: 'improving' | 'stable' | 'declining';
    if (recent > older + 0.05) {
      trend = 'improving';
    } else if (recent < older - 0.05) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    return {
      overallAccuracy,
      byMonth,
      trend,
    };
  }
}
