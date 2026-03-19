import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';

export type CustomFieldType = 
  | 'text' 
  | 'number' 
  | 'date' 
  | 'boolean' 
  | 'select' 
  | 'multi_select' 
  | 'url' 
  | 'email' 
  | 'phone';

export interface CustomField {
  id: string;
  organizationId: string;
  name: string;
  apiName: string;
  type: CustomFieldType;
  description?: string;
  required: boolean;
  defaultValue?: any;
  options?: string[]; // For select/multi_select
  entityType: 'contact' | 'company' | 'deal';
  order: number;
  isActive: boolean;
}

@Injectable()
export class CustomFieldsService {
  private readonly logger = new Logger(CustomFieldsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // CUSTOM FIELD MANAGEMENT
  // ============================================================

  async createField(
    organizationId: string,
    data: {
      name: string;
      apiName: string;
      type: CustomFieldType;
      description?: string;
      required?: boolean;
      defaultValue?: any;
      options?: string[];
      entityType: 'contact' | 'company' | 'deal';
    },
  ): Promise<CustomField> {
    // Validate apiName format (snake_case)
    if (!/^[a-z][a-z0-9_]*$/.test(data.apiName)) {
      throw new Error('API name must be snake_case starting with a letter');
    }

    // Check for reserved names
    const reservedNames = [
      'id', 'created_at', 'updated_at', 'organization_id',
      'email', 'phone', 'name', 'first_name', 'last_name',
    ];
    if (reservedNames.includes(data.apiName)) {
      throw new Error(`'${data.apiName}' is a reserved field name`);
    }

    // Check if apiName already exists for this entity type
    const existing = await this.prisma.customField.findFirst({
      where: {
        organizationId,
        apiName: data.apiName,
        entityType: data.entityType,
      },
    });

    if (existing) {
      throw new Error(`Field '${data.apiName}' already exists for ${data.entityType}`);
    }

    // Get next order number
    const maxOrder = await this.prisma.customField.aggregate({
      where: {
        organizationId,
        entityType: data.entityType,
      },
      _max: { order: true },
    });

    const field = await this.prisma.customField.create({
      data: {
        organizationId,
        name: data.name,
        apiName: data.apiName,
        type: data.type,
        description: data.description,
        required: data.required ?? false,
        defaultValue: data.defaultValue,
        options: data.options as any,
        entityType: data.entityType,
        order: (maxOrder._max.order ?? 0) + 1,
        isActive: true,
      },
    });

    return field as CustomField;
  }

  async updateField(
    organizationId: string,
    fieldId: string,
    data: Partial<{
      name: string;
      description: string;
      required: boolean;
      defaultValue: any;
      options: string[];
      isActive: boolean;
      order: number;
    }>,
  ): Promise<CustomField> {
    const field = await this.prisma.customField.findFirst({
      where: { id: fieldId, organizationId },
    });

    if (!field) {
      throw new Error('Custom field not found');
    }

    const updated = await this.prisma.customField.update({
      where: { id: fieldId },
      data: {
        ...data,
        options: data.options as any,
      },
    });

    return updated as CustomField;
  }

  async deleteField(organizationId: string, fieldId: string): Promise<void> {
    const field = await this.prisma.customField.findFirst({
      where: { id: fieldId, organizationId },
    });

    if (!field) {
      throw new Error('Custom field not found');
    }

    // Delete all values first
    await this.prisma.customFieldValue.deleteMany({
      where: { fieldId },
    });

    // Delete the field
    await this.prisma.customField.delete({
      where: { id: fieldId },
    });
  }

  async getFields(
    organizationId: string,
    filters?: {
      entityType?: 'contact' | 'company' | 'deal';
      isActive?: boolean;
    },
  ): Promise<CustomField[]> {
    return this.prisma.customField.findMany({
      where: {
        organizationId,
        ...(filters?.entityType && { entityType: filters.entityType }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      },
      orderBy: [{ entityType: 'asc' }, { order: 'asc' }],
    }) as Promise<CustomField[]>;
  }

  async getField(organizationId: string, fieldId: string): Promise<CustomField | null> {
    return this.prisma.customField.findFirst({
      where: { id: fieldId, organizationId },
    }) as Promise<CustomField | null>;
  }

  // ============================================================
  // FIELD VALUES
  // ============================================================

  async setFieldValue(
    organizationId: string,
    fieldId: string,
    entityId: string,
    value: any,
  ): Promise<void> {
    const field = await this.getField(organizationId, fieldId);
    if (!field) {
      throw new Error('Custom field not found');
    }

    // Validate value type
    this.validateFieldValue(field, value);

    // Upsert the value
    await this.prisma.customFieldValue.upsert({
      where: {
        fieldId_entityId: {
          fieldId,
          entityId,
        },
      },
      create: {
        organizationId,
        fieldId,
        entityId,
        entityType: field.entityType,
        value: this.serializeValue(value),
      },
      update: {
        value: this.serializeValue(value),
        updatedAt: new Date(),
      },
    });
  }

  async setMultipleFieldValues(
    organizationId: string,
    entityType: 'contact' | 'company' | 'deal',
    entityId: string,
    values: Record<string, any>,
  ): Promise<void> {
    // Get all fields for this entity type
    const fields = await this.getFields(organizationId, { entityType });
    const fieldMap = new Map(fields.map((f) => [f.apiName, f]));

    for (const [apiName, value] of Object.entries(values)) {
      const field = fieldMap.get(apiName);
      if (!field) {
        this.logger.warn(`Unknown custom field: ${apiName}`);
        continue;
      }

      await this.setFieldValue(organizationId, field.id, entityId, value);
    }
  }

  async getFieldValue(
    organizationId: string,
    fieldId: string,
    entityId: string,
  ): Promise<any> {
    const valueRecord = await this.prisma.customFieldValue.findUnique({
      where: {
        fieldId_entityId: {
          fieldId,
          entityId,
        },
      },
    });

    if (!valueRecord) {
      // Return default value if set
      const field = await this.getField(organizationId, fieldId);
      return field?.defaultValue ?? null;
    }

    return this.deserializeValue(valueRecord.value);
  }

  async getEntityCustomFields(
    organizationId: string,
    entityType: 'contact' | 'company' | 'deal',
    entityId: string,
  ): Promise<Record<string, any>> {
    const [fields, values] = await Promise.all([
      this.getFields(organizationId, { entityType, isActive: true }),
      this.prisma.customFieldValue.findMany({
        where: {
          organizationId,
          entityType,
          entityId,
        },
        include: { field: true },
      }),
    ]);

    const valueMap = new Map(values.map((v) => [v.field.apiName, this.deserializeValue(v.value)]));

    const result: Record<string, any> = {};
    for (const field of fields) {
      result[field.apiName] = valueMap.get(field.apiName) ?? field.defaultValue ?? null;
    }

    return result;
  }

  async deleteFieldValue(
    organizationId: string,
    fieldId: string,
    entityId: string,
  ): Promise<void> {
    await this.prisma.customFieldValue.deleteMany({
      where: {
        fieldId,
        entityId,
        organizationId,
      },
    });
  }

  // ============================================================
  // BULK OPERATIONS
  // ============================================================

  async copyFieldValues(
    organizationId: string,
    sourceEntityId: string,
    targetEntityId: string,
    entityType: 'contact' | 'company' | 'deal',
  ): Promise<void> {
    const values = await this.prisma.customFieldValue.findMany({
      where: {
        organizationId,
        entityType,
        entityId: sourceEntityId,
      },
    });

    for (const value of values) {
      await this.prisma.customFieldValue.upsert({
        where: {
          fieldId_entityId: {
            fieldId: value.fieldId,
            entityId: targetEntityId,
          },
        },
        create: {
          organizationId,
          fieldId: value.fieldId,
          entityId: targetEntityId,
          entityType,
          value: value.value,
        },
        update: {
          value: value.value,
        },
      });
    }
  }

  async migrateFieldValues(
    organizationId: string,
    sourceFieldId: string,
    targetFieldId: string,
  ): Promise<{ migrated: number }> {
    const values = await this.prisma.customFieldValue.findMany({
      where: {
        organizationId,
        fieldId: sourceFieldId,
      },
    });

    let migrated = 0;
    for (const value of values) {
      try {
        await this.prisma.customFieldValue.create({
          data: {
            organizationId,
            fieldId: targetFieldId,
            entityId: value.entityId,
            entityType: value.entityType,
            value: value.value,
          },
        });
        migrated++;
      } catch (error) {
        this.logger.warn(`Failed to migrate value for entity ${value.entityId}`);
      }
    }

    return { migrated };
  }

  // ============================================================
  // VALIDATION
  // ============================================================

  private validateFieldValue(field: CustomField, value: any): void {
    if (value === null || value === undefined) {
      if (field.required) {
        throw new Error(`Field '${field.name}' is required`);
      }
      return;
    }

    switch (field.type) {
      case 'text':
      case 'url':
      case 'email':
      case 'phone':
        if (typeof value !== 'string') {
          throw new Error(`Field '${field.name}' must be a string`);
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          throw new Error(`Field '${field.name}' must be a number`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new Error(`Field '${field.name}' must be a boolean`);
        }
        break;

      case 'date':
        if (!(value instanceof Date) && isNaN(Date.parse(value))) {
          throw new Error(`Field '${field.name}' must be a valid date`);
        }
        break;

      case 'select':
        if (!field.options?.includes(value)) {
          throw new Error(`Field '${field.name}' must be one of: ${field.options?.join(', ')}`);
        }
        break;

      case 'multi_select':
        if (!Array.isArray(value)) {
          throw new Error(`Field '${field.name}' must be an array`);
        }
        const invalidOptions = value.filter((v) => !field.options?.includes(v));
        if (invalidOptions.length > 0) {
          throw new Error(`Invalid options for '${field.name}': ${invalidOptions.join(', ')}`);
        }
        break;
    }
  }

  private serializeValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'object') {
      return value;
    }
    return value;
  }

  private deserializeValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }
    // Try to parse ISO date strings
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return value;
  }

  // ============================================================
  // STATS
  // ============================================================

  async getFieldStats(organizationId: string, fieldId: string) {
    const field = await this.getField(organizationId, fieldId);
    if (!field) {
      throw new Error('Field not found');
    }

    const [totalValues, uniqueValues] = await Promise.all([
      this.prisma.customFieldValue.count({
        where: { organizationId, fieldId },
      }),
      this.prisma.customFieldValue.groupBy({
        by: ['value'],
        where: { organizationId, fieldId },
      }),
    ]);

    return {
      fieldId,
      fieldName: field.name,
      totalValues,
      uniqueValues: uniqueValues.length,
      fillRate: 0, // Would need total entity count to calculate
    };
  }
}
