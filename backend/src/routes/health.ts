import { Router } from 'express';
import { HealthController } from '../controllers/healthController';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/logs', requirePermission('health_logs', 'read'), HealthController.getHealthLogs);
router.get('/summary', requirePermission('health_logs', 'read'), HealthController.getHealthSummary);
router.get('/trends', requirePermission('health_logs', 'read'), HealthController.getHealthTrends);
router.get('/data-source/:id', requirePermission('health_logs', 'read'), HealthController.getDataSourceHealth);
router.post('/logs', requirePermission('health_logs', 'write'), HealthController.createHealthLog);
router.patch('/logs/:id/resolve', requirePermission('health_logs', 'write'), HealthController.resolveHealthLog);
router.patch('/logs/bulk-resolve', requirePermission('health_logs', 'write'), HealthController.bulkResolveHealthLogs);

export default router;