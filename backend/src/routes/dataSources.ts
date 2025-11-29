import { Router } from 'express';
import { DataSourceController } from '../controllers/dataSourceController';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('data_sources', 'read'), DataSourceController.getDataSources);
router.get('/:id', requirePermission('data_sources', 'read'), DataSourceController.getDataSource);
router.post('/', requirePermission('data_sources', 'write'), DataSourceController.createDataSource);
router.put('/:id', requirePermission('data_sources', 'write'), DataSourceController.updateDataSource);
router.delete('/:id', requirePermission('data_sources', 'delete'), DataSourceController.deleteDataSource);
router.patch('/:id/toggle', requirePermission('data_sources', 'write'), DataSourceController.toggleDataSource);

export default router;