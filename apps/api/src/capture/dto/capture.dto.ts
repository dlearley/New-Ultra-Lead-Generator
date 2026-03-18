// Lead Form DTOs

export interface CreateLeadFormDto {
  name: string;
  description?: string;
  formType?: 'inline' | 'popup' | 'slide_in' | 'fullscreen' | 'sticky_bar';
  template?: string;
  fields: FormField[];
  design?: FormDesign;
  triggerConfig?: TriggerConfig;
  displayRules?: DisplayRules;
  thankYouMessage?: string;
  redirectUrl?: string;
  leadMagnetId?: string;
}

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'file' | 'hidden';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // for select, radio, checkbox
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  defaultValue?: string;
  helpText?: string;
}

export interface FormDesign {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  borderRadius?: number;
  buttonText?: string;
  buttonColor?: string;
  width?: string;
  padding?: string;
}

export interface TriggerConfig {
  triggerType: 'immediate' | 'time_on_page' | 'scroll_percentage' | 'exit_intent' | 'click';
  delay?: number; // seconds for time_on_page
  scrollPercentage?: number; // for scroll trigger
  clickSelector?: string; // CSS selector for click trigger
}

export interface DisplayRules {
  showOnPages?: string[]; // URL patterns
  hideOnPages?: string[];
  frequency?: 'always' | 'once_per_session' | 'once_per_day' | 'once_per_week';
  deviceType?: 'all' | 'desktop' | 'mobile';
}

export interface UpdateLeadFormDto extends Partial<CreateLeadFormDto> {
  status?: 'draft' | 'active' | 'paused' | 'archived';
}

export interface LeadFormResponse {
  id: string;
  name: string;
  description?: string;
  formType: string;
  status: string;
  template?: string;
  fields: FormField[];
  design: FormDesign;
  triggerConfig: TriggerConfig;
  displayRules: DisplayRules;
  thankYouMessage?: string;
  redirectUrl?: string;
  leadMagnetId?: string;
  views: number;
  submissions: number;
  conversions: number;
  conversionRate: number;
  createdAt: string;
  updatedAt: string;
}

// Form Submission DTOs

export interface SubmitFormDto {
  formId: string;
  data: Record<string, any>;
  visitorId?: string;
  pageUrl?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface FormSubmissionResponse {
  id: string;
  formId: string;
  data: Record<string, any>;
  visitorId?: string;
  ipAddress?: string;
  pageUrl?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  contactId?: string;
  converted: boolean;
  submittedAt: string;
}

// Landing Page DTOs

export interface CreateLandingPageDto {
  name: string;
  slug: string;
  title: string;
  description?: string;
  content: PageBlock[];
  template?: string;
  metaTitle?: string;
  metaDescription?: string;
  formId?: string;
}

export interface PageBlock {
  id: string;
  type: 'hero' | 'text' | 'image' | 'video' | 'form' | 'testimonial' | 'features' | 'cta' | 'footer';
  content: Record<string, any>;
  styles?: Record<string, string>;
}

export interface UpdateLandingPageDto extends Partial<CreateLandingPageDto> {
  status?: 'draft' | 'published' | 'archived';
}

export interface LandingPageResponse {
  id: string;
  name: string;
  slug: string;
  title: string;
  description?: string;
  content: PageBlock[];
  template?: string;
  metaTitle?: string;
  metaDescription?: string;
  status: string;
  publishedAt?: string;
  views: number;
  uniqueViews: number;
  conversions: number;
  conversionRate: number;
  formId?: string;
  createdAt: string;
  updatedAt: string;
}

// Website Visitor DTOs

export interface TrackVisitorDto {
  fingerprint: string;
  sessionId: string;
  pageUrl: string;
  pageTitle?: string;
  referrer?: string;
  ipAddress?: string;
  userAgent?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface IdentifyVisitorDto {
  visitorId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  title?: string;
}

export interface VisitorResponse {
  id: string;
  fingerprint: string;
  sessionId: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  companyName?: string;
  companyDomain?: string;
  companyIndustry?: string;
  pageViews: number;
  firstVisitAt: string;
  lastVisitAt: string;
  leadScore: number;
  contactId?: string;
  identifiedAt?: string;
}

// Lead Magnet DTOs

export interface CreateLeadMagnetDto {
  name: string;
  description?: string;
  type: 'ebook' | 'whitepaper' | 'template' | 'webinar' | 'checklist' | 'tool' | 'guide';
  fileUrl?: string;
  content?: string;
  externalUrl?: string;
  deliveryMethod?: 'immediate' | 'email';
  requireEmail?: boolean;
  requirePhone?: boolean;
}

export interface UpdateLeadMagnetDto extends Partial<CreateLeadMagnetDto> {}

export interface LeadMagnetResponse {
  id: string;
  name: string;
  description?: string;
  type: string;
  fileUrl?: string;
  content?: string;
  externalUrl?: string;
  deliveryMethod: string;
  views: number;
  downloads: number;
  createdAt: string;
  updatedAt: string;
}

// Analytics DTOs

export interface FormAnalytics {
  formId: string;
  totalViews: number;
  totalSubmissions: number;
  conversionRate: number;
  submissionsByDay: Array<{ date: string; count: number }>;
  submissionsBySource: Record<string, number>;
  topReferrers: Array<{ url: string; count: number }>;
}

export interface LandingPageAnalytics {
  pageId: string;
  totalViews: number;
  uniqueViews: number;
  totalConversions: number;
  conversionRate: number;
  viewsByDay: Array<{ date: string; views: number; unique: number }>;
  avgTimeOnPage: number;
  bounceRate: number;
}

export interface ConversionDashboard {
  totalConversions: number;
  conversionsBySource: Record<string, number>;
  conversionsByDay: Array<{ date: string; count: number }>;
  topLandingPages: Array<{ pageId: string; name: string; conversions: number }>;
  topForms: Array<{ formId: string; name: string; conversions: number }>;
  avgTimeToConvert: number;
}
