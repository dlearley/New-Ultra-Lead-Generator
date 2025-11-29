import { z } from 'zod';

export const pushLeadsSchema = z.object({
  crmType: z.enum(['SALESFORCE', 'HUBSPOT', 'PIPEDRIVE']),
  leadIds: z.array(z.string().cuid()).optional(),
  leads: z.array(z.object({
    email: z.string().email(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    jobTitle: z.string().optional(),
    source: z.string().optional(),
    customFields: z.record(z.any()).optional(),
  })).optional(),
  runImmediately: z.boolean().default(false),
}).refine(
  (data) => data.leadIds || data.leads,
  {
    message: "Either leadIds or leads must be provided",
    path: ["leadIds"],
  }
);

export const fieldMappingSchema = z.object({
  crmType: z.enum(['SALESFORCE', 'HUBSPOT', 'PIPEDRIVE']),
  mappings: z.array(z.object({
    sourceField: z.string().min(1),
    targetField: z.string().min(1),
    fieldType: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'EMAIL', 'PHONE', 'PICKLIST', 'TEXTAREA']),
    isRequired: z.boolean().default(false),
    defaultValue: z.string().optional(),
  })),
});

export const crmConfigSchema = z.object({
  crmType: z.enum(['SALESFORCE', 'HUBSPOT', 'PIPEDRIVE']),
  isActive: z.boolean().default(false),
  credentials: z.object({
    // Salesforce
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    securityToken: z.string().optional(),
    instanceUrl: z.string().optional(),
    
    // HubSpot
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    
    // Pipedrive
    apiToken: z.string().optional(),
    companyDomain: z.string().optional(),
  }),
}).refine(
  (data) => {
    switch (data.crmType) {
      case 'SALESFORCE':
        return !!(data.credentials.clientId && data.credentials.clientSecret && 
                  data.credentials.username && data.credentials.password);
      case 'HUBSPOT':
        return !!data.credentials.accessToken;
      case 'PIPEDRIVE':
        return !!(data.credentials.apiToken && data.credentials.companyDomain);
      default:
        return false;
    }
  },
  {
    message: "Invalid or missing credentials for the specified CRM type",
    path: ["credentials"],
  }
);

export const businessLeadSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  source: z.string().optional(),
  customFields: z.record(z.any()).optional(),
});

export const organizationIdSchema = z.object({
  organizationId: z.string().cuid(),
});

export const syncJobIdSchema = z.object({
  jobId: z.string().cuid(),
});

export const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1).default(1)),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100).default(20)),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING']).optional(),
  crmType: z.enum(['SALESFORCE', 'HUBSPOT', 'PIPEDRIVE']).optional(),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});