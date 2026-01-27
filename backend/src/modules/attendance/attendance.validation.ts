import { z } from 'zod';

// Date format validation (YYYY-MM-DD)
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// ISO datetime format validation
const isoDatetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:\d{2}|Z)?$/;

// Attendance status enum
const attendanceStatusEnum = z.enum([
    'pending',
    'on_time',
    'late',
    'early_leave',
    'no_show',
    'completed',
]);

// ============================================================================
// CLOCK IN/OUT VALIDATION SCHEMAS
// ============================================================================

export const clockInSchema = z.object({
    shiftId: z.string().uuid('Invalid shift ID').optional(),
    latitude: z
        .number()
        .min(-90, 'Latitude must be between -90 and 90')
        .max(90, 'Latitude must be between -90 and 90'),
    longitude: z
        .number()
        .min(-180, 'Longitude must be between -180 and 180')
        .max(180, 'Longitude must be between -180 and 180'),
    accuracy: z.number().min(0, 'Accuracy must be positive'),
    siteId: z.string().uuid('Invalid site ID'),
    zoneQrCode: z.string().optional(),
});

export const clockOutSchema = z.object({
    latitude: z
        .number()
        .min(-90, 'Latitude must be between -90 and 90')
        .max(90, 'Latitude must be between -90 and 90'),
    longitude: z
        .number()
        .min(-180, 'Longitude must be between -180 and 180')
        .max(180, 'Longitude must be between -180 and 180'),
    accuracy: z.number().min(0, 'Accuracy must be positive'),
});

// ============================================================================
// ATTENDANCE MANAGEMENT SCHEMAS
// ============================================================================

export const adjustAttendanceSchema = z.object({
    clockInTime: z
        .string()
        .regex(isoDatetimeRegex, 'Invalid datetime format')
        .optional(),
    clockOutTime: z
        .string()
        .regex(isoDatetimeRegex, 'Invalid datetime format')
        .optional(),
    status: attendanceStatusEnum.optional(),
    notes: z.string().max(1000).optional(),
    adjustmentReason: z
        .string()
        .min(1, 'Adjustment reason is required')
        .max(500),
});

export const createAttendanceSchema = z.object({
    employeeId: z.string().uuid('Invalid employee ID'),
    shiftId: z.string().uuid('Invalid shift ID').optional(),
    clockInTime: z.string().regex(isoDatetimeRegex, 'Invalid datetime format'),
    clockInLatitude: z.number().min(-90).max(90).optional(),
    clockInLongitude: z.number().min(-180).max(180).optional(),
    clockOutTime: z
        .string()
        .regex(isoDatetimeRegex, 'Invalid datetime format')
        .optional(),
    clockOutLatitude: z.number().min(-90).max(90).optional(),
    clockOutLongitude: z.number().min(-180).max(180).optional(),
    status: attendanceStatusEnum.optional(),
    notes: z.string().max(1000).optional(),
});

// ============================================================================
// QUERY VALIDATION SCHEMAS
// ============================================================================

export const listAttendanceQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
    startDate: z
        .string()
        .regex(dateRegex, 'Invalid date format (YYYY-MM-DD)')
        .optional(),
    endDate: z
        .string()
        .regex(dateRegex, 'Invalid date format (YYYY-MM-DD)')
        .optional(),
    employeeId: z.string().uuid('Invalid employee ID').optional(),
    status: attendanceStatusEnum.optional(),
});

export const myAttendanceQuerySchema = z.object({
    days: z.coerce.number().int().min(1).max(90).default(14),
});

export const todayAttendanceQuerySchema = z.object({
    date: z
        .string()
        .regex(dateRegex, 'Invalid date format (YYYY-MM-DD)')
        .optional(),
});

export const attendanceReportQuerySchema = z.object({
    date: z.string().regex(dateRegex, 'Invalid date format (YYYY-MM-DD)'),
});

// ============================================================================
// TYPE INFERENCE HELPERS
// ============================================================================

export type ClockInInput = z.infer<typeof clockInSchema>;
export type ClockOutInput = z.infer<typeof clockOutSchema>;
export type AdjustAttendanceInput = z.infer<typeof adjustAttendanceSchema>;
export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;
export type ListAttendanceQueryInput = z.infer<typeof listAttendanceQuerySchema>;
export type MyAttendanceQueryInput = z.infer<typeof myAttendanceQuerySchema>;
export type TodayAttendanceQueryInput = z.infer<typeof todayAttendanceQuerySchema>;
export type AttendanceReportQueryInput = z.infer<typeof attendanceReportQuerySchema>;
