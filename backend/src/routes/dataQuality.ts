import { Router } from 'express';
import { DataQualityController } from '../controllers/dataQualityController';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('data_quality', 'read'), DataQualityController.getDataQualityMetrics);
router.get('/summary', requirePermission('data_quality', 'read'), DataQualityController.getDataQualitySummary);
router.get('/trends', requirePermission('data_quality', 'read'), DataQualityController.getDataQualityTrends);
router.get('/filters', requirePermission('data_quality', 'read'), DataQualityController.getRegionsAndIndustries);
router.get('/data-source/:dataSourceId', requirePermission('data_quality', 'read'), DataQualityController.getDataQualityMetricsByDataSource);
router.post('/', requirePermission('data_quality', 'write'), DataQualityController.createOrUpdateDataQualityMetrics);

export default router;