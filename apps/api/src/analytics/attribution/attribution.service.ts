import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface AttributionResult {
  contactId: string;
  touchpoints: Array<{
    id: string;
    type: string;
    source: string;
    campaign?: string;
    timestamp: Date;
    weight: number;
    attributedValue: number;
  }>;
  totalValue: number;
  model: string;
}

export interface ChannelPerformance {
  channel: string;
  touches: number;
  attributedLeads: number;
  attributedRevenue: number;
  cost: number;
  roi: number;
  conversionRate: number;
}

@Injectable()
export class AttributionService {
  private readonly logger = new Logger(AttributionService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // ATTRIBUTION MODELS
  // ============================================================

  async calculateAttribution(
    organizationId: string,
    contactId: string,
    modelType: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'position_based' = 'first_touch',
  ): Promise<AttributionResult> {
    // Get touchpoints for contact
    const touchpoints = await this.prisma.attributionTouchpoint.findMany({
      where: { organizationId, contactId },
      orderBy: { touchpointAt: 'asc' },
    });

    if (touchpoints.length === 0) {
      return {
        contactId,
        touchpoints: [],
        totalValue: 0,
        model: modelType,
      };
    }

    // Get conversion value
    const conversion = touchpoints.find((t) => t.convertedToId);
    const totalValue = conversion?.conversionValue || 100; // Default value

    // Calculate weights based on model
    const weights = this.calculateWeights(touchpoints, modelType);

    // Apply weights
    const attributedTouchpoints = touchpoints.map((tp, index) => ({
      id: tp.id,
      type: tp.touchpointType,
      source: tp.source,
      campaign: tp.campaign || undefined,
      timestamp: tp.touchpointAt,
      weight: weights[index],
      attributedValue: totalValue * weights[index],
    }));

    return {
      contactId,
      touchpoints: attributedTouchpoints,
      totalValue,
      model: modelType,
    };
  }

  private calculateWeights(
    touchpoints: any[],
    modelType: string,
  ): number[] {
    const count = touchpoints.length;
    
    switch (modelType) {
      case 'first_touch':
        return touchpoints.map((_, i) => i === 0 ? 1 : 0);
      
      case 'last_touch':
        return touchpoints.map((_, i) => i === count - 1 ? 1 : 0);
      
      case 'linear':
        const equalWeight = 1 / count;
        return touchpoints.map(() => equalWeight);
      
      case 'time_decay':
        // More recent touches get more weight
        const decayFactor = 0.7;
        let totalWeight = 0;
        const weights = touchpoints.map((_, i) => {
          const weight = Math.pow(decayFactor, count - 1 - i);
          totalWeight += weight;
          return weight;
        });
        return weights.map((w) => w / totalWeight);
      
      case 'position_based':
        // 40% first, 40% last, 20% distributed to middle
        if (count === 1) return [1];
        if (count === 2) return [0.5, 0.5];
        
        const middleWeight = 0.2 / (count - 2);
        return touchpoints.map((_, i) => {
          if (i === 0) return 0.4;
          if (i === count - 1) return 0.4;
          return middleWeight;
        });
      
      default:
        return touchpoints.map(() => 1 / count);
    }
  }

  // ============================================================
  // CHANNEL PERFORMANCE
  // ============================================================

  async getChannelPerformance(
    organizationId: string,
    period: string = '30d',
    modelType: string = 'first_touch',
  ): Promise<ChannelPerformance[]> {
    const startDate = this.getDateFromPeriod(period);

    // Get all touchpoints in period
    const touchpoints = await this.prisma.attributionTouchpoint.findMany({
      where: {
        organizationId,
        touchpointAt: { gte: startDate },
      },
      include: {
        contact: true,
      },
    });

    // Group by channel
    const channelMap = new Map<string, {
      touches: number;
      leads: Set<string>;
      revenue: number;
      cost: number;
    }>();

    for (const tp of touchpoints) {
      const channel = tp.channel || tp.source || 'unknown';
      
      if (!channelMap.has(channel)) {
        channelMap.set(channel, {
          touches: 0,
          leads: new Set(),
          revenue: 0,
          cost: 0,
        });
      }

      const data = channelMap.get(channel)!;
      data.touches++;
      data.leads.add(tp.contactId);
      
      if (tp.conversionValue) {
        // Apply attribution weight based on model
        const contactTouchpoints = touchpoints.filter(
          (t) => t.contactId === tp.contactId,
        );
        const weights = this.calculateWeights(contactTouchpoints, modelType);
        const tpIndex = contactTouchpoints.findIndex((t) => t.id === tp.id);
        data.revenue += tp.conversionValue * weights[tpIndex];
      }
    }

    // Mock cost data - in production, get from ad platforms
    const mockCosts: Record<string, number> = {
      'google_ads': 15000,
      'facebook': 8000,
      'linkedin': 12000,
      'organic': 0,
      'email': 2000,
      'events': 5000,
    };

    // Convert to array
    const results: ChannelPerformance[] = [];
    
    for (const [channel, data] of channelMap) {
      const cost = mockCosts[channel] || 0;
      const leads = data.leads.size;
      
      results.push({
        channel,
        touches: data.touches,
        attributedLeads: leads,
        attributedRevenue: data.revenue,
        cost,
        roi: cost > 0 ? ((data.revenue - cost) / cost) * 100 : 0,
        conversionRate: data.touches > 0 ? (leads / data.touches) * 100 : 0,
      });
    }

    // Sort by revenue
    return results.sort((a, b) => b.attributedRevenue - a.attributedRevenue);
  }

  // ============================================================
  // CAMPAIGN ATTRIBUTION
  // ============================================================

  async getCampaignAttribution(
    organizationId: string,
    period: string = '30d',
  ): Promise<Array<{
    campaign: string;
    channel: string;
    touches: number;
    leads: number;
    opportunities: number;
    revenue: number;
    cost: number;
    roi: number;
  }>> {
    const startDate = this.getDateFromPeriod(period);

    const touchpoints = await this.prisma.attributionTouchpoint.findMany({
      where: {
        organizationId,
        touchpointAt: { gte: startDate },
        campaign: { not: null },
      },
    });

    // Group by campaign
    const campaignMap = new Map<string, any>();

    for (const tp of touchpoints) {
      const key = `${tp.campaign}_${tp.channel}`;
      
      if (!campaignMap.has(key)) {
        campaignMap.set(key, {
          campaign: tp.campaign,
          channel: tp.channel || 'unknown',
          touches: 0,
          leads: new Set(),
          opportunities: new Set(),
          revenue: 0,
          cost: 0,
        });
      }

      const data = campaignMap.get(key);
      data.touches++;
      data.leads.add(tp.contactId);
      
      if (tp.conversionValue) {
        data.revenue += tp.conversionValue;
      }
    }

    // Convert to array
    const results = [];
    for (const data of campaignMap.values()) {
      const cost = Math.random() * 10000 + 1000; // Mock cost
      
      results.push({
        campaign: data.campaign,
        channel: data.channel,
        touches: data.touches,
        leads: data.leads.size,
        opportunities: data.opportunities.size,
        revenue: data.revenue,
        cost,
        roi: cost > 0 ? ((data.revenue - cost) / cost) * 100 : 0,
      });
    }

    return results.sort((a, b) => b.revenue - a.revenue);
  }

  // ============================================================
  // TOUCHPOINT TRACKING
  // ============================================================

  async trackTouchpoint(
    organizationId: string,
    data: {
      contactId: string;
      touchpointType: string;
      source: string;
      channel?: string;
      campaign?: string;
      metadata?: any;
    },
  ): Promise<any> {
    return this.prisma.attributionTouchpoint.create({
      data: {
        organizationId,
        contactId: data.contactId,
        touchpointType: data.touchpointType,
        source: data.source,
        channel: data.channel,
        campaign: data.campaign,
        touchpointAt: new Date(),
      },
    });
  }

  async trackConversion(
    organizationId: string,
    contactId: string,
    data: {
      convertedToId: string;
      conversionValue: number;
      conversionType: string;
    },
  ): Promise<void> {
    // Update all touchpoints for this contact
    await this.prisma.attributionTouchpoint.updateMany({
      where: { organizationId, contactId },
      data: {
        convertedToId: data.convertedToId,
        conversionValue: data.conversionValue,
      },
    });
  }

  // ============================================================
  // ATTRIBUTION MODELS MANAGEMENT
  // ============================================================

  async getAttributionModels(organizationId: string): Promise<any[]> {
    const models = await this.prisma.attributionModel.findMany({
      where: { organizationId },
    });

    if (models.length === 0) {
      // Create default models
      return this.createDefaultModels(organizationId);
    }

    return models;
  }

  private async createDefaultModels(organizationId: string): Promise<any[]> {
    const defaultModels = [
      {
        name: 'First Touch',
        modelType: 'first_touch',
        config: { description: '100% credit to first interaction' },
        isDefault: true,
      },
      {
        name: 'Last Touch',
        modelType: 'last_touch',
        config: { description: '100% credit to last interaction' },
      },
      {
        name: 'Linear',
        modelType: 'linear',
        config: { description: 'Equal credit to all touchpoints' },
      },
      {
        name: 'Time Decay',
        modelType: 'time_decay',
        config: { 
          description: 'More credit to recent touchpoints',
          decayFactor: 0.7,
        },
      },
      {
        name: 'Position Based',
        modelType: 'position_based',
        config: { 
          description: '40% first, 40% last, 20% middle',
          firstTouchWeight: 40,
          lastTouchWeight: 40,
          middleTouchWeight: 20,
        },
      },
    ];

    const created = [];
    for (const model of defaultModels) {
      const createdModel = await this.prisma.attributionModel.create({
        data: {
          organizationId,
          ...model,
        },
      });
      created.push(createdModel);
    }

    return created;
  }

  async setDefaultModel(
    organizationId: string,
    modelId: string,
  ): Promise<void> {
    // Clear existing default
    await this.prisma.attributionModel.updateMany({
      where: { organizationId },
      data: { isDefault: false },
    });

    // Set new default
    await this.prisma.attributionModel.update({
      where: { id: modelId, organizationId },
      data: { isDefault: true },
    });
  }

  // ============================================================
  // COMPARISON REPORTS
  // ============================================================

  async compareAttributionModels(
    organizationId: string,
    period: string = '30d',
  ): Promise<Record<string, ChannelPerformance[]>> {
    const models = ['first_touch', 'last_touch', 'linear', 'time_decay', 'position_based'];
    const results: Record<string, ChannelPerformance[]> = {};

    for (const model of models) {
      results[model] = await this.getChannelPerformance(organizationId, period, model);
    }

    return results;
  }

  // ============================================================
  // CUSTOMER JOURNEY
  // ============================================================

  async getCustomerJourney(
    organizationId: string,
    contactId: string,
  ): Promise<{
    contact: any;
    touchpoints: any[];
    totalTouches: number;
    journeyLength: number; // days
    conversionValue: number;
  }> {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId },
      include: { company: true },
    });

    const touchpoints = await this.prisma.attributionTouchpoint.findMany({
      where: { organizationId, contactId },
      orderBy: { touchpointAt: 'asc' },
    });

    const firstTouch = touchpoints[0]?.touchpointAt;
    const lastTouch = touchpoints[touchpoints.length - 1]?.touchpointAt;
    
    const journeyLength = firstTouch && lastTouch
      ? Math.round((lastTouch.getTime() - firstTouch.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const conversionValue = touchpoints.find((t) => t.conversionValue)?.conversionValue || 0;

    return {
      contact,
      touchpoints,
      totalTouches: touchpoints.length,
      journeyLength,
      conversionValue,
    };
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
