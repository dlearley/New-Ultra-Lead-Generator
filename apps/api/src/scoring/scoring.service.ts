import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { ConfigService } from '@nestjs/config';

export interface ScoringRule {
  id: string;
  name: string;
  description: string;
  ruleType: 'demographic' | 'behavioral' | 'firmographic' | 'intent' | 'engagement';
  condition: {
    field: string;
    operator: string;
    value: any;
  };
  points: number;
  maxPoints?: number;
  frequency: 'once' | 'daily' | 'per_session' | 'unlimited';
}

export interface ScoreBreakdown {
  ruleId: string;
  ruleName: string;
  points: number;
  reason: string;
}

export interface LeadScoreResult {
  totalScore: number;
  maxPossible: number;
  category: 'hot' | 'warm' | 'cold';
  breakdown: {
    demographic: number;
    behavioral: number;
    firmographic: number;
    intent: number;
    engagement: number;
  };
  ruleContributions: ScoreBreakdown[];
  conversionProbability?: number;
}

@Injectable()
export class LeadScoringService {
  private readonly logger = new Logger(LeadScoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================================
  // REAL-TIME SCORING
  // ============================================================

  async calculateLeadScore(
    organizationId: string,
    contactId: string,
    modelId?: string,
  ): Promise<LeadScoreResult> {
    // Get scoring model
    const model = modelId 
      ? await this.prisma.leadScoringModel.findFirst({
          where: { id: modelId, organizationId },
        })
      : await this.prisma.leadScoringModel.findFirst({
          where: { organizationId, status: 'active' },
          orderBy: { createdAt: 'desc' },
        });

    if (!model) {
      throw new Error('No active scoring model found');
    }

    // Get contact data
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId },
      include: {
        company: true,
        intents: {
          where: { expiresAt: { gt: new Date() } },
          orderBy: { detectedAt: 'desc' },
        },
        activities: {
          orderBy: { occurredAt: 'desc' },
          take: 50,
        },
        pageViewsList: {
          orderBy: { viewedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Get scoring rules
    const rules: ScoringRule[] = model.rules as any[];
    
    // Calculate scores by category
    const breakdown = {
      demographic: 0,
      behavioral: 0,
      firmographic: 0,
      intent: 0,
      engagement: 0,
    };

    const ruleContributions: ScoreBreakdown[] = [];

    for (const rule of rules) {
      if (!rule.condition) continue;

      const matches = this.evaluateRule(rule.condition, contact);
      
      if (matches) {
        const points = Math.min(
          rule.points,
          rule.maxPoints || rule.points,
        );

        breakdown[rule.ruleType] += points;
        
        ruleContributions.push({
          ruleId: rule.id,
          ruleName: rule.name,
          points,
          reason: this.generateRuleDescription(rule, contact),
        });
      }
    }

    const totalScore = Object.values(breakdown).reduce((a, b) => a + b, 0);

    // Determine category
    const category = this.getScoreCategory(totalScore, model);

    // Calculate conversion probability (simplified model)
    const conversionProbability = this.calculateConversionProbability(
      totalScore,
      breakdown,
      contact,
    );

    // Save score
    await this.saveLeadScore(
      organizationId,
      model.id,
      contactId,
      totalScore,
      breakdown,
      category,
      ruleContributions,
      conversionProbability,
    );

    return {
      totalScore,
      maxPossible: model.maxPossible || 100,
      category,
      breakdown,
      ruleContributions,
      conversionProbability,
    };
  }

  // ============================================================
  // RULE EVALUATION
  // ============================================================

  private evaluateRule(condition: any, contact: any): boolean {
    const { field, operator, value } = condition;
    
    // Get field value from contact data
    const fieldValue = this.getFieldValue(field, contact);
    
    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }

    switch (operator) {
      case 'eq':
      case 'equals':
        return fieldValue === value;
      
      case 'neq':
      case 'not_equals':
        return fieldValue !== value;
      
      case 'gt':
      case 'greater_than':
        return fieldValue > value;
      
      case 'gte':
      case 'greater_than_or_equal':
        return fieldValue >= value;
      
      case 'lt':
      case 'less_than':
        return fieldValue < value;
      
      case 'lte':
      case 'less_than_or_equal':
        return fieldValue <= value;
      
      case 'contains':
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(value);
        }
        if (typeof fieldValue === 'string') {
          return fieldValue.toLowerCase().includes(value.toLowerCase());
        }
        return false;
      
      case 'not_contains':
        if (Array.isArray(fieldValue)) {
          return !fieldValue.includes(value);
        }
        if (typeof fieldValue === 'string') {
          return !fieldValue.toLowerCase().includes(value.toLowerCase());
        }
        return false;
      
      case 'in':
        if (Array.isArray(value)) {
          return value.includes(fieldValue);
        }
        return false;
      
      case 'has':
        if (Array.isArray(fieldValue)) {
          return fieldValue.some((item) => 
            JSON.stringify(item).toLowerCase().includes(value.toLowerCase())
          );
        }
        return false;
      
      case 'regex':
        const regex = new RegExp(value, 'i');
        return regex.test(String(fieldValue));
      
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
      
      default:
        return false;
    }
  }

  private getFieldValue(field: string, contact: any): any {
    const parts = field.split('.');
    let value: any = contact;
    
    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      
      // Handle arrays
      if (Array.isArray(value)) {
        // Return array length or check if array has items
        if (part === 'length') {
          return value.length;
        }
        if (part === 'count') {
          return value.length;
        }
        // Map to array of values
        return value.map((item) => item[part]).filter(Boolean);
      }
      
      value = value[part];
    }
    
    return value;
  }

