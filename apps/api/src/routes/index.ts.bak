import { Router } from 'express';
import crmRoutes from './crm';
import fieldMappingRoutes from './fieldMapping';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API routes
router.use('/crm', crmRoutes);
router.use('/field-mappings', fieldMappingRoutes);

export default router;