// Advanced Search DTOs for B2B Lead Generation

export interface FirmographicFilters {
  // Company Size
  employeeCount?: {
    min?: number;
    max?: number;
  };
  employeeRange?: string[]; // ["1-10", "11-50", "51-200", etc.]

  // Revenue
  annualRevenue?: {
    min?: number;
    max?: number;
  };
  revenueRange?: string[]; // ["0-1m", "1m-10m", etc.]

  // Industry
  industries?: string[];
  subIndustries?: string[];
  excludeIndustries?: string[];

  // Location
  locations?: {
    countries?: string[];
    states?: string[];
    cities?: string[];
    zipCodes?: string[];
    region?: string; // "EMEA", "APAC", "Americas"
  };

  // Company Maturity
  foundedYear?: {
    min?: number;
    max?: number;
  };

  // Funding
  fundingStage?: string[]; // ["seed", "series_a", "series_b", etc.]
  fundingAmount?: {
    min?: number;
    max?: number;
  };

  // Company Type
  isPublic?: boolean;
  isStartup?: boolean;
  isEnterprise?: boolean;
}

export interface TechnographicFilters {
  // Must have these technologies
  include?: {
    technologies?: string[]; // ["Salesforce", "HubSpot", "Marketo"]
    categories?: string[]; // ["crm", "marketing_automation"]
  };

  // Must NOT have these technologies
  exclude?: {
    technologies?: string[];
    categories?: string[];
  };

  // Technology usage timeframe
  detectedWithinDays?: number; // e.g., 30 = detected in last 30 days
}

export interface ContactFilters {
  // Job Titles
  titles?: {
    include?: string[];
    exclude?: string[];
  };

  // Seniority Levels
  seniority?: string[]; // ["c_level", "vp", "director", "manager"]

  // Departments
  departments?: string[]; // ["sales", "marketing", "engineering"]

  // Data Quality
  mustHaveEmail?: boolean;
  mustHavePhone?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

export interface IntentFilters {
  // Intent Score
  score?: {
    min?: number; // 0-100
    max?: number;
  };

  // Buying Stage
  buyingStage?: string[]; // ["awareness", "consideration", "decision"]

  // Intent Types
  intentTypes?: string[]; // ["website_visit", "pricing_view", etc.]

  // Recency
  withinDays?: number; // e.g., 7 = intent signals in last 7 days

  // Specific Intent Signals
  visitedUrls?: string[];
  downloadedContent?: string[];
  attendedWebinars?: string[];
}

export interface AccountBasedFilters {
  // Target specific accounts
  targetAccounts?: string[]; // Company IDs or domains

  // Exclude accounts
  excludeAccounts?: string[];

  // Account tiers
  tier?: string[]; // ["tier1", "tier2", "tier3"]
}

export interface AdvancedSearchInput {
  // Text search
  query?: string;

  // Search mode
  mode?: 'contacts' | 'companies' | 'both';

  // Filters
  firmographics?: FirmographicFilters;
  technographics?: TechnographicFilters;
  contacts?: ContactFilters;
  intent?: IntentFilters;
  accounts?: AccountBasedFilters;

  // Sorting
  sortBy?:
    | 'relevance'
    | 'intent_score'
    | 'company_size'
    | 'recent_activity'
    | 'created_at';
  sortOrder?: 'asc' | 'desc';

  // Pagination
  page?: number;
  limit?: number;

  // Output
  includeFields?: string[];
  excludeFields?: string[];
}

export interface SearchSuggestion {
  type: 'company' | 'contact' | 'industry' | 'technology' | 'location';
  value: string;
  label: string;
  count?: number;
  metadata?: Record<string, unknown>;
}

export interface NaturalLanguageQueryRequest {
  query: string; // e.g., "SaaS companies in Detroit with 50-200 employees using HubSpot"
  organizationId: string;
}

export interface NaturalLanguageQueryResult {
  originalQuery: string;
  parsedFilters: AdvancedSearchInput;
  aiExplanation: string;
  confidence: number;
  suggestedFilters: string[];
  suggestedCorrections?: string[];
}

export interface SavedSearchInput {
  name: string;
  description?: string;
  filters: AdvancedSearchInput;
  alertEnabled?: boolean;
  alertThreshold?: number; // Min intent score to trigger alert
}

export interface SearchAnalytics {
  totalResults: number;
  facets: {
    industries: Array<{ value: string; count: number }>;
    companySizes: Array<{ value: string; count: number }>;
    locations: Array<{ value: string; count: number }>;
    technologies: Array<{ value: string; count: number }>;
    buyingStages: Array<{ value: string; count: number }>;
  };
  intentDistribution: {
    high: number; // 70-100
    medium: number; // 40-69
    low: number; // 0-39
  };
  avgIntentScore: number;
}

export interface AdvancedSearchResult {
  contacts?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    emailStatus: string;
    title: string;
    seniority: string;
    department: string;
    company?: {
      id: string;
      name: string;
      domain: string;
      industry: string;
      employeeCount: number;
    };
    intentScore: number;
    buyingStage: string;
    enrichedAt?: Date;
  }>;

  companies?: Array<{
    id: string;
    name: string;
    domain: string;
    industry: string;
    employeeCount: number;
    annualRevenue?: number;
    technologies: string[];
    intentScore: number;
    buyingStage: string;
    headquarters?: {
      city: string;
      state: string;
      country: string;
    };
  }>;

  analytics: SearchAnalytics;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  };
}
