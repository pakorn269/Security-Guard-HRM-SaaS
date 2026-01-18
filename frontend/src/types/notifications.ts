
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

export interface Notification {
    id: string;
    companyId: string;
    userId: string;
    type: NotificationType;
    title: string;
    titleTh?: string;
    message: string;
    messageTh?: string;
    data: Record<string, any>;
    isRead: boolean;
    sentAt: string;
    createdAt: string;
}

export interface NotificationResponse {
    notifications: Notification[];
    total: number;
    unread: number;
}
