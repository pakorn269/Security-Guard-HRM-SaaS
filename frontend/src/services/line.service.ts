import { apiGet, apiPost, apiPut, apiDelete } from './api';

// ============================================================
// TYPES
// ============================================================

export type LineTemplateCategory =
    | 'shift_reminder'
    | 'shift_change'
    | 'leave_approved'
    | 'leave_rejected'
    | 'attendance_late'
    | 'attendance_missing'
    | 'announcement'
    | 'custom';

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

export interface CreateTemplateRequest {
    name: string;
    nameTh?: string;
    category: LineTemplateCategory;
    message: string;
    messageTh?: string;
    variables?: string[];
    isActive?: boolean;
}

export interface UpdateTemplateRequest {
    name?: string;
    nameTh?: string | null;
    category?: LineTemplateCategory;
    message?: string;
    messageTh?: string | null;
    variables?: string[];
    isActive?: boolean;
}

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

export interface UpdatePreferencesRequest {
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

export type LineMessageStatus = 'sent' | 'failed' | 'delivered' | 'read';
export type LineMessageContext =
    | 'bulk_message'
    | 'shift_reminder'
    | 'shift_change'
    | 'leave_notification'
    | 'attendance_alert'
    | 'announcement'
    | 'manual';

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

export interface MessageHistoryResponse {
    data: LineMessageHistory[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

export interface MessageStats {
    totalSent: number;
    totalFailed: number;
    byContext: Record<string, number>;
    byStatus: Record<string, number>;
}

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

export interface BulkSendResult {
    results: Array<{
        employeeId: string;
        employeeName: string;
        success: boolean;
        error?: string;
    }>;
    successCount: number;
    failureCount: number;
}

// ============================================================
// SERVICE
// ============================================================

class LineService {
    // ============================================================
    // TEMPLATE METHODS
    // ============================================================

    async listTemplates(query?: {
        category?: LineTemplateCategory;
        isActive?: boolean;
        search?: string;
    }): Promise<LineMessageTemplate[]> {
        const response = await apiGet<LineMessageTemplate[]>('/line/templates', query);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'Failed to fetch templates');
    }

    async getTemplate(templateId: string): Promise<LineMessageTemplate> {
        const response = await apiGet<LineMessageTemplate>(`/line/templates/${templateId}`);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'Failed to fetch template');
    }

    async createTemplate(data: CreateTemplateRequest): Promise<LineMessageTemplate> {
        const response = await apiPost<LineMessageTemplate>('/line/templates', data);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'Failed to create template');
    }

    async updateTemplate(
        templateId: string,
        data: UpdateTemplateRequest
    ): Promise<LineMessageTemplate> {
        const response = await apiPut<LineMessageTemplate>(`/line/templates/${templateId}`, data);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'Failed to update template');
    }

    async deleteTemplate(templateId: string): Promise<void> {
        const response = await apiDelete<void>(`/line/templates/${templateId}`);
        if (!response.success) {
            throw new Error(response.error?.message || 'Failed to delete template');
        }
    }

    async initializeTemplates(): Promise<void> {
        const response = await apiPost<void>('/line/templates/initialize');
        if (!response.success) {
            throw new Error(response.error?.message || 'Failed to initialize templates');
        }
    }

    // ============================================================
    // NOTIFICATION PREFERENCES METHODS
    // ============================================================

    async getMyPreferences(): Promise<LineNotificationPreferences> {
        const response = await apiGet<LineNotificationPreferences>('/line/preferences');
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'Failed to fetch preferences');
    }

    async updateMyPreferences(
        data: UpdatePreferencesRequest
    ): Promise<LineNotificationPreferences> {
        const response = await apiPut<LineNotificationPreferences>('/line/preferences', data);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'Failed to update preferences');
    }

    async getEmployeePreferences(employeeId: string): Promise<LineNotificationPreferences> {
        const response = await apiGet<LineNotificationPreferences>(
            `/line/preferences/employee/${employeeId}`
        );
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'Failed to fetch employee preferences');
    }

    async updateEmployeePreferences(
        employeeId: string,
        data: UpdatePreferencesRequest
    ): Promise<LineNotificationPreferences> {
        const response = await apiPut<LineNotificationPreferences>(
            `/line/preferences/employee/${employeeId}`,
            data
        );
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'Failed to update employee preferences');
    }

    // ============================================================
    // MESSAGE HISTORY METHODS
    // ============================================================

    async listHistory(query?: {
        page?: number;
        pageSize?: number;
        recipientUserId?: string;
        recipientEmployeeId?: string;
        status?: LineMessageStatus;
        context?: LineMessageContext;
        startDate?: string;
        endDate?: string;
    }): Promise<MessageHistoryResponse> {
        const response = await apiGet<MessageHistoryResponse>('/line/history', query);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'Failed to fetch message history');
    }

    async getEmployeeHistory(
        employeeId: string,
        query?: { page?: number; pageSize?: number }
    ): Promise<MessageHistoryResponse> {
        const response = await apiGet<MessageHistoryResponse>(
            `/line/history/employee/${employeeId}`,
            query
        );
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'Failed to fetch employee message history');
    }

    async getStats(query?: { startDate?: string; endDate?: string }): Promise<MessageStats> {
        const response = await apiGet<MessageStats>('/line/stats', query);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'Failed to fetch message stats');
    }

    // ============================================================
    // SEND MESSAGE METHODS
    // ============================================================

    async sendWithTemplate(
        employeeId: string,
        data: SendTemplatedMessageRequest
    ): Promise<{ success: boolean; message?: string; error?: string }> {
        const response = await apiPost<{ success: boolean; message?: string; error?: string }>(
            `/line/send/${employeeId}`,
            data
        );
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'Failed to send message');
    }

    async sendBulkWithTemplate(data: BulkTemplatedMessageRequest): Promise<BulkSendResult> {
        const response = await apiPost<BulkSendResult>('/line/send/bulk', data);
        if (response.success && response.data) {
            return response.data;
        }
        throw new Error(response.error?.message || 'Failed to send bulk message');
    }
}

export const lineService = new LineService();
export default lineService;
