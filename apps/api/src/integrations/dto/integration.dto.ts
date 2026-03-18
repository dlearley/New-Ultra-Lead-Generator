export interface CreateCrmConnectionDto {
  provider: 'salesforce' | 'hubspot' | 'dynamics' | 'pipedrive' | 'zoho';
  credentials: {
    accessToken: string;
    refreshToken?: string;
    instanceUrl?: string;
  };
  settings?: {
    syncFrequency?: 'realtime' | 'hourly' | 'daily';
    conflictResolution?: 'crm_wins' | 'local_wins' | 'newer_wins';
  };
  syncConfig?: {
    contacts?: { enabled: boolean; direction: 'to_crm' | 'from_crm' | 'bidirectional' };
    companies?: { enabled: boolean; direction: 'to_crm' | 'from_crm' | 'bidirectional' };
    deals?: { enabled: boolean; direction: 'to_crm' | 'from_crm' | 'bidirectional' };
    tasks?: { enabled: boolean; direction: 'to_crm' | 'from_crm' | 'bidirectional' };
  };
}

export interface UpdateCrmConnectionDto {
  settings?: CreateCrmConnectionDto['settings'];
  syncConfig?: CreateCrmConnectionDto['syncConfig'];
  status?: 'connected' | 'disconnected' | 'paused';
}

export interface CreateFieldMappingDto {
  entityType: 'contact' | 'company' | 'deal' | 'task';
  localField: string;
  crmField: string;
  crmFieldId?: string;
  transform?: string;
  direction?: 'to_crm' | 'from_crm' | 'bidirectional';
  isRequired?: boolean;
}

export interface RunSyncDto {
  entityType?: 'contact' | 'company' | 'deal' | 'task' | 'all';
  direction?: 'to_crm' | 'from_crm' | 'bidirectional';
}

export interface CreateWebhookDto {
  name: string;
  description?: string;
  url: string;
  events: string[];
  secret?: string;
}

export interface WebhookEvent {
  event: string;
  timestamp: string;
  organizationId: string;
  data: any;
}

export interface IntegrationDashboardDto {
  connections: Array<{
    id: string;
    provider: string;
    status: string;
    lastSyncAt: string | null;
    totalSynced: number;
  }>;
  recentSyncs: Array<{
    id: string;
    jobType: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    successCount: number;
    errorCount: number;
  }>;
  webhookStats: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalDelivered: number;
    totalFailed: number;
  };
}

export interface CrmAuthUrlDto {
  provider: string;
  redirectUri: string;
}

export interface CrmAuthCallbackDto {
  provider: string;
  code: string;
  redirectUri: string;
}
