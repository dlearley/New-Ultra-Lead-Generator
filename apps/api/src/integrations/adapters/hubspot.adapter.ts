import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  CrmAdapter,
  CrmCredentials,
  CrmContact,
  CrmCompany,
  CrmDeal,
  CrmPipelineStage,
  SyncResult,
} from './crm-adapter.interface';

@Injectable()
export class HubSpotAdapter implements CrmAdapter {
  readonly name = 'HubSpot';
  private readonly logger = new Logger(HubSpotAdapter.name);
  
  private credentials: CrmCredentials | null = null;
  private baseUrl = 'https://api.hubapi.com';

  constructor(private readonly httpService: HttpService) {}

  async connect(credentials: CrmCredentials): Promise<boolean> {
    this.credentials = credentials;
    const test = await this.testConnection();
    return test.success;
  }

  async disconnect(): Promise<void> {
    this.credentials = null;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.makeRequest('/integrations/v1/me');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async refreshToken(): Promise<CrmCredentials> {
    // HubSpot OAuth refresh
    return this.credentials!;
  }

  // ============================================================
  // FIELDS
  // ============================================================

  async getFields(entityType: string): Promise<Array<{ name: string; label: string; type: string; required: boolean }>> {
    const objectType = entityType === 'contact' ? 'contacts' : 
                       entityType === 'company' ? 'companies' : 'deals';
    
    const response = await this.makeRequest(`/crm/v3/schemas/${objectType}`);
    
    return response.properties.map((prop: any) => ({
      name: prop.name,
      label: prop.label,
      type: prop.type,
      required: prop.required || false,
    }));
  }

  // ============================================================
  // CONTACTS
  // ============================================================

  async createContact(contact: CrmContact): Promise<SyncResult> {
    try {
      const existing = await this.findContactByEmail(contact.email!);
      if (existing?.id) {
        return this.updateContact(existing.id, contact);
      }

      const hsContact = this.mapToHubSpotContact(contact);
      const response = await this.makeRequest('/crm/v3/objects/contacts', 'POST', {
        properties: hsContact,
      });
      
      return { success: true, id: response.id };
    } catch (error: any) {
      this.logger.error('Failed to create HubSpot contact:', error);
      return { success: false, error: error.message };
    }
  }

  async updateContact(id: string, contact: Partial<CrmContact>): Promise<SyncResult> {
    try {
      const hsContact = this.mapToHubSpotContact(contact as CrmContact);
      await this.makeRequest(`/crm/v3/objects/contacts/${id}`, 'PATCH', {
        properties: hsContact,
      });
      
      return { success: true, id };
    } catch (error: any) {
      this.logger.error('Failed to update HubSpot contact:', error);
      return { success: false, error: error.message };
    }
  }

  async getContact(id: string): Promise<CrmContact | null> {
    try {
      const response = await this.makeRequest(`/crm/v3/objects/contacts/${id}?properties=firstname,lastname,email,phone,jobtitle,company`);
      return this.mapFromHubSpotContact(response);
    } catch (error) {
      return null;
    }
  }

  async findContactByEmail(email: string): Promise<CrmContact | null> {
    try {
      const response = await this.makeRequest(`/crm/v3/objects/contacts/search`, 'POST', {
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: email,
          }],
        }],
        properties: ['firstname', 'lastname', 'email', 'phone', 'jobtitle', 'company'],
        limit: 1,
      });
      
      if (response.results?.length > 0) {
        return this.mapFromHubSpotContact(response.results[0]);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async listContacts(updatedSince?: Date): Promise<CrmContact[]> {
    const response = await this.makeRequest(
      `/crm/v3/objects/contacts?properties=firstname,lastname,email,phone,jobtitle,company${
        updatedSince ? `&updatedAfter=${updatedSince.toISOString()}` : ''
      }&limit=100`,
    );
    
    return response.results?.map((r: any) => this.mapFromHubSpotContact(r)) || [];
  }

  // ============================================================
  // COMPANIES
  // ============================================================

  async createCompany(company: CrmCompany): Promise<SyncResult> {
    try {
      const existing = await this.findCompanyByName(company.name);
      if (existing?.id) {
        return this.updateCompany(existing.id, company);
      }

      const hsCompany = this.mapToHubSpotCompany(company);
      const response = await this.makeRequest('/crm/v3/objects/companies', 'POST', {
        properties: hsCompany,
      });
      
      return { success: true, id: response.id };
    } catch (error: any) {
      this.logger.error('Failed to create HubSpot company:', error);
      return { success: false, error: error.message };
    }
  }

  async updateCompany(id: string, company: Partial<CrmCompany>): Promise<SyncResult> {
    try {
      const hsCompany = this.mapToHubSpotCompany(company as CrmCompany);
      await this.makeRequest(`/crm/v3/objects/companies/${id}`, 'PATCH', {
        properties: hsCompany,
      });
      
      return { success: true, id };
    } catch (error: any) {
      this.logger.error('Failed to update HubSpot company:', error);
      return { success: false, error: error.message };
    }
  }

  async getCompany(id: string): Promise<CrmCompany | null> {
    try {
      const response = await this.makeRequest(`/crm/v3/objects/companies/${id}?properties=name,industry,numberofemployees,domain`);
      return this.mapFromHubSpotCompany(response);
    } catch (error) {
      return null;
    }
  }

  async findCompanyByName(name: string): Promise<CrmCompany | null> {
    try {
      const response = await this.makeRequest(`/crm/v3/objects/companies/search`, 'POST', {
        filterGroups: [{
          filters: [{
            propertyName: 'name',
            operator: 'EQ',
            value: name,
          }],
        }],
        properties: ['name', 'industry', 'numberofemployees', 'domain'],
        limit: 1,
      });
      
      if (response.results?.length > 0) {
        return this.mapFromHubSpotCompany(response.results[0]);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async listCompanies(updatedSince?: Date): Promise<CrmCompany[]> {
    const response = await this.makeRequest(
      `/crm/v3/objects/companies?properties=name,industry,numberofemployees,domain${
        updatedSince ? `&updatedAfter=${updatedSince.toISOString()}` : ''
      }&limit=100`,
    );
    
    return response.results?.map((r: any) => this.mapFromHubSpotCompany(r)) || [];
  }

  // ============================================================
  // DEALS
  // ============================================================

  async createDeal(deal: CrmDeal): Promise<SyncResult> {
    try {
      const hsDeal = this.mapToHubSpotDeal(deal);
      const response = await this.makeRequest('/crm/v3/objects/deals', 'POST', {
        properties: hsDeal,
      });
      
      return { success: true, id: response.id };
    } catch (error: any) {
      this.logger.error('Failed to create HubSpot deal:', error);
      return { success: false, error: error.message };
    }
  }

  async updateDeal(id: string, deal: Partial<CrmDeal>): Promise<SyncResult> {
    try {
      const hsDeal = this.mapToHubSpotDeal(deal as CrmDeal);
      await this.makeRequest(`/crm/v3/objects/deals/${id}`, 'PATCH', {
        properties: hsDeal,
      });
      
      return { success: true, id };
    } catch (error: any) {
      this.logger.error('Failed to update HubSpot deal:', error);
      return { success: false, error: error.message };
    }
  }

  async getDeal(id: string): Promise<CrmDeal | null> {
    try {
      const response = await this.makeRequest(`/crm/v3/objects/deals/${id}?properties=dealname,amount,dealstage,closedate`);
      return this.mapFromHubSpotDeal(response);
    } catch (error) {
      return null;
    }
  }

  async listDeals(updatedSince?: Date): Promise<CrmDeal[]> {
    const response = await this.makeRequest(
      `/crm/v3/objects/deals?properties=dealname,amount,dealstage,closedate${
        updatedSince ? `&updatedAfter=${updatedSince.toISOString()}` : ''
      }&limit=100`,
    );
    
    return response.results?.map((r: any) => this.mapFromHubSpotDeal(r)) || [];
  }

  // ============================================================
  // PIPELINE STAGES
  // ============================================================

  async getPipelineStages(): Promise<CrmPipelineStage[]> {
    try {
      const response = await this.makeRequest('/crm/v3/pipelines/deals');
      const stages: CrmPipelineStage[] = [];
      
      for (const pipeline of response.results || []) {
        for (const stage of pipeline.stages || []) {
          stages.push({
            id: stage.id,
            name: stage.label,
            displayOrder: stage.displayOrder,
            winProbability: stage.probability || 0,
            category: stage.probability === 100 ? 'won' : stage.probability === 0 ? 'lost' : 'open',
          });
        }
      }
      
      return stages;
    } catch (error) {
      return [];
    }
  }

  // ============================================================
  // TASKS
  // ============================================================

  async createTask(task: {
    subject: string;
    description?: string;
    dueDate?: Date;
    assignedTo?: string;
    relatedTo?: { type: string; id: string };
  }): Promise<SyncResult> {
    try {
      const hsTask = {
        properties: {
          hs_task_subject: task.subject,
          hs_task_body: task.description,
          hs_timestamp: task.dueDate?.toISOString(),
          hs_task_status: 'NOT_STARTED',
          hubspot_owner_id: task.assignedTo,
        },
        associations: task.relatedTo ? [{
          to: { id: task.relatedTo.id },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }],
        }] : undefined,
      };

      const response = await this.makeRequest('/crm/v3/objects/tasks', 'POST', hsTask);
      return { success: true, id: response.id };
    } catch (error: any) {
      this.logger.error('Failed to create HubSpot task:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: any,
  ): Promise<any> {
    if (!this.credentials?.accessToken) {
      throw new Error('Not connected to HubSpot');
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await firstValueFrom(
      this.httpService.request({
        method,
        url,
        data: body,
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
      }),
    );

    return response.data;
  }

  private mapToHubSpotContact(contact: CrmContact): any {
    return {
      firstname: contact.firstName,
      lastname: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      jobtitle: contact.title,
      company: contact.company,
    };
  }

  private mapFromHubSpotContact(record: any): CrmContact {
    const props = record.properties || record;
    return {
      id: record.id,
      firstName: props.firstname,
      lastName: props.lastname,
      email: props.email,
      phone: props.phone,
      title: props.jobtitle,
      company: props.company,
    };
  }

  private mapToHubSpotCompany(company: CrmCompany): any {
    return {
      name: company.name,
      industry: company.industry,
      numberofemployees: company.size ? parseInt(company.size) : undefined,
      domain: company.website?.replace(/^https?:\/\//, ''),
    };
  }

  private mapFromHubSpotCompany(record: any): CrmCompany {
    const props = record.properties || record;
    return {
      id: record.id,
      name: props.name,
      industry: props.industry,
      size: props.numberofemployees?.toString(),
      website: props.domain ? `https://${props.domain}` : undefined,
    };
  }

  private mapToHubSpotDeal(deal: CrmDeal): any {
    return {
      dealname: deal.name,
      amount: deal.value,
      dealstage: deal.stage,
      closedate: deal.closeDate?.toISOString(),
    };
  }

  private mapFromHubSpotDeal(record: any): CrmDeal {
    const props = record.properties || record;
    return {
      id: record.id,
      name: props.dealname,
      value: props.amount ? parseFloat(props.amount) : undefined,
      stage: props.dealstage,
      closeDate: props.closedate ? new Date(props.closedate) : undefined,
    };
  }
}
