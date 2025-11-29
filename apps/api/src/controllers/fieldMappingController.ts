import { Request, Response } from 'express';
import { FieldMappingService } from '../services/fieldMappingService';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const fieldMappingService = new FieldMappingService();

export const createFieldMappings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { crmType, mappings } = req.body;
  const organizationId = req.headers['x-organization-id'] as string;

  if (!organizationId) {
    res.status(400).json({
      error: {
        message: 'Organization ID is required',
        statusCode: 400,
      },
    });
    return;
  }

  try {
    const result = await fieldMappingService.createFieldMappings(
      organizationId,
      crmType,
      mappings
    );

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        mappings: result.mappings,
        crmType,
        count: mappings.length,
      },
    });
  } catch (error: any) {
    logger.error('Create field mappings error', {
      organizationId,
      crmType,
      error: error.message,
    });

    res.status(400).json({
      error: {
        message: error.message || 'Failed to create field mappings',
        statusCode: 400,
      },
    });
  }
});

export const getFieldMappings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const organizationId = req.headers['x-organization-id'] as string;
  const { crmType } = req.query;

  if (!organizationId) {
    res.status(400).json({
      error: {
        message: 'Organization ID is required',
        statusCode: 400,
      },
    });
    return;
  }

  try {
    const mappings = await fieldMappingService.getFieldMappings(
      organizationId,
      crmType as any
    );

    res.json({
      success: true,
      data: {
        mappings,
        crmType: crmType || 'all',
        count: mappings.length,
      },
    });
  } catch (error: any) {
    logger.error('Get field mappings error', {
      organizationId,
      crmType,
      error: error.message,
    });

    res.status(500).json({
      error: {
        message: error.message || 'Failed to fetch field mappings',
        statusCode: 500,
      },
    });
  }
});

export const deleteFieldMapping = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const organizationId = req.headers['x-organization-id'] as string;
  const { mappingId } = req.params;

  if (!organizationId) {
    res.status(400).json({
      error: {
        message: 'Organization ID is required',
        statusCode: 400,
      },
    });
    return;
  }

  try {
    const result = await fieldMappingService.deleteFieldMapping(
      organizationId,
      mappingId
    );

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    logger.error('Delete field mapping error', {
      organizationId,
      mappingId,
      error: error.message,
    });

    if (error.message === 'Field mapping not found') {
      res.status(404).json({
        error: {
          message: 'Field mapping not found',
          statusCode: 404,
        },
      });
    } else {
      res.status(500).json({
        error: {
          message: error.message || 'Failed to delete field mapping',
          statusCode: 500,
        },
      });
    }
  }
});

export const getAvailableCrmFields = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const organizationId = req.headers['x-organization-id'] as string;
  const { crmType } = req.params;

  if (!organizationId) {
    res.status(400).json({
      error: {
        message: 'Organization ID is required',
        statusCode: 400,
      },
    });
    return;
  }

  try {
    const result = await fieldMappingService.getAvailableCrmFields(
      organizationId,
      crmType as any
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          fields: result.fields,
          crmType,
          count: result.fields.length,
        },
      });
    } else {
      res.status(400).json({
        error: {
          message: result.message || 'Failed to fetch CRM fields',
          statusCode: 400,
        },
      });
    }
  } catch (error: any) {
    logger.error('Get available CRM fields error', {
      organizationId,
      crmType,
      error: error.message,
    });

    res.status(500).json({
      error: {
        message: error.message || 'Failed to fetch CRM fields',
        statusCode: 500,
      },
    });
  }
});

export const validateFieldMappings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { crmType, mappings } = req.body;
  const organizationId = req.headers['x-organization-id'] as string;

  if (!organizationId) {
    res.status(400).json({
      error: {
        message: 'Organization ID is required',
        statusCode: 400,
      },
    });
    return;
  }

  try {
    const result = await fieldMappingService.validateFieldMappings(
      organizationId,
      crmType,
      mappings
    );

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          validMappings: mappings,
          count: mappings.length,
        },
      });
    } else {
      res.status(400).json({
        error: {
          message: result.message,
          statusCode: 400,
        },
        data: {
          errors: result.errors,
          invalidMappings: mappings,
        },
      });
    }
  } catch (error: any) {
    logger.error('Validate field mappings error', {
      organizationId,
      crmType,
      error: error.message,
    });

    res.status(500).json({
      error: {
        message: error.message || 'Failed to validate field mappings',
        statusCode: 500,
      },
    });
  }
});

export const getStandardBusinessLeadFields = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const fields = await fieldMappingService.getStandardBusinessLeadFields();

    res.json({
      success: true,
      data: {
        fields,
        count: fields.length,
      },
    });
  } catch (error: any) {
    logger.error('Get standard business lead fields error', {
      error: error.message,
    });

    res.status(500).json({
      error: {
        message: error.message || 'Failed to fetch standard business lead fields',
        statusCode: 500,
      },
    });
  }
});