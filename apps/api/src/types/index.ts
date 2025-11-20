export interface BusinessLeadData {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  source?: string;
  customFields?: Record<string, any>;
}

export interface CrmCredentials {
  // Salesforce
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  securityToken?: string;
  instanceUrl?: string;
  
  // HubSpot
  accessToken?: string;
  refreshToken?: string;
  
  // Pipedrive
  apiToken?: string;
  companyDomain?: string;
}

export interface FieldMappingData {
  sourceField: string;
  targetField: string;
  fieldType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'EMAIL' | 'PHONE' | 'PICKLIST' | 'TEXTAREA';
  isRequired?: boolean;
  defaultValue?: string;
}

export interface CrmAdapter {
  authenticate(credentials: CrmCredentials): Promise<boolean>;
  pushLead(leadData: BusinessLeadData, fieldMappings: FieldMappingData[]): Promise<CrmPushResult>;
  validateFieldMapping(fieldMapping: FieldMappingData): Promise<boolean>;
  getAvailableFields(): Promise<string[]>;
}

export interface CrmPushResult {
  success: boolean;
  crmId?: string;
  errorMessage?: string;
  responseData?: any;
}

export interface SyncJobData {
  organizationId: string;
  businessLeadId: string;
  crmType: 'SALESFORCE' | 'HUBSPOT' | 'PIPEDRIVE';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRYING';
  errorMessage?: string;
  requestData?: any;
  responseData?: any;
}

export interface PushLeadsRequest {
  crmType: 'SALESFORCE' | 'HUBSPOT' | 'PIPEDRIVE';
  leadIds?: string[];
  leads?: BusinessLeadData[];
  runImmediately?: boolean;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
}

export interface QueueConfig {
  connection: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  defaultJobOptions: {
    removeOnComplete: number;
    removeOnFail: number;
    attempts: number;
    backoff: {
      type: string;
      delay: number;
    };
  };
}