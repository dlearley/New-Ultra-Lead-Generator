import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/me', AuthController.getCurrentUser);
router.put('/profile', AuthController.updateProfile);
router.put('/password', AuthController.changePassword);
router.get('/users', AuthController.getUsers);
router.put('/users/:id/role', AuthController.updateUserRole);

export default router;