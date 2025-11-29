import { Router } from 'express';
import { PlanController } from '../controllers/planController';
import { authenticateToken, requirePermission } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', requirePermission('plans', 'read'), PlanController.getPlans);
router.get('/features', requirePermission('plans', 'read'), PlanController.getPlanFeatures);
router.get('/:id', requirePermission('plans', 'read'), PlanController.getPlan);
router.post('/', requirePermission('plans', 'write'), PlanController.createPlan);
router.put('/:id', requirePermission('plans', 'write'), PlanController.updatePlan);
router.delete('/:id', requirePermission('plans', 'delete'), PlanController.deletePlan);
router.patch('/:id/toggle', requirePermission('plans', 'write'), PlanController.togglePlan);
router.post('/:id/clone', requirePermission('plans', 'write'), PlanController.clonePlan);

export default router;