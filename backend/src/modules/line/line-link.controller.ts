import type { Request, Response, NextFunction } from 'express';
import { lineLinkService } from './line-link.service.js';
import {
    lineLoginSchema,
    reviewLinkRequestSchema,
    createUnlinkRequestSchema,
    forceUnlinkSchema,
    revokeSessionSchema,
    listLinkRequestsQuerySchema,
    listSessionsQuerySchema,
    listAuditLogsQuerySchema,
} from './line-link.validation.js';
import { successResponse, errorResponse } from '@/utils/response.js';
import type { AuthenticatedRequest } from '@/types/express.js';

// ============================================================
// LINE LOGIN & AUTO-DISCOVERY
// ============================================================

/**
 * Handle LINE login with auto-discovery
 * POST /api/v1/line/login
 * Public endpoint (no auth required)
 */
export async function handleLineLogin(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const validated = lineLoginSchema.parse(req.body);
        const result = await lineLinkService.handleLineLogin(validated);

        res.json(successResponse(result));
    } catch (error) {
        next(error);
    }
}

// ============================================================
// LINK REQUEST MANAGEMENT
// ============================================================

/**
 * List link requests
 * GET /api/v1/line/link-requests
 * Auth: Admin/Manager
 */
export async function listLinkRequests(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const companyId = req.user!.companyId as string;
        const query = listLinkRequestsQuerySchema.parse(req.query);

        const result = await lineLinkService.listLinkRequests(companyId, query);

        res.json(
            successResponse(result.data, {
                pagination: {
                    page: query.page,
                    pageSize: query.pageSize,
                    total: result.total,
                    totalPages: Math.ceil(result.total / query.pageSize),
                },
            })
        );
    } catch (error) {
        next(error);
    }
}

/**
 * Get link request by ID
 * GET /api/v1/line/link-requests/:id
 * Auth: Admin/Manager
 */
export async function getLinkRequest(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const id = req.params.id as string;
        const companyId = req.user!.companyId as string;

        const result = await lineLinkService.getLinkRequestById(id, companyId);

        res.json(successResponse(result));
    } catch (error) {
        next(error);
    }
}

/**
 * Approve link request
 * POST /api/v1/line/link-requests/:id/approve
 * Auth: Company Admin
 */
export async function approveLinkRequest(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const id = req.params.id as string;
        const userId = req.user!.userId as string;
        const validated = reviewLinkRequestSchema.parse(req.body);

        const result = await lineLinkService.approveLinkRequest(id, userId, validated);

        res.json(
            successResponse(result, {
                message: 'Link request approved successfully',
            })
        );
    } catch (error) {
        next(error);
    }
}

/**
 * Reject link request
 * POST /api/v1/line/link-requests/:id/reject
 * Auth: Company Admin
 */
export async function rejectLinkRequest(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const id = req.params.id as string;
        const userId = req.user!.userId as string;
        const validated = reviewLinkRequestSchema.parse(req.body);

        const result = await lineLinkService.rejectLinkRequest(id, userId, validated);

        res.json(
            successResponse(result, {
                message: 'Link request rejected',
            })
        );
    } catch (error) {
        next(error);
    }
}

// ============================================================
// UNLINK OPERATIONS
// ============================================================

/**
 * Create unlink request (guard-initiated)
 * POST /api/v1/line/unlink-request
 * Auth: Guard (self-service)
 */
export async function createUnlinkRequest(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const userId = req.user!.userId as string;
        const companyId = req.user!.companyId as string;
        const validated = createUnlinkRequestSchema.parse(req.body);

        const result = await lineLinkService.createUnlinkRequest(userId, companyId, validated);

        res.json(
            successResponse(result, {
                message: 'Unlink request submitted. Please wait for admin approval.',
            })
        );
    } catch (error) {
        next(error);
    }
}

/**
 * Approve unlink request
 * POST /api/v1/line/link-requests/:id/approve-unlink
 * Auth: Company Admin
 */
export async function approveUnlinkRequest(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const id = req.params.id as string;
        const userId = req.user!.userId as string;
        const validated = reviewLinkRequestSchema.parse(req.body);
        const ipAddress = req.ip;
        const userAgent = req.get('user-agent') || 'unknown';

        const result = await lineLinkService.approveUnlinkRequest(
            id,
            userId,
            validated,
            ipAddress,
            userAgent
        );

        res.json(
            successResponse(result, {
                message: 'Unlink request approved. Account unlinked and sessions revoked.',
            })
        );
    } catch (error) {
        next(error);
    }
}

/**
 * Force unlink LINE account (admin only)
 * POST /api/v1/line/force-unlink
 * Auth: Company Admin
 */
export async function forceUnlink(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const userId = req.user!.userId as string;
        const validated = forceUnlinkSchema.parse(req.body);
        const ipAddress = req.ip;
        const userAgent = req.get('user-agent') || 'unknown';

        const result = await lineLinkService.forceUnlink(
            userId,
            validated,
            ipAddress,
            userAgent
        );

        res.json(
            successResponse(result, {
                message: `LINE account unlinked successfully. ${result.revokedSessions} session(s) revoked.`,
            })
        );
    } catch (error) {
        next(error);
    }
}

// ============================================================
// SESSION MANAGEMENT
// ============================================================

/**
 * List sessions
 * GET /api/v1/line/sessions
 * Auth: Admin (all sessions) or Guard (own sessions)
 */
export async function listSessions(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const companyId = req.user!.companyId as string;
        const userRole = req.user!.role;
        const currentUserId = req.user!.userId as string;

        const query = listSessionsQuerySchema.parse(req.query);

        // Guards can only view their own sessions
        if (userRole === 'guard') {
            query.userId = currentUserId;
        }

        const result = await lineLinkService.listSessions(companyId, query);

        res.json(
            successResponse(result.data, {
                pagination: {
                    page: query.page,
                    pageSize: query.pageSize,
                    total: result.total,
                    totalPages: Math.ceil(result.total / query.pageSize),
                },
            })
        );
    } catch (error) {
        next(error);
    }
}

/**
 * Revoke session
 * POST /api/v1/line/sessions/:sessionId/revoke
 * Auth: Company Admin
 */
export async function revokeSession(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const userId = req.user!.userId as string;
        const { sessionId } = req.params;
        const validated = revokeSessionSchema.parse({ ...req.body, sessionId });

        const result = await lineLinkService.revokeSession(userId, validated);

        res.json(
            successResponse(result, {
                message: 'Session revoked successfully',
            })
        );
    } catch (error) {
        next(error);
    }
}

// ============================================================
// AUDIT LOGS
// ============================================================

/**
 * List audit logs
 * GET /api/v1/line/audit-logs
 * Auth: Admin/Manager
 */
export async function listAuditLogs(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const companyId = req.user!.companyId as string;
        const query = listAuditLogsQuerySchema.parse(req.query);

        const result = await lineLinkService.listAuditLogs(companyId, query);

        res.json(
            successResponse(result.data, {
                pagination: {
                    page: query.page,
                    pageSize: query.pageSize,
                    total: result.total,
                    totalPages: Math.ceil(result.total / query.pageSize),
                },
            })
        );
    } catch (error) {
        next(error);
    }
}
