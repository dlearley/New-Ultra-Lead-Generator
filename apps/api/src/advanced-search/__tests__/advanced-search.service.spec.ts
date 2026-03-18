import { Test, TestingModule } from '@nestjs/testing';
import { AdvancedSearchService } from '../advanced-search.service';
import { PrismaService } from '../../services/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('AdvancedSearchService', () => {
  let service: AdvancedSearchService;

  const mockPrismaService = {
    contact: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    company: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    technology: {
      findMany: jest.fn(),
    },
    location: {
      findMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvancedSearchService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AdvancedSearchService>(AdvancedSearchService);
    jest.clearAllMocks();
  });

  describe('advancedSearch', () => {
    it('should search contacts with firmographic filters', async () => {
      mockPrismaService.contact.findMany.mockResolvedValue([]);
      mockPrismaService.contact.count.mockResolvedValue(0);

      const input = {
        mode: 'contacts' as const,
        firmographics: {
          employeeCount: { min: 50, max: 200 },
          locations: { cities: ['Detroit'] },
        },
      };

      const result = await service.advancedSearch('org-1', input);

      expect(result).toHaveProperty('contacts');
      expect(result).toHaveProperty('analytics');
      expect(result).toHaveProperty('pagination');
    });

    it('should search companies with technographic filters', async () => {
      mockPrismaService.company.findMany.mockResolvedValue([]);
      mockPrismaService.company.count.mockResolvedValue(0);

      const input = {
        mode: 'companies' as const,
        technographics: {
          include: { technologies: ['HubSpot'] },
        },
      };

      const result = await service.advancedSearch('org-1', input);

      expect(result).toHaveProperty('companies');
      expect(mockPrismaService.company.findMany).toHaveBeenCalled();
    });

    it('should filter by intent score', async () => {
      mockPrismaService.contact.findMany.mockResolvedValue([]);
      mockPrismaService.contact.count.mockResolvedValue(0);

      const input = {
        mode: 'contacts' as const,
        intent: {
          score: { min: 70 },
        },
      };

      await service.advancedSearch('org-1', input);

      expect(mockPrismaService.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            intentScore: expect.objectContaining({ gte: 70 }),
          }),
        })
      );
    });
  });

  describe('naturalLanguageSearch', () => {
    it('should parse query using rule-based parser when OpenAI not configured', async () => {
      const request = {
        query: 'SaaS companies in Detroit with 50-200 employees',
        organizationId: 'org-1',
      };

      const result = await service.naturalLanguageSearch(request);

      expect(result).toHaveProperty('originalQuery');
      expect(result).toHaveProperty('parsedFilters');
      expect(result).toHaveProperty('aiExplanation');
      expect(result.parsedFilters.firmographics).toBeDefined();
    });

    it('should parse employee count from query', async () => {
      const request = {
        query: 'companies with 100-500 employees',
        organizationId: 'org-1',
      };

      const result = await service.naturalLanguageSearch(request);

      expect(result.parsedFilters.firmographics?.employeeCount).toEqual({
        min: 100,
        max: 500,
      });
    });

    it('should parse location from query', async () => {
      const request = {
        query: 'companies in San Francisco',
        organizationId: 'org-1',
      };

      const result = await service.naturalLanguageSearch(request);

      expect(result.parsedFilters.firmographics?.locations?.cities).toContain(
        'San Francisco'
      );
    });

    it('should parse technology from query', async () => {
      const request = {
        query: 'companies using HubSpot',
        organizationId: 'org-1',
      };

      const result = await service.naturalLanguageSearch(request);

      expect(result.parsedFilters.technographics?.include?.technologies).toContain(
        'HubSpot'
      );
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return company suggestions', async () => {
      mockPrismaService.company.findMany.mockResolvedValue([
        { id: '1', name: 'Acme Corp', domain: 'acme.com' },
      ]);

      const result = await service.getSearchSuggestions('org-1', 'Acme');

      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'company',
          label: 'Acme Corp',
        })
      );
    });

    it('should return industry suggestions', async () => {
      mockPrismaService.company.groupBy.mockResolvedValue([
        { industry: 'Software', _count: { industry: 10 } },
      ]);

      const result = await service.getSearchSuggestions('org-1', 'Soft');

      expect(result).toContainEqual(
        expect.objectContaining({
          type: 'industry',
          label: 'Software',
        })
      );
    });
  });
});
