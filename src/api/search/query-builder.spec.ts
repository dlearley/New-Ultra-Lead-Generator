import { describe, it, expect } from 'vitest';
import { BusinessSearchInput, SortField, SortOrder } from '@common/dtos/business-search.input';

// Query builder helper for testing
class QueryBuilder {
  buildQuery(input: BusinessSearchInput): any {
    const must: any[] = [];
    const filter: any[] = [];

    if (input.query) {
      if (input.fuzzyMatching === 'high') {
        must.push({
          multi_match: {
            query: input.query,
            fields: ['name^2', 'description'],
            fuzziness: 'AUTO',
            operator: 'or',
          },
        });
      } else {
        must.push({
          multi_match: {
            query: input.query,
            fields: ['name^2', 'description'],
            operator: 'and',
          },
        });
      }
    }

    if (input.industry) {
      filter.push({ term: { industry: input.industry } });
    } else if (input.industries && input.industries.length > 0) {
      filter.push({ terms: { industry: input.industries } });
    }

    if (input.location) {
      filter.push({ match: { location: input.location } });
    }

    if (input.geoLocation) {
      filter.push({
        geo_distance: {
          distance: `${input.geoLocation.distanceKm || 50}km`,
          geopoint: {
            lat: input.geoLocation.latitude,
            lon: input.geoLocation.longitude,
          },
        },
      });
    }

    if (input.minRevenue !== undefined || input.maxRevenue !== undefined) {
      const rangeQuery: any = {};
      if (input.minRevenue !== undefined) rangeQuery.gte = input.minRevenue;
      if (input.maxRevenue !== undefined) rangeQuery.lte = input.maxRevenue;
      filter.push({ range: { revenue: rangeQuery } });
    }

    if (input.minEmployees !== undefined || input.maxEmployees !== undefined) {
      const rangeQuery: any = {};
      if (input.minEmployees !== undefined) rangeQuery.gte = input.minEmployees;
      if (input.maxEmployees !== undefined) rangeQuery.lte = input.maxEmployees;
      filter.push({ range: { employees: rangeQuery } });
    }

    if (input.techStack && input.techStack.length > 0) {
      filter.push({ terms: { techStack: input.techStack } });
    }

    const boolQuery: any = {};
    if (must.length > 0) boolQuery.must = must;
    if (filter.length > 0) boolQuery.filter = filter;

    return {
      query: Object.keys(boolQuery).length > 0 ? { bool: boolQuery } : { match_all: {} },
      size: input.take || 20,
      from: input.skip || 0,
    };
  }
}

describe('Query Builder', () => {
  const queryBuilder = new QueryBuilder();

  describe('text search', () => {
    it('should build a simple text search query', () => {
      const input: BusinessSearchInput = { query: 'tech company' };
      const query = queryBuilder.buildQuery(input);

      expect(query.query.bool.must).toBeDefined();
      expect(query.query.bool.must[0].multi_match.query).toBe('tech company');
      expect(query.query.bool.must[0].multi_match.operator).toBe('and');
    });

    it('should support fuzzy matching with high fuzziness', () => {
      const input: BusinessSearchInput = {
        query: 'techs companies',
        fuzzyMatching: 'high',
      };
      const query = queryBuilder.buildQuery(input);

      expect(query.query.bool.must[0].multi_match.fuzziness).toBe('AUTO');
      expect(query.query.bool.must[0].multi_match.operator).toBe('or');
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
      const query = queryBuilder.buildQuery(input);

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
      const query = queryBuilder.buildQuery(input);

      const geoFilter = query.query.bool.filter.find((f: any) => f.geo_distance);
      expect(geoFilter.geo_distance.distance).toBe('50km');
    });
  });

  describe('multi-filter combinations', () => {
    it('should combine multiple filters', () => {
      const input: BusinessSearchInput = {
        query: 'software',
        industry: 'Technology',
        minRevenue: 1000000,
        maxRevenue: 10000000,
        techStack: ['JavaScript', 'React'],
      };
      const query = queryBuilder.buildQuery(input);

      expect(query.query.bool.must).toBeDefined();
      expect(query.query.bool.filter.length).toBeGreaterThan(0);

      const industryFilter = query.query.bool.filter.find((f: any) => f.term?.industry);
      expect(industryFilter).toBeDefined();

      const revenueFilter = query.query.bool.filter.find((f: any) => f.range?.revenue);
      expect(revenueFilter).toBeDefined();
      expect(revenueFilter.range.revenue.gte).toBe(1000000);
      expect(revenueFilter.range.revenue.lte).toBe(10000000);

      const techStackFilter = query.query.bool.filter.find((f: any) => f.terms?.techStack);
      expect(techStackFilter).toBeDefined();
      expect(techStackFilter.terms.techStack).toEqual(['JavaScript', 'React']);
    });

    it('should handle multiple industries', () => {
      const input: BusinessSearchInput = {
        industries: ['Technology', 'Finance'],
      };
      const query = queryBuilder.buildQuery(input);

      const industriesFilter = query.query.bool.filter.find((f: any) => f.terms?.industry);
      expect(industriesFilter).toBeDefined();
      expect(industriesFilter.terms.industry).toEqual(['Technology', 'Finance']);
    });
  });

  describe('pagination and sorting', () => {
    it('should apply skip and take for pagination', () => {
      const input: BusinessSearchInput = { skip: 20, take: 10 };
      const query = queryBuilder.buildQuery(input);

      expect(query.from).toBe(20);
      expect(query.size).toBe(10);
    });

    it('should default to skip 0 and take 20', () => {
      const input: BusinessSearchInput = {};
      const query = queryBuilder.buildQuery(input);

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
      const query = queryBuilder.buildQuery(input);

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
      const query = queryBuilder.buildQuery(input);

      const hiringFilter = query.query.bool.filter.find((f: any) => f.range?.hiring);
      expect(hiringFilter).toBeDefined();
      expect(hiringFilter.range.hiring.gte).toBe(5);
      expect(hiringFilter.range.hiring.lte).toBe(50);
    });
  });
});
