import { Router } from 'express';
import { leaveController } from './leave.controller.js';
import { authMiddleware, requireManager } from '../../middleware/auth.middleware.js';
import { leaveDocumentUpload } from '../../middleware/upload.middleware.js';

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
// Document management routes
// --------------------------------

// Upload document for leave request (request owner or manager)
leaveRequestsRouter.post('/:id/document', leaveDocumentUpload, leaveController.uploadDocument);

// Get document URL for leave request (request owner or manager)
leaveRequestsRouter.get('/:id/document', leaveController.getDocumentUrl);

// Delete document from leave request (request owner or manager)
leaveRequestsRouter.delete('/:id/document', leaveController.deleteDocument);

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

// Get shift conflicts for leave request (managers and above)
leaveRequestsRouter.get('/:id/conflicts', requireManager, leaveController.getLeaveRequestConflicts);

// Approve leave request with replacements (managers and above)
leaveRequestsRouter.post('/:id/approve-with-replacements', requireManager, leaveController.approveLeaveWithReplacements);

// Assign replacements for leave request (managers and above)
leaveRequestsRouter.post('/:id/assign-replacements', requireManager, leaveController.assignReplacementsForLeave);

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

// List all adjustments (managers and above)
leaveBalancesRouter.get('/adjustments', requireManager, leaveController.listAdjustments);

// Bulk adjust balances (managers and above)
leaveBalancesRouter.post('/bulk-adjust', requireManager, leaveController.bulkAdjustBalances);

// Update employee's leave balance (managers and above)
leaveBalancesRouter.put('/:employeeId/:leaveTypeId', requireManager, leaveController.updateBalance);

// Initialize balances for year (managers and above)
leaveBalancesRouter.post('/initialize', requireManager, leaveController.initializeBalances);

// --------------------------------
// Balance adjustment routes
// --------------------------------

// Adjust a specific balance with audit trail (managers and above)
leaveBalancesRouter.post('/:id/adjust', requireManager, leaveController.adjustBalance);

// Get adjustment history for a balance (managers and above)
leaveBalancesRouter.get('/:id/adjustments', requireManager, leaveController.getBalanceAdjustments);

// ============================================================================
// LEAVE REQUEST TEMPLATES ROUTER
// ============================================================================

const leaveTemplatesRouter = Router();

// All routes require authentication
leaveTemplatesRouter.use(authMiddleware);

// List all templates (all authenticated users can view active templates)
leaveTemplatesRouter.get('/', leaveController.listTemplates);

// Get a single template
leaveTemplatesRouter.get('/:id', leaveController.getTemplate);

// Create a new template (managers and above)
leaveTemplatesRouter.post('/', requireManager, leaveController.createTemplate);

// Update a template (managers and above)
leaveTemplatesRouter.put('/:id', requireManager, leaveController.updateTemplate);

// Delete a template (managers and above)
leaveTemplatesRouter.delete('/:id', requireManager, leaveController.deleteTemplate);

// Apply a template to get draft data (all authenticated users)
leaveTemplatesRouter.post('/:id/apply', leaveController.applyTemplate);

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

// Export routes
leaveRouter.get('/export/ical', requireManager, leaveController.exportICalendar);

// ================================
// Analytics & Reporting Routes
// ================================

leaveRouter.get('/reports/kpi', requireManager, leaveController.getKPISummary);
leaveRouter.get('/reports/utilization', requireManager, leaveController.getUtilizationReport);
leaveRouter.get('/reports/trending', requireManager, leaveController.getTrendingReport);
leaveRouter.get('/reports/type-distribution', requireManager, leaveController.getTypeDistribution);
leaveRouter.get('/reports/approval-metrics', requireManager, leaveController.getApprovalMetrics);
leaveRouter.get('/reports/heatmap', requireManager, leaveController.getHeatmapData);

// ============================================================================
// EXPORTS
// ============================================================================

export {
    leaveTypesRouter,
    leaveRequestsRouter,
    leaveBalancesRouter,
    leaveTemplatesRouter,
    leaveRouter,
};

export default leaveRequestsRouter;
