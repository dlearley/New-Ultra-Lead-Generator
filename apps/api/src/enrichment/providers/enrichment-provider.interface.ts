// Enrichment Provider Interface
export interface EnrichmentProvider {
  name: string;
  testConnection(): Promise<boolean>;
}

export interface CompanyEnrichmentResult {
  name?: string;
  domain?: string;
  description?: string;
  industry?: string;
  subIndustry?: string;
  employeeCount?: number;
  employeeRange?: string;
  annualRevenue?: number;
  revenueRange?: string;
  naicsCode?: string;
  sicCode?: string;
  foundedYear?: number;
  logo?: string;
  
  // Location
  headquarters?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  
  // Social
  linkedInUrl?: string;
  twitterHandle?: string;
  facebookUrl?: string;
  
  // Technographics
  technologies?: string[];
  
  // Confidence
  confidence: number;
  source: string;
}

export interface PersonEnrichmentResult {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  emailStatus?: 'valid' | 'invalid' | 'catch_all' | 'unknown';
  phone?: string;
  mobile?: string;
  
  // Professional
  title?: string;
  seniority?: string;
  department?: string;
  
  // Social
  linkedInUrl?: string;
  twitterHandle?: string;
  githubUsername?: string;
  
  // Location
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  
  // Employment
  company?: {
    name?: string;
    domain?: string;
    title?: string;
  };
  
  // Confidence
  confidence: number;
  source: string;
}

export interface EmailVerificationResult {
  email: string;
  status: 'valid' | 'invalid' | 'catch_all' | 'unknown' | 'risky';
  isDeliverable: boolean;
  isDisposable: boolean;
  isRoleAccount: boolean;
  isFreeProvider: boolean;
  
  // MX/DNS checks
  hasMxRecord: boolean;
  mxDomain?: string;
  
  // SMTP verification
  smtpVerified?: boolean;
  
  // Confidence
  confidence: number;
  score?: number; // 0-100
  
  source: string;
}

export interface TechnologyDetectionResult {
  domain: string;
  technologies: Array<{
    name: string;
    category: string;
    confidence: number;
    firstDetectedAt?: Date;
    lastSeenAt?: Date;
  }>;
  
  // Metadata
  detectedAt: Date;
  source: string;
}

export interface EnrichmentError {
  provider: string;
  error: string;
  code?: string;
  retryable: boolean;
}
