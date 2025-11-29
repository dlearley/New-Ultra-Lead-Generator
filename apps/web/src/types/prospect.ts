export type OwnershipType = "Public" | "Private" | "PE-backed" | "VC-backed";
export type BusinessType = "B2B" | "B2C" | "Marketplace" | "D2C";

export interface ProspectLocation {
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
}

export interface Prospect {
  id: string;
  name: string;
  description: string;
  industry: string;
  naics: string;
  sic: string;
  ownership: OwnershipType;
  businessType: BusinessType;
  location: ProspectLocation;
  revenueRange: [number, number];
  employeesRange: [number, number];
  reviewCount: number;
  reviewRating: number;
  reviewPlatforms: string[];
  recentReviewDays: number;
  isHiring: boolean;
  hasWebsite: boolean;
  hasGenericEmail: boolean;
  techStack: string[];
  aiLeadScore: number;
  fundingStage: string;
  lastFundingRound: string;
  tags: string[];
}

export interface ProspectFilters {
  query: string;
  industries: string[];
  naicsCodes: string[];
  sicCodes: string[];
  ownershipTypes: OwnershipType[];
  businessTypes: BusinessType[];
  locations: {
    city?: string;
    state?: string;
    country?: string;
    lat?: number;
    lng?: number;
  }[];
  radiusMiles: number;
  revenueRange: [number, number] | null;
  employeesRange: [number, number] | null;
  minimumReviewRating: number;
  minimumReviewCount: number;
  reviewPlatforms: string[];
  hasRecentReviews: boolean;
  isHiring: boolean | null;
  hasWebsite: boolean | null;
  hasGenericEmail: boolean | null;
  techStacks: string[];
}

export type SortField = "aiLeadScore" | "name" | "revenue" | "employees";

export interface SortState {
  field: SortField;
  direction: "asc" | "desc";
}

export interface PaginationState {
  page: number;
  pageSize: number;
}

export interface ProspectSearchResponse {
  results: Prospect[];
  total: number;
}
