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

export interface FieldMappingData {
  sourceField: string;
  targetField: string;
  fieldType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'EMAIL' | 'PHONE' | 'PICKLIST' | 'TEXTAREA';
  isRequired?: boolean;
  defaultValue?: string;
}

export interface SyncJob {
  id: string;
  organizationId: string;
  businessLeadId: string;
  crmType: 'SALESFORCE' | 'HUBSPOT' | 'PIPEDRIVE';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRYING';
  errorMessage?: string;
  requestData?: any;
  responseData?: any;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  businessLead?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
  };
}

export interface CrmConfiguration {
  id: string;
  crmType: 'SALESFORCE' | 'HUBSPOT' | 'PIPEDRIVE';
  isActive: boolean;
  credentials: any;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    message: string;
    statusCode: number;
  };
}