import { Router } from 'express';
import { validateBody, validateParams } from '../middleware/validation';
import { fieldMappingRateLimiter } from '../middleware/rateLimiter';
import { 
  fieldMappingSchema, 
  organizationIdSchema,
  syncJobIdSchema 
} from '../utils/validation';
import {
  createFieldMappings,
  getFieldMappings,
  deleteFieldMapping,
  getAvailableCrmFields,
  validateFieldMappings,
  getStandardBusinessLeadFields,
} from '../controllers/fieldMappingController';

const router = Router();

// Create field mappings
router.post(
  '/',
  fieldMappingRateLimiter,
  validateBody(fieldMappingSchema),
  createFieldMappings
);

// Get field mappings (with optional CRM type filter)
router.get(
  '/',
  validateBody(organizationIdSchema),
  getFieldMappings
);

// Delete field mapping
router.delete(
  '/:mappingId',
  validateParams(syncJobIdSchema),
  deleteFieldMapping
);

// Get available fields for a specific CRM
router.get(
  '/crm-fields/:crmType',
  validateBody(organizationIdSchema),
  getAvailableCrmFields
);

// Validate field mappings
router.post(
  '/validate',
  fieldMappingRateLimiter,
  validateBody(fieldMappingSchema),
  validateFieldMappings
);

// Get standard business lead fields
router.get(
  '/standard-fields',
  getStandardBusinessLeadFields
);

export default router;