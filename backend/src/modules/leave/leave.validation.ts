import { z } from 'zod';

// Date format validation (YYYY-MM-DD)
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// Leave request status enum
const leaveRequestStatusEnum = z.enum(['pending', 'approved', 'rejected', 'cancelled']);

// ============================================================================
// LEAVE TYPE SCHEMAS
// ============================================================================

export const createLeaveTypeSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    nameTh: z.string().max(100).optional(),
    description: z.string().max(500).optional(),
    isPaid: z.boolean().default(true),
    maxDaysPerYear: z.number().int().min(0).max(365).optional(),
    requiresApproval: z.boolean().default(true),
    requiresDocument: z.boolean().default(false),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().min(0).default(0),
});

export const updateLeaveTypeSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    nameTh: z.string().max(100).optional().nullable(),
    description: z.string().max(500).optional().nullable(),
    isPaid: z.boolean().optional(),
    maxDaysPerYear: z.number().int().min(0).max(365).optional().nullable(),
    requiresApproval: z.boolean().optional(),
    requiresDocument: z.boolean().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
});

// ============================================================================
// LEAVE REQUEST SCHEMAS
// ============================================================================

export const createLeaveRequestSchema = z.object({
    leaveTypeId: z.string().uuid('Invalid leave type ID'),
    startDate: z
        .string()
        .regex(dateRegex, 'Invalid date format (YYYY-MM-DD)'),
    endDate: z
        .string()
        .regex(dateRegex, 'Invalid date format (YYYY-MM-DD)'),
    reason: z.string().max(1000).optional(),
    documentUrl: z.string().url().optional(),
}).refine(
    (data) => new Date(data.startDate) <= new Date(data.endDate),
    {
        message: 'End date must be on or after start date',
        path: ['endDate'],
    }
);

export const approveLeaveRequestSchema = z.object({
    reviewNotes: z.string().max(500).optional(),
});

export const rejectLeaveRequestSchema = z.object({
    reviewNotes: z.string().min(1, 'Rejection reason is required').max(500),
});

export const cancelLeaveRequestSchema = z.object({
    reason: z.string().max(500).optional(),
});

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const listLeaveTypesQuerySchema = z.object({
    includeInactive: z.coerce.boolean().default(false),
});

export const listLeaveRequestsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
    employeeId: z.string().uuid('Invalid employee ID').optional(),
    status: leaveRequestStatusEnum.optional(),
    startDate: z
        .string()
        .regex(dateRegex, 'Invalid date format (YYYY-MM-DD)')
        .optional(),
    endDate: z
        .string()
        .regex(dateRegex, 'Invalid date format (YYYY-MM-DD)')
        .optional(),
});

export const myLeaveQuerySchema = z.object({
    year: z.coerce.number().int().min(2020).max(2100).optional(),
});

export const leaveCalendarQuerySchema = z.object({
    startDate: z.string().regex(dateRegex, 'Invalid date format (YYYY-MM-DD)'),
    endDate: z.string().regex(dateRegex, 'Invalid date format (YYYY-MM-DD)'),
});

export const listLeaveBalancesQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
    year: z.coerce.number().int().min(2020).max(2100).optional(),
    employeeId: z.string().uuid().optional(),
    leaveTypeId: z.string().uuid().optional(),
});

// ============================================================================
// LEAVE BALANCE SCHEMAS
// ============================================================================

export const updateLeaveBalanceSchema = z.object({
    entitledDays: z.number().min(0).max(365),
});

export const initializeBalancesSchema = z.object({
    year: z.number().int().min(2020).max(2100),
    employeeIds: z.array(z.string().uuid()).optional(),
});

// ============================================================================
// TYPE INFERENCE HELPERS
// ============================================================================

export type CreateLeaveTypeInput = z.infer<typeof createLeaveTypeSchema>;
export type UpdateLeaveTypeInput = z.infer<typeof updateLeaveTypeSchema>;
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type ApproveLeaveRequestInput = z.infer<typeof approveLeaveRequestSchema>;
export type RejectLeaveRequestInput = z.infer<typeof rejectLeaveRequestSchema>;
export type CancelLeaveRequestInput = z.infer<typeof cancelLeaveRequestSchema>;
export type ListLeaveTypesQueryInput = z.infer<typeof listLeaveTypesQuerySchema>;
export type ListLeaveRequestsQueryInput = z.infer<typeof listLeaveRequestsQuerySchema>;
export type MyLeaveQueryInput = z.infer<typeof myLeaveQuerySchema>;
export type LeaveCalendarQueryInput = z.infer<typeof leaveCalendarQuerySchema>;
export type ListLeaveBalancesQueryInput = z.infer<typeof listLeaveBalancesQuerySchema>;
export type UpdateLeaveBalanceInput = z.infer<typeof updateLeaveBalanceSchema>;
export type InitializeBalancesInput = z.infer<typeof initializeBalancesSchema>;
