// Intent Monitoring DTOs

export interface IntentWebhookPayload {
  // Common fields
  type: string;
  timestamp: string;
  source: string;
  
  // Contact/Company identification
  email?: string;
  domain?: string;
  companyId?: string;
  contactId?: string;
  
  // Event specific data
  data: Record<string, unknown>;
}

export interface WebsiteVisitEvent {
  url: string;
  referrer?: string;
  title?: string;
  duration?: number; // seconds
  scrollDepth?: number; // percentage
  
  // UTM parameters
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  
  // User info
  ipAddress?: string;
  userAgent?: string;
  fingerprint?: string;
}

export interface ContentDownloadEvent {
  contentType: string; // whitepaper, ebook, case_study, etc.
  contentId: string;
  contentTitle: string;
  
  // Form data
  formFields?: Record<string, string>;
}

export interface EmailEngagementEvent {
  emailType: string; // newsletter, drip, transactional
  campaignId?: string;
  subject?: string;
  
  // Engagement type
  action: 'open' | 'click' | 'reply' | 'forward' | 'unsubscribe';
  
  // Click details
  linkUrl?: string;
  linkText?: string;
}

export interface PricingPageEvent {
  planViewed?: string;
  timeOnPage?: number;
  
  // Calculator usage
  calculatorUsed?: boolean;
  estimatedValue?: number;
}

export interface DemoRequestEvent {
  preferredDate?: string;
  preferredTime?: string;
  teamSize?: string;
  useCase?: string;
  
  // Qualification
  budgetRange?: string;
  timeline?: string;
}

export interface FundingNewsEvent {
  fundingRound: string;
  amount: number;
  currency: string;
  
  // Investors
  leadInvestor?: string;
  otherInvestors?: string[];
  
  // Company metrics
  valuation?: number;
  totalFunding?: number;
  
  // Source
  newsUrl?: string;
  publishedAt: string;
}

export interface TechnologyChangeEvent {
  changeType: 'added' | 'removed' | 'updated';
  technology: string;
  category: string;
  
  // Detection info
  detectedAt: string;
  confidence: number;
}

export interface HiringActivityEvent {
  jobTitle: string;
  department: string;
  seniority: string;
  
  // Hiring signals
  jobCount: number;
  postedAt: string;
  
  // Location
  location?: string;
  remote?: boolean;
}

export interface CreateIntentSignalDto {
  type: string;
  category: 'behavioral' | 'engagement' | 'firmographic' | 'technographic' | 'news';
  
  // Target
  contactId?: string;
  companyId?: string;
  email?: string;
  domain?: string;
  
  // Signal data
  score: number; // 0-100
  confidence: number; // 0-1
  
  // Context
  url?: string;
  referrer?: string;
  campaign?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  
  // Content
  pageTitle?: string;
  contentTopic?: string;
  
  // Metadata
  metadata?: Record<string, unknown>;
  
  // Expiration
  expiresAt?: string;
}

export interface IntentScoreResult {
  contactId?: string;
  companyId?: string;
  
  // Overall score
  overallScore: number; // 0-100
  
  // Component scores
  behavioralScore: number;
  engagementScore: number;
  technographicScore: number;
  firmographicScore: number;
  newsScore: number;
  
  // Buying stage
  stage: 'awareness' | 'consideration' | 'decision' | 'purchase' | 'churned';
  
  // Recent signals
  recentSignals: Array<{
    type: string;
    score: number;
    detectedAt: string;
  }>;
  
  // Recommendations
  recommendedActions: string[];
  bestTimeToContact?: string;
  suggestedMessaging?: string;
}

export interface CreateIntentAlertDto {
  name: string;
  description?: string;
  
  // Filter criteria
  filters: {
    minIntentScore?: number;
    intentTypes?: string[];
    buyingStage?: string[];
    companies?: string[];
    contacts?: string[];
  };
  
  // Threshold
  threshold: number; // Min score to trigger
  
  // Notification settings
  notifyEmail: boolean;
  emailAddresses?: string[];
  notifySlack?: boolean;
  slackWebhook?: string;
  webhookUrl?: string;
}

export interface IntentAlertTriggered {
  alertId: string;
  alertName: string;
  
  // What triggered it
  triggeredBy: {
    type: 'contact' | 'company';
    id: string;
    name: string;
    intentScore: number;
    buyingStage: string;
  };
  
  // Signals that contributed
  contributingSignals: Array<{
    type: string;
    score: number;
    detectedAt: string;
  }>;
  
  // Recommended action
  recommendedAction: string;
  
  triggeredAt: string;
}

export interface IntentDashboardData {
  // Overview
  totalContacts: number;
  totalCompanies: number;
  highIntentCount: number;
  
  // Intent distribution
  intentDistribution: {
    high: number; // 70-100
    medium: number; // 40-69
    low: number; // 0-39
  };
  
  // Recent activity
  signalsToday: number;
  signalsThisWeek: number;
  alertsTriggered: number;
  
  // Top prospects
  topContacts: Array<{
    id: string;
    name: string;
    company: string;
    intentScore: number;
    lastActivity: string;
  }>;
  
  // Signal breakdown
  signalsByType: Record<string, number>;
  
  // Trend
  intentTrend: Array<{
    date: string;
    avgScore: number;
    signalCount: number;
  }>;
}
