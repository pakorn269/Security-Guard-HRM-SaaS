import { Router } from 'express';
import { linkRequestsController } from './link-requests.controller.js';
import { authMiddleware, requireManager, requireNonLiff } from '../../middleware/auth.middleware.js';

const router = Router();

// All routes are protected and require manager/admin role
router.use(authMiddleware);
router.use(requireNonLiff); // Ensure not accessed from LIFF (Guards)
router.use(requireManager); // Ensure only Managers/Admins

// GET /api/v1/link-requests - List pending requests
router.get('/', linkRequestsController.list);

// POST /api/v1/link-requests/:id/approve - Approve request
router.post('/:id/approve', linkRequestsController.approve);

// POST /api/v1/link-requests/:id/reject - Reject request
router.post('/:id/reject', linkRequestsController.reject);

export default router;
