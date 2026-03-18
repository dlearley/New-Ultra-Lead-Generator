import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface FilterConfig {
  dateRange?: string;
  source?: string[];
  status?: string[];
  assignedTo?: string[];
  leadScore?: { min?: number; max?: number };
  industry?: string[];
  companySize?: string[];
  tags?: string[];
  custom?: Record<string, any>;
}

@Injectable()
export class SavedFiltersService {
  private readonly logger = new Logger(SavedFiltersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // FILTER CRUD
  // ============================================================

  async createFilter(
    organizationId: string,
    userId: string,
    data: {
      name: string;
      filterType: string;
      filters: FilterConfig;
      isDefault?: boolean;
      isShared?: boolean;
    },
  ): Promise<any> {
    // If setting as default, clear existing default for this type
    if (data.isDefault) {
      await this.prisma.savedFilter.updateMany({
        where: {
          organizationId,
          userId,
          filterType: data.filterType,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.savedFilter.create({
      data: {
        organizationId,
        userId,
        name: data.name,
        filterType: data.filterType,
        filters: data.filters as any,
        isDefault: data.isDefault || false,
        isShared: data.isShared || false,
      },
    });
  }

  async getFilters(
    organizationId: string,
    userId: string,
    options?: {
      filterType?: string;
      includeShared?: boolean;
    },
  ): Promise<any[]> {
    const where: any = {
      organizationId,
      OR: [
        { userId },
        ...(options?.includeShared !== false ? [{ isShared: true }] : []),
      ],
    };

    if (options?.filterType) {
      where.filterType = options.filterType;
    }

    return this.prisma.savedFilter.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { updatedAt: 'desc' },
      ],
    });
  }

  async getFilter(
    organizationId: string,
    userId: string,
    filterId: string,
  ): Promise<any> {
    return this.prisma.savedFilter.findFirst({
      where: {
        id: filterId,
        organizationId,
        OR: [
          { userId },
          { isShared: true },
        ],
      },
    });
  }

  async updateFilter(
    organizationId: string,
    userId: string,
    filterId: string,
    data: Partial<{
      name: string;
      filters: FilterConfig;
      isDefault: boolean;
      isShared: boolean;
    }>,
  ): Promise<any> {
    // Verify ownership
    const filter = await this.prisma.savedFilter.findFirst({
      where: { id: filterId, organizationId, userId },
    });

    if (!filter) {
      throw new Error('Filter not found or not owned by user');
    }

    // If setting as default, clear existing
    if (data.isDefault) {
      await this.prisma.savedFilter.updateMany({
        where: {
          organizationId,
          userId,
          filterType: filter.filterType,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.savedFilter.update({
      where: { id: filterId },
      data: {
        name: data.name,
        filters: data.filters as any,
        isDefault: data.isDefault,
        isShared: data.isShared,
      },
    });
  }

  async deleteFilter(
    organizationId: string,
    userId: string,
    filterId: string,
  ): Promise<void> {
    await this.prisma.savedFilter.deleteMany({
      where: {
        id: filterId,
        organizationId,
        userId,
      },
    });
  }

  // ============================================================
  // ROLE-BASED FILTERS
  // ============================================================

  async getRoleBasedFilters(
    organizationId: string,
    userId: string,
    userRole: string,
  ): Promise<{
    myFilters: any[];
    teamFilters: any[];
    recommendedFilters: any[];
  }> {
    // Get user's filters
    const myFilters = await this.getFilters(organizationId, userId);

    // Get shared filters based on role
    let teamFilterTypes: string[] = [];
    
    switch (userRole) {
      case 'sales':
        teamFilterTypes = ['leads', 'contacts', 'deals', 'activities'];
        break;
      case 'marketing':
        teamFilterTypes = ['leads', 'campaigns', 'content', 'roi'];
        break;
      case 'executive':
        teamFilterTypes = ['pipeline', 'revenue', 'forecasts', 'kpi'];
        break;
      default:
        teamFilterTypes = ['leads', 'contacts'];
    }

    const teamFilters = await this.prisma.savedFilter.findMany({
      where: {
        organizationId,
        isShared: true,
        filterType: { in: teamFilterTypes },
        userId: { not: userId },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Get recommended filters (popular shared ones)
    const recommendedFilters = await this.getRecommendedFilters(
      organizationId,
      userRole,
    );

    return {
      myFilters,
      teamFilters,
      recommendedFilters,
    };
  }

  private async getRecommendedFilters(
    organizationId: string,
    userRole: string,
  ): Promise<any[]> {
    // Role-specific recommended filters
    const roleRecommendations: Record<string, string[]> = {
      sales: [
        'My Hot Leads',
        'Follow-up Due Today',
        'Deals Closing This Month',
        'Unresponsive Contacts',
      ],
      marketing: [
        'High-Intent Leads',
        'Campaign Performance',
        'Content Engagement',
        'ROI by Channel',
      ],
      executive: [
        'Revenue Forecast',
        'Team Performance',
        'Pipeline Health',
        'Key Metrics',
      ],
    };

    const recommendedNames = roleRecommendations[userRole] || roleRecommendations['sales'];

    return this.prisma.savedFilter.findMany({
      where: {
        organizationId,
        isShared: true,
        name: { in: recommendedNames },
      },
    });
  }

  // ============================================================
  // APPLY FILTERS
  // ============================================================

  async applyFilter(
    organizationId: string,
    filterId: string,
  ): Promise<{
    filter: any;
    query: any;
  }> {
    const filter = await this.prisma.savedFilter.findFirst({
      where: {
        id: filterId,
        organizationId,
      },
    });

    if (!filter) {
      throw new Error('Filter not found');
    }

    const query = this.buildQuery(filter.filterType, filter.filters as FilterConfig);

    return { filter, query };
  }

  private buildQuery(filterType: string, filters: FilterConfig): any {
    const where: any = {};

    // Date range
    if (filters.dateRange) {
      where.createdAt = {
        gte: this.getDateFromRange(filters.dateRange),
      };
    }

    // Source
    if (filters.source?.length) {
      where.leadSource = { in: filters.source };
    }

    // Status
    if (filters.status?.length) {
      where.status = { in: filters.status };
    }

    // Assigned to
    if (filters.assignedTo?.length) {
      where.assignedToId = { in: filters.assignedTo };
    }

    // Lead score
    if (filters.leadScore) {
      where.leadScore = {};
      if (filters.leadScore.min !== undefined) {
        where.leadScore.gte = filters.leadScore.min;
      }
      if (filters.leadScore.max !== undefined) {
        where.leadScore.lte = filters.leadScore.max;
      }
    }

    // Industry
    if (filters.industry?.length) {
      where.company = { industry: { in: filters.industry } };
    }

    // Tags
    if (filters.tags?.length) {
      where.tags = { hasSome: filters.tags };
    }

    return where;
  }

  // ============================================================
  // DEFAULT FILTERS BY ROLE
  // ============================================================

  async createDefaultFiltersForUser(
    organizationId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    const defaults = this.getDefaultFiltersForRole(userRole);

    for (const filter of defaults) {
      const existing = await this.prisma.savedFilter.findFirst({
        where: {
          organizationId,
          userId,
          name: filter.name,
        },
      });

      if (!existing) {
        await this.prisma.savedFilter.create({
          data: {
            organizationId,
            userId,
            name: filter.name,
            filterType: filter.filterType,
            filters: filter.filters as any,
            isDefault: filter.isDefault || false,
          },
        });
      }
    }
  }

  private getDefaultFiltersForRole(userRole: string): Array<{
    name: string;
    filterType: string;
    filters: FilterConfig;
    isDefault?: boolean;
  }> {
    const defaults: Record<string, any[]> = {
      sales: [
        {
          name: 'My Hot Leads',
          filterType: 'leads',
          filters: { leadScore: { min: 70 }, status: ['active'] },
          isDefault: true,
        },
        {
          name: 'Follow-up Due',
          filterType: 'leads',
          filters: { dateRange: '7d' },
        },
        {
          name: 'Unresponsive',
          filterType: 'contacts',
          filters: { status: ['unresponsive'] },
        },
      ],
      marketing: [
        {
          name: 'High Intent',
          filterType: 'leads',
          filters: { leadScore: { min: 50 } },
          isDefault: true,
        },
        {
          name: 'This Month',
          filterType: 'leads',
          filters: { dateRange: '30d' },
        },
      ],
      executive: [
        {
          name: 'Key Metrics',
          filterType: 'kpi',
          filters: {},
          isDefault: true,
        },
        {
          name: 'Revenue Pipeline',
          filterType: 'pipeline',
          filters: {},
        },
      ],
    };

    return defaults[userRole] || defaults['sales'];
  }

  // ============================================================
  // SHARE FILTERS
  // ============================================================

  async shareFilter(
    organizationId: string,
    userId: string,
    filterId: string,
  ): Promise<void> {
    await this.prisma.savedFilter.updateMany({
      where: {
        id: filterId,
        organizationId,
        userId,
      },
      data: { isShared: true },
    });
  }

  async unshareFilter(
    organizationId: string,
    userId: string,
    filterId: string,
  ): Promise<void> {
    await this.prisma.savedFilter.updateMany({
      where: {
        id: filterId,
        organizationId,
        userId,
      },
      data: { isShared: false },
    });
  }

  // ============================================================
  // FILTER SUGGESTIONS
  // ============================================================

  async getFilterSuggestions(
    organizationId: string,
    filterType: string,
  ): Promise<{
    sources: string[];
    statuses: string[];
    industries: string[];
    assignedTo: Array<{ id: string; name: string }>;
    tags: string[];
  }> {
    // Get distinct values from database
    const [sources, statuses, industries, assignedTo, tags] = await Promise.all([
      this.prisma.contact.findMany({
        where: { organizationId },
        select: { leadSource: true },
        distinct: ['leadSource'],
      }).then((results) => results.map((r) => r.leadSource).filter(Boolean)),

      this.prisma.contact.findMany({
        where: { organizationId },
        select: { status: true },
        distinct: ['status'],
      }).then((results) => results.map((r) => r.status).filter(Boolean)),

      this.prisma.company.findMany({
        where: { organizationId },
        select: { industry: true },
        distinct: ['industry'],
      }).then((results) => results.map((r) => r.industry).filter(Boolean)),

      this.prisma.user.findMany({
        where: { organizationId },
        select: { id: true, firstName: true, lastName: true },
      }).then((results) => results.map((r) => ({
        id: r.id,
        name: `${r.firstName} ${r.lastName}`,
      }))),

      // Tags would come from a tags table
      Promise.resolve(['hot', 'warm', 'cold', 'nurture', 'qualified']),
    ]);

    return {
      sources,
      statuses,
      industries,
      assignedTo,
      tags,
    };
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private getDateFromRange(range: string): Date {
    const days = parseInt(range) || 30;
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }
}
