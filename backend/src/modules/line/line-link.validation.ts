import { z } from 'zod';

// ============================================================
// LINE LOGIN VALIDATION
// ============================================================

export const lineLoginSchema = z.object({
    lineUserId: z.string().min(1, 'LINE user ID is required'),
    lineDisplayName: z.string().min(1, 'LINE display name is required'),
    linePictureUrl: z.string().url().optional(),
    lineEmail: z.string().email().optional(),
    enteredPhone: z.string().min(9, 'Phone number must be at least 9 characters'),
    enteredEmployeeCode: z.string().min(1, 'Employee code is required'),
});

// ============================================================
// LINK REQUEST VALIDATION
// ============================================================

export const reviewLinkRequestSchema = z.object({
    reviewNotes: z.string().optional(),
});

export const createUnlinkRequestSchema = z.object({
    reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

export const forceUnlinkSchema = z.object({
    targetUserId: z.string().uuid('Invalid user ID'),
    reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

// ============================================================
// SESSION VALIDATION
// ============================================================

export const revokeSessionSchema = z.object({
    sessionId: z.string().uuid('Invalid session ID'),
    reason: z.string().min(5, 'Reason must be at least 5 characters'),
});

// ============================================================
// QUERY VALIDATION
// ============================================================

export const listLinkRequestsQuerySchema = z.object({
    status: z.enum(['pending', 'approved', 'rejected', 'expired', 'cancelled']).optional(),
    requestType: z.enum(['link', 'unlink']).optional(),
    employeeId: z.string().uuid().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const listSessionsQuerySchema = z.object({
    userId: z.string().uuid().optional(),
    isActive: z.coerce.boolean().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const listAuditLogsQuerySchema = z.object({
    userId: z.string().uuid().optional(),
    employeeId: z.string().uuid().optional(),
    action: z
        .enum([
            'link_request_created',
            'link_request_approved',
            'link_request_rejected',
            'link_request_expired',
            'unlink_request_created',
            'unlink_request_approved',
            'unlink_request_rejected',
            'force_unlink_executed',
            'session_revoked',
            'auto_link_matched',
            'manual_relink',
        ])
        .optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(50),
});
