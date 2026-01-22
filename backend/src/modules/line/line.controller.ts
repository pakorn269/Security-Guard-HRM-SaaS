import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { lineService } from './line.service.js';
import { employeeService } from '../employee/employee.service.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/response.js';
import { ValidationError, ForbiddenError } from '../../utils/errors.js';
import { messagingApiClient, isLineConfigured } from '../../config/line.js';
import logger from '../../utils/logger.js';
import {
    createTemplateSchema,
    updateTemplateSchema,
    listTemplatesSchema,
    templateIdSchema,
    updatePreferencesSchema,
    userPreferencesSchema,
    employeePreferencesSchema,
    listHistorySchema,
    historyIdSchema,
    employeeHistorySchema,
    messageStatsSchema,
    sendTemplatedMessageSchema,
    sendBulkTemplatedMessageSchema,
} from './line.validation.js';

// Helper to convert Zod error to ValidationError
const formatZodError = (error: ZodError): ValidationError => {
    return new ValidationError(
        'Validation failed',
        error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
        }))
    );
};

class LineController {
    // ============================================================
    // TEMPLATE ENDPOINTS
    // ============================================================

    // GET /api/v1/line/templates - List templates
    async listTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            const validation = listTemplatesSchema.safeParse({ query: req.query });
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const templates = await lineService.listTemplates(
                req.user.companyId,
                validation.data.query
            );
            sendSuccess(res, templates);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/line/templates/:id - Get template by ID
    async getTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            const validation = templateIdSchema.safeParse({ params: req.params });
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const template = await lineService.getTemplateById(
                validation.data.params.id,
                req.user.companyId
            );
            sendSuccess(res, template);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/line/templates - Create template
    async createTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins can create templates
            if (!['super_admin', 'company_admin'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins can create message templates',
                    'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถสร้างเทมเพลตข้อความ'
                );
            }

