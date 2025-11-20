import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenSearchService } from './opensearch.service';
import { BusinessSearchInput, SortField } from '@common/dtos/business-search.input';

describe('OpenSearchService', () => {
  let service: OpenSearchService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        OPENSEARCH_HOST: 'localhost',
        OPENSEARCH_PORT: 9200,
        OPENSEARCH_PROTOCOL: 'http',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenSearchService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OpenSearchService>(OpenSearchService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('buildQuery', () => {
    it('should build a text search query', () => {
      const input: BusinessSearchInput = { query: 'tech company' };
      const method = (service as any).buildQuery.bind(service);
      const query = method(input);

      expect(query.query.bool.must).toBeDefined();
      expect(query.query.bool.must[0].multi_match.query).toBe('tech company');
    });

    it('should build a query with geo distance filter', () => {
      const input: BusinessSearchInput = {
        geoLocation: {
          latitude: 37.7749,
          longitude: -122.4194,
          distanceKm: 25,
        },
      };
      const method = (service as any).buildQuery.bind(service);
      const query = method(input);

      expect(query.query.bool.filter).toBeDefined();
      const geoFilter = query.query.bool.filter.find((f: any) => f.geo_distance);
      expect(geoFilter).toBeDefined();
      expect(geoFilter.geo_distance.distance).toBe('25km');
    });

    it('should build a query with industry filter', () => {
      const input: BusinessSearchInput = { industry: 'Technology' };
      const method = (service as any).buildQuery.bind(service);
      const query = method(input);

      const industryFilter = query.query.bool.filter.find((f: any) => f.term?.industry);
      expect(industryFilter).toBeDefined();
      expect(industryFilter.term.industry).toBe('Technology');
    });

    it('should build a query with multiple industries', () => {
      const input: BusinessSearchInput = {
        industries: ['Technology', 'Finance'],
      };
      const method = (service as any).buildQuery.bind(service);
      const query = method(input);

      const industriesFilter = query.query.bool.filter.find((f: any) => f.terms?.industry);
      expect(industriesFilter).toBeDefined();
      expect(industriesFilter.terms.industry).toEqual(['Technology', 'Finance']);
    });

    it('should build a query with revenue range', () => {
      const input: BusinessSearchInput = {
        minRevenue: 1000000,
        maxRevenue: 10000000,
      };
      const method = (service as any).buildQuery.bind(service);
      const query = method(input);

      const revenueFilter = query.query.bool.filter.find((f: any) => f.range?.revenue);
      expect(revenueFilter).toBeDefined();
      expect(revenueFilter.range.revenue.gte).toBe(1000000);
      expect(revenueFilter.range.revenue.lte).toBe(10000000);
    });

    it('should build a query with employee count range', () => {
      const input: BusinessSearchInput = {
        minEmployees: 10,
        maxEmployees: 100,
      };
      const method = (service as any).buildQuery.bind(service);
      const query = method(input);

      const employeeFilter = query.query.bool.filter.find((f: any) => f.range?.employees);
      expect(employeeFilter).toBeDefined();
      expect(employeeFilter.range.employees.gte).toBe(10);
      expect(employeeFilter.range.employees.lte).toBe(100);
    });

    it('should build a query with tech stack filter', () => {
      const input: BusinessSearchInput = {
        techStack: ['JavaScript', 'React'],
      };
      const method = (service as any).buildQuery.bind(service);
      const query = method(input);

      const techStackFilter = query.query.bool.filter.find((f: any) => f.terms?.techStack);
      expect(techStackFilter).toBeDefined();
      expect(techStackFilter.terms.techStack).toEqual(['JavaScript', 'React']);
    });

    it('should apply pagination correctly', () => {
      const input: BusinessSearchInput = { skip: 10, take: 5 };
      const method = (service as any).buildQuery.bind(service);
      const query = method(input);

      expect(query.from).toBe(10);
      expect(query.size).toBe(5);
    });

    it('should build correct sort for relevance', () => {
      const input: BusinessSearchInput = { sortBy: SortField.RELEVANCE };
      const method = (service as any).buildSort.bind(service);
      const sort = method(input);

      expect(sort[0]).toHaveProperty('_score');
    });

    it('should build correct sort for revenue', () => {
      const input: BusinessSearchInput = { sortBy: SortField.REVENUE };
      const method = (service as any).buildSort.bind(service);
      const sort = method(input);

      expect(sort[0]).toHaveProperty('revenue');
    });
  });

  describe('formatAggregations', () => {
    it('should format aggregation buckets correctly', () => {
      const mockAggs = {
        industries: {
          buckets: [
            { key: 'Technology', doc_count: 25 },
            { key: 'Finance', doc_count: 15 },
          ],
        },
        locations: {
          buckets: [
            { key: 'San Francisco', doc_count: 30 },
          ],
        },
        techStacks: {
          buckets: [
            { key: 'JavaScript', doc_count: 20 },
          ],
        },
        revenueRanges: {
          buckets: [{ doc_count: 10 }, { doc_count: 15 }],
        },
        hiringLevels: {
          buckets: [{ doc_count: 5 }],
        },
      };

      const method = (service as any).formatAggregations.bind(service);
      const result = method(mockAggs);

      expect(result.industry.length).toBe(2);
      expect(result.industry[0].name).toBe('Technology');
      expect(result.location.length).toBe(1);
      expect(result.techStack.length).toBe(1);
    });
  });

  describe('generateSuggestions', () => {
    it('should generate suggestions from search results', () => {
      const results = [
        { id: '1', name: 'Tech Company Inc', score: 0.95 },
        { id: '2', name: 'Tech Solutions LLC', score: 0.87 },
        { id: '3', name: 'TechForce Global', score: 0.80 },
      ];

      const method = (service as any).generateSuggestions.bind(service);
      const suggestions = method(results, 'tech');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toHaveProperty('text');
      expect(suggestions[0]).toHaveProperty('score');
    });
  });
});
