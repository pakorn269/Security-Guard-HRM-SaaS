import { supabaseAdmin } from '../../config/supabase.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';
import type {
    LineMessageTemplate,
    LineMessageTemplateRow,
    CreateLineTemplateRequest,
    UpdateLineTemplateRequest,
    ListTemplatesQuery,
    LineNotificationPreferences,
    LineNotificationPreferencesRow,
    UpdateNotificationPreferencesRequest,
    LineMessageHistory,
    LineMessageHistoryRow,
    CreateMessageHistoryRequest,
    ListMessageHistoryQuery,
} from './line.types.js';

class LineService {
    // ============================================================
    // TEMPLATE MAPPING
    // ============================================================

    private mapToTemplate(row: LineMessageTemplateRow): LineMessageTemplate {
        return {
            id: row.id,
            companyId: row.company_id,
            name: row.name,
            nameTh: row.name_th,
            category: row.category,
            message: row.message,
            messageTh: row.message_th,
            variables: row.variables || [],
            isActive: row.is_active,
            isSystem: row.is_system,
            createdBy: row.created_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    // ============================================================
    // TEMPLATE CRUD OPERATIONS
    // ============================================================

    async getTemplateById(templateId: string, companyId: string): Promise<LineMessageTemplate> {
        const { data, error } = await supabaseAdmin
            .from('line_message_templates')
            .select('*')
            .eq('id', templateId)
            .eq('company_id', companyId)
            .single();

        if (error || !data) {
            throw new NotFoundError('Template', 'ไม่พบเทมเพลตข้อความ');
        }

        return this.mapToTemplate(data as LineMessageTemplateRow);
    }

    async listTemplates(
        companyId: string,
        query: ListTemplatesQuery
    ): Promise<LineMessageTemplate[]> {
        let queryBuilder = supabaseAdmin
            .from('line_message_templates')
            .select('*')
            .eq('company_id', companyId);

        if (query.category) {
            queryBuilder = queryBuilder.eq('category', query.category);
        }

        if (query.isActive !== undefined) {
            queryBuilder = queryBuilder.eq('is_active', query.isActive);
        }

        if (query.search) {
            queryBuilder = queryBuilder.or(
                `name.ilike.%${query.search}%,name_th.ilike.%${query.search}%`
            );
        }

        const { data, error } = await queryBuilder.order('category').order('name');

        if (error) {
            logger.error('Failed to list templates', error);
            throw error;
        }

        return (data || []).map((row) => this.mapToTemplate(row as LineMessageTemplateRow));
    }

    async createTemplate(
        companyId: string,
        userId: string,
        data: CreateLineTemplateRequest
    ): Promise<LineMessageTemplate> {
        const { data: template, error } = await supabaseAdmin
            .from('line_message_templates')
            .insert({
                company_id: companyId,
                name: data.name,
                name_th: data.nameTh || null,
                category: data.category,
                message: data.message,
                message_th: data.messageTh || null,
                variables: data.variables || [],
                is_active: data.isActive !== false,
                is_system: false,
                created_by: userId,
            })
            .select()
            .single();

        if (error || !template) {
            logger.error('Failed to create template', error);
            throw new Error('Failed to create template');
        }

        logger.info('LINE template created', {
            templateId: template.id,
            name: data.name,
            companyId,
        });

        return this.mapToTemplate(template as LineMessageTemplateRow);
    }

    async updateTemplate(
        templateId: string,
        companyId: string,
        data: UpdateLineTemplateRequest
    ): Promise<LineMessageTemplate> {
        // Check if it's a system template
        const existing = await this.getTemplateById(templateId, companyId);
        if (existing.isSystem) {
            throw new ValidationError('Cannot modify system templates', [
                { field: 'template', message: 'System templates cannot be modified', message_th: 'ไม่สามารถแก้ไขเทมเพลตระบบได้' },
            ]);
        }

        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.nameTh !== undefined) updateData.name_th = data.nameTh;
        if (data.category !== undefined) updateData.category = data.category;
        if (data.message !== undefined) updateData.message = data.message;
        if (data.messageTh !== undefined) updateData.message_th = data.messageTh;
        if (data.variables !== undefined) updateData.variables = data.variables;
        if (data.isActive !== undefined) updateData.is_active = data.isActive;

        const { data: template, error } = await supabaseAdmin
            .from('line_message_templates')
            .update(updateData)
            .eq('id', templateId)
            .eq('company_id', companyId)
            .select()
            .single();

        if (error || !template) {
            logger.error('Failed to update template', error);
            throw new Error('Failed to update template');
        }

        logger.info('LINE template updated', { templateId });

        return this.mapToTemplate(template as LineMessageTemplateRow);
    }

    async deleteTemplate(templateId: string, companyId: string): Promise<void> {
        // Check if it's a system template
        const existing = await this.getTemplateById(templateId, companyId);
        if (existing.isSystem) {
            throw new ValidationError('Cannot delete system templates', [
                { field: 'template', message: 'System templates cannot be deleted', message_th: 'ไม่สามารถลบเทมเพลตระบบได้' },
            ]);
        }

        const { error } = await supabaseAdmin
            .from('line_message_templates')
            .delete()
            .eq('id', templateId)
            .eq('company_id', companyId);

        if (error) {
            logger.error('Failed to delete template', error);
            throw new Error('Failed to delete template');
        }

        logger.info('LINE template deleted', { templateId });
    }

    // Initialize default templates for a company
    async initializeDefaultTemplates(companyId: string): Promise<void> {
        // Call the database function to create default templates
        const { error } = await supabaseAdmin.rpc('create_default_line_templates', {
            p_company_id: companyId,
        });

        if (error) {
            logger.error('Failed to initialize default templates', error);
            throw error;
        }

        logger.info('Default LINE templates initialized', { companyId });
    }

    // Render template with variables
    renderTemplate(
        template: LineMessageTemplate,
        variables: Record<string, string>,
        useThai: boolean = false
    ): string {
        let message = useThai && template.messageTh ? template.messageTh : template.message;

        for (const [key, value] of Object.entries(variables)) {
            message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }

        return message;
    }

    // ============================================================
    // NOTIFICATION PREFERENCES MAPPING
    // ============================================================

    private mapToPreferences(row: LineNotificationPreferencesRow): LineNotificationPreferences {
        return {
            id: row.id,
            userId: row.user_id,
            companyId: row.company_id,
            shiftPublished: row.shift_published,
            shiftChanged: row.shift_changed,
            shiftReminder: row.shift_reminder,
            leaveApproved: row.leave_approved,
            leaveRejected: row.leave_rejected,
            attendanceLate: row.attendance_late,
            attendanceMissing: row.attendance_missing,
            announcements: row.announcements,
            shiftReminderHoursBefore: row.shift_reminder_hours_before,
            quietHoursEnabled: row.quiet_hours_enabled,
            quietHoursStart: row.quiet_hours_start,
            quietHoursEnd: row.quiet_hours_end,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    // ============================================================
    // NOTIFICATION PREFERENCES OPERATIONS
    // ============================================================

    async getPreferences(userId: string): Promise<LineNotificationPreferences | null> {
        const { data, error } = await supabaseAdmin
            .from('line_notification_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Not found
            }
            logger.error('Failed to get notification preferences', error);
            throw error;
        }

        return this.mapToPreferences(data as LineNotificationPreferencesRow);
    }

    async getOrCreatePreferences(
        userId: string,
        companyId: string
    ): Promise<LineNotificationPreferences> {
        const existing = await this.getPreferences(userId);
        if (existing) return existing;

        // Create default preferences
        const { data, error } = await supabaseAdmin
            .from('line_notification_preferences')
            .insert({
                user_id: userId,
                company_id: companyId,
            })
            .select()
            .single();

        if (error || !data) {
            logger.error('Failed to create notification preferences', error);
            throw new Error('Failed to create notification preferences');
        }

        logger.info('LINE notification preferences created', { userId });

        return this.mapToPreferences(data as LineNotificationPreferencesRow);
    }

    async updatePreferences(
        userId: string,
        companyId: string,
        data: UpdateNotificationPreferencesRequest
    ): Promise<LineNotificationPreferences> {
        // Ensure preferences exist
        await this.getOrCreatePreferences(userId, companyId);

        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (data.shiftPublished !== undefined) updateData.shift_published = data.shiftPublished;
        if (data.shiftChanged !== undefined) updateData.shift_changed = data.shiftChanged;
        if (data.shiftReminder !== undefined) updateData.shift_reminder = data.shiftReminder;
        if (data.leaveApproved !== undefined) updateData.leave_approved = data.leaveApproved;
        if (data.leaveRejected !== undefined) updateData.leave_rejected = data.leaveRejected;
        if (data.attendanceLate !== undefined) updateData.attendance_late = data.attendanceLate;
        if (data.attendanceMissing !== undefined) updateData.attendance_missing = data.attendanceMissing;
        if (data.announcements !== undefined) updateData.announcements = data.announcements;
        if (data.shiftReminderHoursBefore !== undefined)
            updateData.shift_reminder_hours_before = data.shiftReminderHoursBefore;
        if (data.quietHoursEnabled !== undefined) updateData.quiet_hours_enabled = data.quietHoursEnabled;
        if (data.quietHoursStart !== undefined) updateData.quiet_hours_start = data.quietHoursStart;
        if (data.quietHoursEnd !== undefined) updateData.quiet_hours_end = data.quietHoursEnd;

        const { data: prefs, error } = await supabaseAdmin
            .from('line_notification_preferences')
            .update(updateData)
            .eq('user_id', userId)
            .select()
            .single();

        if (error || !prefs) {
            logger.error('Failed to update notification preferences', error);
            throw new Error('Failed to update notification preferences');
        }

        logger.info('LINE notification preferences updated', { userId });

        return this.mapToPreferences(prefs as LineNotificationPreferencesRow);
    }

    // Check if user should receive a notification type
    async shouldNotify(
        userId: string,
        notificationType: keyof Omit<
            LineNotificationPreferences,
            | 'id'
            | 'userId'
            | 'companyId'
            | 'shiftReminderHoursBefore'
            | 'quietHoursEnabled'
            | 'quietHoursStart'
            | 'quietHoursEnd'
            | 'createdAt'
            | 'updatedAt'
        >
    ): Promise<boolean> {
        const prefs = await this.getPreferences(userId);
        if (!prefs) return true; // Default to true if no preferences set

        // Check if notification type is enabled
        if (!prefs[notificationType]) return false;

        // Check quiet hours
        if (prefs.quietHoursEnabled) {
            const now = new Date();
            const currentTime =
                now.getHours().toString().padStart(2, '0') +
                ':' +
                now.getMinutes().toString().padStart(2, '0');

            const start = prefs.quietHoursStart;
            const end = prefs.quietHoursEnd;

            // Handle overnight quiet hours (e.g., 22:00 - 07:00)
            if (start > end) {
                if (currentTime >= start || currentTime <= end) return false;
            } else {
                if (currentTime >= start && currentTime <= end) return false;
            }
        }

        return true;
    }

    // ============================================================
    // MESSAGE HISTORY MAPPING
    // ============================================================

    private mapToHistory(row: LineMessageHistoryRow): LineMessageHistory {
        return {
            id: row.id,
            companyId: row.company_id,
            recipientUserId: row.recipient_user_id,
            recipientEmployeeId: row.recipient_employee_id,
            recipientLineUserId: row.recipient_line_user_id,
            recipientName: row.recipient_name,
            message: row.message,
            messageTh: row.message_th,
            templateId: row.template_id,
            templateName: row.template_name,
            sentBy: row.sent_by,
            sentByName: row.sent_by_name,
            status: row.status,
            lineMessageId: row.line_message_id,
            errorMessage: row.error_message,
            context: row.context,
            contextData: row.context_data || {},
            createdAt: row.created_at,
        };
    }

    // ============================================================
    // MESSAGE HISTORY OPERATIONS
    // ============================================================

    async logMessage(
        companyId: string,
        data: CreateMessageHistoryRequest
    ): Promise<LineMessageHistory> {
        const { data: history, error } = await supabaseAdmin
            .from('line_message_history')
            .insert({
                company_id: companyId,
                recipient_user_id: data.recipientUserId || null,
                recipient_employee_id: data.recipientEmployeeId || null,
                recipient_line_user_id: data.recipientLineUserId || null,
                recipient_name: data.recipientName || null,
                message: data.message,
                message_th: data.messageTh || null,
                template_id: data.templateId || null,
                template_name: data.templateName || null,
                sent_by: data.sentBy || null,
                sent_by_name: data.sentByName || null,
                status: data.status,
                line_message_id: data.lineMessageId || null,
                error_message: data.errorMessage || null,
                context: data.context || null,
                context_data: data.contextData || {},
            })
            .select()
            .single();

        if (error || !history) {
            logger.error('Failed to log message', error);
            throw new Error('Failed to log message');
        }

        return this.mapToHistory(history as LineMessageHistoryRow);
    }

    async getHistoryById(historyId: string, companyId: string): Promise<LineMessageHistory> {
        const { data, error } = await supabaseAdmin
            .from('line_message_history')
            .select('*')
            .eq('id', historyId)
            .eq('company_id', companyId)
            .single();

        if (error || !data) {
            throw new NotFoundError('Message history', 'ไม่พบประวัติข้อความ');
        }

        return this.mapToHistory(data as LineMessageHistoryRow);
    }

    async listHistory(
        companyId: string,
        query: ListMessageHistoryQuery
    ): Promise<{ history: LineMessageHistory[]; total: number }> {
        const page = query.page || 1;
        const pageSize = query.pageSize || 20;

        let queryBuilder = supabaseAdmin
            .from('line_message_history')
            .select('*', { count: 'exact' })
            .eq('company_id', companyId);

        if (query.recipientUserId) {
            queryBuilder = queryBuilder.eq('recipient_user_id', query.recipientUserId);
        }

        if (query.recipientEmployeeId) {
            queryBuilder = queryBuilder.eq('recipient_employee_id', query.recipientEmployeeId);
        }

        if (query.status) {
            queryBuilder = queryBuilder.eq('status', query.status);
        }

        if (query.context) {
            queryBuilder = queryBuilder.eq('context', query.context);
        }

        if (query.startDate) {
            queryBuilder = queryBuilder.gte('created_at', query.startDate);
        }

        if (query.endDate) {
            queryBuilder = queryBuilder.lte('created_at', query.endDate);
        }

        const { data, error, count } = await queryBuilder
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);

        if (error) {
            logger.error('Failed to list message history', error);
            throw error;
        }

        return {
            history: (data || []).map((row) => this.mapToHistory(row as LineMessageHistoryRow)),
            total: count || 0,
        };
    }

    // Get message statistics for a company
    async getMessageStats(
        companyId: string,
        startDate?: string,
        endDate?: string
    ): Promise<{
        totalSent: number;
        totalFailed: number;
        byContext: Record<string, number>;
        byStatus: Record<string, number>;
    }> {
        let queryBuilder = supabaseAdmin
            .from('line_message_history')
            .select('status, context')
            .eq('company_id', companyId);

        if (startDate) {
            queryBuilder = queryBuilder.gte('created_at', startDate);
        }

        if (endDate) {
            queryBuilder = queryBuilder.lte('created_at', endDate);
        }

        const { data, error } = await queryBuilder;

        if (error) {
            logger.error('Failed to get message stats', error);
            throw error;
        }

        const stats = {
            totalSent: 0,
            totalFailed: 0,
            byContext: {} as Record<string, number>,
            byStatus: {} as Record<string, number>,
        };

        for (const row of data || []) {
            // Count by status
            const status = row.status || 'unknown';
            stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

            if (status === 'sent' || status === 'delivered' || status === 'read') {
                stats.totalSent++;
            } else if (status === 'failed') {
                stats.totalFailed++;
            }

            // Count by context
            const context = row.context || 'unknown';
            stats.byContext[context] = (stats.byContext[context] || 0) + 1;
        }

        return stats;
    }

    // Update message status (e.g., when we get delivery confirmation)
    async updateMessageStatus(
        historyId: string,
        companyId: string,
        status: 'delivered' | 'read' | 'failed',
        errorMessage?: string
    ): Promise<void> {
        const updateData: Record<string, unknown> = { status };
        if (errorMessage) {
            updateData.error_message = errorMessage;
        }

        const { error } = await supabaseAdmin
            .from('line_message_history')
            .update(updateData)
            .eq('id', historyId)
            .eq('company_id', companyId);

        if (error) {
            logger.error('Failed to update message status', error);
            throw error;
        }
    }
}

export const lineService = new LineService();
export default lineService;
