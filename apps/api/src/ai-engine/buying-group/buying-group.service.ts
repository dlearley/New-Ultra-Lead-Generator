import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface BuyingGroupDetectionResult {
  companyId: string;
  companyName: string;
  groupName: string;
  members: Array<{
    contactId: string;
    name: string;
    title: string;
    role: 'decision_maker' | 'champion' | 'influencer' | 'blocker' | 'user';
    influence: number;
    engagement: number;
    lastActivity: Date;
  }>;
  analysis: {
    groupSize: number;
    decisionMakers: number;
    champions: number;
    blockers: number;
    engagementScore: number;
    confidence: number;
  };
  recommendations: {
    missingRoles: string[];
    suggestedContacts: Array<{
      role: string;
      title: string;
      reason: string;
    }>;
    engagementStrategy: string;
    multiThreadingPlan: string[];
  };
}

@Injectable()
export class BuyingGroupService {
  private readonly logger = new Logger(BuyingGroupService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // DETECT BUYING GROUP
  // ============================================================

  async detectBuyingGroup(
    organizationId: string,
    companyId: string,
  ): Promise<BuyingGroupDetectionResult> {
    // Get company
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, organizationId },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    // Get all contacts at company
    const contacts = await this.prisma.contact.findMany({
      where: { organizationId, companyId },
      include: {
        activities: {
          orderBy: { occurredAt: 'desc' },
          take: 10,
        },
        enrollments: {
          include: {
            stepExecutions: {
              orderBy: { sentAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    // Analyze each contact's role
    const members = contacts.map((contact) => {
      const role = this.inferRole(contact);
      const influence = this.calculateInfluence(contact);
      const engagement = this.calculateEngagement(contact);
      const lastActivity = this.getLastActivity(contact);

      return {
        contactId: contact.id,
        name: `${contact.firstName} ${contact.lastName}`,
        title: contact.jobTitle || '',
        role,
        influence,
        engagement,
        lastActivity,
      };
    });

    // Sort by influence
    members.sort((a, b) => b.influence - a.influence);

    // Calculate group metrics
    const groupSize = members.length;
    const decisionMakers = members.filter((m) => m.role === 'decision_maker').length;
    const champions = members.filter((m) => m.role === 'champion').length;
    const blockers = members.filter((m) => m.role === 'blocker').length;
    const engagementScore = Math.round(
      members.reduce((sum, m) => sum + m.engagement, 0) / (members.length || 1),
    );
    const confidence = this.calculateConfidence(members);

    // Generate recommendations
    const recommendations = this.generateRecommendations(members, company);

    // Save buying group
    await this.saveBuyingGroup(organizationId, companyId, {
      members,
      groupSize,
      decisionMakers,
      champions,
      blockers,
      engagementScore,
      recommendations,
    });

    return {
      companyId,
      companyName: company.name,
      groupName: `${company.name} Evaluation Team`,
      members,
      analysis: {
        groupSize,
        decisionMakers,
        champions,
        blockers,
        engagementScore,
        confidence,
      },
      recommendations,
    };
  }

  private inferRole(contact: any): 'decision_maker' | 'champion' | 'influencer' | 'blocker' | 'user' {
    const title = (contact.jobTitle || '').toLowerCase();
    const email = (contact.email || '').toLowerCase();

    // Decision makers
    if (title.match(/ceo|cto|cio|cfo|chief|vp|vice president|head of|director/)) {
      return 'decision_maker';
    }

    // Champions (high engagement + senior)
    if (title.match(/manager|senior|lead/)) {
      return 'champion';
    }

    // Blockers (often IT security or procurement)
    if (title.match(/security|procurement|legal|compliance|procurement/)) {
      return 'blocker';
    }

    // Users (practitioners)
    if (title.match(/specialist|analyst|coordinator|associate/)) {
      return 'user';
    }

    return 'influencer';
  }

  private calculateInfluence(contact: any): number {
    let influence = 50; // Base

    // Title influence
    const title = (contact.jobTitle || '').toLowerCase();
    if (title.includes('ceo')) influence += 40;
    else if (title.includes('cto') || title.includes('cio')) influence += 35;
    else if (title.includes('vp') || title.includes('vice president')) influence += 30;
    else if (title.includes('director')) influence += 25;
    else if (title.includes('manager')) influence += 15;

    // Seniority influence
    if (contact.seniority === 'c_level') influence += 20;
    else if (contact.seniority === 'vp') influence += 15;
    else if (contact.seniority === 'director') influence += 10;

    // Engagement influence
    const recentActivities = contact.activities?.length || 0;
    influence += Math.min(recentActivities * 5, 20);

    return Math.min(influence, 100);
  }

  private calculateEngagement(contact: any): number {
    let engagement = 0;

    // Email engagement
    const executions = contact.enrollments?.flatMap((e: any) => e.stepExecutions) || [];
    const opens = executions.filter((e: any) => e.openedAt).length;
    const clicks = executions.filter((e: any) => e.clickedAt).length;
    const replies = executions.filter((e: any) => e.repliedAt).length;

    engagement += opens * 10;
    engagement += clicks * 20;
    engagement += replies * 50;

    // Recent activity
    const hasRecentActivity = contact.activities?.some(
      (a: any) => new Date(a.occurredAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    );
    if (hasRecentActivity) engagement += 20;

    return Math.min(engagement, 100);
  }

  private getLastActivity(contact: any): Date {
    const activities = contact.activities || [];
    const executions = contact.enrollments?.flatMap((e: any) => e.stepExecutions) || [];

    const lastActivity = activities[0]?.occurredAt;
    const lastExecution = executions[0]?.sentAt;

    if (!lastActivity) return lastExecution || new Date(0);
    if (!lastExecution) return lastActivity;

    return new Date(Math.max(new Date(lastActivity).getTime(), new Date(lastExecution).getTime()));
  }

  private calculateConfidence(members: any[]): number {
    if (members.length === 0) return 0;

    // Higher confidence with more senior contacts
    const seniorContacts = members.filter((m) => 
      m.role === 'decision_maker' || m.role === 'champion',
    ).length;

    // Higher confidence with engaged contacts
    const engagedContacts = members.filter((m) => m.engagement > 30).length;

    return Math.min((seniorContacts * 20) + (engagedContacts * 10) + 30, 95);
  }

  private generateRecommendations(
    members: any[],
    company: any,
  ): {
    missingRoles: string[];
    suggestedContacts: Array<{ role: string; title: string; reason: string }>;
    engagementStrategy: string;
    multiThreadingPlan: string[];
  } {
    const presentRoles = new Set(members.map((m) => m.role));
    const missingRoles: string[] = [];

    if (!presentRoles.has('decision_maker')) {
      missingRoles.push('economic_buyer');
    }
    if (!presentRoles.has('champion')) {
      missingRoles.push('internal_champion');
    }
    if (!presentRoles.has('user')) {
      missingRoles.push('end_user');
    }

    const suggestedContacts = [];
    if (!presentRoles.has('decision_maker')) {
      suggestedContacts.push({
        role: 'economic_buyer',
        title: 'VP or Director',
        reason: 'Need budget approval for this deal',
      });
    }
    if (!presentRoles.has('champion')) {
      suggestedContacts.push({
        role: 'internal_champion',
        title: 'Senior Manager',
        reason: 'Someone to advocate for your solution internally',
      });
    }

    const engagementStrategy = this.generateEngagementStrategy(members);
    const multiThreadingPlan = this.generateMultiThreadingPlan(members, company);

    return {
      missingRoles,
      suggestedContacts,
      engagementStrategy,
      multiThreadingPlan,
    };
  }

  private generateEngagementStrategy(members: any[]): string {
    const decisionMakers = members.filter((m) => m.role === 'decision_maker');
    const champions = members.filter((m) => m.role === 'champion');
    const influencers = members.filter((m) => m.role === 'influencer');

    if (decisionMakers.length === 0) {
      return 'Focus on finding and engaging the economic buyer. Leverage existing champions for introductions.';
    }

    if (champions.length === 0) {
      return 'Develop a champion who can advocate for you internally. Start with the most engaged influencer.';
    }

    return 'Multi-thread approach: Keep champions active, engage decision makers with ROI-focused content, and build consensus among influencers.';
  }

  private generateMultiThreadingPlan(members: any[], company: any): string[] {
    const plan: string[] = [];

    // Sort by influence
    const sorted = [...members].sort((a, b) => b.influence - a.influence);

    sorted.forEach((member, index) => {
      if (member.role === 'decision_maker') {
        plan.push(`Week ${index + 1}: Executive briefing with ${member.name} (${member.title}) - focus on ROI and business outcomes`);
      } else if (member.role === 'champion') {
        plan.push(`Week ${index + 1}: Enablement session with ${member.name} (${member.title}) - provide internal selling tools`);
      } else if (member.engagement > 50) {
        plan.push(`Week ${index + 1}: Technical deep-dive with ${member.name} (${member.title}) - address specific use cases`);
      }
    });

    if (plan.length === 0) {
      plan.push('Week 1: Initial outreach to senior contacts');
      plan.push('Week 2: Follow up with value-focused content');
      plan.push('Week 3: Request introduction to decision maker');
    }

    return plan.slice(0, 5);
  }

  private async saveBuyingGroup(
    organizationId: string,
    companyId: string,
    data: any,
  ): Promise<void> {
    await this.prisma.buyingGroup.upsert({
      where: {
        // Use a composite unique constraint would be better
        id: `${organizationId}_${companyId}`,
      },
      create: {
        organizationId,
        companyId,
        name: data.name,
        members: data.members,
        groupSize: data.groupSize,
        decisionMakers: data.decisionMakers,
        champions: data.champions,
        blockers: data.blockers,
        engagementScore: data.engagementScore,
        recommendations: data.recommendations,
      },
      update: {
        members: data.members,
        groupSize: data.groupSize,
        decisionMakers: data.decisionMakers,
        champions: data.champions,
        blockers: data.blockers,
        engagementScore: data.engagementScore,
        recommendations: data.recommendations,
        updatedAt: new Date(),
      },
    });
  }

  // ============================================================
  // GET BUYING GROUPS
  // ============================================================

  async getBuyingGroups(
    organizationId: string,
    filters?: {
      minEngagement?: number;
      hasDecisionMaker?: boolean;
    },
  ): Promise<any[]> {
    const where: any = { organizationId };

    if (filters?.minEngagement) {
      where.engagementScore = { gte: filters.minEngagement };
    }

    if (filters?.hasDecisionMaker) {
      where.decisionMakers = { gt: 0 };
    }

    return this.prisma.buyingGroup.findMany({
      where,
      include: { company: true },
      orderBy: { engagementScore: 'desc' },
    });
  }

  async getBuyingGroup(
    organizationId: string,
    companyId: string,
  ): Promise<any> {
    return this.prisma.buyingGroup.findFirst({
      where: { organizationId, companyId },
      include: { company: true },
    });
  }

  // ============================================================
  // UPDATE BUYING GROUP
  // ============================================================

  async addContactToBuyingGroup(
    organizationId: string,
    companyId: string,
    contactId: string,
  ): Promise<void> {
    const group = await this.getBuyingGroup(organizationId, companyId);
    if (!group) {
      // Create new group
      await this.detectBuyingGroup(organizationId, companyId);
      return;
    }

    // Get contact details
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, organizationId },
    });

    if (!contact) return;

    // Add to members
    const members = (group.members as any[]) || [];
    const role = this.inferRole(contact);
    const influence = this.calculateInfluence(contact);

    members.push({
      contactId: contact.id,
      name: `${contact.firstName} ${contact.lastName}`,
      title: contact.jobTitle,
      role,
      influence,
      engagement: 0,
      lastActivity: new Date(),
    });

    await this.prisma.buyingGroup.update({
      where: { id: group.id },
      data: {
        members,
        groupSize: members.length,
      },
    });
  }
}
