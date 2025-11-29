export interface BusinessSearchResult {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  revenue?: number;
  employees?: number;
  hiring?: number;
  techStack?: string[];
  score?: number;
  metadata?: Record<string, any>;
}

export interface Facet {
  name: string;
  count: number;
  value?: string | number;
}

export interface Aggregation {
  industry?: Facet[];
  location?: Facet[];
  techStack?: Facet[];
  revenueRanges?: Facet[];
  hiringLevels?: Facet[];
}

export interface SearchSuggestion {
  text: string;
  score: number;
}

export class SearchResponseDto {
  results: BusinessSearchResult[];
  total: number;
  skip: number;
  take: number;
  aggregations: Aggregation;
  suggestions?: SearchSuggestion[];
}
