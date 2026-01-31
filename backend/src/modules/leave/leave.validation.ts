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

// ============================================================================
// REPLACEMENT GUARD WORKFLOW SCHEMAS
// ============================================================================

export const replacementAssignmentSchema = z.object({
    shiftId: z.string().uuid('Invalid shift ID'),
    replacementEmployeeId: z.string().uuid('Invalid employee ID'),
    reason: z.string().max(500).optional(),
});

export const approveLeaveWithReplacementsSchema = z.object({
    reviewNotes: z.string().max(1000).optional(),
    replacements: z.array(replacementAssignmentSchema).optional(),
});

export const assignReplacementsSchema = z.object({
    replacements: z.array(replacementAssignmentSchema).min(1, 'At least one replacement is required'),
});

// ============================================================================
// BALANCE ADJUSTMENT SCHEMAS
// ============================================================================

const adjustmentFieldNameEnum = z.enum(['entitled_days', 'used_days', 'pending_days']);
const adjustmentTypeEnum = z.enum(['pro_rated', 'correction', 'special_allowance', 'carry_forward', 'manual']);

export const adjustBalanceSchema = z.object({
    fieldName: adjustmentFieldNameEnum,
    newValue: z.number().min(0, 'Value cannot be negative').max(365, 'Value exceeds maximum'),
    reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000, 'Reason is too long'),
    adjustmentType: adjustmentTypeEnum.optional(),
});

export const listAdjustmentsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    year: z.coerce.number().int().min(2020).max(2100).optional(),
    employeeId: z.string().uuid().optional(),
    adjustmentType: adjustmentTypeEnum.optional(),
});

export const bulkAdjustSchema = z.object({
    adjustments: z.array(
        z.object({
            balanceId: z.string().uuid('Invalid balance ID'),
            fieldName: adjustmentFieldNameEnum,
            newValue: z.number().min(0).max(365),
            reason: z.string().min(10).max(1000),
            adjustmentType: adjustmentTypeEnum.optional(),
        })
    ).min(1, 'At least one adjustment is required').max(100, 'Maximum 100 adjustments per request'),
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
export type ReplacementAssignmentInput = z.infer<typeof replacementAssignmentSchema>;
export type ApproveLeaveWithReplacementsInput = z.infer<typeof approveLeaveWithReplacementsSchema>;
export type AssignReplacementsInput = z.infer<typeof assignReplacementsSchema>;
export type AdjustBalanceInput = z.infer<typeof adjustBalanceSchema>;
export type ListAdjustmentsQueryInput = z.infer<typeof listAdjustmentsQuerySchema>;
export type BulkAdjustInput = z.infer<typeof bulkAdjustSchema>;

// ============================================================================
// LEAVE REQUEST TEMPLATE SCHEMAS
// ============================================================================

export const createTemplateSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    nameTh: z.string().max(100, 'Thai name too long').optional(),
    description: z.string().max(1000, 'Description too long').optional(),
    leaveTypeId: z.string().uuid('Invalid leave type ID'),
    defaultDaysCount: z
        .number()
        .min(0.5, 'Days count must be at least 0.5')
        .max(365, 'Days count cannot exceed 365')
        .optional(),
    defaultReason: z.string().max(1000, 'Default reason too long').optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
});

export const updateTemplateSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
    nameTh: z.string().max(100, 'Thai name too long').optional(),
    description: z.string().max(1000, 'Description too long').optional(),
    leaveTypeId: z.string().uuid('Invalid leave type ID').optional(),
    defaultDaysCount: z
        .number()
        .min(0.5, 'Days count must be at least 0.5')
        .max(365, 'Days count cannot exceed 365')
        .optional()
        .nullable(),
    defaultReason: z.string().max(1000, 'Default reason too long').optional().nullable(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
});

export const applyTemplateSchema = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
});

export const listTemplatesQuerySchema = z.object({
    includeInactive: z.coerce.boolean().optional(),
});

// Type inference
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type ApplyTemplateInput = z.infer<typeof applyTemplateSchema>;
export type ListTemplatesQueryInput = z.infer<typeof listTemplatesQuerySchema>;
