import { z } from 'zod';

// Time format validation (HH:mm)
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Date format validation (YYYY-MM-DD)
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// ============================================================================
// SHIFT TEMPLATE VALIDATION SCHEMAS
// ============================================================================

export const createShiftTemplateSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    nameTh: z.string().max(100).optional(),
    startTime: z.string().regex(timeRegex, 'Invalid time format (HH:mm)'),
    endTime: z.string().regex(timeRegex, 'Invalid time format (HH:mm)'),
    breakMinutes: z.number().int().min(0).max(480).default(0),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').default('#3B82F6'),
    isOvernight: z.boolean().default(false),
});

export const updateShiftTemplateSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    nameTh: z.string().max(100).nullable().optional(),
    startTime: z.string().regex(timeRegex, 'Invalid time format (HH:mm)').optional(),
    endTime: z.string().regex(timeRegex, 'Invalid time format (HH:mm)').optional(),
    breakMinutes: z.number().int().min(0).max(480).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
    isOvernight: z.boolean().optional(),
    isActive: z.boolean().optional(),
});

// ============================================================================
// SHIFT VALIDATION SCHEMAS
// ============================================================================

export const createShiftSchema = z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    templateId: z.string().uuid('Invalid template ID').optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    siteId: z.string().uuid('Invalid site ID').optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    zoneId: z.string().uuid('Invalid zone ID').optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    date: z.string().regex(dateRegex, 'Invalid date format (YYYY-MM-DD)'),
    startTime: z.string().regex(timeRegex, 'Invalid time format (HH:mm)'),
    endTime: z.string().regex(timeRegex, 'Invalid time format (HH:mm)'),
    location: z.string().max(255).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    notes: z.string().max(1000).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
});

export const bulkCreateShiftsSchema = z.object({
    shifts: z.array(createShiftSchema).min(1, 'At least one shift is required').max(100, 'Maximum 100 shifts per request'),
});

export const updateShiftSchema = z.object({
    employeeId: z.string().uuid('Invalid employee ID').optional(),
    templateId: z.string().uuid('Invalid template ID').nullable().optional().or(z.literal('')).transform(val => val === '' ? null : val),
    siteId: z.string().uuid('Invalid site ID').nullable().optional().or(z.literal('')).transform(val => val === '' ? null : val),
    zoneId: z.string().uuid('Invalid zone ID').nullable().optional().or(z.literal('')).transform(val => val === '' ? null : val),
    date: z.string().regex(dateRegex, 'Invalid date format (YYYY-MM-DD)').optional(),
    startTime: z.string().regex(timeRegex, 'Invalid time format (HH:mm)').optional(),
    endTime: z.string().regex(timeRegex, 'Invalid time format (HH:mm)').optional(),
    location: z.string().max(255).nullable().optional().or(z.literal('')).transform(val => val === '' ? null : val),
    notes: z.string().max(1000).nullable().optional().or(z.literal('')).transform(val => val === '' ? null : val),
    status: z.enum(['draft', 'published', 'cancelled']).optional(),
});

export const publishShiftsSchema = z.object({
    shiftIds: z.array(z.string().uuid()).optional(),
    startDate: z.string().regex(dateRegex, 'Invalid date format (YYYY-MM-DD)').optional(),
    endDate: z.string().regex(dateRegex, 'Invalid date format (YYYY-MM-DD)').optional(),
}).refine(
    (data) => data.shiftIds?.length || (data.startDate && data.endDate),
    { message: 'Either shiftIds or both startDate and endDate are required' }
);

export const copyShiftsSchema = z.object({
    sourceStartDate: z.string().regex(dateRegex, 'Invalid date format (YYYY-MM-DD)'),
    targetStartDate: z.string().regex(dateRegex, 'Invalid date format (YYYY-MM-DD)'),
    employeeIds: z.array(z.string().uuid()).optional(),
});

// Query schemas
export const listShiftsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
    startDate: z.string().regex(dateRegex, 'Invalid date format (YYYY-MM-DD)').optional(),
    endDate: z.string().regex(dateRegex, 'Invalid date format (YYYY-MM-DD)').optional(),
    employeeId: z.string().uuid('Invalid employee ID').optional(),
    status: z.enum(['draft', 'published', 'cancelled']).optional(),
});

export const calendarQuerySchema = z.object({
    startDate: z.string().regex(dateRegex, 'Invalid date format (YYYY-MM-DD)'),
    endDate: z.string().regex(dateRegex, 'Invalid date format (YYYY-MM-DD)'),
    employeeId: z.string().uuid('Invalid employee ID').optional(),
});

export const myShiftsQuerySchema = z.object({
    days: z.coerce.number().int().min(1).max(30).default(7),
});

export const listShiftTemplatesQuerySchema = z.object({
    includeInactive: z.coerce.boolean().default(false),
});

// Type inference helpers
export type CreateShiftTemplateInput = z.infer<typeof createShiftTemplateSchema>;
export type UpdateShiftTemplateInput = z.infer<typeof updateShiftTemplateSchema>;
export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type BulkCreateShiftsInput = z.infer<typeof bulkCreateShiftsSchema>;
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
export type PublishShiftsInput = z.infer<typeof publishShiftsSchema>;
export type CopyShiftsInput = z.infer<typeof copyShiftsSchema>;
export type ListShiftsQueryInput = z.infer<typeof listShiftsQuerySchema>;
export type CalendarQueryInput = z.infer<typeof calendarQuerySchema>;
export type MyShiftsQueryInput = z.infer<typeof myShiftsQuerySchema>;
