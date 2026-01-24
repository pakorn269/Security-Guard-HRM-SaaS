import { Router } from 'express';
import { lineController } from './line.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import lineLinkRoutes from './line-link.routes.js';

const router = Router();

// ============================================================
// LINE LINK MANAGEMENT ROUTES (includes public /login route)
// ============================================================
router.use(lineLinkRoutes);

// All routes below require authentication
router.use(authMiddleware);

// ============================================================
// TEMPLATE ROUTES
// ============================================================

// GET /api/v1/line/templates - List templates
router.get('/templates', lineController.listTemplates.bind(lineController));

// POST /api/v1/line/templates - Create template
router.post('/templates', lineController.createTemplate.bind(lineController));

// POST /api/v1/line/templates/initialize - Initialize default templates
router.post('/templates/initialize', lineController.initializeTemplates.bind(lineController));

// GET /api/v1/line/templates/:id - Get template by ID
router.get('/templates/:id', lineController.getTemplate.bind(lineController));

// PUT /api/v1/line/templates/:id - Update template
router.put('/templates/:id', lineController.updateTemplate.bind(lineController));

// DELETE /api/v1/line/templates/:id - Delete template
router.delete('/templates/:id', lineController.deleteTemplate.bind(lineController));

// ============================================================
// NOTIFICATION PREFERENCES ROUTES
// ============================================================

// GET /api/v1/line/preferences - Get current user's preferences
router.get('/preferences', lineController.getMyPreferences.bind(lineController));

// PUT /api/v1/line/preferences - Update current user's preferences
router.put('/preferences', lineController.updateMyPreferences.bind(lineController));

// GET /api/v1/line/preferences/user/:userId - Get user's preferences (admin)
router.get('/preferences/user/:userId', lineController.getUserPreferences.bind(lineController));

// GET /api/v1/line/preferences/employee/:employeeId - Get employee's preferences
router.get(
    '/preferences/employee/:employeeId',
    lineController.getEmployeePreferences.bind(lineController)
);

// PUT /api/v1/line/preferences/employee/:employeeId - Update employee's preferences
router.put(
    '/preferences/employee/:employeeId',
    lineController.updateEmployeePreferences.bind(lineController)
);

// ============================================================
// MESSAGE HISTORY ROUTES
// ============================================================

// GET /api/v1/line/history - List message history
router.get('/history', lineController.listHistory.bind(lineController));

// GET /api/v1/line/history/employee/:employeeId - Get history for employee
router.get('/history/employee/:employeeId', lineController.getEmployeeHistory.bind(lineController));

// GET /api/v1/line/history/:id - Get history by ID
router.get('/history/:id', lineController.getHistoryById.bind(lineController));

// ============================================================
// STATISTICS ROUTES
// ============================================================

// GET /api/v1/line/stats - Get message statistics
router.get('/stats', lineController.getStats.bind(lineController));

// ============================================================
// SEND MESSAGE ROUTES
// ============================================================

// POST /api/v1/line/send/bulk - Send bulk message
router.post('/send/bulk', lineController.sendBulkWithTemplate.bind(lineController));

// POST /api/v1/line/send/:employeeId - Send message to employee
router.post('/send/:employeeId', lineController.sendWithTemplate.bind(lineController));

export default router;
