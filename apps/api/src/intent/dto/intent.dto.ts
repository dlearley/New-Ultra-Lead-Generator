// Intent Monitoring DTOs

export interface IntentWebhookPayload {
  type: string;
  timestamp: string;
  source: string;
  email?: string;
  domain?: string;
  companyId?: string;
  contactId?: string;
  data: Record<string, unknown>;
}

export interface WebsiteVisitEvent {
  url: string;
  referrer?: string;
  title?: string;
  duration?: number;
  scrollDepth?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  ipAddress?: string;
  userAgent?: string;
  fingerprint?: string;
}

export interface ContentDownloadEvent {
  contentType: string;
  contentId: string;
  contentTitle: string;
  email?: string;
  domain?: string;
  company?: string;
  formFields?: Record<string, string>;
}

export interface EmailEngagementEvent {
  email?: string;
  domain?: string;
  emailType: string;
  campaignId?: string;
  subject?: string;
  action: 'open' | 'click' | 'reply' | 'forward' | 'unsubscribe';
  linkUrl?: string;
  linkText?: string;
}

export interface PricingPageEvent {
  url?: string;
  planViewed?: string;
  timeOnPage?: number;
  calculatorUsed?: boolean;
  estimatedValue?: number;
}

export interface DemoRequestEvent {
  email?: string;
  domain?: string;
  preferredDate?: string;
  preferredTime?: string;
  teamSize?: string;
  useCase?: string;
  budgetRange?: string;
  timeline?: string;
}

export interface FundingNewsEvent {
  domain?: string;
  companyName?: string;
  fundingRound: string;
  amount: number;
  currency: string;
  leadInvestor?: string;
  otherInvestors?: string[];
  valuation?: number;
  totalFunding?: number;
  newsUrl?: string;
  publishedAt: string;
}

export interface TechnologyChangeEvent {
  domain?: string;
  companyName?: string;
  changeType: 'added' | 'removed' | 'updated';
  technology: string;
  category: string;
  detectedAt: string;
  confidence: number;
}

export interface HiringActivityEvent {
  domain?: string;
  companyName?: string;
  jobTitle: string;
  department: string;
  seniority: string;
  jobCount: number;
  postedAt: string;
  location?: string;
  remote?: boolean;
}

export interface CreateIntentSignalDto {
  type: string;
  category: 'behavioral' | 'engagement' | 'firmographic' | 'technographic' | 'news';
  contactId?: string;
  companyId?: string;
  email?: string;
  domain?: string;
  score: number;
  confidence: number;
  url?: string;
  referrer?: string;
  campaign?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  pageTitle?: string;
  contentTopic?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: string;
}

export interface IntentScoreResult {
  contactId?: string;
  companyId?: string;
  overallScore: number;
  behavioralScore: number;
  engagementScore: number;
  technographicScore: number;
  firmographicScore: number;
  newsScore: number;
  stage: 'awareness' | 'consideration' | 'decision' | 'purchase' | 'churned';
  recentSignals: Array<{
    type: string;
    score: number;
    detectedAt: string;
  }>;
  recommendedActions: string[];
  bestTimeToContact?: string;
  suggestedMessaging?: string;
}

export interface CreateIntentAlertDto {
  name: string;
  description?: string;
  filters: {
    minIntentScore?: number;
    intentTypes?: string[];
    buyingStage?: string[];
    companies?: string[];
    contacts?: string[];
  };
  threshold: number;
  notifyEmail: boolean;
  emailAddresses?: string[];
  notifySlack?: boolean;
  slackWebhook?: string;
  webhookUrl?: string;
}

export interface IntentAlertTriggered {
  alertId: string;
  alertName: string;
  triggeredBy: {
    type: 'contact' | 'company';
    id: string;
    name: string;
    intentScore: number;
    buyingStage: string;
  };
  contributingSignals: Array<{
    type: string;
    score: number;
    detectedAt: string;
  }>;
  recommendedAction: string;
  triggeredAt: string;
}

export interface IntentDashboardData {
  totalContacts: number;
  totalCompanies: number;
  highIntentCount: number;
  intentDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  signalsToday: number;
  signalsThisWeek: number;
  alertsTriggered: number;
  topContacts: Array<{
    id: string;
    name: string;
    company: string;
    intentScore: number;
    lastActivity: string;
  }>;
  signalsByType: Record<string, number>;
  intentTrend: Array<{
    date: string;
    avgScore: number;
    signalCount: number;
  }>;
}
