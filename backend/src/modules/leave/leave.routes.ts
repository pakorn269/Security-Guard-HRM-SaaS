import { Router } from 'express';
import { leaveController } from './leave.controller.js';
import { authMiddleware, requireManager } from '../../middleware/auth.middleware.js';

// ============================================================================
// LEAVE TYPES ROUTER
// ============================================================================

const leaveTypesRouter = Router();

// All routes require authentication
leaveTypesRouter.use(authMiddleware);

// List leave types (all users can view)
leaveTypesRouter.get('/', leaveController.listLeaveTypes);

// Get leave type by ID
leaveTypesRouter.get('/:id', leaveController.getLeaveTypeById);

// Create leave type (managers and above)
leaveTypesRouter.post('/', requireManager, leaveController.createLeaveType);

// Update leave type (managers and above)
leaveTypesRouter.put('/:id', requireManager, leaveController.updateLeaveType);

// Delete leave type (managers and above)
leaveTypesRouter.delete('/:id', requireManager, leaveController.deleteLeaveType);

// ============================================================================
// LEAVE REQUESTS ROUTER
// ============================================================================

const leaveRequestsRouter = Router();

// All routes require authentication
leaveRequestsRouter.use(authMiddleware);

// --------------------------------
// Guard routes (for LIFF)
// --------------------------------

// Get my leave requests
leaveRequestsRouter.get('/my', leaveController.getMyLeaveRequests);

// Create leave request (any authenticated user with employee link)
leaveRequestsRouter.post('/', leaveController.createLeaveRequest);

// Cancel my leave request
leaveRequestsRouter.post('/:id/cancel', leaveController.cancelMyLeaveRequest);

// --------------------------------
// Manager routes
// --------------------------------

// List all leave requests (managers and above)
leaveRequestsRouter.get('/', requireManager, leaveController.listLeaveRequests);

// Get leave request by ID (managers and above)
leaveRequestsRouter.get('/:id', requireManager, leaveController.getLeaveRequestById);

// Approve leave request (managers and above)
leaveRequestsRouter.post('/:id/approve', requireManager, leaveController.approveLeaveRequest);

// Reject leave request (managers and above)
leaveRequestsRouter.post('/:id/reject', requireManager, leaveController.rejectLeaveRequest);

// ============================================================================
// LEAVE BALANCES ROUTER
// ============================================================================

const leaveBalancesRouter = Router();

// All routes require authentication
leaveBalancesRouter.use(authMiddleware);

// List all leave balances (managers and above)
leaveBalancesRouter.get('/', requireManager, leaveController.listBalances);

// Get my leave balances
leaveBalancesRouter.get('/my', leaveController.getMyBalances);

// Update employee's leave balance (managers and above)
leaveBalancesRouter.put('/:employeeId/:leaveTypeId', requireManager, leaveController.updateBalance);

// Initialize balances for year (managers and above)
leaveBalancesRouter.post('/initialize', requireManager, leaveController.initializeBalances);

// ============================================================================
// LEAVE MANAGEMENT ROUTER (combined endpoints)
// ============================================================================

const leaveRouter = Router();

// All routes require authentication
leaveRouter.use(authMiddleware);

// Get my complete leave data (for LIFF)
leaveRouter.get('/my', leaveController.getMyLeaveData);

// Manager routes
leaveRouter.get('/calendar', requireManager, leaveController.getLeaveCalendar);
leaveRouter.get('/summary', requireManager, leaveController.getLeaveSummary);
leaveRouter.get('/pending-count', requireManager, leaveController.getPendingCount);

// ============================================================================
// EXPORTS
// ============================================================================

export {
    leaveTypesRouter,
    leaveRequestsRouter,
    leaveBalancesRouter,
    leaveRouter,
};

export default leaveRequestsRouter;
