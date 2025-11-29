import axios from 'axios';
import { BaseCrmAdapter } from './base';
import { CrmCredentials, BusinessLeadData, FieldMappingData, CrmPushResult } from '../types';

export class HubSpotAdapter extends BaseCrmAdapter {
  private accessToken: string | null = null;

  constructor() {
    super('HUBSPOT');
  }

  async authenticate(credentials: CrmCredentials): Promise<boolean> {
    try {
      if (!credentials.accessToken) {
        throw new Error('Missing HubSpot access token');
      }

      // Test the access token by making a simple API call
      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        this.accessToken = credentials.accessToken;
        return true;
      }

      return false;
    } catch (error) {
      console.error('HubSpot authentication error:', error);
      return false;
    }
  }

  async pushLead(leadData: BusinessLeadData, fieldMappings: FieldMappingData[]): Promise<CrmPushResult> {
    try {
      if (!this.accessToken) {
        throw new Error('Not authenticated with HubSpot');
      }

      const transformedData = this.transformLeadData(leadData, fieldMappings);
      
      // HubSpot Contact object
      const hubspotContact = {
        properties: {
          ...transformedData,
          email: leadData.email,
          firstname: transformedData.firstname || leadData.firstName || '',
          lastname: transformedData.lastname || leadData.lastName || '',
          phone: transformedData.phone || leadData.phone || '',
          company: transformedData.company || leadData.company || '',
          jobtitle: transformedData.jobtitle || leadData.jobTitle || ''
        }
      };

      const response = await axios.post(
        'https://api.hubapi.com/crm/v3/objects/contacts',
        hubspotContact,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        crmId: response.data.id,
        responseData: response.data
      };
    } catch (error: any) {
      return this.handleError(error, 'HubSpot pushLead');
    }
  }

  async validateFieldMapping(fieldMapping: FieldMappingData): Promise<boolean> {
    try {
      const availableFields = await this.getAvailableFields();
      return availableFields.includes(fieldMapping.targetField);
    } catch {
      return false;
    }
  }

  async getAvailableFields(): Promise<string[]> {
    try {
      if (!this.accessToken) {
        throw new Error('Not authenticated with HubSpot');
      }

      const response = await axios.get(
        'https://api.hubapi.com/crm/v3/properties/contacts',
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return response.data.results.map((field: any) => field.name);
    } catch (error) {
      console.error('Error fetching HubSpot fields:', error);
      // Return common HubSpot Contact fields as fallback
      return [
        'email', 'firstname', 'lastname', 'phone', 'company', 'jobtitle',
        'website', 'industry', 'annualrevenue', 'numberofemployees',
        'lifecyclestage', 'hs_lead_status', 'hs_analytics_source',
        'address', 'city', 'state', 'zip', 'country', 'description'
      ];
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.accessToken) {
        return false;
      }

      const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return response.status === 200;
    } catch {
      return false;
    }
  }
}