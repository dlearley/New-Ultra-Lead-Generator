import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/integrations`,
  headers: {
    'Content-Type': 'application/json',
    'x-organization-id': 'demo-org-id', // In a real app, this would come from auth
  },
});

// Types
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

// CRM Types
export const getCrmTypes = () => ['SALESFORCE', 'HUBSPOT', 'PIPEDRIVE'];

// Field Mappings API
export const getFieldMappings = async (crmType?: string) => {
  const params = crmType ? { crmType } : {};
  const response = await api.get('/field-mappings', { params });
  return response.data.data.mappings;
};

export const createFieldMappings = async (data: {
  crmType: string;
  mappings: FieldMappingData[];
}) => {
  const response = await api.post('/field-mappings', data);
  return response.data;
};

export const deleteFieldMapping = async (mappingId: string) => {
  const response = await api.delete(`/field-mappings/${mappingId}`);
  return response.data;
};

export const getAvailableCrmFields = async (crmType: string) => {
  const response = await api.get(`/field-mappings/crm-fields/${crmType}`);
  return response.data.data;
};

export const validateFieldMappings = async (data: {
  crmType: string;
  mappings: FieldMappingData[];
}) => {
  const response = await api.post('/field-mappings/validate', data);
  return response.data.data;
};

export const getStandardBusinessLeadFields = async () => {
  const response = await api.get('/field-mappings/standard-fields');
  return response.data.data.fields;
};

// CRM Push API
export const pushLeads = async (data: {
  crmType: string;
  leadIds?: string[];
  leads?: BusinessLeadData[];
  runImmediately?: boolean;
}) => {
  const response = await api.post('/crm/push-leads', data);
  return response.data;
};

// Sync Jobs API
export const getSyncJobs = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  crmType?: string;
}) => {
  const response = await api.get('/crm/sync-jobs', { params });
  return response.data.data;
};

export const getSyncJob = async (jobId: string) => {
  const response = await api.get(`/crm/sync-jobs/${jobId}`);
  return response.data.data;
};

// CRM Connection Test
export const testCrmConnection = async (crmType: string) => {
  const response = await api.post('/crm/test-connection', { crmType });
  return response.data;
};

// Health Check
export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;