  // ============================================================
  // SCORING UTILITIES
  // ============================================================

  private getScoreCategory(
    score: number,
    model: any,
  ): 'hot' | 'warm' | 'cold' {
    if (score >= (model.hotThreshold || 70)) {
      return 'hot';
    }
    if (score >= (model.warmThreshold || 40)) {
      return 'warm';
    }
    return 'cold';
  }

  private calculateConversionProbability(
    totalScore: number,
    breakdown: any,
    contact: any,
  ): number {
    // Simplified predictive model
    // Base probability from score
    let probability = (totalScore / 100) * 0.8;
    
    // Boost for intent signals
    if (breakdown.intent > 20) {
      probability += 0.1;
    }
    
    // Boost for engagement
    if (breakdown.engagement > 15) {
      probability += 0.05;
    }
    
    // Cap at 95%
    return Math.min(probability, 0.95);
  }

  private generateRuleDescription(rule: ScoringRule, contact: any): string {
    const { condition } = rule;
    
    const operatorDescriptions: Record<string, string> = {
      eq: 'equals',
      equals: 'equals',
      gt: 'greater than',
      gte: 'at least',
      lt: 'less than',
      lte: 'at most',
      contains: 'contains',
      exists: 'is set',
    };
    
    const operatorDesc = operatorDescriptions[condition.operator] || condition.operator;
    
    return `${condition.field} ${operatorDesc} ${condition.value}`;
  }

  // ============================================================
  // DATA PERSISTENCE
  // ============================================================

  private async saveLeadScore(
    organizationId: string,
    modelId: string,
    contactId: string,
    totalScore: number,
    breakdown: any,
    category: string,
    ruleContributions: ScoreBreakdown[],
    conversionProbability?: number,
  ): Promise<void> {
    // Get previous score for change calculation
    const previousScoreRecord = await this.prisma.leadScore.findFirst({
      where: { contactId, modelId },
      orderBy: { calculatedAt: 'desc' },
    });

    const previousScore = previousScoreRecord?.totalScore || 0;
    const scoreChange = totalScore - previousScore;

    // Upsert lead score
    await this.prisma.leadScore.upsert({
      where: {
        modelId_contactId: {
          modelId,
          contactId,
        },
      },
      create: {
        modelId,
        organizationId,
        contactId,
        totalScore,
        maxPossible: 100,
        category,
        demographicScore: breakdown.demographic,
        behavioralScore: breakdown.behavioral,
        firmographicScore: breakdown.firmographic,
        intentScore: breakdown.intent,
        engagementScore: breakdown.engagement,
        ruleBreakdown: ruleContributions as any,
        conversionProbability,
        previousScore,
        scoreChange,
      },
      update: {
        totalScore,
        category,
        demographicScore: breakdown.demographic,
        behavioralScore: breakdown.behavioral,
        firmographicScore: breakdown.firmographic,
        intentScore: breakdown.intent,
        engagementScore: breakdown.engagement,
        ruleBreakdown: ruleContributions as any,
        conversionProbability,
        previousScore,
        scoreChange,
        calculatedAt: new Date(),
      },
    });

    // Record in history
    await this.prisma.scoreHistory.create({
      data: {
        organizationId,
        contactId,
        score: totalScore,
        category,
        triggerType: 'rule_triggered',
        previousScore,
        change: scoreChange,
        ruleBreakdown: ruleContributions as any,
      },
    });

    // Update contact's lead score
    await this.prisma.contact.update({
      where: { id: contactId },
      data: { leadScore: totalScore },
    });
  }

  // ============================================================
  // BATCH SCORING
  // ============================================================

  async batchScoreLeads(
    organizationId: string,
    modelId?: string,
    filters?: any,
  ): Promise<{ scored: number; errors: number }> {
    const contacts = await this.prisma.contact.findMany({
      where: {
        organizationId,
        ...(filters || {}),
      },
      select: { id: true },
    });

    let scored = 0;
    let errors = 0;

    for (const contact of contacts) {
      try {
        await this.calculateLeadScore(organizationId, contact.id, modelId);
        scored++;
      } catch (error) {
        this.logger.error(`Failed to score contact ${contact.id}:`, error);
        errors++;
      }
    }

    return { scored, errors };
  }

  // ============================================================
  // SCORE RETRIEVAL
  // ============================================================

  async getLeadScore(
    organizationId: string,
    contactId: string,
    modelId?: string,
  ): Promise<any> {
    const where: any = {
      contactId,
      model: { organizationId },
    };

    if (modelId) {
      where.modelId = modelId;
    }

    return this.prisma.leadScore.findFirst({
      where,
      orderBy: { calculatedAt: 'desc' },
      include: {
        model: true,
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            company: {
              select: { name: true },
            },
          },
        },
      },
    });
  }

  async getScoreHistory(
    organizationId: string,
    contactId: string,
    limit: number = 30,
  ): Promise<any[]> {
    return this.prisma.scoreHistory.findMany({
      where: { organizationId, contactId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });
  }

  async getHotLeads(
    organizationId: string,
    limit: number = 50,
  ): Promise<any[]> {
    return this.prisma.leadScore.findMany({
      where: {
        organizationId,
        category: 'hot',
      },
      orderBy: { totalScore: 'desc' },
      take: limit,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            company: {
              select: { name: true },
            },
          },
        },
      },
    });
  }
}
