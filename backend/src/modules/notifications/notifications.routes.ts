
import { Router } from 'express';
import { NotificationController } from './notifications.controller.js';
import { authMiddleware as requireAuth } from '../../middleware/auth.middleware.js';

const router = Router();

// System endpoints (schedulers)
router.post('/reminders', NotificationController.triggerReminders);

// All routes require authentication
router.use(requireAuth);

router.get('/', NotificationController.getNotifications);
router.put('/read-all', NotificationController.markAllAsRead);
router.put('/:id/read', NotificationController.markAsRead);

export const notificationRoutes = router;
