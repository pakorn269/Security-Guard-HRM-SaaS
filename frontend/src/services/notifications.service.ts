
import api from './api';
import type { NotificationResponse } from '../types/notifications';

export const notificationService = {
    getNotifications: async (page = 1, limit = 20) => {
        const response = await api.get<{ success: boolean; data: NotificationResponse }>('/notifications', {
            params: { page, limit }
        });
        return response.data.data;
    },

    markAsRead: async (id: string) => {
        const response = await api.put<{ success: boolean; message: string }>(`/notifications/${id}/read`);
        return response.data;
    },

    markAllAsRead: async () => {
        const response = await api.put<{ success: boolean; message: string }>('/notifications/read-all');
        return response.data;
    }
};
