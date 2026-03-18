import { Router } from 'express';
import { validateBody } from '../middleware/validation';
import { crmPushRateLimiter } from '../middleware/rateLimiter';
import { 
  pushLeadsSchema, 
  organizationIdSchema,
  syncJobIdSchema 
} from '../utils/validation';
import {
  pushLeads,
  getSyncJobs,
  getSyncJob,
  testCrmConnection,
} from '../controllers/crmController';

const router = Router();

// Push leads to CRM
router.post(
  '/push-leads',
  crmPushRateLimiter,
  validateBody(pushLeadsSchema),
  pushLeads
);

// Get sync jobs (with optional filtering)
router.get(
  '/sync-jobs',
  validateBody(organizationIdSchema),
  getSyncJobs
);

// Get specific sync job
router.get(
  '/sync-jobs/:jobId',
  validateBody(syncJobIdSchema),
  getSyncJob
);

// Test CRM connection
router.post(
  '/test-connection',
  crmPushRateLimiter,
  testCrmConnection
);

export default router;