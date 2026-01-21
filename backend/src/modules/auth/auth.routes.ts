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

// ============================================================
// LIFF Account Linking Routes
// ============================================================

// Public routes - for LIFF first-time user flow
router.post('/line/verify', authController.lineVerify);
router.post('/line/link-employee', authController.linkEmployee);
router.post('/line/link-credentials', authController.linkCredentials);

// Protected route - requires authentication
router.post('/line/unlink', authMiddleware, authController.unlinkLineAccount);

export default router;
