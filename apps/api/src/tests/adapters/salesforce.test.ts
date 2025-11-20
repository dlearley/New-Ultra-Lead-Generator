import { SalesforceAdapter } from '../../adapters/salesforce';
import { BusinessLeadData, FieldMappingData } from '../../types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SalesforceAdapter', () => {
  let adapter: SalesforceAdapter;
  let mockCredentials: any;

  beforeEach(() => {
    adapter = new SalesforceAdapter();
    mockCredentials = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      username: 'test@example.com',
      password: 'test-password',
      securityToken: 'test-token',
      instanceUrl: 'https://test.salesforce.com',
    };
  });

  describe('authenticate', () => {
    it('should authenticate successfully with valid credentials', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'test-access-token',
          instance_url: 'https://test.salesforce.com',
        },
      });

      const result = await adapter.authenticate(mockCredentials);

      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://login.salesforce.com/services/oauth2/token',
        expect.any(URLSearchParams),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
    });

    it('should fail authentication with missing credentials', async () => {
      const invalidCredentials = { ...mockCredentials };
      delete invalidCredentials.clientId;

      const result = await adapter.authenticate(invalidCredentials);

      expect(result).toBe(false);
    });

    it('should handle authentication errors', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Authentication failed'));

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
      { sourceField: 'firstName', targetField: 'FirstName', fieldType: 'STRING' },
      { sourceField: 'lastName', targetField: 'LastName', fieldType: 'STRING' },
      { sourceField: 'email', targetField: 'Email', fieldType: 'EMAIL' },
      { sourceField: 'phone', targetField: 'Phone', fieldType: 'PHONE' },
      { sourceField: 'company', targetField: 'Company', fieldType: 'STRING' },
    ];

    beforeEach(async () => {
      // Authenticate first
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'test-access-token',
          instance_url: 'https://test.salesforce.com',
        },
      });
      await adapter.authenticate(mockCredentials);
    });

    it('should push lead successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          id: 'test-lead-id',
          success: true,
        },
      });

      const result = await adapter.pushLead(leadData, fieldMappings);

      expect(result.success).toBe(true);
      expect(result.crmId).toBe('test-lead-id');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test.salesforce.com/services/data/v58.0/sobjects/Lead',
        expect.objectContaining({
          FirstName: 'John',
          LastName: 'Doe',
          Email: 'test@example.com',
          Phone: '+1234567890',
          Company: 'Test Company',
        }),
        {
          headers: {
            'Authorization': 'Bearer test-access-token',
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should handle missing authentication', async () => {
      // Create new adapter without authentication
      const newAdapter = new SalesforceAdapter();
      
      const result = await newAdapter.pushLead(leadData, fieldMappings);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Not authenticated');
    });

    it('should handle API errors', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            message: 'Invalid field',
          },
        },
      });

      const result = await adapter.pushLead(leadData, fieldMappings);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Invalid field');
    });
  });

  describe('validateFieldMapping', () => {
    beforeEach(async () => {
      // Authenticate first
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'test-access-token',
          instance_url: 'https://test.salesforce.com',
        },
      });
      await adapter.authenticate(mockCredentials);
    });

    it('should validate existing field', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          fields: [
            { name: 'FirstName' },
            { name: 'LastName' },
            { name: 'Email' },
          ],
        },
      });

      const fieldMapping: FieldMappingData = {
        sourceField: 'firstName',
        targetField: 'FirstName',
        fieldType: 'STRING',
      };

      const result = await adapter.validateFieldMapping(fieldMapping);

      expect(result).toBe(true);
    });

    it('should reject invalid field', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          fields: [
            { name: 'FirstName' },
            { name: 'LastName' },
            { name: 'Email' },
          ],
        },
      });

      const fieldMapping: FieldMappingData = {
        sourceField: 'firstName',
        targetField: 'InvalidField',
        fieldType: 'STRING',
      };

      const result = await adapter.validateFieldMapping(fieldMapping);

      expect(result).toBe(false);
    });
  });

  describe('getAvailableFields', () => {
    beforeEach(async () => {
      // Authenticate first
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          access_token: 'test-access-token',
          instance_url: 'https://test.salesforce.com',
        },
      });
      await adapter.authenticate(mockCredentials);
    });

    it('should return available fields', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          fields: [
            { name: 'FirstName' },
            { name: 'LastName' },
            { name: 'Email' },
            { name: 'Phone' },
          ],
        },
      });

      const fields = await adapter.getAvailableFields();

      expect(fields).toEqual(['FirstName', 'LastName', 'Email', 'Phone']);
    });

    it('should return fallback fields on error', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      const fields = await adapter.getAvailableFields();

      expect(fields).toContain('FirstName');
      expect(fields).toContain('LastName');
      expect(fields).toContain('Email');
    });
  });
});