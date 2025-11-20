import axios from 'axios';
import { BaseCrmAdapter } from './base';
import { CrmCredentials, BusinessLeadData, FieldMappingData, CrmPushResult } from '../types';

export class SalesforceAdapter extends BaseCrmAdapter {
  private accessToken: string | null = null;
  private instanceUrl: string | null = null;

  constructor() {
    super('SALESFORCE');
  }

  async authenticate(credentials: CrmCredentials): Promise<boolean> {
    try {
      if (!credentials.clientId || !credentials.clientSecret || !credentials.username || !credentials.password) {
        throw new Error('Missing required Salesforce credentials');
      }

      const params = new URLSearchParams({
        grant_type: 'password',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        username: credentials.username,
        password: credentials.password + (credentials.securityToken || '')
      });

      const response = await axios.post('https://login.salesforce.com/services/oauth2/token', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = response.data.access_token;
      this.instanceUrl = response.data.instance_url || credentials.instanceUrl;

      return !!(this.accessToken && this.instanceUrl);
    } catch (error) {
      console.error('Salesforce authentication error:', error);
      return false;
    }
  }

  async pushLead(leadData: BusinessLeadData, fieldMappings: FieldMappingData[]): Promise<CrmPushResult> {
    try {
      if (!this.accessToken || !this.instanceUrl) {
        throw new Error('Not authenticated with Salesforce');
      }

      const transformedData = this.transformLeadData(leadData, fieldMappings);
      
      // Salesforce Lead object
      const salesforceLead = {
        ...transformedData,
        // Ensure required fields for Salesforce Lead
        LastName: transformedData.LastName || leadData.lastName || 'Unknown',
        Company: transformedData.Company || leadData.company || 'Unknown Company',
        Email: leadData.email
      };

      const response = await axios.post(
        `${this.instanceUrl}/services/data/v58.0/sobjects/Lead`,
        salesforceLead,
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
      return this.handleError(error, 'Salesforce pushLead');
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
      if (!this.accessToken || !this.instanceUrl) {
        throw new Error('Not authenticated with Salesforce');
      }

      const response = await axios.get(
        `${this.instanceUrl}/services/data/v58.0/sobjects/Lead/describe`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return response.data.fields.map((field: any) => field.name);
    } catch (error) {
      console.error('Error fetching Salesforce fields:', error);
      // Return common Salesforce Lead fields as fallback
      return [
        'FirstName', 'LastName', 'Email', 'Phone', 'Company', 'Title',
        'Website', 'Industry', 'AnnualRevenue', 'NumberOfEmployees',
        'LeadSource', 'Status', 'Rating', 'Street', 'City', 'State',
        'PostalCode', 'Country', 'Description'
      ];
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.accessToken || !this.instanceUrl) {
        return false;
      }

      const response = await axios.get(
        `${this.instanceUrl}/services/data/v58.0/sobjects/Lead/describe`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return response.status === 200;
    } catch {
      return false;
    }
  }
}