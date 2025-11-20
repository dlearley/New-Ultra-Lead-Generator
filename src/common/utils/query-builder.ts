import { BusinessSearchInput, SortField, SortOrder } from '../dtos/business-search.input';

export class OpenSearchQueryBuilder {
  static buildQuery(input: BusinessSearchInput): any {
    const must: any[] = [];
    const filter: any[] = [];

    // Text search with fuzzy matching
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

    // Industry filter
    if (input.industry) {
      filter.push({ term: { industry: input.industry } });
    } else if (input.industries && input.industries.length > 0) {
      filter.push({ terms: { industry: input.industries } });
    }

    // Location filter
    if (input.location) {
      filter.push({ match: { location: input.location } });
    } else if (input.locations && input.locations.length > 0) {
      filter.push({
        bool: {
          should: input.locations.map((loc) => ({ match: { location: loc } })),
        },
      });
    }

    // Geo distance filter
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

    // Revenue filter
    if (input.minRevenue !== undefined || input.maxRevenue !== undefined) {
      const rangeQuery: any = {};
      if (input.minRevenue !== undefined) rangeQuery.gte = input.minRevenue;
      if (input.maxRevenue !== undefined) rangeQuery.lte = input.maxRevenue;
      filter.push({ range: { revenue: rangeQuery } });
    }

    // Employees filter
    if (input.minEmployees !== undefined || input.maxEmployees !== undefined) {
      const rangeQuery: any = {};
      if (input.minEmployees !== undefined) rangeQuery.gte = input.minEmployees;
      if (input.maxEmployees !== undefined) rangeQuery.lte = input.maxEmployees;
      filter.push({ range: { employees: rangeQuery } });
    }

    // Hiring filter
    if (input.minHiring !== undefined || input.maxHiring !== undefined) {
      const rangeQuery: any = {};
      if (input.minHiring !== undefined) rangeQuery.gte = input.minHiring;
      if (input.maxHiring !== undefined) rangeQuery.lte = input.maxHiring;
      filter.push({ range: { hiring: rangeQuery } });
    }

    // Tech stack filter
    if (input.techStack && input.techStack.length > 0) {
      filter.push({ terms: { techStack: input.techStack } });
    }

    // Build the bool query
    const boolQuery: any = {};

    if (must.length > 0) boolQuery.must = must;
    if (filter.length > 0) boolQuery.filter = filter;

    const sort = this.buildSort(input);

    const aggs = {
      industries: { terms: { field: 'industry', size: 20 } },
      locations: { terms: { field: 'location.keyword', size: 20 } },
      techStacks: { terms: { field: 'techStack', size: 20 } },
      revenueRanges: {
        range: {
          field: 'revenue',
          ranges: [
            { to: 1000000 },
            { from: 1000000, to: 5000000 },
            { from: 5000000, to: 10000000 },
            { from: 10000000 },
          ],
        },
      },
      hiringLevels: {
        range: {
          field: 'hiring',
          ranges: [
            { to: 10 },
            { from: 10, to: 50 },
            { from: 50, to: 100 },
            { from: 100 },
          ],
        },
      },
    };

    return {
      query: Object.keys(boolQuery).length > 0 ? { bool: boolQuery } : { match_all: {} },
      sort,
      size: input.take || 20,
      from: input.skip || 0,
      aggs,
      _source: true,
    };
  }

  static buildSort(input: BusinessSearchInput): any[] {
    const sortField = input.sortBy || SortField.RELEVANCE;
    const sortOrder = input.sortOrder || SortOrder.DESC;
    const order = sortOrder === SortOrder.ASC ? 'asc' : 'desc';

    switch (sortField) {
      case SortField.RELEVANCE:
        return [{ _score: { order } }];
      case SortField.NAME:
        return [{ 'name.keyword': { order } }];
      case SortField.REVENUE:
        return [{ revenue: { order, missing: '_last' } }];
      case SortField.EMPLOYEES:
        return [{ employees: { order, missing: '_last' } }];
      case SortField.HIRING:
        return [{ hiring: { order, missing: '_last' } }];
      case SortField.DISTANCE:
        if (input.geoLocation) {
          return [
            {
              _geo_distance: {
                geopoint: {
                  lat: input.geoLocation.latitude,
                  lon: input.geoLocation.longitude,
                },
                order,
                unit: 'km',
              },
            },
          ];
        }
        return [{ _score: { order } }];
      case SortField.CREATED:
        return [{ createdAt: { order, missing: '_last' } }];
      default:
        return [{ _score: { order } }];
    }
  }
}
