import { Router } from 'express';
import { FeatureFlagController } from '../controllers/featureFlagController';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('feature_flags', 'read'), FeatureFlagController.getFeatureFlags);
router.get('/:id', requirePermission('feature_flags', 'read'), FeatureFlagController.getFeatureFlag);
router.post('/', requirePermission('feature_flags', 'write'), FeatureFlagController.createFeatureFlag);
router.put('/:id', requirePermission('feature_flags', 'write'), FeatureFlagController.updateFeatureFlag);
router.delete('/:id', requirePermission('feature_flags', 'delete'), FeatureFlagController.deleteFeatureFlag);
router.patch('/:id/toggle', requirePermission('feature_flags', 'write'), FeatureFlagController.toggleFeatureFlag);
router.post('/:id/tenant-overrides', requirePermission('feature_flags', 'write'), FeatureFlagController.addTenantOverride);
router.delete('/:id/tenant-overrides/:tenantId', requirePermission('feature_flags', 'write'), FeatureFlagController.removeTenantOverride);

export default router;