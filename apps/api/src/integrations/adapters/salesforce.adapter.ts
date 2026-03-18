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
export class SalesforceAdapter implements CrmAdapter {
  readonly name = 'Salesforce';
  private readonly logger = new Logger(SalesforceAdapter.name);
  
  private credentials: CrmCredentials | null = null;
  private apiVersion = 'v58.0';

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
      await this.makeRequest('/sobjects/Account/describe');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async refreshToken(): Promise<CrmCredentials> {
    // Salesforce OAuth refresh
    // Implementation would call Salesforce token endpoint
    return this.credentials!;
  }

  // ============================================================
  // FIELDS
  // ============================================================

  async getFields(entityType: string): Promise<Array<{ name: string; label: string; type: string; required: boolean }>> {
    const sobjectType = this.mapEntityToSObject(entityType);
    const response = await this.makeRequest(`/sobjects/${sobjectType}/describe`);
    
    return response.fields.map((field: any) => ({
      name: field.name,
      label: field.label,
      type: field.type,
      required: field.createRequired,
    }));
  }

  // ============================================================
  // CONTACTS (Leads/Contacts)
  // ============================================================

  async createContact(contact: CrmContact): Promise<SyncResult> {
    try {
      // Check if lead exists first
      const existing = await this.findContactByEmail(contact.email!);
      if (existing) {
        return this.updateContact(existing.id!, contact);
      }

      const sfLead = this.mapToSalesforceLead(contact);
      const response = await this.makeRequest('/sobjects/Lead', 'POST', sfLead);
      
      return { success: true, id: response.id };
    } catch (error: any) {
      this.logger.error('Failed to create Salesforce lead:', error);
      return { success: false, error: error.message };
    }
  }

  async updateContact(id: string, contact: Partial<CrmContact>): Promise<SyncResult> {
    try {
      const sfLead = this.mapToSalesforceLead(contact as CrmContact);
      await this.makeRequest(`/sobjects/Lead/${id}`, 'PATCH', sfLead);
      
      return { success: true, id };
    } catch (error: any) {
      this.logger.error('Failed to update Salesforce lead:', error);
      return { success: false, error: error.message };
    }
  }

  async getContact(id: string): Promise<CrmContact | null> {
    try {
      const response = await this.makeRequest(`/sobjects/Lead/${id}`);
      return this.mapFromSalesforceLead(response);
    } catch (error) {
      return null;
    }
  }

