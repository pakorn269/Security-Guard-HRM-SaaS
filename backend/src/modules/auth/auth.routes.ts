import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/login-phone', authController.phoneLogin);
router.post('/line', authController.lineLogin);
router.post('/refresh', authController.refresh);
router.post('/logout', authMiddleware, authController.logout);
router.post('/forgot-pin', authController.forgotPin);
router.post('/setup-pin', authController.setupPin);
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/request-pin-reset', authController.requestPinReset);
router.post('/me/request-pin-reset', authMiddleware, authController.requestPinResetMe);

// Protected routes (require authentication)
router.get('/me', authMiddleware, authController.me);
router.post('/link-line', authMiddleware, authController.linkLine);
router.post('/password', authMiddleware, authController.changePassword);
router.post('/set-pin', authMiddleware, authController.setPin);
router.get('/pin-reset-requests', authMiddleware, authController.getPinResetRequests);
router.get('/pin-reset-requests/count', authMiddleware, authController.getPendingPinResetCount);

// ============================================================
// Session Management Routes (Protected)
// ============================================================
router.get('/sessions', authMiddleware, authController.getSessions);
router.delete('/sessions/:sessionId', authMiddleware, authController.revokeSession);
router.delete('/sessions', authMiddleware, authController.revokeAllSessions);

// ============================================================
// LIFF Account Linking Routes
// ============================================================

// Public routes - for LIFF first-time user flow
router.post('/line/verify', authController.lineVerify);
router.post('/line/link-employee', authController.linkEmployee);
router.post('/line/link-credentials', authController.linkCredentials);

// ============================================================
// LIFF Email Login (Without LINE)
// ============================================================

// Public route - for guards who don't use LINE
router.post('/liff/employee-login', authController.liffEmployeeLogin);

// Protected route - requires authentication
router.post('/line/unlink', authMiddleware, authController.unlinkLineAccount);

export default router;

