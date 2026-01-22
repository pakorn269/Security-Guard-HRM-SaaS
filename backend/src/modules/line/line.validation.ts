import { z } from 'zod';

// Template category enum
const templateCategoryEnum = z.enum([
    'shift_reminder',
    'shift_change',
    'leave_approved',
    'leave_rejected',
    'attendance_late',
    'attendance_missing',
    'announcement',
    'custom',
]);

// Message status enum
const messageStatusEnum = z.enum(['sent', 'failed', 'delivered', 'read']);

// Message context enum
const messageContextEnum = z.enum([
    'bulk_message',
    'shift_reminder',
    'shift_change',
    'leave_notification',
    'attendance_alert',
    'announcement',
    'manual',
]);

// ============================================================
// TEMPLATE SCHEMAS
// ============================================================

export const createTemplateSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(100),
        nameTh: z.string().max(100).optional(),
        category: templateCategoryEnum,
        message: z.string().min(1).max(5000),
        messageTh: z.string().max(5000).optional(),
        variables: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
    }),
});

export const updateTemplateSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
    body: z.object({
        name: z.string().min(1).max(100).optional(),
        nameTh: z.string().max(100).nullable().optional(),
        category: templateCategoryEnum.optional(),
        message: z.string().min(1).max(5000).optional(),
        messageTh: z.string().max(5000).nullable().optional(),
        variables: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
    }),
});

export const listTemplatesSchema = z.object({
    query: z.object({
        category: templateCategoryEnum.optional(),
        isActive: z
            .string()
            .transform((v) => v === 'true')
            .optional(),
        search: z.string().optional(),
    }),
});

export const templateIdSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
});

// ============================================================
// NOTIFICATION PREFERENCES SCHEMAS
// ============================================================

export const updatePreferencesSchema = z.object({
    body: z.object({
        shiftPublished: z.boolean().optional(),
        shiftChanged: z.boolean().optional(),
        shiftReminder: z.boolean().optional(),
        leaveApproved: z.boolean().optional(),
        leaveRejected: z.boolean().optional(),
        attendanceLate: z.boolean().optional(),
        attendanceMissing: z.boolean().optional(),
        announcements: z.boolean().optional(),
        shiftReminderHoursBefore: z.number().int().min(1).max(168).optional(), // 1-168 hours (1 week)
        quietHoursEnabled: z.boolean().optional(),
        quietHoursStart: z
            .string()
            .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .optional(), // HH:MM format
        quietHoursEnd: z
            .string()
            .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .optional(),
    }),
});

export const userPreferencesSchema = z.object({
    params: z.object({
        userId: z.string().uuid(),
    }),
});

export const employeePreferencesSchema = z.object({
    params: z.object({
        employeeId: z.string().uuid(),
    }),
});

// ============================================================
// MESSAGE HISTORY SCHEMAS
// ============================================================

export const listHistorySchema = z.object({
    query: z.object({
        page: z
            .string()
            .transform((v) => parseInt(v, 10))
            .optional(),
        pageSize: z
            .string()
            .transform((v) => parseInt(v, 10))
            .optional(),
        recipientUserId: z.string().uuid().optional(),
        recipientEmployeeId: z.string().uuid().optional(),
        status: messageStatusEnum.optional(),
        context: messageContextEnum.optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
    }),
});

export const historyIdSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
});

export const employeeHistorySchema = z.object({
    params: z.object({
        employeeId: z.string().uuid(),
    }),
    query: z.object({
        page: z
            .string()
            .transform((v) => parseInt(v, 10))
            .optional(),
        pageSize: z
            .string()
            .transform((v) => parseInt(v, 10))
            .optional(),
    }),
});

export const messageStatsSchema = z.object({
    query: z.object({
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
    }),
});

// ============================================================
// SEND WITH TEMPLATE SCHEMAS
// ============================================================

export const sendTemplatedMessageSchema = z.object({
    params: z.object({
        employeeId: z.string().uuid(),
    }),
    body: z.object({
        templateId: z.string().uuid(),
        variables: z.record(z.string()).optional(),
        customMessage: z.string().max(5000).optional(),
        customMessageTh: z.string().max(5000).optional(),
    }),
});

export const sendBulkTemplatedMessageSchema = z.object({
    body: z.object({
        employeeIds: z.array(z.string().uuid()).min(1).max(100),
        templateId: z.string().uuid().optional(),
        variables: z.record(z.string()).optional(),
        message: z.string().min(1).max(5000).optional(),
        messageTh: z.string().max(5000).optional(),
    }).refine(
        (data) => data.templateId || data.message,
        { message: 'Either templateId or message is required' }
    ),
});

// Export types
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type ListTemplatesInput = z.infer<typeof listTemplatesSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type ListHistoryInput = z.infer<typeof listHistorySchema>;
export type SendTemplatedMessageInput = z.infer<typeof sendTemplatedMessageSchema>;
export type SendBulkTemplatedMessageInput = z.infer<typeof sendBulkTemplatedMessageSchema>;
