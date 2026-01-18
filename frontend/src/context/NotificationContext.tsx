
import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/notifications.service';
import type { Notification } from '../types/notifications';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    total: number;
    loading: boolean;
    page: number;
    hasMore: boolean;
    fetchNotifications: (page?: number) => Promise<void>;
    loadMore: () => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
        if (!isAuthenticated) return;

        try {
            if (!append) setLoading(true); // Don't show full loading on background refresh or load more

            const data = await notificationService.getNotifications(pageNum, 10);

            if (append) {
                setNotifications(prev => {
                    const existingIds = new Set(prev.map(n => n.id));
                    const newNotifications = data.notifications.filter(n => !existingIds.has(n.id));
                    return [...prev, ...newNotifications];
                });
            } else {
                setNotifications(data.notifications);
            }

            setUnreadCount(data.unread);
            setTotal(data.total);
            setPage(pageNum);
            setHasMore(data.notifications.length === 10);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const loadMore = async () => {
        if (!loading && hasMore) {
            await fetchNotifications(page + 1, true);
        }
    };

    const refresh = async () => {
        await fetchNotifications(1, false);
    };

    const markAsRead = async (id: string) => {
        try {
            // Optimistic update
            const target = notifications.find(n => n.id === id);
            if (target && !target.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }

            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, isRead: true } : n
            ));

            await notificationService.markAsRead(id);
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            // Optimistic update
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);

            await notificationService.markAllAsRead();
        } catch (error) {
            console.error('Failed to mark all as read', error);
        }
    };

    // Initial load and polling
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isAuthenticated) {
            refresh();

            interval = setInterval(() => {
                // Only refresh if we are on the first page to avoid resetting scroll position/list
                if (page === 1) {
                    refresh();
                }
            }, 60000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isAuthenticated]); // Removed page dependency to avoid resetting interval on page change, but checked page inside

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            total,
            loading,
            page,
            hasMore,
            fetchNotifications,
            loadMore,
            markAsRead,
            markAllAsRead,
            refresh
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
