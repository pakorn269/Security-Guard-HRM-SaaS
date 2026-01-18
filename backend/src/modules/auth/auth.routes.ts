import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/line', authController.lineLogin);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Protected routes (require authentication)
router.get('/me', authMiddleware, authController.me);
router.post('/link-line', authMiddleware, authController.linkLine);

export default router;
