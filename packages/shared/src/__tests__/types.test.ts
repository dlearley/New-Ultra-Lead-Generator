import { User, ApiResponse, API_ENDPOINTS } from '../src/index';

describe('Shared Types', () => {
  describe('User interface', () => {
    it('should create a valid user object', () => {
      const user: User = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      };

      expect(user.id).toBe('1');
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.role).toBe('user');
    });

    it('should accept admin role', () => {
      const user: User = {
        id: '2',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
      };

      expect(user.role).toBe('admin');
    });
  });

  describe('ApiResponse interface', () => {
    it('should create a successful response', () => {
      const response: ApiResponse<string> = {
        success: true,
        data: 'Success message',
        message: 'Operation completed',
      };

      expect(response.success).toBe(true);
      expect(response.data).toBe('Success message');
      expect(response.message).toBe('Operation completed');
    });

    it('should create an error response', () => {
      const response: ApiResponse = {
        success: false,
        error: 'Something went wrong',
      };

      expect(response.success).toBe(false);
      expect(response.error).toBe('Something went wrong');
    });
  });

  describe('API_ENDPOINTS', () => {
    it('should contain expected endpoints', () => {
      expect(API_ENDPOINTS.USERS).toBe('/api/users');
      expect(API_ENDPOINTS.AUTH).toBe('/api/auth');
      expect(API_ENDPOINTS.HEALTH).toBe('/api/health');
    });
  });
});