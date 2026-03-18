export interface CrmCredentials {
  accessToken: string;
  refreshToken?: string;
  instanceUrl?: string;
  expiresAt?: Date;
}

export interface CrmEntity {
  id?: string;
  [key: string]: any;
}

export interface CrmContact extends CrmEntity {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  company?: string;
  [key: string]: any;
}

export interface CrmCompany extends CrmEntity {
  name: string;
  industry?: string;
  size?: string;
  website?: string;
  [key: string]: any;
}

export interface CrmDeal extends CrmEntity {
  name: string;
  value?: number;
  currency?: string;
  stage?: string;
  closeDate?: Date;
  [key: string]: any;
}

export interface CrmPipelineStage {
  id: string;
  name: string;
  displayOrder: number;
  winProbability: number;
  category: 'open' | 'won' | 'lost';
}

export interface SyncResult {
  success: boolean;
  id?: string;
  error?: string;
  data?: any;
}

export interface CrmAdapter {
  name: string;
  
  // Connection
  connect(credentials: CrmCredentials): Promise<boolean>;
  disconnect(): Promise<void>;
  refreshToken(): Promise<CrmCredentials>;
  testConnection(): Promise<{ success: boolean; error?: string }>;
  
  // Fields
  getFields(entityType: string): Promise<Array<{ name: string; label: string; type: string; required: boolean }>>;
  
  // Contacts
  createContact(contact: CrmContact): Promise<SyncResult>;
  updateContact(id: string, contact: Partial<CrmContact>): Promise<SyncResult>;
  getContact(id: string): Promise<CrmContact | null>;
  findContactByEmail(email: string): Promise<CrmContact | null>;
  listContacts(updatedSince?: Date): Promise<CrmContact[]>;
  
  // Companies
  createCompany(company: CrmCompany): Promise<SyncResult>;
  updateCompany(id: string, company: Partial<CrmCompany>): Promise<SyncResult>;
  getCompany(id: string): Promise<CrmCompany | null>;
  findCompanyByName(name: string): Promise<CrmCompany | null>;
  listCompanies(updatedSince?: Date): Promise<CrmCompany[]>;
  
  // Deals
  createDeal(deal: CrmDeal): Promise<SyncResult>;
  updateDeal(id: string, deal: Partial<CrmDeal>): Promise<SyncResult>;
  getDeal(id: string): Promise<CrmDeal | null>;
  listDeals(updatedSince?: Date): Promise<CrmDeal[]>;
  
  // Pipeline
  getPipelineStages(): Promise<CrmPipelineStage[]>;
  
  // Tasks
  createTask(task: {
    subject: string;
    description?: string;
    dueDate?: Date;
    assignedTo?: string;
    relatedTo?: { type: string; id: string };
  }): Promise<SyncResult>;
}
