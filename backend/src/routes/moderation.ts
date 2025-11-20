import { Router } from 'express';
import { ModerationController } from '../controllers/moderationController';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('data_quality', 'read'), ModerationController.getModerationQueue);
router.get('/stats', requirePermission('data_quality', 'read'), ModerationController.getModerationStats);
router.get('/:id', requirePermission('data_quality', 'read'), ModerationController.getModerationItem);
router.post('/', requirePermission('data_quality', 'write'), ModerationController.createModerationItem);
router.patch('/:id/approve', requirePermission('data_quality', 'write'), ModerationController.approveModerationItem);
router.patch('/:id/reject', requirePermission('data_quality', 'write'), ModerationController.rejectModerationItem);
router.patch('/bulk-approve', requirePermission('data_quality', 'write'), ModerationController.bulkApprove);

export default router;