/**
 * Reports Routes
 * API route definitions for reports
 */

import { Router } from 'express';
import { reportsController } from './reports.controller.js';
import { authMiddleware, requireManager } from '../../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Only admin, manager can view reports
router.use(requireManager);

/**
 * @route   GET /api/v1/reports/attendance
 * @desc    Get attendance summary report
 * @access  Admin, Manager, Supervisor
 * @query   startDate, endDate, employeeId?, status?, format?
 */
router.get('/attendance', reportsController.getAttendanceSummary.bind(reportsController));

/**
 * @route   GET /api/v1/reports/leave
 * @desc    Get leave usage report
 * @access  Admin, Manager, Supervisor
 * @query   year, leaveTypeId?, employeeId?, format?
 */
router.get('/leave', reportsController.getLeaveUsage.bind(reportsController));

/**
 * @route   GET /api/v1/reports/attendance/trend
 * @desc    Get attendance trend data for charts
 * @access  Admin, Manager, Supervisor
 * @query   startDate, endDate
 */
router.get('/attendance/trend', reportsController.getAttendanceTrend.bind(reportsController));

export { router as reportRoutes };
export default router;
