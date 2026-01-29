// LINE module types

// ============================================================
// TEMPLATE TYPES
// ============================================================

export type LineTemplateCategory =
    | 'shift_reminder'
    | 'shift_change'
    | 'leave_approved'
    | 'leave_rejected'
    | 'attendance_late'
    | 'attendance_missing'
    | 'attendance_no_show'
    | 'announcement'
    | 'custom';

// Database row type
export interface LineMessageTemplateRow {
    id: string;
    company_id: string;
    name: string;
    name_th: string | null;
    category: LineTemplateCategory;
    message: string;
    message_th: string | null;
    variables: string[]; // JSONB array of variable names
    is_active: boolean;
    is_system: boolean;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

// API response type
export interface LineMessageTemplate {
    id: string;
    companyId: string;
    name: string;
    nameTh: string | null;
    category: LineTemplateCategory;
    message: string;
    messageTh: string | null;
    variables: string[];
    isActive: boolean;
    isSystem: boolean;
    createdBy: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateLineTemplateRequest {
    name: string;
    nameTh?: string;
    category: LineTemplateCategory;
    message: string;
    messageTh?: string;
    variables?: string[];
    isActive?: boolean;
}

export interface UpdateLineTemplateRequest {
    name?: string;
    nameTh?: string | null;
    category?: LineTemplateCategory;
    message?: string;
    messageTh?: string | null;
    variables?: string[];
    isActive?: boolean;
}

export interface ListTemplatesQuery {
    category?: LineTemplateCategory;
    isActive?: boolean;
    search?: string;
}

// ============================================================
// NOTIFICATION PREFERENCES TYPES
// ============================================================

// Database row type
export interface LineNotificationPreferencesRow {
    id: string;
    user_id: string;
    company_id: string;
    shift_published: boolean;
    shift_changed: boolean;
    shift_reminder: boolean;
    leave_approved: boolean;
    leave_rejected: boolean;
    attendance_late: boolean;
    attendance_missing: boolean;
    announcements: boolean;
    shift_reminder_hours_before: number;
    quiet_hours_enabled: boolean;
    quiet_hours_start: string;
    quiet_hours_end: string;
    created_at: string;
    updated_at: string;
}

// API response type
export interface LineNotificationPreferences {
    id: string;
    userId: string;
    companyId: string;
    shiftPublished: boolean;
    shiftChanged: boolean;
    shiftReminder: boolean;
    leaveApproved: boolean;
    leaveRejected: boolean;
    attendanceLate: boolean;
    attendanceMissing: boolean;
    announcements: boolean;
    shiftReminderHoursBefore: number;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateNotificationPreferencesRequest {
    shiftPublished?: boolean;
    shiftChanged?: boolean;
    shiftReminder?: boolean;
    leaveApproved?: boolean;
    leaveRejected?: boolean;
    attendanceLate?: boolean;
    attendanceMissing?: boolean;
    announcements?: boolean;
    shiftReminderHoursBefore?: number;
    quietHoursEnabled?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
}

// ============================================================
// MESSAGE HISTORY TYPES
// ============================================================

export type LineMessageStatus = 'sent' | 'failed' | 'delivered' | 'read';
export type LineMessageContext =
    | 'bulk_message'
    | 'shift_reminder'
    | 'shift_change'
    | 'leave_notification'
    | 'attendance_alert'
    | 'announcement'
    | 'manual';

// Database row type
export interface LineMessageHistoryRow {
    id: string;
    company_id: string;
    recipient_user_id: string | null;
    recipient_employee_id: string | null;
    recipient_line_user_id: string | null;
    recipient_name: string | null;
    message: string;
    message_th: string | null;
    template_id: string | null;
    template_name: string | null;
    sent_by: string | null;
    sent_by_name: string | null;
    status: LineMessageStatus;
    line_message_id: string | null;
    error_message: string | null;
    context: LineMessageContext | null;
    context_data: Record<string, unknown>;
    created_at: string;
}

// API response type
export interface LineMessageHistory {
    id: string;
    companyId: string;
    recipientUserId: string | null;
    recipientEmployeeId: string | null;
    recipientLineUserId: string | null;
    recipientName: string | null;
    message: string;
    messageTh: string | null;
    templateId: string | null;
    templateName: string | null;
    sentBy: string | null;
    sentByName: string | null;
    status: LineMessageStatus;
    lineMessageId: string | null;
    errorMessage: string | null;
    context: LineMessageContext | null;
    contextData: Record<string, unknown>;
    createdAt: string;
}

export interface CreateMessageHistoryRequest {
    recipientUserId?: string;
    recipientEmployeeId?: string;
    recipientLineUserId?: string;
    recipientName?: string;
    message: string;
    messageTh?: string;
    templateId?: string;
    templateName?: string;
    sentBy?: string;
    sentByName?: string;
    status: LineMessageStatus;
    lineMessageId?: string;
    errorMessage?: string;
    context?: LineMessageContext;
    contextData?: Record<string, unknown>;
}

export interface ListMessageHistoryQuery {
    page?: number;
    pageSize?: number;
    recipientUserId?: string;
    recipientEmployeeId?: string;
    status?: LineMessageStatus;
    context?: LineMessageContext;
    startDate?: string;
    endDate?: string;
}

// ============================================================
// SEND MESSAGE WITH TEMPLATE TYPES
// ============================================================

export interface SendTemplatedMessageRequest {
    templateId: string;
    variables?: Record<string, string>;
    customMessage?: string;
    customMessageTh?: string;
}

export interface BulkTemplatedMessageRequest {
    employeeIds: string[];
    templateId?: string;
    variables?: Record<string, string>;
    message?: string;
    messageTh?: string;
}
