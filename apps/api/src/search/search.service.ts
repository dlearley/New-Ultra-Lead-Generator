// apps/api/src/search/search.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchBusinesses(params: {
    query?: string;
    industry?: string;
    location?: string;
    limit: number;
  }) {
    const { query, industry, location, limit } = params;

    // Build where clause
    const where: any = {};

    if (query) {
      where.OR = [
        { company: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Note: industry and location filtering would require those fields
    // to be in the BusinessLead model or related table

    const leads = await this.prisma.businessLead.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return {
      results: leads,
      total: await this.prisma.businessLead.count({ where }),
      page: 1,
      limit,
    };
  }

  async advancedSearch(input: {
    query?: string;
    filters?: {
      industry?: string[];
      location?: string;
      minEmployees?: number;
      maxEmployees?: number;
      minRevenue?: number;
      maxRevenue?: number;
    };
    geoLocation?: {
      latitude: number;
      longitude: number;
      radius: number;
    };
    sort?: {
      field: string;
      order: 'asc' | 'desc';
    };
    pagination?: {
      page: number;
      limit: number;
    };
  }) {
    const { query, filters, sort, pagination } = input;
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query) {
      where.OR = [
        { company: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Note: Advanced filters would need those fields in the database

    const orderBy: any = {};
    if (sort) {
      orderBy[sort.field] = sort.order;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [results, total] = await Promise.all([
      this.prisma.businessLead.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.businessLead.count({ where }),
    ]);

    return {
      results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSuggestions(query: string) {
    if (!query || query.length < 2) {
      return { suggestions: [] };
    }

    const leads = await this.prisma.businessLead.findMany({
      where: {
        OR: [
          { company: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        company: true,
        email: true,
      },
      take: 10,
    });

    const suggestions = [
      ...new Set(
        leads
          .flatMap((lead) => [lead.company, lead.email])
          .filter(Boolean)
          .filter((val) => val?.toLowerCase().includes(query.toLowerCase())),
      ),
    ].slice(0, 5);

    return { suggestions };
  }

  async getIndustries() {
    // Note: This would need an industry field in BusinessLead
    // For now, return empty or fetch from related table
    return {
      industries: [
        'Technology',
        'Healthcare',
        'Finance',
        'Manufacturing',
        'Retail',
        'Services',
        'Energy',
        'Education',
        'Real Estate',
        'Transportation',
      ],
    };
  }

  async getLocations(query?: string) {
    // Note: This would aggregate from actual location data
    const locations = [
      { city: 'New York', state: 'NY', country: 'USA' },
      { city: 'Los Angeles', state: 'CA', country: 'USA' },
      { city: 'Chicago', state: 'IL', country: 'USA' },
      { city: 'Houston', state: 'TX', country: 'USA' },
      { city: 'Phoenix', state: 'AZ', country: 'USA' },
    ];

    if (query) {
      return {
        locations: locations.filter(
          (loc) =>
            loc.city.toLowerCase().includes(query.toLowerCase()) ||
            loc.state.toLowerCase().includes(query.toLowerCase()),
        ),
      };
    }

    return { locations };
  }
}
