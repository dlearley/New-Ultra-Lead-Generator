import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';
import { ConfigService } from '@nestjs/config';

export interface ResearchScope {
  news?: boolean;
  techStack?: boolean;
  competitors?: boolean;
  funding?: boolean;
  hiring?: boolean;
  intent?: boolean;
}

export interface AccountResearchResult {
  companyId: string;
  companyName: string;
  researchDate: Date;
  findings: {
    news?: Array<{
      title: string;
      source: string;
      date: string;
      summary: string;
      relevance: number;
    }>;
    techStack?: string[];
    competitors?: string[];
    funding?: {
      round: string;
      amount: number;
      date: string;
      investors: string[];
    };
    hiring?: {
      openRoles: number;
      departments: string[];
      growthRate: number;
    };
    intent?: {
      score: number;
      signals: string[];
      topics: string[];
    };
  };
  insights: string[];
  talkingPoints: string[];
}

@Injectable()
export class AccountResearchService {
  private readonly logger = new Logger(AccountResearchService.name);
  private newsApiKey: string;
  private clearbitKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.newsApiKey = this.configService.get('NEWS_API_KEY') || '';
    this.clearbitKey = this.configService.get('CLEARBIT_API_KEY') || '';
  }

  // ============================================================
  // ACCOUNT RESEARCH
  // ============================================================

  async researchAccount(
    organizationId: string,
    companyId: string,
    scope: ResearchScope = { news: true, techStack: true, competitors: true },
  ): Promise<AccountResearchResult> {
    // Get company details
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, organizationId },
    });

    if (!company) {
      throw new Error('Company not found');
    }

    // Create research job
    const job = await this.prisma.aIResearchJob.create({
      data: {
        organizationId,
        companyId,
        jobType: 'account_research',
        status: 'running',
        researchScope: scope as any,
        startedAt: new Date(),
      },
    });

    try {
      // Perform research
      const findings: any = {};

      if (scope.news) {
        findings.news = await this.researchNews(company.name, company.industry);
      }

      if (scope.techStack) {
        findings.techStack = await this.researchTechStack(company.website);
      }

      if (scope.competitors) {
        findings.competitors = await this.researchCompetitors(company.name, company.industry);
      }

      if (scope.funding) {
        findings.funding = await this.researchFunding(company.name);
      }

      if (scope.hiring) {
        findings.hiring = await this.researchHiring(company.name);
      }

      // Generate insights and talking points
      const insights = this.generateInsights(findings, company);
      const talkingPoints = this.generateTalkingPoints(findings, company);

      // Save results
      await this.prisma.aIResearchJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          results: findings,
          insights: { insights, talkingPoints },
          completedAt: new Date(),
        },
      });

      // Update or create account intelligence
      await this.saveAccountIntelligence(organizationId, companyId, findings);

      return {
        companyId,
        companyName: company.name,
        researchDate: new Date(),
        findings,
        insights,
        talkingPoints,
      };
    } catch (error: any) {
      await this.prisma.aIResearchJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }

  // ============================================================
  // NEWS RESEARCH
  // ============================================================

  private async researchNews(companyName: string, industry?: string): Promise<any[]> {
    // In production, call NewsAPI or similar
    // For now, return mock data
    
    const mockNews = [
      {
        title: `${companyName} Announces Expansion into European Markets`,
        source: 'TechCrunch',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        summary: `The company plans to open offices in London and Berlin, signaling aggressive growth in the region.`,
        relevance: 95,
      },
      {
        title: `${companyName} Partners with Major Enterprise Client`,
        source: 'Business Insider',
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        summary: `A landmark deal that represents significant revenue potential and market validation.`,
        relevance: 85,
      },
      {
        title: `Industry Report: ${industry || 'Tech'} Sector Sees Record Growth`,
        source: 'Industry Weekly',
        date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        summary: `Market analysis shows 35% growth in the sector, with ${companyName} positioned as a key player.`,
        relevance: 70,
      },
    ];

    return mockNews;
  }

  // ============================================================
  // TECH STACK RESEARCH
  // ============================================================

  private async researchTechStack(website?: string): Promise<string[]> {
    // In production, use BuiltWith or similar
    // For now, return common tech stack
    
    return [
      'Salesforce',
      'HubSpot',
      'Marketo',
      'AWS',
      'Slack',
      'Zoom',
      'Tableau',
      'Segment',
    ];
  }

  // ============================================================
  // COMPETITOR RESEARCH
  // ============================================================

  private async researchCompetitors(companyName: string, industry?: string): Promise<string[]> {
    // Mock competitor data
    const competitorsByIndustry: Record<string, string[]> = {
      'SaaS': ['Salesforce', 'HubSpot', 'Zendesk', 'Intercom'],
      'Fintech': ['Stripe', 'Plaid', 'Brex', 'Mercury'],
      'Healthcare': ['Epic', 'Cerner', 'Athenahealth'],
      'E-commerce': ['Shopify', 'BigCommerce', 'WooCommerce'],
    };

    return competitorsByIndustry[industry || 'SaaS'] || ['Competitor A', 'Competitor B'];
  }

  // ============================================================
  // FUNDING RESEARCH
  // ============================================================

  private async researchFunding(companyName: string): Promise<any> {
    // In production, query Crunchbase or similar
    // Mock funding data
    
    return {
      round: 'Series B',
      amount: 25000000,
      date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      investors: ['Andreessen Horowitz', 'Sequoia Capital', 'Local VC'],
    };
  }

  // ============================================================
  // HIRING RESEARCH
  // ============================================================

  private async researchHiring(companyName: string): Promise<any> {
    // In production, scrape LinkedIn Jobs or similar
    // Mock hiring data
    
    return {
      openRoles: 42,
      departments: ['Engineering', 'Sales', 'Marketing', 'Customer Success'],
      growthRate: 35,
    };
  }

  // ============================================================
  // INSIGHT GENERATION
  // ============================================================

  private generateInsights(findings: any, company: any): string[] {
    const insights: string[] = [];

    // Funding insight
    if (findings.funding) {
      const monthsAgo = Math.floor(
        (Date.now() - new Date(findings.funding.date).getTime()) / (30 * 24 * 60 * 60 * 1000),
      );
      insights.push(
        `Recently raised $${(findings.funding.amount / 1000000).toFixed(0)}M ${findings.funding.round} (${monthsAgo} months ago) - likely have budget for new solutions`,
      );
    }

    // Hiring insight
    if (findings.hiring?.growthRate > 30) {
      insights.push(
        `Aggressive hiring (${findings.hiring.growthRate}% growth) suggests rapid expansion and potential scaling challenges`,
      );
    }

    // News insight
    if (findings.news?.length > 0) {
      const recentExpansion = findings.news.find((n: any) => 
        n.title.toLowerCase().includes('expansion') || 
        n.title.toLowerCase().includes('growth'),
      );
      if (recentExpansion) {
        insights.push(
          `Recent expansion news indicates growing pains where your solution could help`,
        );
      }
    }

    // Tech stack insight
    if (findings.techStack?.includes('Salesforce')) {
      insights.push(
        `Uses Salesforce - your CRM integration could be a key selling point`,
      );
    }

    return insights;
  }

  private generateTalkingPoints(findings: any, company: any): string[] {
    const talkingPoints: string[] = [];

    if (findings.funding) {
      talkingPoints.push(
        `I saw you raised $${(findings.funding.amount / 1000000).toFixed(0)}M recently - congratulations on the momentum!`,
      );
    }

    if (findings.news?.length > 0) {
      talkingPoints.push(
        `I read about your ${findings.news[0].title.toLowerCase().replace(company.name.toLowerCase(), 'your company')} - exciting times!`,
      );
    }

    if (findings.hiring?.growthRate > 30) {
      talkingPoints.push(
        `With ${findings.hiring.openRoles} open roles, it looks like you're scaling fast. How are you managing the growth?`,
      );
    }

    talkingPoints.push(
      `Given your tech stack includes ${findings.techStack?.slice(0, 3).join(', ')}, I think you'd appreciate how we integrate with your existing tools.`,
    );

    return talkingPoints;
  }

  // ============================================================
  // SAVE INTELLIGENCE
  // ============================================================

  private async saveAccountIntelligence(
    organizationId: string,
    companyId: string,
    findings: any,
  ): Promise<void> {
    await this.prisma.accountIntelligence.upsert({
      where: {
        organizationId_companyId: {
          organizationId,
          companyId,
        },
      },
      create: {
        organizationId,
        companyId,
        recentNews: findings.news,
        techStack: findings.techStack,
        competitors: findings.competitors,
        fundingNews: findings.funding,
        hiringActivity: findings.hiring,
        intentScore: findings.intent?.score || 0,
        lastResearchedAt: new Date(),
        researchSource: ['newsapi', 'builtwith', 'crunchbase'],
      },
      update: {
        recentNews: findings.news,
        techStack: findings.techStack,
        competitors: findings.competitors,
        fundingNews: findings.funding,
        hiringActivity: findings.hiring,
        intentScore: findings.intent?.score || 0,
        lastResearchedAt: new Date(),
        researchSource: ['newsapi', 'builtwith', 'crunchbase'],
      },
    });
  }

  // ============================================================
  // GET INTELLIGENCE
  // ============================================================

  async getAccountIntelligence(
    organizationId: string,
    companyId: string,
  ): Promise<any> {
    return this.prisma.accountIntelligence.findFirst({
      where: { organizationId, companyId },
    });
  }

  async getRecentIntelligence(
    organizationId: string,
    limit: number = 10,
  ): Promise<any[]> {
    return this.prisma.accountIntelligence.findMany({
      where: { organizationId },
      orderBy: { lastResearchedAt: 'desc' },
      take: limit,
      include: { company: true },
    });
  }

  // ============================================================
  // BATCH RESEARCH
  // ============================================================

  async batchResearch(
    organizationId: string,
    companyIds: string[],
    scope: ResearchScope,
  ): Promise<{
    jobId: string;
    status: string;
    companies: number;
  }> {
    // Create batch job
    const job = await this.prisma.aIResearchJob.create({
      data: {
        organizationId,
        jobType: 'batch_account_research',
        status: 'pending',
        researchScope: { ...scope as any, companyIds },
      },
    });

    // Process in background (in production, use queue)
    this.processBatchResearch(job.id, organizationId, companyIds, scope);

    return {
      jobId: job.id,
      status: 'pending',
      companies: companyIds.length,
    };
  }

  private async processBatchResearch(
    jobId: string,
    organizationId: string,
    companyIds: string[],
    scope: ResearchScope,
  ): Promise<void> {
    await this.prisma.aIResearchJob.update({
      where: { id: jobId },
      data: { status: 'running', startedAt: new Date() },
    });

    let completed = 0;

    for (const companyId of companyIds) {
      try {
        await this.researchAccount(organizationId, companyId, scope);
        completed++;
      } catch (error) {
        this.logger.error(`Failed to research ${companyId}:`, error);
      }
    }

    await this.prisma.aIResearchJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        results: { completed, total: companyIds.length },
        completedAt: new Date(),
      },
    });
  }
}
