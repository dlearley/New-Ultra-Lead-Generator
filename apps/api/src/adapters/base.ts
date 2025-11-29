import { CrmAdapter, CrmCredentials, BusinessLeadData, FieldMappingData, CrmPushResult } from '../types';

export abstract class BaseCrmAdapter implements CrmAdapter {
  protected crmType: string;
  protected credentials: CrmCredentials;

  constructor(crmType: string) {
    this.crmType = crmType;
  }

  abstract authenticate(credentials: CrmCredentials): Promise<boolean>;
  abstract pushLead(leadData: BusinessLeadData, fieldMappings: FieldMappingData[]): Promise<CrmPushResult>;
  abstract validateFieldMapping(fieldMapping: FieldMappingData): Promise<boolean>;
  abstract getAvailableFields(): Promise<string[]>;

  protected transformLeadData(leadData: BusinessLeadData, fieldMappings: FieldMappingData[]): Record<string, any> {
    const transformed: Record<string, any> = {};

    for (const mapping of fieldMappings) {
      const value = this.getFieldValue(leadData, mapping.sourceField);
      
      if (value !== null && value !== undefined) {
        transformed[mapping.targetField] = this.convertFieldValue(value, mapping.fieldType);
      } else if (mapping.defaultValue) {
        transformed[mapping.targetField] = this.convertFieldValue(mapping.defaultValue, mapping.fieldType);
      } else if (mapping.isRequired) {
        throw new Error(`Required field ${mapping.sourceField} is missing and no default value provided`);
      }
    }

    return transformed;
  }

  private getFieldValue(leadData: BusinessLeadData, fieldName: string): any {
    // Check standard fields first
    if (fieldName in leadData) {
      return (leadData as any)[fieldName];
    }

    // Check custom fields
    if (leadData.customFields && fieldName in leadData.customFields) {
      return leadData.customFields[fieldName];
    }

    return null;
  }

  private convertFieldValue(value: any, fieldType: string): any {
    switch (fieldType) {
      case 'STRING':
      case 'EMAIL':
      case 'PHONE':
      case 'PICKLIST':
      case 'TEXTAREA':
        return String(value);
      
      case 'NUMBER':
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`Invalid number value: ${value}`);
        }
        return num;
      
      case 'BOOLEAN':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1';
        }
        return Boolean(value);
      
      case 'DATE':
        if (value instanceof Date) return value;
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid date value: ${value}`);
        }
        return date;
      
      default:
        return value;
    }
  }

  protected handleError(error: any, context: string): CrmPushResult {
    const errorMessage = error?.response?.data?.message || error?.message || `Unknown error in ${context}`;
    
    return {
      success: false,
      errorMessage,
      responseData: error?.response?.data || null
    };
  }
}