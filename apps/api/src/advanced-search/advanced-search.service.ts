import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  AdvancedSearchInput,
  AdvancedSearchResult,
  SearchAnalytics,
  NaturalLanguageQueryRequest,
  NaturalLanguageQueryResult,
  SearchSuggestion,
} from './dto/advanced-search.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdvancedSearchService {
  private readonly logger = new Logger(AdvancedSearchService.name);
  private readonly openaiApiKey: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
  }

  async advancedSearch(
    organizationId: string,
    input: AdvancedSearchInput
  ): Promise<AdvancedSearchResult> {
    const startTime = Date.now();
    const { mode = 'contacts', page = 1, limit = 20 } = input;

    try {
      // Build where clauses based on filters
      const contactWhere = this.buildContactWhereClause(organizationId, input);
      const companyWhere = this.buildCompanyWhereClause(organizationId, input);

      let contacts: AdvancedSearchResult['contacts'] = [];
      let companies: AdvancedSearchResult['companies'] = [];

      // Search based on mode
      if (mode === 'contacts' || mode === 'both') {
        contacts = await this.searchContacts(contactWhere, input);
      }

      if (mode === 'companies' || mode === 'both') {
        companies = await this.searchCompanies(companyWhere, input);
      }

      // Get analytics
      const analytics = await this.getSearchAnalytics(
        organizationId,
        contactWhere,
        companyWhere,
        mode
      );

      // Count total results
      const totalContacts =
        mode === 'contacts' || mode === 'both'
          ? await this.prisma.contact.count({ where: contactWhere })
          : 0;
      const totalCompanies =
        mode === 'companies' || mode === 'both'
          ? await this.prisma.company.count({ where: companyWhere })
          : 0;
      const totalResults = totalContacts + totalCompanies;

      this.logger.log(
        `Advanced search completed in ${Date.now() - startTime}ms. Found ${totalResults} results.`
      );

      return {
        contacts,
        companies,
        analytics,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalResults / limit),
          totalResults,
        },
      };
    } catch (error) {
      this.logger.error('Advanced search failed:', error);
      throw error;
    }
  }

  async naturalLanguageSearch(
    request: NaturalLanguageQueryRequest
  ): Promise<NaturalLanguageQueryResult> {
    const { query, organizationId } = request;

    // If OpenAI is not configured, use rule-based parsing
    if (!this.openaiApiKey) {
      return this.ruleBasedNLParse(query);
    }

    try {
      // Use OpenAI to parse natural language query
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a B2B search query parser. Convert natural language queries into structured search filters.
              
Available filter categories:
- Firmographics: employee count, revenue, industry, location, funding stage
- Technographics: technologies used (CRM, marketing automation, etc.)
- Contact: job titles, seniority, departments
- Intent: buying stage, recent activity, intent score

Respond with a JSON object containing:
{
  "parsedFilters": { /* structured filters */ },
  "explanation": "Human-readable explanation of what was parsed",
  "confidence": 0.95,
  "suggestedFilters": ["additional filters to consider"]
}`,
            },
            {
              role: 'user',
              content: query,
            },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = (data as any).choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content from OpenAI');
      }

      // Parse the JSON response
      const parsed = JSON.parse(content);

      return {
        originalQuery: query,
        parsedFilters: parsed.parsedFilters,
        aiExplanation: parsed.explanation,
        confidence: parsed.confidence,
        suggestedFilters: parsed.suggestedFilters || [],
      };
    } catch (error) {
      this.logger.warn('OpenAI NLP failed, falling back to rule-based:', error);
      return this.ruleBasedNLParse(query);
    }
  }

  async getSearchSuggestions(
    organizationId: string,
    query: string,
    type?: string
  ): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];

    // Company suggestions
    if (!type || type === 'company') {
      const companies = await this.prisma.company.findMany({
        where: {
          organizationId,
          name: { contains: query, mode: 'insensitive' },
        },
        take: 5,
        select: { id: true, name: true, domain: true },
      });

      companies.forEach((company) => {
        suggestions.push({
          type: 'company',
          value: company.id,
          label: company.name,
          metadata: { domain: company.domain },
        });
      });
    }

    // Industry suggestions
    if (!type || type === 'industry') {
      const industries = await this.prisma.company.groupBy({
        by: ['industry'],
        where: {
          organizationId,
          industry: { contains: query, mode: 'insensitive' },
        },
        _count: { industry: true },
        take: 5,
      });

      industries.forEach((ind) => {
        if (ind.industry) {
          suggestions.push({
            type: 'industry',
            value: ind.industry,
            label: ind.industry,
            count: ind._count.industry,
          });
        }
      });
    }

    // Technology suggestions
    if (!type || type === 'technology') {
      const technologies = await this.prisma.technology.findMany({
        where: {
          name: { contains: query, mode: 'insensitive' },
        },
        take: 5,
        select: { id: true, name: true, category: true },
      });

      technologies.forEach((tech) => {
        suggestions.push({
          type: 'technology',
          value: tech.id,
          label: tech.name,
          metadata: { category: tech.category },
        });
      });
    }

    // Location suggestions
    if (!type || type === 'location') {
      const locations = await this.prisma.location.findMany({
        where: {
          OR: [
            { city: { contains: query, mode: 'insensitive' } },
            { state: { contains: query, mode: 'insensitive' } },
            { country: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, city: true, state: true, country: true },
      });

      locations.forEach((loc) => {
        suggestions.push({
          type: 'location',
          value: loc.id,
          label: `${loc.city}, ${loc.state || loc.country}`,
          metadata: { city: loc.city, state: loc.state, country: loc.country },
        });
      });
    }

    return suggestions;
  }

  private buildContactWhereClause(
    organizationId: string,
    input: AdvancedSearchInput
  ): Prisma.ContactWhereInput {
    const where: Prisma.ContactWhereInput = {
      organizationId,
    };

    // Text search on name or email
    if (input.query) {
      where.OR = [
        { firstName: { contains: input.query, mode: 'insensitive' } },
        { lastName: { contains: input.query, mode: 'insensitive' } },
        { email: { contains: input.query, mode: 'insensitive' } },
        { title: { contains: input.query, mode: 'insensitive' } },
      ];
    }

    // Contact filters
    if (input.contacts) {
      const { contacts } = input;

      // Job titles
      if (contacts.titles?.include?.length) {
        where.title = {
          in: contacts.titles.include,
          mode: 'insensitive',
        };
      }

      if (contacts.titles?.exclude?.length) {
        where.NOT = {
          title: {
            in: contacts.titles.exclude,
            mode: 'insensitive',
          },
        };
      }

      // Seniority
      if (contacts.seniority?.length) {
        where.seniority = { in: contacts.seniority };
      }

      // Departments
      if (contacts.departments?.length) {
        where.department = { in: contacts.departments };
      }

      // Data quality filters
      if (contacts.mustHaveEmail) {
        where.email = { not: null };
      }

      if (contacts.mustHavePhone) {
        where.phone = { not: null };
      }

      if (contacts.emailVerified) {
        where.emailStatus = 'verified';
      }

      if (contacts.phoneVerified) {
        where.phoneStatus = 'verified';
      }
    }

    // Intent filters
    if (input.intent) {
      const { intent } = input;

      if (intent.score?.min !== undefined) {
        where.intentScore = {
          ...(where.intentScore as object),
          gte: intent.score.min,
        };
      }

      if (intent.score?.max !== undefined) {
        where.intentScore = {
          ...(where.intentScore as object),
          lte: intent.score.max,
        };
      }

      if (intent.buyingStage?.length) {
        where.buyingStage = { in: intent.buyingStage };
      }
    }

    // Account-based filters (target specific companies)
    if (input.accounts?.targetAccounts?.length) {
      where.companyId = { in: input.accounts.targetAccounts };
    }

    return where;
  }

  private buildCompanyWhereClause(
    organizationId: string,
    input: AdvancedSearchInput
  ): Prisma.CompanyWhereInput {
    const where: Prisma.CompanyWhereInput = {
      organizationId,
    };

    // Text search
    if (input.query) {
      where.OR = [
        { name: { contains: input.query, mode: 'insensitive' } },
        { description: { contains: input.query, mode: 'insensitive' } },
      ];
    }

    // Firmographic filters
    if (input.firmographics) {
      const { firmographics } = input;

      // Employee count
      if (firmographics.employeeCount) {
        if (firmographics.employeeCount.min !== undefined) {
          where.employeeCount = {
            ...(where.employeeCount as object),
            gte: firmographics.employeeCount.min,
          };
        }
        if (firmographics.employeeCount.max !== undefined) {
          where.employeeCount = {
            ...(where.employeeCount as object),
            lte: firmographics.employeeCount.max,
          };
        }
      }

      // Industry
      if (firmographics.industries?.length) {
        where.industry = { in: firmographics.industries };
      }

      // Location
      if (firmographics.locations?.countries?.length) {
        where.headquarters = {
          country: { in: firmographics.locations.countries },
        };
      }

      // Funding stage
      if (firmographics.fundingStage?.length) {
        where.fundingStage = { in: firmographics.fundingStage };
      }

      // Founded year
      if (firmographics.foundedYear) {
        // Note: This would need a foundedYear field added to schema
      }
    }

    // Technographic filters
    if (input.technographics?.include?.technologies?.length) {
      where.technologies = {
        some: {
          technology: {
            name: { in: input.technographics.include.technologies },
          },
        },
      };
    }

    // Intent filters
    if (input.intent?.score?.min !== undefined) {
      where.intentScore = { gte: input.intent.score.min };
    }

    return where;
  }

  private async searchContacts(
    where: Prisma.ContactWhereInput,
    input: AdvancedSearchInput
  ): Promise<AdvancedSearchResult['contacts']> {
    const { page = 1, limit = 20, sortBy = 'relevance', sortOrder = 'desc' } = input;

    const orderBy: Prisma.ContactOrderByWithRelationInput = {};

    switch (sortBy) {
      case 'intent_score':
        orderBy.intentScore = sortOrder;
        break;
      case 'recent_activity':
        orderBy.lastActivityAt = sortOrder;
        break;
      case 'created_at':
        orderBy.createdAt = sortOrder;
        break;
      default:
        orderBy.createdAt = 'desc';
    }

    const contacts = await this.prisma.contact.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            domain: true,
            industry: true,
            employeeCount: true,
          },
        },
      },
    });

    return contacts.map((contact) => ({
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      emailStatus: contact.emailStatus,
      title: contact.title || '',
      seniority: contact.seniority || '',
      department: contact.department || '',
      company: contact.company
        ? {
            id: contact.company.id,
            name: contact.company.name,
            domain: contact.company.domain || '',
            industry: contact.company.industry || '',
            employeeCount: contact.company.employeeCount || 0,
          }
        : undefined,
      intentScore: contact.intentScore,
      buyingStage: contact.buyingStage,
      enrichedAt: contact.enrichedAt || undefined,
    }));
  }

  private async searchCompanies(
    where: Prisma.CompanyWhereInput,
    input: AdvancedSearchInput
  ): Promise<AdvancedSearchResult['companies']> {
    const { page = 1, limit = 20 } = input;

    const companies = await this.prisma.company.findMany({
      where,
      orderBy: { intentScore: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        technologies: {
          include: {
            technology: {
              select: { name: true },
            },
          },
        },
        headquarters: {
          select: { city: true, state: true, country: true },
        },
      },
    });

    return companies.map((company) => ({
      id: company.id,
      name: company.name,
      domain: company.domain || '',
      industry: company.industry || '',
      employeeCount: company.employeeCount || 0,
      annualRevenue: company.annualRevenue || undefined,
      technologies: company.technologies.map((t) => t.technology.name),
      intentScore: company.intentScore,
      buyingStage: company.buyingStage,
      headquarters: company.headquarters
        ? {
            city: company.headquarters.city || '',
            state: company.headquarters.state || '',
            country: company.headquarters.country || '',
          }
        : undefined,
    }));
  }

  private async getSearchAnalytics(
    organizationId: string,
    contactWhere: Prisma.ContactWhereInput,
    companyWhere: Prisma.CompanyWhereInput,
    mode: string
  ): Promise<SearchAnalytics> {
    const facets: SearchAnalytics['facets'] = {
      industries: [],
      companySizes: [],
      locations: [],
      technologies: [],
      buyingStages: [],
    };

    let totalResults = 0;
    let highIntent = 0;
    let mediumIntent = 0;
    let lowIntent = 0;
    let totalIntentScore = 0;

    // Contact analytics
    if (mode === 'contacts' || mode === 'both') {
      const contacts = await this.prisma.contact.findMany({
        where: contactWhere,
        select: {
          intentScore: true,
          buyingStage: true,
          company: {
            select: {
              industry: true,
              employeeRange: true,
            },
          },
        },
      });

      totalResults += contacts.length;

      // Calculate intent distribution
      contacts.forEach((contact) => {
        if (contact.intentScore >= 70) highIntent++;
        else if (contact.intentScore >= 40) mediumIntent++;
        else lowIntent++;

        totalIntentScore += contact.intentScore;

        // Industry facet
        if (contact.company?.industry) {
          const existing = facets.industries.find(
            (i) => i.value === contact.company!.industry
          );
          if (existing) existing.count++;
          else facets.industries.push({ value: contact.company.industry, count: 1 });
        }
      });
    }

    // Company analytics
    if (mode === 'companies' || mode === 'both') {
      const companies = await this.prisma.company.findMany({
        where: companyWhere,
        select: {
          intentScore: true,
          buyingStage: true,
          industry: true,
          employeeRange: true,
          headquarters: {
            select: { country: true },
          },
        },
      });

      totalResults += companies.length;

      companies.forEach((company) => {
        if (company.intentScore >= 70) highIntent++;
        else if (company.intentScore >= 40) mediumIntent++;
        else lowIntent++;

        totalIntentScore += company.intentScore;

        // Industry facet
        if (company.industry) {
          const existing = facets.industries.find((i) => i.value === company.industry);
          if (existing) existing.count++;
          else facets.industries.push({ value: company.industry, count: 1 });
        }
      });
    }

    return {
      totalResults,
      facets,
      intentDistribution: {
        high: highIntent,
        medium: mediumIntent,
        low: lowIntent,
      },
      avgIntentScore: totalResults > 0 ? totalIntentScore / totalResults : 0,
    };
  }

  private ruleBasedNLParse(query: string): NaturalLanguageQueryResult {
    const lowerQuery = query.toLowerCase();
    const parsedFilters: AdvancedSearchInput = {
      mode: 'both',
    };

    // Parse company size
    const sizeMatch = lowerQuery.match(/(\d+)\s*-\s*(\d+)\s*employees?/);
    if (sizeMatch) {
      parsedFilters.firmographics = {
        ...(parsedFilters.firmographics || {}),
        employeeCount: {
          min: parseInt(sizeMatch[1]),
          max: parseInt(sizeMatch[2]),
        },
      };
    }

    // Parse location
    const locationMatch = lowerQuery.match(/in\s+([a-z\s]+)(?:,|\s+with|\s+using|$)/i);
    if (locationMatch) {
      parsedFilters.firmographics = {
        ...(parsedFilters.firmographics || {}),
        locations: {
          cities: [locationMatch[1].trim()],
        },
      };
    }

    // Parse technologies
    const techMatch = lowerQuery.match(/using\s+([a-z\s]+)(?:\s+with|\s+and|\s+in|$)/i);
    if (techMatch) {
      parsedFilters.technographics = {
        include: {
          technologies: [techMatch[1].trim()],
        },
      };
    }

    // Parse industry
    const industryKeywords = ['saas', 'software', 'healthcare', 'finance', 'retail', 'manufacturing'];
    for (const keyword of industryKeywords) {
      if (lowerQuery.includes(keyword)) {
        parsedFilters.firmographics = {
          ...(parsedFilters.firmographics || {}),
          industries: [keyword.charAt(0).toUpperCase() + keyword.slice(1)],
        };
        break;
      }
    }

    return {
      originalQuery: query,
      parsedFilters,
      aiExplanation: `Parsed query for ${parsedFilters.firmographics?.industries?.[0] || 'companies'} in ${parsedFilters.firmographics?.locations?.cities?.[0] || 'any location'}`,
      confidence: 0.7,
      suggestedFilters: ['Add funding stage filter', 'Add intent score threshold'],
    };
  }
}
