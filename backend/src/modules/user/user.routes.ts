import { Router } from 'express';
import { userController } from './user.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Current user routes (must be before :id routes)
router.get('/me', userController.getCurrentUser);
router.put('/me', userController.updateCurrentUser);
router.post('/me/change-password', userController.changePassword);

// User CRUD
router.get('/', userController.list);
router.post('/', userController.create);
router.get('/:id', userController.getById);
router.put('/:id', userController.update);
router.delete('/:id', userController.deactivate);

// User actions
router.post('/:id/reactivate', userController.reactivate);
router.post('/:id/link-line', userController.linkLine);
router.delete('/:id/link-line', userController.unlinkLine);

export default router;
