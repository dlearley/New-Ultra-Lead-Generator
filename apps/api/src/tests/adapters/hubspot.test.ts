import { HubSpotAdapter } from '../../adapters/hubspot';
import { BusinessLeadData, FieldMappingData } from '../../types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HubSpotAdapter', () => {
  let adapter: HubSpotAdapter;
  let mockCredentials: any;

  beforeEach(() => {
    adapter = new HubSpotAdapter();
    mockCredentials = {
      accessToken: 'test-access-token',
    };
  });

  describe('authenticate', () => {
    it('should authenticate successfully with valid token', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { results: [] },
      });

      const result = await adapter.authenticate(mockCredentials);

      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/objects/contacts?limit=1',
        {
          headers: {
            'Authorization': 'Bearer test-access-token',
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should fail authentication with missing token', async () => {
      const invalidCredentials = {};

      const result = await adapter.authenticate(invalidCredentials);

      expect(result).toBe(false);
    });

    it('should handle authentication errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Invalid token'));

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
      { sourceField: 'firstName', targetField: 'firstname', fieldType: 'STRING' },
      { sourceField: 'lastName', targetField: 'lastname', fieldType: 'STRING' },
      { sourceField: 'email', targetField: 'email', fieldType: 'EMAIL' },
      { sourceField: 'phone', targetField: 'phone', fieldType: 'PHONE' },
      { sourceField: 'company', targetField: 'company', fieldType: 'STRING' },
    ];

    beforeEach(async () => {
      // Authenticate first
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { results: [] },
      });
      await adapter.authenticate(mockCredentials);
    });

    it('should push lead successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          id: 'test-contact-id',
          properties: {},
        },
      });

      const result = await adapter.pushLead(leadData, fieldMappings);

      expect(result.success).toBe(true);
      expect(result.crmId).toBe('test-contact-id');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/objects/contacts',
        expect.objectContaining({
          properties: expect.objectContaining({
            firstname: 'John',
            lastname: 'Doe',
            email: 'test@example.com',
            phone: '+1234567890',
            company: 'Test Company',
          }),
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
      const newAdapter = new HubSpotAdapter();
      
      const result = await newAdapter.pushLead(leadData, fieldMappings);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Not authenticated');
    });

    it('should handle API errors', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            message: 'Contact already exists',
          },
        },
      });

      const result = await adapter.pushLead(leadData, fieldMappings);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Contact already exists');
    });
  });

  describe('validateFieldMapping', () => {
    beforeEach(async () => {
      // Authenticate first
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { results: [] },
      });
      await adapter.authenticate(mockCredentials);
    });

    it('should validate existing field', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          results: [
            { name: 'firstname' },
            { name: 'lastname' },
            { name: 'email' },
          ],
        },
      });

      const fieldMapping: FieldMappingData = {
        sourceField: 'firstName',
        targetField: 'firstname',
        fieldType: 'STRING',
      };

      const result = await adapter.validateFieldMapping(fieldMapping);

      expect(result).toBe(true);
    });

    it('should reject invalid field', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          results: [
            { name: 'firstname' },
            { name: 'lastname' },
            { name: 'email' },
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
        data: { results: [] },
      });
      await adapter.authenticate(mockCredentials);
    });

    it('should return available fields', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          results: [
            { name: 'firstname' },
            { name: 'lastname' },
            { name: 'email' },
            { name: 'phone' },
          ],
        },
      });

      const fields = await adapter.getAvailableFields();

      expect(fields).toEqual(['firstname', 'lastname', 'email', 'phone']);
    });

    it('should return fallback fields on error', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      const fields = await adapter.getAvailableFields();

      expect(fields).toContain('email');
      expect(fields).toContain('firstname');
      expect(fields).toContain('lastname');
    });
  });
});