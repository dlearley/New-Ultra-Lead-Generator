export interface DataSource {
  id: string;
  name: string;
  type: 'api' | 'database' | 'file' | 'stream';
  connector: string;
  credentials: EncryptedCredentials;
  rateLimit: RateLimit;
  enabled: boolean;
  healthStatus: HealthStatus;
  lastHealthCheck: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EncryptedCredentials {
  apiKey?: string;
  username?: string;
  password?: string;
  connectionString?: string;
  additionalConfig?: Record<string, any>;
}

export interface RateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  currentUsage: {
    minute: number;
    hour: number;
    day: number;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  responseTime?: number;
  errorRate: number;
  lastError?: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  plans: string[];
  tenantOverrides: TenantOverride[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantOverride {
  tenantId: string;
  enabled: boolean;
  value?: any;
}

export interface Plan {
  id: string;
  name: string;
  tier: 'basic' | 'pro' | 'enterprise' | 'custom';
  features: string[];
  limits: PlanLimits;
  price: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanLimits {
  dataSources: number;
  apiCallsPerMonth: number;
  storageGB: number;
  users: number;
}

export interface DataQualityMetrics {
  id: string;
  dataSourceId: string;
  region: string;
  industry: string;
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  validity: number;
  score: number;
  lastUpdated: Date;
}

export interface ModerationQueue {
  id: string;
  entityType: 'profile' | 'data' | 'config';
  entityId: string;
  changes: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  moderatorId?: string;
  moderatorNotes?: string;
  createdAt: Date;
  reviewedAt?: Date;
}

export interface HealthLog {
  id: string;
  dataSourceId: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'viewer';
  permissions: Permission[];
  lastLogin?: Date;
  createdAt: Date;
}

export interface Permission {
  resource: 'data_sources' | 'feature_flags' | 'plans' | 'data_quality' | 'health_logs';
  actions: ('read' | 'write' | 'delete')[];
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
  type: 'health_update' | 'data_quality_update' | 'system_alert';
  payload: any;
  timestamp: Date;
}