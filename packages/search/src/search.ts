import { BusinessSearchInput, Industry, BusinessType, BusinessMode, Ownership, RevenueBand, EmployeeBand } from '@monorepo/core';
import { BUSINESS_LEADS_INDEX } from './mappings';

export interface SearchQuery {
  index: string;
  body: any;
}

export class BusinessSearchService {
  
  buildSearchQuery(input: BusinessSearchInput): SearchQuery {
    const must: any[] = [];
    const filter: any[] = [];
    const should: any[] = [];

    // Text search
    if (input.query) {
      must.push({
        multi_match: {
          query: input.query,
          fields: [
            'name^3',
            'canonicalName^3',
            'alternateNames^2',
            'description',
            'techStack^2',
            'industryTags^2',
            'specializations^2'
          ],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    }

    // Location-based search
    if (input.location && input.radius) {
      filter.push({
        geo_distance: {
          distance: `${input.radius}km`,
          coordinates: {
            lat: input.location.lat,
            lon: input.location.lon
          }
        }
      });
    }

    // Industry filter
    if (input.industries && input.industries.length > 0) {
      filter.push({
        terms: { industry: input.industries }
      });
    }

    // Business type filter
    if (input.businessTypes && input.businessTypes.length > 0) {
      filter.push({
        terms: { businessType: input.businessTypes }
      });
    }

    // Business mode filter
    if (input.businessModes && input.businessModes.length > 0) {
      filter.push({
        terms: { businessMode: input.businessModes }
      });
    }

    // Ownership filter
    if (input.ownership && input.ownership.length > 0) {
      filter.push({
        terms: { ownership: input.ownership }
      });
    }

    // Revenue bands filter
    if (input.revenueBands && input.revenueBands.length > 0) {
      filter.push({
        terms: { revenueBand: input.revenueBands }
      });
    }

    // Employee bands filter
    if (input.employeeBands && input.employeeBands.length > 0) {
      filter.push({
        terms: { employeeBand: input.employeeBands }
      });
    }

    // Tech stack filter
    if (input.techStack && input.techStack.length > 0) {
      filter.push({
        terms: { 'techStack.keyword': input.techStack }
      });
    }

    // Tags filter
    if (input.tags && input.tags.length > 0) {
      should.push(
        ...input.tags.map((tag: string) => ({
          term: { 'industryTags.keyword': tag }
        })),
        ...input.tags.map((tag: string) => ({
          term: { 'specializations.keyword': tag }
        }))
      );
    }

    // Build the main query
    const query: any = {
      query: {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
          filter,
          should: should.length > 0 ? should : undefined,
          minimum_should_match: should.length > 0 ? 1 : undefined
        }
      },
      from: input.offset,
      size: input.limit
    };

    // Add sorting
    if (input.sortBy === 'distance' && input.location) {
      query.sort = [
        {
          _geo_distance: {
            coordinates: {
              lat: input.location.lat,
              lon: input.location.lon
            },
            order: input.sortOrder,
            unit: 'km'
          }
        }
      ];
    } else if (input.sortBy === 'revenue') {
      query.sort = [
        { revenue: { order: input.sortOrder, missing: '_last' } }
      ];
    } else if (input.sortBy === 'employees') {
      query.sort = [
        { employeeCount: { order: input.sortOrder, missing: '_last' } }
      ];
    } else {
      // Default to relevance scoring
      query.sort = [
        { _score: { order: input.sortOrder } }
      ];
    }

    return {
      index: BUSINESS_LEADS_INDEX,
      body: query
    };
  }

  buildAggregationQuery(input: BusinessSearchInput): SearchQuery {
    const baseQuery = this.buildSearchQuery(input);
    
    // Add aggregations for faceted search
    baseQuery.body.aggs = {
      industries: {
        terms: { field: 'industry' }
      },
      businessTypes: {
        terms: { field: 'businessType' }
      },
      businessModes: {
        terms: { field: 'businessMode' }
      },
      ownership: {
        terms: { field: 'ownership' }
      },
      revenueBands: {
        terms: { field: 'revenueBand' }
      },
      employeeBands: {
        terms: { field: 'employeeBand' }
      },
      techStack: {
        terms: { field: 'techStack.keyword', size: 20 }
      },
      industryTags: {
        terms: { field: 'industryTags.keyword', size: 20 }
      }
    };

    return baseQuery;
  }

  buildAutocompleteQuery(partial: string, limit: number = 10): SearchQuery {
    return {
      index: BUSINESS_LEADS_INDEX,
      body: {
        suggest: {
          name_suggest: {
            prefix: partial,
            completion: {
              field: 'name.suggest',
              size: limit,
              skip_duplicates: true
            }
          }
        }
      }
    };
  }

  buildSimilarBusinessQuery(businessId: string, limit: number = 10): SearchQuery {
    return {
      index: BUSINESS_LEADS_INDEX,
      body: {
        size: limit,
        query: {
          more_like_this: {
            fields: [
              'name',
              'description',
              'techStack',
              'industryTags',
              'specializations'
            ],
            like: [{ _index: BUSINESS_LEADS_INDEX, _id: businessId }],
            min_term_freq: 1,
            max_query_terms: 12,
            min_doc_freq: 1
          }
        }
      }
    };
  }
}

export function createBusinessSearchService(): BusinessSearchService {
  return new BusinessSearchService();
}