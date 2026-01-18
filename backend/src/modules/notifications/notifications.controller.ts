
import { Request, Response } from 'express';
import { NotificationService } from './notifications.service.js';
import { z } from 'zod';

export class NotificationController {
    /**
     * Get user notifications
     */
    static async getNotifications(req: Request, res: Response) {
        try {
            const userId = (req as any).user.userId;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;

            const result = await NotificationService.getUserNotifications(userId, page, limit);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Error fetching notifications:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch notifications'
            });
        }
    }

    /**
     * Mark notification as read
     */
    static async markAsRead(req: Request, res: Response) {
        try {
            const userId = (req as any).user.userId;
            const { id } = req.params;

            await NotificationService.markAsRead(id as string, userId);

            res.json({
                success: true,
                message: 'Notification marked as read'
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update notification'
            });
        }
    }

    /**
     * Mark all notifications as read
     */
    static async markAllAsRead(req: Request, res: Response) {
        try {
            const userId = (req as any).user.userId;

            await NotificationService.markAllAsRead(userId);

            res.json({
                success: true,
                message: 'All notifications marked as read'
            });
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update notifications'
            });
        }
    }

    /**
     * Trigger shift reminders (System endpoint)
     */
    static async triggerReminders(req: Request, res: Response) {
        try {
            // Optional: verify secret key header for security if needed, 
            // for now, relying on protected route or just open for this demo/MVP
            const lookaheadHours = parseInt(req.body.hours as string) || 2;

            const { shiftService } = await import('../shift/shift.service.js');
            const result = await shiftService.sendUpcomingShiftReminders(lookaheadHours);

            res.json({
                success: true,
                message: 'Shift reminders processed',
                data: result
            });
        } catch (error) {
            console.error('Error triggering reminders:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process reminders'
            });
        }
    }
}
