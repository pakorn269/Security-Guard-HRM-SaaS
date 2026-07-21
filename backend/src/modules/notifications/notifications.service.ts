
import { supabaseAdmin as supabase } from '../../config/supabase.js';
import { messagingApiClient } from '../../config/line.js';
import { CreateNotificationParams, Notification, NotificationRow, NotificationType } from './notifications.types.js';

export class NotificationService {
    /**
     * Create and send a notification
     */
    static async createNotification(params: CreateNotificationParams): Promise<Notification> {
        const { companyId, userId, type, title, titleTh, message, messageTh, data, channels = ['in_app'] } = params;

        // 1. Create notification record in database
        const { data: notification, error } = await supabase
            .from('notifications')
            .insert({
                company_id: companyId,
                user_id: userId,
                type,
                title,
                title_th: titleTh,
                message,
                message_th: messageTh,
                data: data || {},
                sent_via: channels,
                is_read: false
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating notification:', error);
            throw new Error('Failed to create notification');
        }

        // 2. Send via LINE if requested
        if (channels.includes('line')) {
            await this.sendLineNotification(userId, title, message, data, type);
        }

        // 3. Send via Email if requested (future implementation)
        if (channels.includes('email')) {
            // TODO: Implement email sending
        }

        return this.mapTonotification(notification as NotificationRow);
    }

    /**
     * Send notification via LINE
     */
    private static async sendLineNotification(userId: string, title: string, message: string, data: any, type: NotificationType) {
        try {
            // Get user's LINE ID
            const { data: user, error } = await supabase
                .from('users')
                .select('line_user_id')
                .eq('id', userId)
                .single();

            if (error || !user || !user.line_user_id) {
                console.warn(`User ${userId} does not have a LINE ID linked. Skipping LINE notification.`);
                return;
            }

            // Select message template based on type
            let messagePayload: any = { type: 'text', text: `${title}\n\n${message}` };

            // Dynamic import to avoid circular dependency
            // Dynamic import to avoid circular dependency
            const { createShiftPublishedMessage, createShiftReminderMessage, createShiftOfferMessage } = await import('./line-templates.js');

            switch (type) {
                case 'shift_published':
                    if (data && data.startDate && data.endDate) {
                        messagePayload = createShiftPublishedMessage(
                            data.startDate,
                            data.endDate,
                            data.totalShifts || 0
                        );
                    }
                    break;
                case 'shift_reminder':
                    if (data && data.date && data.timeRange) {
                        messagePayload = createShiftReminderMessage(
                            data.date,
                            data.timeRange,
                            data.location || '-'
                        );
                    }
                    break;
                case 'shift_offer':
                    if (data && data.date && data.startTime && data.endTime) {
                        messagePayload = createShiftOfferMessage(
                            data.date,
                            `${data.startTime} - ${data.endTime}`,
                            data.shiftId || ''
                        );
                    }
                    break;
            }

            await messagingApiClient.pushMessage({
                to: user.line_user_id,
                messages: [messagePayload]
            });

        } catch (error) {
            console.error('Error sending LINE notification:', error);
            // We don't throw here to avoid failing the whole notification process if LINE fails
        }
    }

    /**
     * Get notifications for a user
     */
    static async getUserNotifications(userId: string, page = 1, limit = 20): Promise<{ notifications: Notification[], total: number, unread: number }> {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // Get total count
        const { count: totalCount, error: countError } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (countError) throw countError;

        // Get unread count
        const { count: unreadCount, error: unreadError } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (unreadError) throw unreadError;

        // Get data
        const { data: rows, error: dataError } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (dataError) throw dataError;

        return {
            notifications: (rows || []).map(this.mapTonotification),
            total: totalCount || 0,
            unread: unreadCount || 0
        };
    }

    /**
     * Mark notification as read
     */
    static async markAsRead(id: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
    }

    /**
     * Mark all notifications as read for a user
     */
    static async markAllAsRead(userId: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;
    }

    /**
     * Map database row to Notification object
     */
    private static mapTonotification(row: NotificationRow): Notification {
        return {
            id: row.id,
            companyId: row.company_id,
            userId: row.user_id,
            type: row.type,
            title: row.title,
            titleTh: row.title_th,
            message: row.message,
            messageTh: row.message_th,
            data: row.data,
            isRead: row.is_read,
            sentVia: row.sent_via,
            lineMessageId: row.line_message_id,
            sentAt: row.sent_at,
            readAt: row.read_at,
            createdAt: row.created_at
        };
    }
}
