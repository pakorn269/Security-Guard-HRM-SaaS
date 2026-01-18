
export type NotificationType =
    | 'shift_published'
    | 'shift_changed'
    | 'shift_reminder'
    | 'leave_submitted'
    | 'leave_approved'
    | 'leave_rejected'
    | 'cert_expiring'
    | 'attendance_late'
    | 'attendance_no_show'
    | 'system';

export type NotificationChannel = 'line' | 'in_app' | 'email';

export interface NotificationRow {
    id: string;
    company_id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    title_th?: string | null;
    message: string;
    message_th?: string | null;
    data: Record<string, any>;
    is_read: boolean;
    sent_via: NotificationChannel[];
    line_message_id?: string | null;
    sent_at?: string | null;
    read_at?: string | null;
    created_at: string;
}

export interface Notification {
    id: string;
    companyId: string;
    userId: string;
    type: NotificationType;
    title: string;
    titleTh?: string | null;
    message: string;
    messageTh?: string | null;
    data: Record<string, any>;
    isRead: boolean;
    sentVia: NotificationChannel[];
    lineMessageId?: string | null;
    sentAt?: string | null;
    readAt?: string | null;
    createdAt: string;
}

export interface CreateNotificationParams {
    companyId: string;
    userId: string; // The recipient
    type: NotificationType;
    title: string;
    titleTh?: string;
    message: string;
    messageTh?: string;
    data?: Record<string, any>;
    channels?: NotificationChannel[];
}
