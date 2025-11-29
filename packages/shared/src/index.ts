export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export const API_ENDPOINTS = {
  USERS: '/api/users',
  AUTH: '/api/auth',
  HEALTH: '/api/health',
} as const;