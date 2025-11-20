import axios from 'axios';
import { BaseCrmAdapter } from './base';
import { CrmCredentials, BusinessLeadData, FieldMappingData, CrmPushResult } from '../types';

export class PipedriveAdapter extends BaseCrmAdapter {
  private apiToken: string | null = null;
  private companyDomain: string | null = null;

  constructor() {
    super('PIPEDRIVE');
  }

  async authenticate(credentials: CrmCredentials): Promise<boolean> {
    try {
      if (!credentials.apiToken || !credentials.companyDomain) {
        throw new Error('Missing Pipedrive API token or company domain');
      }

      // Test the API token by fetching user info
      const response = await axios.get(
        `https://${credentials.companyDomain}.pipedrive.com/api/v1/users/me`,
        {
          params: {
            api_token: credentials.apiToken
          }
        }
      );

      if (response.status === 200 && response.data.success) {
        this.apiToken = credentials.apiToken;
        this.companyDomain = credentials.companyDomain;
        return true;
      }

      return false;
    } catch (error) {
      console.error('Pipedrive authentication error:', error);
      return false;
    }
  }

  async pushLead(leadData: BusinessLeadData, fieldMappings: FieldMappingData[]): Promise<CrmPushResult> {
    try {
      if (!this.apiToken || !this.companyDomain) {
        throw new Error('Not authenticated with Pipedrive');
      }

      const transformedData = this.transformLeadData(leadData, fieldMappings);
      
      // Pipedrive Person object
      const pipedrivePerson = {
        name: `${transformedData.name || leadData.firstName || ''} ${transformedData.name || leadData.lastName || ''}`.trim() || 'Unknown',
        email: transformedData.email || leadData.email,
        phone: transformedData.phone || leadData.phone,
        org_id: transformedData.org_id || await this.getOrCreateCompany(leadData.company),
        job_title: transformedData.job_title || leadData.jobTitle,
        ...transformedData
      };

      const response = await axios.post(
        `https://${this.companyDomain}.pipedrive.com/api/v1/persons`,
        pipedrivePerson,
        {
          params: {
            api_token: this.apiToken
          }
        }
      );

      if (response.data.success) {
        return {
          success: true,
          crmId: response.data.data.id.toString(),
          responseData: response.data
        };
      } else {
        throw new Error(response.data.error || 'Failed to create person in Pipedrive');
      }
    } catch (error: any) {
      return this.handleError(error, 'Pipedrive pushLead');
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
      if (!this.apiToken || !this.companyDomain) {
        throw new Error('Not authenticated with Pipedrive');
      }

      const response = await axios.get(
        `https://${this.companyDomain}.pipedrive.com/api/v1/personFields`,
        {
          params: {
            api_token: this.apiToken
          }
        }
      );

      return response.data.data.map((field: any) => field.key);
    } catch (error) {
      console.error('Error fetching Pipedrive fields:', error);
      // Return common Pipedrive Person fields as fallback
      return [
        'name', 'email', 'phone', 'org_id', 'job_title', 'add_time',
        'update_time', 'visible_to', 'owner_id', 'label', 'value',
        'first_name', 'last_name', 'company_name', 'address', 'postal_code',
        'city', 'state', 'country', 'website', 'notes'
      ];
    }
  }

  private async getOrCreateCompany(companyName?: string): Promise<number | undefined> {
    if (!companyName || !this.apiToken || !this.companyDomain) {
      return undefined;
    }

    try {
      // Try to find existing company
      const searchResponse = await axios.get(
        `https://${this.companyDomain}.pipedrive.com/api/v1/organizations/find`,
        {
          params: {
            api_token: this.apiToken,
            term: companyName,
            exact_match: true
          }
        }
      );

      if (searchResponse.data.success && searchResponse.data.data.length > 0) {
        return searchResponse.data.data[0].id;
      }

      // Create new company if not found
      const createResponse = await axios.post(
        `https://${this.companyDomain}.pipedrive.com/api/v1/organizations`,
        {
          name: companyName
        },
        {
          params: {
            api_token: this.apiToken
          }
        }
      );

      if (createResponse.data.success) {
        return createResponse.data.data.id;
      }

      return undefined;
    } catch (error) {
      console.error('Error creating company in Pipedrive:', error);
      return undefined;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiToken || !this.companyDomain) {
        return false;
      }

      const response = await axios.get(
        `https://${this.companyDomain}.pipedrive.com/api/v1/users/me`,
        {
          params: {
            api_token: this.apiToken
          }
        }
      );

      return response.status === 200 && response.data.success;
    } catch {
      return false;
    }
  }
}