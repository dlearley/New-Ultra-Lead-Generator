import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../services/prisma.service';

export interface FieldTransform {
  type: 'uppercase' | 'lowercase' | 'capitalize' | 'trim' | 'phone_format' | 
        'date_format' | 'number_round' | 'json_extract' | 'concat' | 'split' |
        'replace' | 'regex_extract' | 'map_value';
  config?: any;
}

export interface DataMapping {
  id: string;
  sourceField: string;
  targetField: string;
  transform?: FieldTransform;
  condition?: {
    field: string;
    operator: string;
    value: any;
  };
}

export interface MappingTemplate {
  id: string;
  name: string;
  provider: string;
  entityType: string;
  mappings: DataMapping[];
  isDefault?: boolean;
}

@Injectable()
export class DataMappingService {
  private readonly logger = new Logger(DataMappingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // FIELD TRANSFORMATIONS
  // ============================================================

  transformValue(value: any, transform?: FieldTransform): any {
    if (value == null || value === undefined) {
      return value;
    }

    if (!transform) {
      return value;
    }

    switch (transform.type) {
      case 'uppercase':
        return String(value).toUpperCase();

      case 'lowercase':
        return String(value).toLowerCase();

      case 'capitalize':
        return String(value)
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');

      case 'trim':
        return String(value).trim();

      case 'phone_format':
        return this.formatPhoneNumber(String(value), transform.config?.format);

      case 'date_format':
        return this.formatDate(value, transform.config?.format);

      case 'number_round':
        const decimals = transform.config?.decimals || 0;
        return Math.round(Number(value) * Math.pow(10, decimals)) / Math.pow(10, decimals);

      case 'json_extract':
        return this.extractJsonValue(value, transform.config?.path);

      case 'concat':
        if (Array.isArray(transform.config?.fields)) {
          return transform.config.fields
            .map((f: string) => value[f])
            .filter(Boolean)
            .join(transform.config?.separator || ' ');
        }
        return value;

      case 'split':
        if (typeof value === 'string') {
          return value.split(transform.config?.delimiter || ',').map((s: string) => s.trim());
        }
        return value;

      case 'replace':
        if (typeof value === 'string') {
          return value.replace(
            new RegExp(transform.config?.search, 'g'),
            transform.config?.replace || '',
          );
        }
        return value;

      case 'regex_extract':
        if (typeof value === 'string') {
          const match = value.match(new RegExp(transform.config?.pattern));
          return match ? match[transform.config?.group || 0] : null;
        }
        return value;

      case 'map_value':
        const mapping = transform.config?.mapping || {};
        return mapping[value] !== undefined ? mapping[value] : transform.config?.default || value;

      default:
        return value;
    }
  }

  // ============================================================
  // PHONE NUMBER FORMATTING
  // ============================================================

  private formatPhoneNumber(phone: string, format?: string): string {
    // Remove all non-numeric characters
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length === 10) {
      // US format: (555) 123-4567
      if (format === 'e164') {
        return `+1${digits}`;
      }
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    
    if (digits.length === 11 && digits.startsWith('1')) {
      // US with country code
      if (format === 'e164') {
        return `+${digits}`;
      }
      return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }

    // International or unknown - return cleaned
    if (format === 'e164' && digits.length > 10) {
      return `+${digits}`;
    }

    return digits;
  }

  // ============================================================
  // DATE FORMATTING
  // ============================================================

  private formatDate(date: any, format?: string): string {
    const d = date instanceof Date ? date : new Date(date);
    
    if (isNaN(d.getTime())) {
      return String(date);
    }

    switch (format) {
      case 'iso':
        return d.toISOString();
      case 'date':
        return d.toISOString().split('T')[0];
      case 'datetime':
        return d.toISOString().replace('T', ' ').split('.')[0];
      case 'unix':
        return Math.floor(d.getTime() / 1000).toString();
      default:
        return d.toISOString();
    }
  }

  // ============================================================
  // JSON EXTRACTION
  // ============================================================

  private extractJsonValue(json: any, path?: string): any {
    if (!path) return json;
    
    try {
      const obj = typeof json === 'string' ? JSON.parse(json) : json;
      const keys = path.split('.');
      let value = obj;
      
      for (const key of keys) {
        if (value == null) return null;
        value = value[key];
      }
      
      return value;
    } catch {
      return null;
    }
  }

  // ============================================================
  // DATA MAPPING APPLICATION
  // ============================================================

  async applyMapping(
    sourceData: any,
    mappings: DataMapping[],
    direction: 'to_crm' | 'from_crm',
  ): Promise<any> {
    const result: any = {};

    for (const mapping of mappings) {
      // Check condition if present
      if (mapping.condition && !this.evaluateCondition(sourceData, mapping.condition)) {
        continue;
      }

      // Get source value based on direction
      const sourceField = direction === 'to_crm' ? mapping.sourceField : mapping.targetField;
      const targetField = direction === 'to_crm' ? mapping.targetField : mapping.sourceField;
      
      let value = this.getNestedValue(sourceData, sourceField);

      // Apply transformation
      if (mapping.transform) {
        value = this.transformValue(value, mapping.transform);
      }

      // Set target value
      this.setNestedValue(result, targetField, value);
    }

    return result;
  }

  // ============================================================
  // MAPPING TEMPLATES
  // ============================================================

  async getMappingTemplates(provider: string, entityType: string): Promise<MappingTemplate[]> {
    const templates: MappingTemplate[] = [
      // Salesforce Contact Template
      {
        id: 'salesforce-contact-default',
        name: 'Salesforce Contact (Default)',
        provider: 'salesforce',
        entityType: 'contact',
        isDefault: true,
        mappings: [
          { id: '1', sourceField: 'firstName', targetField: 'FirstName' },
          { id: '2', sourceField: 'lastName', targetField: 'LastName' },
          { id: '3', sourceField: 'email', targetField: 'Email' },
          { id: '4', sourceField: 'phone', targetField: 'Phone', transform: { type: 'phone_format' } },
          { id: '5', sourceField: 'jobTitle', targetField: 'Title' },
          { id: '6', sourceField: 'company.name', targetField: 'Company' },
        ],
      },
      // HubSpot Contact Template
      {
        id: 'hubspot-contact-default',
        name: 'HubSpot Contact (Default)',
        provider: 'hubspot',
        entityType: 'contact',
        isDefault: true,
        mappings: [
          { id: '1', sourceField: 'firstName', targetField: 'firstname' },
          { id: '2', sourceField: 'lastName', targetField: 'lastname' },
          { id: '3', sourceField: 'email', targetField: 'email' },
          { id: '4', sourceField: 'phone', targetField: 'phone', transform: { type: 'phone_format' } },
          { id: '5', sourceField: 'jobTitle', targetField: 'jobtitle' },
          { id: '6', sourceField: 'company.name', targetField: 'company' },
        ],
      },
      // Salesforce Company Template
      {
        id: 'salesforce-company-default',
        name: 'Salesforce Account (Default)',
        provider: 'salesforce',
        entityType: 'company',
        isDefault: true,
        mappings: [
          { id: '1', sourceField: 'name', targetField: 'Name' },
          { id: '2', sourceField: 'industry', targetField: 'Industry' },
          { id: '3', sourceField: 'website', targetField: 'Website' },
          { id: '4', sourceField: 'employeeCount', targetField: 'NumberOfEmployees' },
          { id: '5', sourceField: 'annualRevenue', targetField: 'AnnualRevenue' },
        ],
      },
      // HubSpot Company Template
      {
        id: 'hubspot-company-default',
        name: 'HubSpot Company (Default)',
        provider: 'hubspot',
        entityType: 'company',
        isDefault: true,
        mappings: [
          { id: '1', sourceField: 'name', targetField: 'name' },
          { id: '2', sourceField: 'industry', targetField: 'industry' },
          { id: '3', sourceField: 'website', targetField: 'domain', transform: { type: 'replace', config: { search: '^https?://', replace: '' } } },
          { id: '4', sourceField: 'employeeCount', targetField: 'numberofemployees' },
          { id: '5', sourceField: 'annualRevenue', targetField: 'annualrevenue' },
        ],
      },
    ];

    return templates.filter(
      (t) => t.provider === provider && t.entityType === entityType,
    );
  }

  async applyTemplate(
    connectionId: string,
    templateId: string,
  ): Promise<{ success: boolean; mappingsCreated: number }> {
    // Get all templates
    const allTemplates = await this.getMappingTemplates('', '');
    const template = allTemplates.find((t) => t.id === templateId);

    if (!template) {
      return { success: false, mappingsCreated: 0 };
    }

    let created = 0;

    for (const mapping of template.mappings) {
      try {
        await this.prisma.crmFieldMapping.create({
          data: {
            connectionId,
            entityType: template.entityType,
            localField: mapping.sourceField,
            crmField: mapping.targetField,
            transform: mapping.transform ? JSON.stringify(mapping.transform) : null,
            isActive: true,
          },
        });
        created++;
      } catch (error) {
        this.logger.warn(`Failed to create mapping for ${mapping.sourceField}:`, error);
      }
    }

    return { success: true, mappingsCreated: created };
  }

  // ============================================================
  // CUSTOM MAPPING BUILDER
  // ============================================================

  async createCustomMapping(
    connectionId: string,
    entityType: string,
    sourceField: string,
    targetField: string,
    options?: {
      transform?: FieldTransform;
      condition?: any;
    },
  ): Promise<any> {
    return this.prisma.crmFieldMapping.create({
      data: {
        connectionId,
        entityType,
        localField: sourceField,
        crmField: targetField,
        transform: options?.transform as any,
        direction: 'bidirectional',
        isActive: true,
      },
    });
  }

  async previewMapping(
    sampleData: any,
    mappings: DataMapping[],
    direction: 'to_crm' | 'from_crm',
  ): Promise<{
    input: any;
    output: any;
    appliedMappings: Array<{
      sourceField: string;
      targetField: string;
      originalValue: any;
      transformedValue: any;
      transform?: string;
    }>;
  }> {
    const output = await this.applyMapping(sampleData, mappings, direction);
    
    const appliedMappings = mappings.map((m) => {
      const sourceField = direction === 'to_crm' ? m.sourceField : m.targetField;
      const targetField = direction === 'to_crm' ? m.targetField : m.sourceField;
      const originalValue = this.getNestedValue(sampleData, sourceField);
      const transformedValue = this.getNestedValue(output, targetField);

      return {
        sourceField,
        targetField,
        originalValue,
        transformedValue,
        transform: m.transform?.type,
      };
    });

    return {
      input: sampleData,
      output,
      appliedMappings,
    };
  }

  // ============================================================
  // FIELD DISCOVERY
  // ============================================================

  async getAvailableFields(entityType: string): Promise<Array<{ name: string; type: string; label: string }>> {
    const fields: Record<string, Array<{ name: string; type: string; label: string }>> = {
      contact: [
        { name: 'firstName', type: 'string', label: 'First Name' },
        { name: 'lastName', type: 'string', label: 'Last Name' },
        { name: 'email', type: 'string', label: 'Email' },
        { name: 'phone', type: 'string', label: 'Phone' },
        { name: 'mobile', type: 'string', label: 'Mobile' },
        { name: 'jobTitle', type: 'string', label: 'Job Title' },
        { name: 'department', type: 'string', label: 'Department' },
        { name: 'seniority', type: 'string', label: 'Seniority Level' },
        { name: 'linkedinUrl', type: 'string', label: 'LinkedIn URL' },
        { name: 'twitterHandle', type: 'string', label: 'Twitter Handle' },
        { name: 'address', type: 'string', label: 'Address' },
        { name: 'city', type: 'string', label: 'City' },
        { name: 'state', type: 'string', label: 'State' },
        { name: 'country', type: 'string', label: 'Country' },
        { name: 'postalCode', type: 'string', label: 'Postal Code' },
        { name: 'leadScore', type: 'number', label: 'Lead Score' },
        { name: 'leadSource', type: 'string', label: 'Lead Source' },
        { name: 'status', type: 'string', label: 'Status' },
        { name: 'tags', type: 'array', label: 'Tags' },
        { name: 'company.name', type: 'string', label: 'Company Name' },
        { name: 'company.industry', type: 'string', label: 'Company Industry' },
        { name: 'company.size', type: 'string', label: 'Company Size' },
      ],
      company: [
        { name: 'name', type: 'string', label: 'Company Name' },
        { name: 'industry', type: 'string', label: 'Industry' },
        { name: 'website', type: 'string', label: 'Website' },
        { name: 'employeeCount', type: 'number', label: 'Employee Count' },
        { name: 'annualRevenue', type: 'number', label: 'Annual Revenue' },
        { name: 'description', type: 'string', label: 'Description' },
        { name: 'foundedYear', type: 'number', label: 'Founded Year' },
        { name: 'linkedinUrl', type: 'string', label: 'LinkedIn URL' },
        { name: 'twitterHandle', type: 'string', label: 'Twitter Handle' },
        { name: 'address', type: 'string', label: 'Address' },
        { name: 'city', type: 'string', label: 'City' },
        { name: 'state', type: 'string', label: 'State' },
        { name: 'country', type: 'string', label: 'Country' },
        { name: 'postalCode', type: 'string', label: 'Postal Code' },
        { name: 'phone', type: 'string', label: 'Phone' },
        { name: 'technologies', type: 'array', label: 'Technologies' },
      ],
    };

    return fields[entityType] || [];
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private evaluateCondition(data: any, condition: { field: string; operator: string; value: any }): boolean {
    const value = this.getNestedValue(data, condition.field);

    switch (condition.operator) {
      case 'eq':
      case 'equals':
        return value === condition.value;
      case 'neq':
      case 'not_equals':
        return value !== condition.value;
      case 'exists':
        return value != null && value !== '';
      case 'not_exists':
        return value == null || value === '';
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'contains':
        return typeof value === 'string' && value.includes(condition.value);
      default:
        return true;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current?.[key];
    }, obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}