            const validation = createTemplateSchema.safeParse({ body: req.body });
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const template = await lineService.createTemplate(
                req.user.companyId,
                req.user.userId,
                validation.data.body
            );
            sendCreated(res, template);
        } catch (error) {
            next(error);
        }
    }

    // PUT /api/v1/line/templates/:id - Update template
    async updateTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins can update templates
            if (!['super_admin', 'company_admin'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins can update message templates',
                    'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถแก้ไขเทมเพลตข้อความ'
                );
            }

            const validation = updateTemplateSchema.safeParse({
                params: req.params,
                body: req.body,
            });
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const template = await lineService.updateTemplate(
                validation.data.params.id,
                req.user.companyId,
                validation.data.body
            );
            sendSuccess(res, template);
        } catch (error) {
            next(error);
        }
    }

    // DELETE /api/v1/line/templates/:id - Delete template
    async deleteTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins can delete templates
            if (!['super_admin', 'company_admin'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins can delete message templates',
                    'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถลบเทมเพลตข้อความ'
                );
            }

            const validation = templateIdSchema.safeParse({ params: req.params });
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            await lineService.deleteTemplate(validation.data.params.id, req.user.companyId);
            sendNoContent(res);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/line/templates/initialize - Initialize default templates for company
    async initializeTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins can initialize templates
            if (!['super_admin', 'company_admin'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins can initialize message templates',
                    'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเริ่มต้นเทมเพลตข้อความ'
                );
            }

            await lineService.initializeDefaultTemplates(req.user.companyId);
            sendSuccess(res, { message: 'Default templates initialized successfully' });
        } catch (error) {
            next(error);
        }
    }

    // ============================================================
    // NOTIFICATION PREFERENCES ENDPOINTS
    // ============================================================

    // GET /api/v1/line/preferences - Get current user's preferences
    async getMyPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId || !req.user?.userId) {
                throw new ForbiddenError('No company or user associated');
            }

            const prefs = await lineService.getOrCreatePreferences(
                req.user.userId,
                req.user.companyId
            );
            sendSuccess(res, prefs);
        } catch (error) {
            next(error);
        }
    }

    // PUT /api/v1/line/preferences - Update current user's preferences
    async updateMyPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId || !req.user?.userId) {
                throw new ForbiddenError('No company or user associated');
            }

            const validation = updatePreferencesSchema.safeParse({ body: req.body });
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const prefs = await lineService.updatePreferences(
                req.user.userId,
                req.user.companyId,
                validation.data.body
            );
            sendSuccess(res, prefs);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/line/preferences/user/:userId - Get user's preferences (admin only)
    async getUserPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins can view other users' preferences
            if (!['super_admin', 'company_admin', 'manager'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins and managers can view other users preferences',
                    'เฉพาะผู้ดูแลระบบและผู้จัดการเท่านั้นที่สามารถดูการตั้งค่าของผู้ใช้อื่น'
                );
            }

            const validation = userPreferencesSchema.safeParse({ params: req.params });
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const prefs = await lineService.getOrCreatePreferences(
                validation.data.params.userId,
                req.user.companyId
            );
            sendSuccess(res, prefs);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/line/preferences/employee/:employeeId - Get employee's preferences
    async getEmployeePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins and managers can view employee preferences
            if (!['super_admin', 'company_admin', 'manager'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins and managers can view employee preferences',
                    'เฉพาะผู้ดูแลระบบและผู้จัดการเท่านั้นที่สามารถดูการตั้งค่าของพนักงาน'
                );
            }

            const validation = employeePreferencesSchema.safeParse({ params: req.params });
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            // Get employee to find user ID
            const employee = await employeeService.getByIdWithUser(
                validation.data.params.employeeId,
                req.user.companyId
            );

            if (!employee.user) {
                throw new ValidationError(
                    'Employee does not have a user account',
                    [{ field: 'employee', message: 'Employee does not have a user account', message_th: 'พนักงานไม่มีบัญชีผู้ใช้' }]
                );
            }

            const prefs = await lineService.getOrCreatePreferences(
                employee.user.id,
                req.user.companyId
            );
            sendSuccess(res, prefs);
        } catch (error) {
            next(error);
        }
    }

    // PUT /api/v1/line/preferences/employee/:employeeId - Update employee's preferences (admin)
    async updateEmployeePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins can update employee preferences
            if (!['super_admin', 'company_admin'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins can update employee preferences',
                    'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถแก้ไขการตั้งค่าของพนักงาน'
                );
            }

            const paramsValidation = employeePreferencesSchema.safeParse({ params: req.params });
            if (!paramsValidation.success) {
                throw formatZodError(paramsValidation.error);
            }

            const bodyValidation = updatePreferencesSchema.safeParse({ body: req.body });
            if (!bodyValidation.success) {
                throw formatZodError(bodyValidation.error);
            }

            // Get employee to find user ID
            const employee = await employeeService.getByIdWithUser(
                paramsValidation.data.params.employeeId,
                req.user.companyId
            );

            if (!employee.user) {
                throw new ValidationError(
                    'Employee does not have a user account',
                    [{ field: 'employee', message: 'Employee does not have a user account', message_th: 'พนักงานไม่มีบัญชีผู้ใช้' }]
                );
            }

            const prefs = await lineService.updatePreferences(
                employee.user.id,
                req.user.companyId,
                bodyValidation.data.body
            );
            sendSuccess(res, prefs);
        } catch (error) {
            next(error);
        }
    }

    // ============================================================
    // MESSAGE HISTORY ENDPOINTS
    // ============================================================

    // GET /api/v1/line/history - List message history
    async listHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins and managers can view message history
            if (!['super_admin', 'company_admin', 'manager'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins and managers can view message history',
                    'เฉพาะผู้ดูแลระบบและผู้จัดการเท่านั้นที่สามารถดูประวัติข้อความ'
                );
            }

            const validation = listHistorySchema.safeParse({ query: req.query });
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const { history, total } = await lineService.listHistory(
                req.user.companyId,
                validation.data.query
            );
            sendPaginated(
                res,
                history,
                validation.data.query.page || 1,
                validation.data.query.pageSize || 20,
                total
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/line/history/:id - Get history by ID
    async getHistoryById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            const validation = historyIdSchema.safeParse({ params: req.params });
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const history = await lineService.getHistoryById(
                validation.data.params.id,
                req.user.companyId
            );
            sendSuccess(res, history);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/line/history/employee/:employeeId - Get history for employee
    async getEmployeeHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins and managers can view employee message history
            if (!['super_admin', 'company_admin', 'manager'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins and managers can view employee message history',
                    'เฉพาะผู้ดูแลระบบและผู้จัดการเท่านั้นที่สามารถดูประวัติข้อความของพนักงาน'
                );
            }

            const validation = employeeHistorySchema.safeParse({
                params: req.params,
                query: req.query,
            });
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const { history, total } = await lineService.listHistory(req.user.companyId, {
                recipientEmployeeId: validation.data.params.employeeId,
                page: validation.data.query.page,
                pageSize: validation.data.query.pageSize,
            });

            sendPaginated(
                res,
                history,
                validation.data.query.page || 1,
                validation.data.query.pageSize || 20,
                total
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/line/stats - Get message statistics
    async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins can view stats
            if (!['super_admin', 'company_admin'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins can view message statistics',
                    'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถดูสถิติข้อความ'
                );
            }

            const validation = messageStatsSchema.safeParse({ query: req.query });
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const stats = await lineService.getMessageStats(
                req.user.companyId,
                validation.data.query.startDate,
                validation.data.query.endDate
            );
            sendSuccess(res, stats);
        } catch (error) {
            next(error);
        }
    }

    // ============================================================
    // SEND WITH TEMPLATE ENDPOINTS
    // ============================================================

    // POST /api/v1/line/send/:employeeId - Send message to employee with template
    async sendWithTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins and managers can send messages
            if (!['super_admin', 'company_admin', 'manager'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins and managers can send LINE messages',
                    'เฉพาะผู้ดูแลระบบและผู้จัดการเท่านั้นที่สามารถส่งข้อความ LINE'
                );
            }

            if (!isLineConfigured()) {
                sendSuccess(res, { success: false, error: 'LINE is not configured' });
                return;
            }

            const validation = sendTemplatedMessageSchema.safeParse({
                params: req.params,
                body: req.body,
            });
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const { employeeId } = validation.data.params;
            const { templateId, variables, customMessage, customMessageTh } = validation.data.body;

            // Get employee
            const employee = await employeeService.getByIdWithUser(employeeId, req.user.companyId);

            if (!employee.user?.lineUserId) {
                sendSuccess(res, {
                    success: false,
                    error: 'Employee has not linked their LINE account',
                });
                return;
            }

            // Get template and render message
            const template = await lineService.getTemplateById(templateId, req.user.companyId);
            const message =
                customMessage || lineService.renderTemplate(template, variables || {}, false);
            const messageTh =
                customMessageTh || lineService.renderTemplate(template, variables || {}, true);

            // Get sender info
            const { userService } = await import('../user/user.service.js');
            const sender = await userService.getById(req.user.userId, req.user.companyId);

            try {
                // Send message
                await messagingApiClient.pushMessage({
                    to: employee.user.lineUserId,
                    messages: [{ type: 'text', text: message }],
                });

                // Log to history
                await lineService.logMessage(req.user.companyId, {
                    recipientUserId: employee.user.id,
                    recipientEmployeeId: employee.id,
                    recipientLineUserId: employee.user.lineUserId,
                    recipientName: employee.fullName,
                    message,
                    messageTh,
                    templateId: template.id,
                    templateName: template.name,
                    sentBy: req.user.userId,
                    sentByName: sender?.email || 'Unknown',
                    status: 'sent',
                    context: 'manual',
                });

                logger.info('LINE message sent with template', {
                    employeeId,
                    templateId,
                    senderUserId: req.user.userId,
                });

                sendSuccess(res, { success: true, message: 'Message sent successfully' });
            } catch (error) {
                // Log failed attempt
                await lineService.logMessage(req.user.companyId, {
                    recipientUserId: employee.user.id,
                    recipientEmployeeId: employee.id,
                    recipientLineUserId: employee.user.lineUserId,
                    recipientName: employee.fullName,
                    message,
                    messageTh,
                    templateId: template.id,
                    templateName: template.name,
                    sentBy: req.user.userId,
                    sentByName: sender?.email || 'Unknown',
                    status: 'failed',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    context: 'manual',
                });

                logger.error('Failed to send LINE message', { employeeId, error });
                sendSuccess(res, {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to send message',
                });
            }
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/line/send/bulk - Send bulk message with optional template
    async sendBulkWithTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins and managers can send bulk messages
            if (!['super_admin', 'company_admin', 'manager'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins and managers can send bulk LINE messages',
                    'เฉพาะผู้ดูแลระบบและผู้จัดการเท่านั้นที่สามารถส่งข้อความ LINE แบบกลุ่ม'
                );
            }

            if (!isLineConfigured()) {
                sendSuccess(res, {
                    success: false,
                    successCount: 0,
                    failureCount: req.body.employeeIds?.length || 0,
                    error: 'LINE is not configured',
                });
                return;
            }

            const validation = sendBulkTemplatedMessageSchema.safeParse({ body: req.body });
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const { employeeIds, templateId, variables, message, messageTh } = validation.data.body;

            // Get sender info
            const { userService } = await import('../user/user.service.js');
            const sender = await userService.getById(req.user.userId, req.user.companyId);

            // Determine message content
            let finalMessage = message;
            let finalMessageTh = messageTh;
            let template = null;

            if (templateId) {
                template = await lineService.getTemplateById(templateId, req.user.companyId);
                if (!finalMessage) {
                    finalMessage = lineService.renderTemplate(template, variables || {}, false);
                }
                if (!finalMessageTh) {
                    finalMessageTh = lineService.renderTemplate(template, variables || {}, true);
                }
            }

            const results: Array<{
                employeeId: string;
                employeeName: string;
                success: boolean;
                error?: string;
            }> = [];
            let successCount = 0;
            let failureCount = 0;

            // Process each employee
            for (const employeeId of employeeIds) {
                try {
                    const employee = await employeeService.getByIdWithUser(
                        employeeId,
                        req.user.companyId
                    );

                    if (!employee.user?.lineUserId) {
                        results.push({
                            employeeId,
                            employeeName: employee.fullName,
                            success: false,
                            error: 'LINE not linked',
                        });
                        failureCount++;

                        // Log failed attempt
                        await lineService.logMessage(req.user.companyId, {
                            recipientEmployeeId: employee.id,
                            recipientName: employee.fullName,
                            message: finalMessage || '',
                            messageTh: finalMessageTh,
                            templateId: template?.id,
                            templateName: template?.name,
                            sentBy: req.user.userId,
                            sentByName: sender?.email || 'Unknown',
                            status: 'failed',
                            errorMessage: 'LINE not linked',
                            context: 'bulk_message',
                        });
                        continue;
                    }

                    // Send message
                    await messagingApiClient.pushMessage({
                        to: employee.user.lineUserId,
                        messages: [{ type: 'text', text: finalMessage || '' }],
                    });

                    // Log success
                    await lineService.logMessage(req.user.companyId, {
                        recipientUserId: employee.user.id,
                        recipientEmployeeId: employee.id,
                        recipientLineUserId: employee.user.lineUserId,
                        recipientName: employee.fullName,
                        message: finalMessage || '',
                        messageTh: finalMessageTh,
                        templateId: template?.id,
                        templateName: template?.name,
                        sentBy: req.user.userId,
                        sentByName: sender?.email || 'Unknown',
                        status: 'sent',
                        context: 'bulk_message',
                    });

                    results.push({
                        employeeId,
                        employeeName: employee.fullName,
                        success: true,
                    });
                    successCount++;
                } catch (error) {
                    const emp = await employeeService.getById(employeeId, req.user.companyId).catch(
                        () => null
                    );
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

                    results.push({
                        employeeId,
                        employeeName: emp?.fullName || 'Unknown',
                        success: false,
                        error: errorMsg,
                    });
                    failureCount++;

                    // Log failed attempt
                    await lineService.logMessage(req.user.companyId, {
                        recipientEmployeeId: employeeId,
                        recipientName: emp?.fullName,
                        message: finalMessage || '',
                        messageTh: finalMessageTh,
                        templateId: template?.id,
                        templateName: template?.name,
                        sentBy: req.user.userId,
                        sentByName: sender?.email || 'Unknown',
                        status: 'failed',
                        errorMessage: errorMsg,
                        context: 'bulk_message',
                    });
                }
            }

            logger.info('Bulk LINE message sent', {
                companyId: req.user.companyId,
                total: employeeIds.length,
                successCount,
                failureCount,
                templateId: template?.id,
            });

            sendSuccess(res, { results, successCount, failureCount });
        } catch (error) {
            next(error);
        }
    }
}

export const lineController = new LineController();
export default lineController;
