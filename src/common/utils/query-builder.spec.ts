import { describe, it, expect } from 'vitest';
import { OpenSearchQueryBuilder } from './query-builder';
import { BusinessSearchInput, SortField, SortOrder } from '../dtos/business-search.input';

describe('OpenSearchQueryBuilder', () => {
  describe('buildQuery', () => {
    describe('text search', () => {
      it('should build a simple text search query', () => {
        const input: BusinessSearchInput = { query: 'tech company' };
        const query = OpenSearchQueryBuilder.buildQuery(input);

        expect(query.query.bool.must).toBeDefined();
        expect(query.query.bool.must[0].multi_match.query).toBe('tech company');
        expect(query.query.bool.must[0].multi_match.operator).toBe('and');
        expect(query.query.bool.must[0].multi_match.fields).toContain('name^2');
      });

      it('should support fuzzy matching with high fuzziness', () => {
        const input: BusinessSearchInput = {
          query: 'techs companies',
          fuzzyMatching: 'high',
        };
        const query = OpenSearchQueryBuilder.buildQuery(input);

        expect(query.query.bool.must[0].multi_match.fuzziness).toBe('AUTO');
        expect(query.query.bool.must[0].multi_match.operator).toBe('or');
      });

      it('should not add must clause for empty query', () => {
        const input: BusinessSearchInput = { query: '' };
        const query = OpenSearchQueryBuilder.buildQuery(input);

        // Empty query should not add a must clause
        expect(query.query.bool.must?.length || 0).toBe(0);
      });
    });

    describe('geo distance filtering', () => {
      it('should add geo distance filter with coordinates', () => {
        const input: BusinessSearchInput = {
          geoLocation: {
            latitude: 37.7749,
            longitude: -122.4194,
            distanceKm: 25,
          },
        };
        const query = OpenSearchQueryBuilder.buildQuery(input);

        expect(query.query.bool.filter).toBeDefined();
        const geoFilter = query.query.bool.filter.find((f: any) => f.geo_distance);
        expect(geoFilter).toBeDefined();
        expect(geoFilter.geo_distance.distance).toBe('25km');
        expect(geoFilter.geo_distance.geopoint.lat).toBe(37.7749);
        expect(geoFilter.geo_distance.geopoint.lon).toBe(-122.4194);
      });

      it('should default to 50km distance when not specified', () => {
        const input: BusinessSearchInput = {
          geoLocation: {
            latitude: 37.7749,
            longitude: -122.4194,
          },
        };
        const query = OpenSearchQueryBuilder.buildQuery(input);

        const geoFilter = query.query.bool.filter.find((f: any) => f.geo_distance);
        expect(geoFilter.geo_distance.distance).toBe('50km');
      });
    });

    describe('industry filtering', () => {
      it('should filter by single industry', () => {
        const input: BusinessSearchInput = { industry: 'Technology' };
        const query = OpenSearchQueryBuilder.buildQuery(input);

        const industryFilter = query.query.bool.filter.find((f: any) => f.term?.industry);
        expect(industryFilter).toBeDefined();
        expect(industryFilter.term.industry).toBe('Technology');
      });

      it('should filter by multiple industries', () => {
        const input: BusinessSearchInput = {
          industries: ['Technology', 'Finance', 'Healthcare'],
        };
        const query = OpenSearchQueryBuilder.buildQuery(input);

        const industriesFilter = query.query.bool.filter.find((f: any) => f.terms?.industry);
        expect(industriesFilter).toBeDefined();
        expect(industriesFilter.terms.industry).toEqual(['Technology', 'Finance', 'Healthcare']);
      });

      it('should prefer single industry over multiple', () => {
        const input: BusinessSearchInput = {
          industry: 'Technology',
          industries: ['Finance'],
        };
        const query = OpenSearchQueryBuilder.buildQuery(input);

        const filters = query.query.bool.filter;
        const termFilter = filters.find((f: any) => f.term?.industry);
        const termsFilter = filters.find((f: any) => f.terms?.industry);

        expect(termFilter).toBeDefined();
        expect(termsFilter).toBeUndefined();
      });
    });

    describe('multi-filter combinations', () => {
      it('should combine text search with industry and revenue filters', () => {
        const input: BusinessSearchInput = {
          query: 'software',
          industry: 'Technology',
          minRevenue: 1000000,
          maxRevenue: 10000000,
        };
        const query = OpenSearchQueryBuilder.buildQuery(input);

        expect(query.query.bool.must).toBeDefined();
        expect(query.query.bool.filter.length).toBeGreaterThanOrEqual(2);

        const industryFilter = query.query.bool.filter.find((f: any) => f.term?.industry);
        const revenueFilter = query.query.bool.filter.find((f: any) => f.range?.revenue);

        expect(industryFilter).toBeDefined();
        expect(revenueFilter).toBeDefined();
      });

      it('should combine all available filters', () => {
        const input: BusinessSearchInput = {
          query: 'software',
          industry: 'Technology',
          minRevenue: 1000000,
          maxRevenue: 10000000,
          minEmployees: 10,
          maxEmployees: 100,
          minHiring: 5,
          maxHiring: 50,
          techStack: ['JavaScript', 'React'],
          geoLocation: {
            latitude: 37.7749,
            longitude: -122.4194,
            distanceKm: 50,
          },
        };
        const query = OpenSearchQueryBuilder.buildQuery(input);

        expect(query.query.bool.must).toBeDefined();
        expect(query.query.bool.filter.length).toBeGreaterThanOrEqual(5);

        const filters = query.query.bool.filter;
        expect(filters.some((f: any) => f.term?.industry)).toBe(true);
        expect(filters.some((f: any) => f.range?.revenue)).toBe(true);
        expect(filters.some((f: any) => f.range?.employees)).toBe(true);
        expect(filters.some((f: any) => f.range?.hiring)).toBe(true);
        expect(filters.some((f: any) => f.terms?.techStack)).toBe(true);
        expect(filters.some((f: any) => f.geo_distance)).toBe(true);
      });
    });

    describe('pagination and sorting', () => {
      it('should apply skip and take for pagination', () => {
        const input: BusinessSearchInput = { skip: 20, take: 10 };
        const query = OpenSearchQueryBuilder.buildQuery(input);

        expect(query.from).toBe(20);
        expect(query.size).toBe(10);
      });

      it('should default to skip 0 and take 20', () => {
        const input: BusinessSearchInput = {};
        const query = OpenSearchQueryBuilder.buildQuery(input);

        expect(query.from).toBe(0);
        expect(query.size).toBe(20);
      });
    });

    describe('range filters', () => {
      it('should filter by employee count range', () => {
        const input: BusinessSearchInput = {
          minEmployees: 10,
          maxEmployees: 100,
        };
        const query = OpenSearchQueryBuilder.buildQuery(input);

        const employeeFilter = query.query.bool.filter.find((f: any) => f.range?.employees);
        expect(employeeFilter).toBeDefined();
        expect(employeeFilter.range.employees.gte).toBe(10);
        expect(employeeFilter.range.employees.lte).toBe(100);
      });

      it('should filter by hiring count range', () => {
        const input: BusinessSearchInput = {
          minHiring: 5,
          maxHiring: 50,
        };
        const query = OpenSearchQueryBuilder.buildQuery(input);

        const hiringFilter = query.query.bool.filter.find((f: any) => f.range?.hiring);
        expect(hiringFilter).toBeDefined();
        expect(hiringFilter.range.hiring.gte).toBe(5);
        expect(hiringFilter.range.hiring.lte).toBe(50);
      });

      it('should filter by revenue range', () => {
        const input: BusinessSearchInput = {
          minRevenue: 1000000,
          maxRevenue: 10000000,
        };
        const query = OpenSearchQueryBuilder.buildQuery(input);

        const revenueFilter = query.query.bool.filter.find((f: any) => f.range?.revenue);
        expect(revenueFilter).toBeDefined();
        expect(revenueFilter.range.revenue.gte).toBe(1000000);
        expect(revenueFilter.range.revenue.lte).toBe(10000000);
      });

      it('should handle only minimum range value', () => {
        const input: BusinessSearchInput = {
          minRevenue: 1000000,
        };
        const query = OpenSearchQueryBuilder.buildQuery(input);

        const revenueFilter = query.query.bool.filter.find((f: any) => f.range?.revenue);
        expect(revenueFilter.range.revenue.gte).toBe(1000000);
        expect(revenueFilter.range.revenue.lte).toBeUndefined();
      });

      it('should handle only maximum range value', () => {
        const input: BusinessSearchInput = {
          maxRevenue: 10000000,
        };
        const query = OpenSearchQueryBuilder.buildQuery(input);

        const revenueFilter = query.query.bool.filter.find((f: any) => f.range?.revenue);
        expect(revenueFilter.range.revenue.gte).toBeUndefined();
        expect(revenueFilter.range.revenue.lte).toBe(10000000);
      });
    });

    describe('aggregations', () => {
      it('should include aggregations in the query', () => {
        const input: BusinessSearchInput = { query: 'tech' };
        const query = OpenSearchQueryBuilder.buildQuery(input);

        expect(query.aggs).toBeDefined();
        expect(query.aggs.industries).toBeDefined();
        expect(query.aggs.locations).toBeDefined();
        expect(query.aggs.techStacks).toBeDefined();
        expect(query.aggs.revenueRanges).toBeDefined();
        expect(query.aggs.hiringLevels).toBeDefined();
      });
    });

    describe('tech stack filtering', () => {
      it('should filter by tech stack', () => {
        const input: BusinessSearchInput = {
          techStack: ['JavaScript', 'React', 'Node.js'],
        };
        const query = OpenSearchQueryBuilder.buildQuery(input);

        const techStackFilter = query.query.bool.filter.find((f: any) => f.terms?.techStack);
        expect(techStackFilter).toBeDefined();
        expect(techStackFilter.terms.techStack).toEqual(['JavaScript', 'React', 'Node.js']);
      });
    });

    describe('sorting', () => {
      it('should sort by relevance', () => {
        const input: BusinessSearchInput = { sortBy: SortField.RELEVANCE };
        const sort = OpenSearchQueryBuilder.buildSort(input);

        expect(sort[0]).toHaveProperty('_score');
      });

      it('should sort by name', () => {
        const input: BusinessSearchInput = { sortBy: SortField.NAME };
        const sort = OpenSearchQueryBuilder.buildSort(input);

        expect(sort[0]).toHaveProperty('name.keyword');
      });

      it('should sort by revenue', () => {
        const input: BusinessSearchInput = { sortBy: SortField.REVENUE };
        const sort = OpenSearchQueryBuilder.buildSort(input);

        expect(sort[0]).toHaveProperty('revenue');
      });

      it('should sort by employees', () => {
        const input: BusinessSearchInput = { sortBy: SortField.EMPLOYEES };
        const sort = OpenSearchQueryBuilder.buildSort(input);

        expect(sort[0]).toHaveProperty('employees');
      });

      it('should sort by hiring', () => {
        const input: BusinessSearchInput = { sortBy: SortField.HIRING };
        const sort = OpenSearchQueryBuilder.buildSort(input);

        expect(sort[0]).toHaveProperty('hiring');
      });

      it('should sort by distance', () => {
        const input: BusinessSearchInput = {
          sortBy: SortField.DISTANCE,
          geoLocation: {
            latitude: 37.7749,
            longitude: -122.4194,
          },
        };
        const sort = OpenSearchQueryBuilder.buildSort(input);

        expect(sort[0]).toHaveProperty('_geo_distance');
      });

      it('should sort by created date', () => {
        const input: BusinessSearchInput = { sortBy: SortField.CREATED };
        const sort = OpenSearchQueryBuilder.buildSort(input);

        expect(sort[0]).toHaveProperty('createdAt');
      });

      it('should respect sort order', () => {
        const inputAsc: BusinessSearchInput = {
          sortBy: SortField.REVENUE,
          sortOrder: SortOrder.ASC,
        };
        const sortAsc = OpenSearchQueryBuilder.buildSort(inputAsc);

        expect(sortAsc[0].revenue.order).toBe('asc');

        const inputDesc: BusinessSearchInput = {
          sortBy: SortField.REVENUE,
          sortOrder: SortOrder.DESC,
        };
        const sortDesc = OpenSearchQueryBuilder.buildSort(inputDesc);

        expect(sortDesc[0].revenue.order).toBe('desc');
      });
    });

    describe('edge cases', () => {
      it('should handle empty input', () => {
        const input: BusinessSearchInput = {};
        const query = OpenSearchQueryBuilder.buildQuery(input);

        expect(query.query).toHaveProperty('match_all');
        expect(query.from).toBe(0);
        expect(query.size).toBe(20);
      });

      it('should handle empty arrays', () => {
        const input: BusinessSearchInput = {
          industries: [],
          techStack: [],
          locations: [],
        };
        const query = OpenSearchQueryBuilder.buildQuery(input);

        // Empty arrays should not add filters
        expect(query.query.bool.filter?.length || 0).toBe(0);
      });

      it('should return proper source field', () => {
        const input: BusinessSearchInput = {};
        const query = OpenSearchQueryBuilder.buildQuery(input);

        expect(query._source).toBe(true);
      });
    });
  });
});
