import { Router } from 'express';
import { authMiddleware as authenticate } from '../../middleware/auth.middleware.js';
import { requireRoles as requireRole } from '../../middleware/auth.middleware.js';
import * as lineLinkController from './line-link.controller.js';

const router = Router();

// ============================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================

/**
 * @route   POST /api/v1/line/login
 * @desc    Handle LINE login with auto-discovery
 * @access  Public
 */
router.post('/login', lineLinkController.handleLineLogin);

// ============================================================
// AUTHENTICATED ROUTES
// All routes below require authentication
// ============================================================

router.use(authenticate);

// ============================================================
// LINK REQUEST ROUTES
// ============================================================

/**
 * @route   GET /api/v1/line/link-requests
 * @desc    List link requests (with pagination and filters)
 * @access  Company Admin, Manager
 */
router.get(
    '/link-requests',
    requireRole('company_admin', 'manager'),
    lineLinkController.listLinkRequests
);

/**
 * @route   GET /api/v1/line/link-requests/:id
 * @desc    Get link request by ID
 * @access  Company Admin, Manager
 */
router.get(
    '/link-requests/:id',
    requireRole('company_admin', 'manager'),
    lineLinkController.getLinkRequest
);

/**
 * @route   POST /api/v1/line/link-requests/:id/approve
 * @desc    Approve link request
 * @access  Company Admin
 */
router.post(
    '/link-requests/:id/approve',
    requireRole('company_admin', 'super_admin'),
    lineLinkController.approveLinkRequest
);

/**
 * @route   POST /api/v1/line/link-requests/:id/reject
 * @desc    Reject link request
 * @access  Company Admin
 */
router.post(
    '/link-requests/:id/reject',
    requireRole('company_admin', 'super_admin'),
    lineLinkController.rejectLinkRequest
);

/**
 * @route   POST /api/v1/line/link-requests/:id/approve-unlink
 * @desc    Approve unlink request
 * @access  Company Admin
 */
router.post(
    '/link-requests/:id/approve-unlink',
    requireRole('company_admin', 'super_admin'),
    lineLinkController.approveUnlinkRequest
);

// ============================================================
// UNLINK ROUTES
// ============================================================

/**
 * @route   POST /api/v1/line/unlink-request
 * @desc    Create unlink request (guard self-service)
 * @access  Guard (self-service)
 */
router.post('/unlink-request', requireRole('guard'), lineLinkController.createUnlinkRequest);

/**
 * @route   POST /api/v1/line/force-unlink
 * @desc    Force unlink LINE account (admin only)
 * @access  Company Admin
 */
router.post(
    '/force-unlink',
    requireRole('company_admin', 'super_admin'),
    lineLinkController.forceUnlink
);

// ============================================================
// SESSION MANAGEMENT ROUTES
// ============================================================

/**
 * @route   GET /api/v1/line/sessions
 * @desc    List LINE sessions
 * @access  Admin (all sessions) or Guard (own sessions)
 */
router.get('/sessions', lineLinkController.listSessions);

/**
 * @route   POST /api/v1/line/sessions/:sessionId/revoke
 * @desc    Revoke a specific LINE session
 * @access  Company Admin
 */
router.post(
    '/sessions/:sessionId/revoke',
    requireRole('company_admin', 'super_admin'),
    lineLinkController.revokeSession
);

// ============================================================
// AUDIT LOG ROUTES
// ============================================================

/**
 * @route   GET /api/v1/line/audit-logs
 * @desc    List LINE audit logs
 * @access  Company Admin, Manager
 */
router.get(
    '/audit-logs',
    requireRole('company_admin', 'manager'),
    lineLinkController.listAuditLogs
);

export default router;