  async findContactByEmail(email: string): Promise<CrmContact | null> {
    try {
      const query = `SELECT Id, FirstName, LastName, Email, Phone, Title, Company FROM Lead WHERE Email = '${email}' LIMIT 1`;
      const response = await this.makeRequest(`/query?q=${encodeURIComponent(query)}`);
      
      if (response.records.length > 0) {
        return this.mapFromSalesforceLead(response.records[0]);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async listContacts(updatedSince?: Date): Promise<CrmContact[]> {
    let query = 'SELECT Id, FirstName, LastName, Email, Phone, Title, Company, LastModifiedDate FROM Lead';
    
    if (updatedSince) {
      query += ` WHERE LastModifiedDate > ${updatedSince.toISOString()}`;
    }
    
    query += ' ORDER BY LastModifiedDate DESC LIMIT 10000';
    
    const response = await this.makeRequest(`/query?q=${encodeURIComponent(query)}`);
    return response.records.map((r: any) => this.mapFromSalesforceLead(r));
  }

  // ============================================================
  // COMPANIES (Accounts)
  // ============================================================

  async createCompany(company: CrmCompany): Promise<SyncResult> {
    try {
      const existing = await this.findCompanyByName(company.name);
      if (existing) {
        return this.updateCompany(existing.id!, company);
      }

      const sfAccount = this.mapToSalesforceAccount(company);
      const response = await this.makeRequest('/sobjects/Account', 'POST', sfAccount);
      
      return { success: true, id: response.id };
    } catch (error: any) {
      this.logger.error('Failed to create Salesforce account:', error);
      return { success: false, error: error.message };
    }
  }

  async updateCompany(id: string, company: Partial<CrmCompany>): Promise<SyncResult> {
    try {
      const sfAccount = this.mapToSalesforceAccount(company as CrmCompany);
      await this.makeRequest(`/sobjects/Account/${id}`, 'PATCH', sfAccount);
      
      return { success: true, id };
    } catch (error: any) {
      this.logger.error('Failed to update Salesforce account:', error);
      return { success: false, error: error.message };
    }
  }

  async getCompany(id: string): Promise<CrmCompany | null> {
    try {
      const response = await this.makeRequest(`/sobjects/Account/${id}`);
      return this.mapFromSalesforceAccount(response);
    } catch (error) {
      return null;
    }
  }

  async findCompanyByName(name: string): Promise<CrmCompany | null> {
    try {
      const query = `SELECT Id, Name, Industry, NumberOfEmployees, Website FROM Account WHERE Name = '${name.replace(/'/g, "\\'")}' LIMIT 1`;
      const response = await this.makeRequest(`/query?q=${encodeURIComponent(query)}`);
      
      if (response.records.length > 0) {
        return this.mapFromSalesforceAccount(response.records[0]);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async listCompanies(updatedSince?: Date): Promise<CrmCompany[]> {
    let query = 'SELECT Id, Name, Industry, NumberOfEmployees, Website, LastModifiedDate FROM Account';
    
    if (updatedSince) {
      query += ` WHERE LastModifiedDate > ${updatedSince.toISOString()}`;
    }
    
    query += ' ORDER BY LastModifiedDate DESC LIMIT 10000';
    
    const response = await this.makeRequest(`/query?q=${encodeURIComponent(query)}`);
    return response.records.map((r: any) => this.mapFromSalesforceAccount(r));
  }

  // ============================================================
  // DEALS (Opportunities)
  // ============================================================

  async createDeal(deal: CrmDeal): Promise<SyncResult> {
    try {
      const sfOpportunity = this.mapToSalesforceOpportunity(deal);
      const response = await this.makeRequest('/sobjects/Opportunity', 'POST', sfOpportunity);
      
      return { success: true, id: response.id };
    } catch (error: any) {
      this.logger.error('Failed to create Salesforce opportunity:', error);
      return { success: false, error: error.message };
    }
  }

  async updateDeal(id: string, deal: Partial<CrmDeal>): Promise<SyncResult> {
    try {
      const sfOpportunity = this.mapToSalesforceOpportunity(deal as CrmDeal);
      await this.makeRequest(`/sobjects/Opportunity/${id}`, 'PATCH', sfOpportunity);
      
      return { success: true, id };
    } catch (error: any) {
      this.logger.error('Failed to update Salesforce opportunity:', error);
      return { success: false, error: error.message };
    }
  }

  async getDeal(id: string): Promise<CrmDeal | null> {
    try {
      const response = await this.makeRequest(`/sobjects/Opportunity/${id}`);
      return this.mapFromSalesforceOpportunity(response);
    } catch (error) {
      return null;
    }
  }

  async listDeals(updatedSince?: Date): Promise<CrmDeal[]> {
    let query = 'SELECT Id, Name, Amount, StageName, CloseDate, Probability FROM Opportunity';
    
    if (updatedSince) {
      query += ` WHERE LastModifiedDate > ${updatedSince.toISOString()}`;
    }
    
    query += ' ORDER BY LastModifiedDate DESC LIMIT 10000';
    
    const response = await this.makeRequest(`/query?q=${encodeURIComponent(query)}`);
    return response.records.map((r: any) => this.mapFromSalesforceOpportunity(r));
  }

  // ============================================================
  // PIPELINE STAGES
  // ============================================================

  async getPipelineStages(): Promise<CrmPipelineStage[]> {
    try {
      const response = await this.makeRequest('/sobjects/Opportunity/describe');
      const stageField = response.fields.find((f: any) => f.name === 'StageName');
      
      if (stageField?.picklistValues) {
        return stageField.picklistValues.map((val: any, index: number) => ({
          id: val.value,
          name: val.label,
          displayOrder: index,
          winProbability: val.default ? 100 : Math.round((index / stageField.picklistValues.length) * 100),
          category: val.default ? 'won' : (index === 0 ? 'lost' : 'open'),
        }));
      }
      
      return [];
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
      const sfTask = {
        Subject: task.subject,
        Description: task.description,
        ActivityDate: task.dueDate?.toISOString().split('T')[0],
        OwnerId: task.assignedTo,
        [`${task.relatedTo?.type}Id`]: task.relatedTo?.id,
      };

      const response = await this.makeRequest('/sobjects/Task', 'POST', sfTask);
      return { success: true, id: response.id };
    } catch (error: any) {
      this.logger.error('Failed to create Salesforce task:', error);
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
    if (!this.credentials?.instanceUrl || !this.credentials?.accessToken) {
      throw new Error('Not connected to Salesforce');
    }

    const url = `${this.credentials.instanceUrl}/services/data/${this.apiVersion}${endpoint}`;
    
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

  private mapEntityToSObject(entityType: string): string {
    const mapping: Record<string, string> = {
      contact: 'Lead',
      company: 'Account',
      deal: 'Opportunity',
    };
    return mapping[entityType] || entityType;
  }

  private mapToSalesforceLead(contact: CrmContact): any {
    return {
      FirstName: contact.firstName,
      LastName: contact.lastName,
      Email: contact.email,
      Phone: contact.phone,
      Title: contact.title,
      Company: contact.company || 'Unknown',
    };
  }

  private mapFromSalesforceLead(record: any): CrmContact {
    return {
      id: record.Id,
      firstName: record.FirstName,
      lastName: record.LastName,
      email: record.Email,
      phone: record.Phone,
      title: record.Title,
      company: record.Company,
    };
  }

  private mapToSalesforceAccount(company: CrmCompany): any {
    return {
      Name: company.name,
      Industry: company.industry,
      NumberOfEmployees: company.size ? parseInt(company.size) : undefined,
      Website: company.website,
    };
  }

  private mapFromSalesforceAccount(record: any): CrmCompany {
    return {
      id: record.Id,
      name: record.Name,
      industry: record.Industry,
      size: record.NumberOfEmployees?.toString(),
      website: record.Website,
    };
  }

  private mapToSalesforceOpportunity(deal: CrmDeal): any {
    return {
      Name: deal.name,
      Amount: deal.value,
      StageName: deal.stage,
      CloseDate: deal.closeDate?.toISOString().split('T')[0],
    };
  }

  private mapFromSalesforceOpportunity(record: any): CrmDeal {
    return {
      id: record.Id,
      name: record.Name,
      value: record.Amount,
      stage: record.StageName,
      closeDate: record.CloseDate ? new Date(record.CloseDate) : undefined,
    };
  }
}
