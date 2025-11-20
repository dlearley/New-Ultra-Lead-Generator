import { PrismaClient } from '@prisma/client';
import { CrmAdapterFactory } from '../adapters';
import { FieldMappingData } from '../types';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class FieldMappingService {
  async createFieldMappings(
    organizationId: string,
    crmType: 'SALESFORCE' | 'HUBSPOT' | 'PIPEDRIVE',
    mappings: FieldMappingData[]
  ): Promise<{ success: boolean; message: string; mappings: any[] }> {
    try {
      // Validate that CRM is configured
      const crmConfig = await prisma.crmConfiguration.findFirst({
        where: {
          organizationId,
          crmType,
          isActive: true,
        },
      });

      if (!crmConfig) {
        throw new Error(`No active CRM configuration found for ${crmType}`);
      }

      // Test connection to CRM to validate fields
      const adapter = CrmAdapterFactory.createAdapter(crmType);
      const isAuthenticated = await adapter.authenticate(crmConfig.credentials as any);

      if (!isAuthenticated) {
        throw new Error(`Failed to authenticate with ${crmType}`);
      }

      // Get available fields from CRM
      const availableFields = await adapter.getAvailableFields();

      // Validate each mapping
      for (const mapping of mappings) {
        const isValid = await adapter.validateFieldMapping(mapping);
        if (!isValid) {
          throw new Error(`Invalid field mapping: ${mapping.targetField} is not available in ${crmType}`);
        }
      }

      // Delete existing mappings for this CRM type
      await prisma.fieldMapping.deleteMany({
        where: {
          organizationId,
          crmType,
        },
      });

      // Create new mappings
      const createdMappings = [];
      for (const mapping of mappings) {
        const created = await prisma.fieldMapping.create({
          data: {
            organizationId,
            crmType,
            sourceField: mapping.sourceField,
            targetField: mapping.targetField,
            fieldType: mapping.fieldType as any,
            isRequired: mapping.isRequired || false,
            defaultValue: mapping.defaultValue,
          },
        });
        createdMappings.push(created);
      }

      logger.info(`Field mappings created`, {
        organizationId,
        crmType,
        mappingCount: mappings.length,
      });

      return {
        success: true,
        message: `Successfully created ${mappings.length} field mappings for ${crmType}`,
        mappings: createdMappings,
      };
    } catch (error: any) {
      logger.error('Error in createFieldMappings', {
        organizationId,
        crmType,
        error: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }

  async getFieldMappings(
    organizationId: string,
    crmType?: 'SALESFORCE' | 'HUBSPOT' | 'PIPEDRIVE'
  ): Promise<any[]> {
    const where: any = { organizationId };

    if (crmType) {
      where.crmType = crmType;
    }

    return await prisma.fieldMapping.findMany({
      where,
      orderBy: [
        { crmType: 'asc' },
        { sourceField: 'asc' },
      ],
    });
  }

  async deleteFieldMapping(
    organizationId: string,
    mappingId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const mapping = await prisma.fieldMapping.findFirst({
        where: {
          id: mappingId,
          organizationId,
        },
      });

      if (!mapping) {
        throw new Error('Field mapping not found');
      }

      await prisma.fieldMapping.delete({
        where: { id: mappingId },
      });

      logger.info(`Field mapping deleted`, {
        organizationId,
        mappingId,
        crmType: mapping.crmType,
      });

      return {
        success: true,
        message: 'Field mapping deleted successfully',
      };
    } catch (error: any) {
      logger.error('Error in deleteFieldMapping', {
        organizationId,
        mappingId,
        error: error.message,
      });

      throw error;
    }
  }

  async getAvailableCrmFields(
    organizationId: string,
    crmType: 'SALESFORCE' | 'HUBSPOT' | 'PIPEDRIVE'
  ): Promise<{ success: boolean; fields: string[]; message?: string }> {
    try {
      const crmConfig = await prisma.crmConfiguration.findFirst({
        where: {
          organizationId,
          crmType,
          isActive: true,
        },
      });

      if (!crmConfig) {
        throw new Error(`No active CRM configuration found for ${crmType}`);
      }

      const adapter = CrmAdapterFactory.createAdapter(crmType);
      const isAuthenticated = await adapter.authenticate(crmConfig.credentials as any);

      if (!isAuthenticated) {
        throw new Error(`Failed to authenticate with ${crmType}`);
      }

      const fields = await adapter.getAvailableFields();

      return {
        success: true,
        fields,
      };
    } catch (error: any) {
      logger.error('Error in getAvailableCrmFields', {
        organizationId,
        crmType,
        error: error.message,
      });

      return {
        success: false,
        fields: [],
        message: error.message || `Failed to fetch fields from ${crmType}`,
      };
    }
  }

  async getStandardBusinessLeadFields(): Promise<string[]> {
    return [
      'email',
      'firstName',
      'lastName',
      'phone',
      'company',
      'jobTitle',
      'source',
      // Custom fields would be handled separately
    ];
  }

  async validateFieldMappings(
    organizationId: string,
    crmType: 'SALESFORCE' | 'HUBSPOT' | 'PIPEDRIVE',
    mappings: FieldMappingData[]
  ): Promise<{ success: boolean; message: string; errors: string[] }> {
    const errors: string[] = [];

    try {
      const crmConfig = await prisma.crmConfiguration.findFirst({
        where: {
          organizationId,
          crmType,
          isActive: true,
        },
      });

      if (!crmConfig) {
        errors.push(`No active CRM configuration found for ${crmType}`);
        return { success: false, message: 'Validation failed', errors };
      }

      const adapter = CrmAdapterFactory.createAdapter(crmType);
      const isAuthenticated = await adapter.authenticate(crmConfig.credentials as any);

      if (!isAuthenticated) {
        errors.push(`Failed to authenticate with ${crmType}`);
        return { success: false, message: 'Validation failed', errors };
      }

      const availableFields = await adapter.getAvailableFields();
      const standardFields = await this.getStandardBusinessLeadFields();

      for (const mapping of mappings) {
        // Validate source field
        if (!standardFields.includes(mapping.sourceField) && !mapping.sourceField.startsWith('customFields.')) {
          errors.push(`Invalid source field: ${mapping.sourceField}`);
        }

        // Validate target field
        if (!availableFields.includes(mapping.targetField)) {
          errors.push(`Target field not available in ${crmType}: ${mapping.targetField}`);
        }

        // Validate field type
        const validTypes = ['STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'EMAIL', 'PHONE', 'PICKLIST', 'TEXTAREA'];
        if (!validTypes.includes(mapping.fieldType)) {
          errors.push(`Invalid field type: ${mapping.fieldType}`);
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          message: 'Field mapping validation failed',
          errors,
        };
      }

      return {
        success: true,
        message: 'Field mappings are valid',
        errors: [],
      };
    } catch (error: any) {
      errors.push(error.message || 'Validation failed');
      return {
        success: false,
        message: 'Field mapping validation failed',
        errors,
      };
    }
  }
}