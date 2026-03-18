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
  pushLead(lead: BusinessLeadData, mapping: FieldMappingData): Promise<CrmPushResult>;
  getFields(): Promise<any[]>;
}

export interface CrmCredentials {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  accessToken?: string;
  instanceUrl?: string;
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
  transform?: string;
}

export interface CrmPushResult {
  success: boolean;
  crmId?: string;
  message?: string;
  error?: string;
}
