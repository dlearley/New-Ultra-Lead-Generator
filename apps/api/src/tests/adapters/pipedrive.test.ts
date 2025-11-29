import { PipedriveAdapter } from '../../adapters/pipedrive';
import { BusinessLeadData, FieldMappingData } from '../../types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PipedriveAdapter', () => {
  let adapter: PipedriveAdapter;
  let mockCredentials: any;

  beforeEach(() => {
    adapter = new PipedriveAdapter();
    mockCredentials = {
      apiToken: 'test-api-token',
      companyDomain: 'test-company',
    };
  });

  describe('authenticate', () => {
    it('should authenticate successfully with valid credentials', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          data: { id: 1, name: 'Test User' },
        },
      });

      const result = await adapter.authenticate(mockCredentials);

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://test-company.pipedrive.com/api/v1/users/me',
        {
          params: {
            api_token: 'test-api-token',
          },
        }
      );
    });

    it('should fail authentication with missing credentials', async () => {
      const invalidCredentials = { apiToken: 'test-api-token' };
      delete invalidCredentials.companyDomain;

      const result = await adapter.authenticate(invalidCredentials);

      expect(result).toBe(false);
    });

    it('should handle authentication errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Invalid API token'));

      const result = await adapter.authenticate(mockCredentials);

      expect(result).toBe(false);
    });
  });

  describe('pushLead', () => {
    const leadData: BusinessLeadData = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      company: 'Test Company',
    };

    const fieldMappings: FieldMappingData[] = [
      { sourceField: 'firstName', targetField: 'name', fieldType: 'STRING' },
      { sourceField: 'email', targetField: 'email', fieldType: 'EMAIL' },
      { sourceField: 'phone', targetField: 'phone', fieldType: 'PHONE' },
    ];

    beforeEach(async () => {
      // Authenticate first
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          data: { id: 1, name: 'Test User' },
        },
      });
      await adapter.authenticate(mockCredentials);
    });

    it('should push lead successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            id: 123,
            name: 'John Doe',
          },
        },
      });

      const result = await adapter.pushLead(leadData, fieldMappings);

      expect(result.success).toBe(true);
      expect(result.crmId).toBe('123');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test-company.pipedrive.com/api/v1/persons',
        expect.objectContaining({
          name: expect.stringContaining('John'),
          email: 'test@example.com',
          phone: '+1234567890',
        }),
        {
          params: {
            api_token: 'test-api-token',
          },
        }
      );
    });

    it('should handle missing authentication', async () => {
      const newAdapter = new PipedriveAdapter();
      
      const result = await newAdapter.pushLead(leadData, fieldMappings);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Not authenticated');
    });

    it('should handle API errors', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Invalid email format',
        },
      });

      const result = await adapter.pushLead(leadData, fieldMappings);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Invalid email format');
    });
  });

  describe('validateFieldMapping', () => {
    beforeEach(async () => {
      // Authenticate first
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          data: { id: 1, name: 'Test User' },
        },
      });
      await adapter.authenticate(mockCredentials);
    });

    it('should validate existing field', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            { key: 'name' },
            { key: 'email' },
            { key: 'phone' },
          ],
        },
      });

      const fieldMapping: FieldMappingData = {
        sourceField: 'firstName',
        targetField: 'name',
        fieldType: 'STRING',
      };

      const result = await adapter.validateFieldMapping(fieldMapping);

      expect(result).toBe(true);
    });

    it('should reject invalid field', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            { key: 'name' },
            { key: 'email' },
            { key: 'phone' },
          ],
        },
      });

      const fieldMapping: FieldMappingData = {
        sourceField: 'firstName',
        targetField: 'invalid_field',
        fieldType: 'STRING',
      };

      const result = await adapter.validateFieldMapping(fieldMapping);

      expect(result).toBe(false);
    });
  });

  describe('getAvailableFields', () => {
    beforeEach(async () => {
      // Authenticate first
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          data: { id: 1, name: 'Test User' },
        },
      });
      await adapter.authenticate(mockCredentials);
    });

    it('should return available fields', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          data: [
            { key: 'name' },
            { key: 'email' },
            { key: 'phone' },
            { key: 'org_id' },
          ],
        },
      });

      const fields = await adapter.getAvailableFields();

      expect(fields).toEqual(['name', 'email', 'phone', 'org_id']);
    });

    it('should return fallback fields on error', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      const fields = await adapter.getAvailableFields();

      expect(fields).toContain('name');
      expect(fields).toContain('email');
      expect(fields).toContain('phone');
    });
  });
});