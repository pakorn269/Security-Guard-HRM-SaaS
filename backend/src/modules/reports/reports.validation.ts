/**
 * Reports Validation
 * Zod schemas for validating report request parameters
 */

import { z } from 'zod';

export const attendanceSummaryQuerySchema = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
    employeeId: z.string().uuid().optional(),
    status: z.enum(['on_time', 'late', 'early_departure', 'absent']).optional(),
});

export const leaveUsageQuerySchema = z.object({
    year: z.coerce.number().int().min(2020).max(2100),
    leaveTypeId: z.string().uuid().optional(),
    employeeId: z.string().uuid().optional(),
});

export const attendanceTrendQuerySchema = z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
});

export type AttendanceSummaryQueryInput = z.infer<typeof attendanceSummaryQuerySchema>;
export type LeaveUsageQueryInput = z.infer<typeof leaveUsageQuerySchema>;
export type AttendanceTrendQueryInput = z.infer<typeof attendanceTrendQuerySchema>;
