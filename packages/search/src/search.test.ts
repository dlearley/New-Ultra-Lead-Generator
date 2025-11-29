import { describe, it, expect, beforeAll } from 'vitest';
import { 
  createBusinessSearchService,
  BusinessSearchService 
} from './search';
import { 
  BusinessSearchInputSchema, 
  Industry, 
  BusinessType, 
  RevenueBand, 
  EmployeeBand 
} from '@monorepo/core';

describe('BusinessSearchService', () => {
  let searchService: BusinessSearchService;

  beforeAll(() => {
    searchService = createBusinessSearchService();
  });

  describe('buildSearchQuery', () => {
    it('should build basic search query', () => {
      const input = BusinessSearchInputSchema.parse({
        query: 'technology companies',
        limit: 10
      });

      const query = searchService.buildSearchQuery(input);
      
      expect(query.index).toBe('business_leads');
      expect(query.body.query.bool.must).toHaveLength(1);
      expect(query.body.query.bool.must[0].multi_match.query).toBe('technology companies');
      expect(query.body.size).toBe(10);
      expect(query.body.from).toBe(0);
    });

    it('should build location-based search query', () => {
      const input = BusinessSearchInputSchema.parse({
        location: { lat: 37.7749, lon: -122.4194 },
        radius: 50,
        limit: 20
      });

      const query = searchService.buildSearchQuery(input);
      
      expect(query.body.query.bool.filter).toContainEqual({
        geo_distance: {
          distance: '50km',
          coordinates: {
            lat: 37.7749,
            lon: -122.4194
          }
        }
      });
    });

    it('should build filtered search query', () => {
      const input = BusinessSearchInputSchema.parse({
        industries: [Industry.TECHNOLOGY, Industry.HEALTHCARE],
        businessTypes: [BusinessType.CORPORATION],
        revenueBands: [RevenueBand.RANGE_1M_5M],
        employeeBands: [EmployeeBand.RANGE_50_100]
      });

      const query = searchService.buildSearchQuery(input);
      
      expect(query.body.query.bool.filter).toContainEqual({
        terms: { industry: [Industry.TECHNOLOGY, Industry.HEALTHCARE] }
      });
      expect(query.body.query.bool.filter).toContainEqual({
        terms: { businessType: [BusinessType.CORPORATION] }
      });
      expect(query.body.query.bool.filter).toContainEqual({
        terms: { revenueBand: [RevenueBand.RANGE_1M_5M] }
      });
      expect(query.body.query.bool.filter).toContainEqual({
        terms: { employeeBand: [EmployeeBand.RANGE_50_100] }
      });
    });

    it('should build tech stack filtered search', () => {
      const input = BusinessSearchInputSchema.parse({
        techStack: ['React', 'Node.js', 'AWS']
      });

      const query = searchService.buildSearchQuery(input);
      
      expect(query.body.query.bool.filter).toContainEqual({
        terms: { 'techStack.keyword': ['React', 'Node.js', 'AWS'] }
      });
    });

    it('should build tags filtered search with should clauses', () => {
      const input = BusinessSearchInputSchema.parse({
        tags: ['SaaS', 'B2B', 'Enterprise']
      });

      const query = searchService.buildSearchQuery(input);
      
      expect(query.body.query.bool.should).toBeDefined();
      expect(query.body.query.bool.minimum_should_match).toBe(1);
      expect(query.body.query.bool.should.length).toBe(6); // 3 tags * 2 fields each
    });

    it('should build relevance sorted search', () => {
      const input = BusinessSearchInputSchema.parse({
        query: 'test',
        sortBy: 'relevance',
        sortOrder: 'desc'
      });

      const query = searchService.buildSearchQuery(input);
      
      expect(query.body.sort).toContainEqual({
        _score: { order: 'desc' }
      });
    });

    it('should build revenue sorted search', () => {
      const input = BusinessSearchInputSchema.parse({
        sortBy: 'revenue',
        sortOrder: 'asc'
      });

      const query = searchService.buildSearchQuery(input);
      
      expect(query.body.sort).toContainEqual({
        revenue: { order: 'asc', missing: '_last' }
      });
    });

    it('should build employee count sorted search', () => {
      const input = BusinessSearchInputSchema.parse({
        sortBy: 'employees',
        sortOrder: 'desc'
      });

      const query = searchService.buildSearchQuery(input);
      
      expect(query.body.sort).toContainEqual({
        employeeCount: { order: 'desc', missing: '_last' }
      });
    });

    it('should build distance sorted search', () => {
      const input = BusinessSearchInputSchema.parse({
        location: { lat: 37.7749, lon: -122.4194 },
        sortBy: 'distance',
        sortOrder: 'asc'
      });

      const query = searchService.buildSearchQuery(input);
      
      expect(query.body.sort).toContainEqual({
        _geo_distance: {
          coordinates: {
            lat: 37.7749,
            lon: -122.4194
          },
          order: 'asc',
          unit: 'km'
        }
      });
    });

    it('should handle pagination correctly', () => {
      const input = BusinessSearchInputSchema.parse({
        limit: 50,
        offset: 100
      });

      const query = searchService.buildSearchQuery(input);
      
      expect(query.body.size).toBe(50);
      expect(query.body.from).toBe(100);
    });

    it('should build empty search query', () => {
      const input = BusinessSearchInputSchema.parse({});

      const query = searchService.buildSearchQuery(input);
      
      expect(query.body.query.bool.must).toHaveLength(1);
      expect(query.body.query.bool.must[0]).toEqual({ match_all: {} });
    });
  });

  describe('buildAggregationQuery', () => {
    it('should build query with aggregations', () => {
      const input = BusinessSearchInputSchema.parse({
        industries: [Industry.TECHNOLOGY]
      });

      const query = searchService.buildAggregationQuery(input);
      
      expect(query.body.aggs).toBeDefined();
      expect(query.body.aggs.industries).toBeDefined();
      expect(query.body.aggs.businessTypes).toBeDefined();
      expect(query.body.aggs.techStack).toBeDefined();
    });
  });

  describe('buildAutocompleteQuery', () => {
    it('should build autocomplete query', () => {
      const query = searchService.buildAutocompleteQuery('tech', 5);
      
      expect(query.index).toBe('business_leads');
      expect(query.body.suggest.name_suggest.prefix).toBe('tech');
      expect(query.body.suggest.name_suggest.completion.size).toBe(5);
      expect(query.body.suggest.name_suggest.completion.skip_duplicates).toBe(true);
    });

    it('should use default limit for autocomplete', () => {
      const query = searchService.buildAutocompleteQuery('test');
      
      expect(query.body.suggest.name_suggest.completion.size).toBe(10);
    });
  });

  describe('buildSimilarBusinessQuery', () => {
    it('should build more-like-this query', () => {
      const query = searchService.buildSimilarBusinessQuery('business-123', 15);
      
      expect(query.index).toBe('business_leads');
      expect(query.body.size).toBe(15);
      expect(query.body.query.more_like_this.like).toContainEqual({
        _index: 'business_leads',
        _id: 'business-123'
      });
      expect(query.body.query.more_like_this.fields).toContain('name');
      expect(query.body.query.more_like_this.fields).toContain('description');
    });

    it('should use default limit for similar business query', () => {
      const query = searchService.buildSimilarBusinessQuery('business-123');
      
      expect(query.body.size).toBe(10);
    });
  });
});