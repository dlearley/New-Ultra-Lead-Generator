import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse } from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: '/api',
      timeout: 10000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.api.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token: string) {
    localStorage.setItem('auth_token', token);
  }

  removeAuthToken() {
    localStorage.removeItem('auth_token');
  }

  getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.api.post('/auth/login', { email, password });
    return response.data;
  }

  async register(email: string, password: string, role?: string) {
    const response = await this.api.post('/auth/register', { email, password, role });
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.api.get('/user/me');
    return response.data;
  }

  async updateProfile(email: string) {
    const response = await this.api.put('/user/profile', { email });
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await this.api.put('/user/password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  }

  async getUsers(params?: { page?: number; limit?: number }) {
    const response = await this.api.get('/user/users', { params });
    return response.data;
  }

  async updateUserRole(id: string, role: string, permissions: any[]) {
    const response = await this.api.put(`/user/users/${id}/role`, {
      role,
      permissions,
    });
    return response.data;
  }

  // Data Sources endpoints
  async getDataSources(params?: { page?: number; limit?: number }) {
    const response = await this.api.get('/data-sources', { params });
    return response.data;
  }

  async getDataSource(id: string) {
    const response = await this.api.get(`/data-sources/${id}`);
    return response.data;
  }

  async createDataSource(data: any) {
    const response = await this.api.post('/data-sources', data);
    return response.data;
  }

  async updateDataSource(id: string, data: any) {
    const response = await this.api.put(`/data-sources/${id}`, data);
    return response.data;
  }

  async deleteDataSource(id: string) {
    const response = await this.api.delete(`/data-sources/${id}`);
    return response.data;
  }

  async toggleDataSource(id: string) {
    const response = await this.api.patch(`/data-sources/${id}/toggle`);
    return response.data;
  }

  // Feature Flags endpoints
  async getFeatureFlags(params?: { page?: number; limit?: number }) {
    const response = await this.api.get('/feature-flags', { params });
    return response.data;
  }

  async getFeatureFlag(id: string) {
    const response = await this.api.get(`/feature-flags/${id}`);
    return response.data;
  }

  async createFeatureFlag(data: any) {
    const response = await this.api.post('/feature-flags', data);
    return response.data;
  }

  async updateFeatureFlag(id: string, data: any) {
    const response = await this.api.put(`/feature-flags/${id}`, data);
    return response.data;
  }

  async deleteFeatureFlag(id: string) {
    const response = await this.api.delete(`/feature-flags/${id}`);
    return response.data;
  }

  async toggleFeatureFlag(id: string) {
    const response = await this.api.patch(`/feature-flags/${id}/toggle`);
    return response.data;
  }

  async addTenantOverride(id: string, data: any) {
    const response = await this.api.post(`/feature-flags/${id}/tenant-overrides`, data);
    return response.data;
  }

  async removeTenantOverride(id: string, tenantId: string) {
    const response = await this.api.delete(`/feature-flags/${id}/tenant-overrides/${tenantId}`);
    return response.data;
  }

  // Plans endpoints
  async getPlans(params?: { page?: number; limit?: number }) {
    const response = await this.api.get('/plans', { params });
    return response.data;
  }

  async getPlanFeatures() {
    const response = await this.api.get('/plans/features');
    return response.data;
  }

  async getPlan(id: string) {
    const response = await this.api.get(`/plans/${id}`);
    return response.data;
  }

  async createPlan(data: any) {
    const response = await this.api.post('/plans', data);
    return response.data;
  }

  async updatePlan(id: string, data: any) {
    const response = await this.api.put(`/plans/${id}`, data);
    return response.data;
  }

  async deletePlan(id: string) {
    const response = await this.api.delete(`/plans/${id}`);
    return response.data;
  }

  async togglePlan(id: string) {
    const response = await this.api.patch(`/plans/${id}/toggle`);
    return response.data;
  }

  async clonePlan(id: string, name: string) {
    const response = await this.api.post(`/plans/${id}/clone`, { name });
    return response.data;
  }

  // Data Quality endpoints
  async getDataQualityMetrics(params?: {
    page?: number;
    limit?: number;
    region?: string;
    industry?: string;
    dataSourceId?: string;
  }) {
    const response = await this.api.get('/data-quality', { params });
    return response.data;
  }

  async getDataQualitySummary(params?: {
    region?: string;
    industry?: string;
  }) {
    const response = await this.api.get('/data-quality/summary', { params });
    return response.data;
  }

  async getDataQualityTrends(params?: {
    dataSourceId?: string;
    period?: string;
  }) {
    const response = await this.api.get('/data-quality/trends', { params });
    return response.data;
  }

  async getRegionsAndIndustries() {
    const response = await this.api.get('/data-quality/filters');
    return response.data;
  }

  async getDataQualityMetricsByDataSource(dataSourceId: string) {
    const response = await this.api.get(`/data-quality/data-source/${dataSourceId}`);
    return response.data;
  }

  async createOrUpdateDataQualityMetrics(data: any) {
    const response = await this.api.post('/data-quality', data);
    return response.data;
  }

  // Moderation endpoints
  async getModerationQueue(params?: {
    page?: number;
    limit?: number;
    status?: string;
    entityType?: string;
  }) {
    const response = await this.api.get('/moderation', { params });
    return response.data;
  }

  async getModerationStats() {
    const response = await this.api.get('/moderation/stats');
    return response.data;
  }

  async getModerationItem(id: string) {
    const response = await this.api.get(`/moderation/${id}`);
    return response.data;
  }

  async createModerationItem(data: any) {
    const response = await this.api.post('/moderation', data);
    return response.data;
  }

  async approveModerationItem(id: string, moderatorNotes?: string) {
    const response = await this.api.patch(`/moderation/${id}/approve`, {
      moderatorNotes,
    });
    return response.data;
  }

  async rejectModerationItem(id: string, moderatorNotes?: string) {
    const response = await this.api.patch(`/moderation/${id}/reject`, {
      moderatorNotes,
    });
    return response.data;
  }

  async bulkApprove(ids: string[], moderatorNotes?: string) {
    const response = await this.api.patch('/moderation/bulk-approve', {
      ids,
      moderatorNotes,
    });
    return response.data;
  }

  // Health endpoints
  async getHealthLogs(params?: {
    page?: number;
    limit?: number;
    level?: string;
    dataSourceId?: string;
    resolved?: boolean;
  }) {
    const response = await this.api.get('/health/logs', { params });
    return response.data;
  }

  async getHealthSummary(params?: { timeRange?: string }) {
    const response = await this.api.get('/health/summary', { params });
    return response.data;
  }

  async getHealthTrends(params?: { period?: string }) {
    const response = await this.api.get('/health/trends', { params });
    return response.data;
  }

  async getDataSourceHealth(id: string) {
    const response = await this.api.get(`/health/data-source/${id}`);
    return response.data;
  }

  async createHealthLog(data: any) {
    const response = await this.api.post('/health/logs', data);
    return response.data;
  }

  async resolveHealthLog(id: string) {
    const response = await this.api.patch(`/health/logs/${id}/resolve`);
    return response.data;
  }

  async bulkResolveHealthLogs(ids: string[]) {
    const response = await this.api.patch('/health/logs/bulk-resolve', { ids });
    return response.data;
  }
}

export const apiService = new ApiService();