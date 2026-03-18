export type CrmType = 'SALESFORCE' | 'HUBSPOT' | 'PIPEDRIVE' | 'ZOHO' | 'OTHER' | 'salesforce' | 'hubspot' | 'pipedrive' | 'zoho' | 'other';

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
  services: {
    database: 'connected' | 'disconnected';
    redis: 'connected' | 'disconnected';
    opensearch: 'connected' | 'disconnected';
  };
}

// CRM Adapter Types
export interface CrmAdapter {
  name: string;
  testConnection(credentials: CrmCredentials): Promise<boolean>;
  pushLead(lead: BusinessLeadData, fieldMappings: FieldMappingData[]): Promise<CrmPushResult>;
  getFields(): Promise<any[]>;
}

export interface CrmCredentials {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  accessToken?: string;
  instanceUrl?: string;
  // Provider-specific credentials
  apiToken?: string;
  companyDomain?: string;
  username?: string;
  password?: string;
  securityToken?: string;
}

export interface BusinessLeadData {
  id?: string;
  company?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  industry?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  linkedinUrl?: string;
  revenue?: string;
  employees?: string;
  [key: string]: any;
}

export interface FieldMappingData {
  sourceField: string;
  targetField: string;
  fieldType?: string;
  defaultValue?: string;
  isRequired?: boolean;
  transform?: string;
}

export interface CrmPushResult {
  success: boolean;
  crmId?: string;
  message?: string;
  error?: string;
  errorMessage?: string;
  responseData?: any;
}

// Additional types for CRM
export interface SyncJobData {
  organizationId: string;
  businessLeadId: string;
  crmType: string;
  id: string;
  crmConfigId: string;
  status: string;
  entityType: string;
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  errorCount: number;
}

// Extended CrmAdapter with methods used by services
export interface ExtendedCrmAdapter extends CrmAdapter {
  authenticate(credentials: CrmCredentials): Promise<boolean>;
  getAvailableFields(): Promise<string[]>;
  validateFieldMapping(fieldMapping: FieldMappingData): Promise<boolean>;
}
