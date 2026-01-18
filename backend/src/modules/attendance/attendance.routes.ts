import { Router } from 'express';
import { attendanceController } from './attendance.controller.js';
import { authMiddleware, requireManager } from '../../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================================================
// GUARD ROUTES (for LIFF clock in/out)
// ============================================================================

// Clock in with GPS
router.post('/clock-in', attendanceController.clockIn);

// Clock out with GPS
router.post('/clock-out', attendanceController.clockOut);

// Get today's attendance status (for clock button state)
router.get('/today', attendanceController.getTodayAttendance);

// Get my attendance history
router.get('/my', attendanceController.getMyAttendance);

// ============================================================================
// MANAGER ROUTES
// ============================================================================

// Get daily attendance report (managers and above)
router.get('/report', requireManager, attendanceController.getDailyReport);

// List all attendance records (managers and above)
router.get('/', requireManager, attendanceController.list);

// Create attendance manually (managers and above)
router.post('/', requireManager, attendanceController.create);

// Get attendance by ID (managers and above)
router.get('/:id', requireManager, attendanceController.getById);

// Adjust attendance (managers and above)
router.put('/:id', requireManager, attendanceController.adjust);

export default router;
