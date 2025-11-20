export interface DataSource {
  id: string;
  name: string;
  type: 'api' | 'database' | 'file' | 'stream';
  connector: string;
  credentials: Record<string, any>;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
    currentUsage: {
      minute: number;
      hour: number;
      day: number;
    };
  };
  enabled: boolean;
  healthStatus: {
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    responseTime?: number;
    errorRate: number;
    lastError?: string;
  };
  lastHealthCheck: string;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  plans: string[];
  tenantOverrides: Array<{
    tenantId: string;
    enabled: boolean;
    value?: any;
  }>;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  tier: 'basic' | 'pro' | 'enterprise' | 'custom';
  features: string[];
  limits: {
    dataSources: number;
    apiCallsPerMonth: number;
    storageGB: number;
    users: number;
  };
  price: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DataQualityMetrics {
  id: string;
  data_source_id: string;
  data_source_name?: string;
  region: string;
  industry: string;
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  validity: number;
  score: number;
  last_updated: string;
}

export interface ModerationQueue {
  id: string;
  entity_type: 'profile' | 'data' | 'config';
  entity_id: string;
  changes: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  moderator_id?: string;
  moderator_email?: string;
  moderator_notes?: string;
  created_at: string;
  reviewed_at?: string;
}

export interface HealthLog {
  id: string;
  data_source_id: string;
  data_source_name?: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  resolved: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'viewer';
  permissions: Array<{
    resource: string;
    actions: string[];
  }>;
  last_login?: string;
  created_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface WebSocketMessage {
  type: 'health_update' | 'data_quality_update' | 'system_alert' | 'connection_established';
  payload: any;
  timestamp: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface FilterParams {
  status?: string;
  level?: string;
  region?: string;
  industry?: string;
  entityType?: string;
  resolved?: boolean;
  timeRange?: string;
}