import { supabaseAdmin } from '../config/supabase.js';
import { messagingApiClient, isLineConfigured } from '../config/line.js';
import { lineService } from '../modules/line/line.service.js';
import logger from '../utils/logger.js';

// ============================================================
// TYPES
// ============================================================

interface ShiftQueryResult {
    id: string;
    company_id: string;
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    location: string | null;
    status: string;
    employees: {
        id: string;
        full_name: string;
        employee_code: string;
        user_id: string | null;
    };
}

interface UserWithLine {
    id: string;
    line_user_id: string | null;
}

interface LeaveRequestQueryResult {
    id: string;
    company_id: string;
    employee_id: string;
    start_date: string;
    end_date: string;
    total_days: number;
    status: 'approved' | 'rejected';
    review_notes: string | null;
    employees: {
        id: string;
        full_name: string;
        user_id: string | null;
    };
    leave_types: {
        name: string;
        name_th: string | null;
    };
}

interface EmployeeWithUsers {
    id: string;
    full_name: string;
    user_id: string | null;
    users: {
        id: string;
        line_user_id: string | null;
    };
}

// ============================================================
// SHIFT REMINDERS
// ============================================================

/**
 * Send shift reminders to employees with upcoming shifts.
 * Queries shifts starting within the specified hours and sends LINE notifications
 * to employees who have:
 * 1. A linked LINE account
 * 2. Shift reminder notifications enabled
 * 3. Not in quiet hours
 */
export async function sendShiftReminders(hoursAhead: number = 2): Promise<{
    sent: number;
    skipped: number;
    errors: number;
}> {
    if (!isLineConfigured()) {
        logger.warn('LINE is not configured, skipping shift reminders');
        return { sent: 0, skipped: 0, errors: 0 };
    }

    const now = new Date();
    const lookAheadTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    // Format times for comparison
    const currentDate = now.toISOString().split('T')[0];
    const lookAheadDate = lookAheadTime.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);
    const lookAheadTimeStr = lookAheadTime.toTimeString().slice(0, 5);

    logger.info('Starting shift reminder job', {
        currentDate,
        currentTime,
        lookAheadDate,
        lookAheadTimeStr,
        hoursAhead,
    });

    let sent = 0;
    let skipped = 0;
    let errors = 0;

    try {
        // Query all published shifts starting within the time window
        // We need to handle two cases:
        // 1. Same day: shifts starting between now and lookAhead
        // 2. Next day: if lookAhead crosses midnight
        let query = supabaseAdmin
            .from('shifts')
            .select(`
                id,
                company_id,
                employee_id,
                date,
                start_time,
                end_time,
                location,
                status,
                employees!inner (
                    id,
                    full_name,
                    employee_code,
                    user_id
                )
            `)
            .eq('status', 'published')
            .gte('date', currentDate)
            .lte('date', lookAheadDate);

        const { data: shifts, error: shiftsError } = await query;

        if (shiftsError) {
            logger.error('Failed to fetch shifts for reminders', shiftsError);
            throw shiftsError;
        }

        if (!shifts || shifts.length === 0) {
            logger.info('No shifts found in reminder window');
            return { sent: 0, skipped: 0, errors: 0 };
        }

        // Filter shifts that actually fall within our time window
        const upcomingShifts = (shifts as unknown as ShiftQueryResult[]).filter((shift) => {
            const shiftDateTime = new Date(`${shift.date}T${shift.start_time}`);
            return shiftDateTime > now && shiftDateTime <= lookAheadTime;
        });

        logger.info(`Found ${upcomingShifts.length} shifts to send reminders for`);

        // Get unique user IDs to fetch LINE info
        const userIds = [...new Set(upcomingShifts
            .map((s) => s.employees?.user_id)
            .filter((id): id is string => !!id)
        )];

        if (userIds.length === 0) {
            logger.info('No users with accounts found for reminders');
            return { sent: 0, skipped: upcomingShifts.length, errors: 0 };
        }

        // Fetch LINE user IDs
        const { data: users, error: usersError } = await supabaseAdmin
            .from('users')
            .select('id, line_user_id')
            .in('id', userIds);

        if (usersError) {
            logger.error('Failed to fetch users for reminders', usersError);
            throw usersError;
        }

        const userLineMap = new Map<string, string>();
        (users || []).forEach((u: UserWithLine) => {
            if (u.line_user_id) {
                userLineMap.set(u.id, u.line_user_id);
            }
        });

        // Get shift reminder template for each company
        const companyIds = [...new Set(upcomingShifts.map((s) => s.company_id))];
        const templateMap = new Map<string, { message: string; messageTh: string | null }>();

        for (const companyId of companyIds) {
            try {
                const templates = await lineService.listTemplates(companyId, {
                    category: 'shift_reminder',
                    isActive: true,
                });
                if (templates.length > 0) {
                    templateMap.set(companyId, {
                        message: templates[0].message,
                        messageTh: templates[0].messageTh,
                    });
                }
            } catch (err) {
                logger.warn(`Failed to get template for company ${companyId}`, err instanceof Error ? { error: err.message } : undefined);
            }
        }

        // Default template
        const defaultTemplate = {
            message: 'Reminder: Your shift starts at {{start_time}} on {{date}}. Location: {{location}}',
            messageTh: 'แจ้งเตือน: กะงานของคุณเริ่มเวลา {{start_time}} วันที่ {{date}} สถานที่: {{location}}',
        };

        // Send reminders
        for (const shift of upcomingShifts) {
            const userId = shift.employees?.user_id;
            if (!userId) {
                skipped++;
                continue;
            }

            const lineUserId = userLineMap.get(userId);
            if (!lineUserId) {
                skipped++;
                continue;
            }

            // Check user preferences
            try {
                const shouldSend = await lineService.shouldNotify(userId, 'shiftReminder');
                if (!shouldSend) {
                    skipped++;
                    continue;
                }
            } catch (err) {
                logger.warn(`Failed to check preferences for user ${userId}`, err instanceof Error ? { error: err.message } : undefined);
                // Continue sending if preference check fails
            }

            // Get template
            const template = templateMap.get(shift.company_id) || defaultTemplate;

            // Format message
            const variables = {
                employee_name: shift.employees.full_name,
                date: shift.date,
                start_time: shift.start_time.slice(0, 5),
                end_time: shift.end_time.slice(0, 5),
                location: shift.location || 'Not specified',
            };

            let message = template.messageTh || template.message;
            for (const [key, value] of Object.entries(variables)) {
                message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
            }

            try {
                await messagingApiClient.pushMessage({
                    to: lineUserId,
                    messages: [{ type: 'text', text: message }],
                });

                // Log success
                await lineService.logMessage(shift.company_id, {
                    recipientUserId: userId,
                    recipientEmployeeId: shift.employee_id,
                    recipientLineUserId: lineUserId,
                    recipientName: shift.employees.full_name,
                    message: message,
                    status: 'sent',
                    context: 'shift_reminder',
                    contextData: { shiftId: shift.id, shiftDate: shift.date },
                });

                sent++;
                logger.info('Shift reminder sent', {
                    employeeId: shift.employee_id,
                    shiftId: shift.id,
                });
            } catch (e) {
                errors++;
                const errorMsg = e instanceof Error ? e.message : 'Unknown error';

                // Log failure
                await lineService.logMessage(shift.company_id, {
                    recipientUserId: userId,
                    recipientEmployeeId: shift.employee_id,
                    recipientLineUserId: lineUserId,
                    recipientName: shift.employees.full_name,
                    message: message,
                    status: 'failed',
                    errorMessage: errorMsg,
                    context: 'shift_reminder',
                    contextData: { shiftId: shift.id, shiftDate: shift.date },
                });

                logger.error('Failed to send shift reminder', {
                    employeeId: shift.employee_id,
                    shiftId: shift.id,
                    error: errorMsg,
                });
            }
        }

        logger.info('Shift reminder job completed', { sent, skipped, errors });
        return { sent, skipped, errors };
    } catch (error) {
        logger.error('Shift reminder job failed', error);
        throw error;
    }
}

// ============================================================
// LEAVE NOTIFICATIONS
// ============================================================

/**
 * Send notification when a leave request is approved or rejected.
 * This function is typically called from the leave approval/rejection handler.
 */
export async function sendLeaveNotification(
    companyId: string,
    leaveRequestId: string,
    status: 'approved' | 'rejected',
    reviewerName?: string
): Promise<{ success: boolean; error?: string }> {
    if (!isLineConfigured()) {
        return { success: false, error: 'LINE is not configured' };
    }

    try {
        // Fetch leave request with employee info
        const { data: request, error: requestError } = await supabaseAdmin
            .from('leave_requests')
            .select(`
                id,
                company_id,
                employee_id,
                start_date,
                end_date,
                total_days,
                status,
                review_notes,
                employees!inner (
                    id,
                    full_name,
                    user_id
                ),
                leave_types!inner (
                    name,
                    name_th
                )
            `)
            .eq('id', leaveRequestId)
            .eq('company_id', companyId)
            .single();

        if (requestError || !request) {
            logger.error('Failed to fetch leave request for notification', requestError);
            return { success: false, error: 'Leave request not found' };
        }

        const leaveRequest = request as unknown as LeaveRequestQueryResult;
        const userId = leaveRequest.employees?.user_id;

        if (!userId) {
            return { success: false, error: 'Employee does not have a user account' };
        }

        // Get LINE user ID
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('line_user_id')
            .eq('id', userId)
            .single();

        if (userError || !user?.line_user_id) {
            return { success: false, error: 'Employee has not linked their LINE account' };
        }

        // Check user preferences
        const preferenceType = status === 'approved' ? 'leaveApproved' : 'leaveRejected';
        const shouldSend = await lineService.shouldNotify(userId, preferenceType);
        if (!shouldSend) {
            return { success: true }; // User opted out, but not an error
        }

        // Get template
        const templateCategory = status === 'approved' ? 'leave_approved' : 'leave_rejected';
        const templates = await lineService.listTemplates(companyId, {
            category: templateCategory,
            isActive: true,
        });

        // Default templates
        const defaultTemplates = {
            approved: {
                message: 'Your leave request has been approved! Leave type: {{leave_type}}, Dates: {{start_date}} to {{end_date}} ({{total_days}} days)',
                messageTh: 'คำขอลาของคุณได้รับการอนุมัติแล้ว! ประเภท: {{leave_type}}, วันที่: {{start_date}} ถึง {{end_date}} ({{total_days}} วัน)',
            },
            rejected: {
                message: 'Your leave request has been rejected. Leave type: {{leave_type}}, Dates: {{start_date}} to {{end_date}}. Reason: {{review_notes}}',
                messageTh: 'คำขอลาของคุณถูกปฏิเสธ ประเภท: {{leave_type}}, วันที่: {{start_date}} ถึง {{end_date}} เหตุผล: {{review_notes}}',
            },
        };

        const template = templates.length > 0
            ? { message: templates[0].message, messageTh: templates[0].messageTh }
            : defaultTemplates[status];

        // Format message
        const variables = {
            employee_name: leaveRequest.employees.full_name,
            leave_type: leaveRequest.leave_types.name_th || leaveRequest.leave_types.name,
            start_date: leaveRequest.start_date,
            end_date: leaveRequest.end_date,
            total_days: leaveRequest.total_days.toString(),
            review_notes: leaveRequest.review_notes || 'No reason provided',
            reviewer_name: reviewerName || 'Manager',
        };

        let message = template.messageTh || template.message;
        for (const [key, value] of Object.entries(variables)) {
            message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }

        // Send message
        await messagingApiClient.pushMessage({
            to: user.line_user_id,
            messages: [{ type: 'text', text: message }],
        });

        // Log success
        await lineService.logMessage(companyId, {
            recipientUserId: userId,
            recipientEmployeeId: leaveRequest.employee_id,
            recipientLineUserId: user.line_user_id,
            recipientName: leaveRequest.employees.full_name,
            message: message,
            status: 'sent',
            context: 'leave_notification',
            contextData: {
                leaveRequestId: leaveRequest.id,
                leaveStatus: status,
            },
        });

        logger.info('Leave notification sent', {
            leaveRequestId,
            status,
            employeeId: leaveRequest.employee_id,
        });

        return { success: true };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to send leave notification', {
            leaveRequestId,
            error: errorMsg,
        });
        return { success: false, error: errorMsg };
    }
}

// ============================================================
// SHIFT CHANGE NOTIFICATIONS
// ============================================================

/**
 * Send notification when an employee's shift is changed.
 */
export async function sendShiftChangeNotification(
    companyId: string,
    employeeId: string,
    shiftId: string,
    changeType: 'created' | 'updated' | 'cancelled',
    shiftDetails: {
        date: string;
        startTime: string;
        endTime: string;
        location?: string;
    }
): Promise<{ success: boolean; error?: string }> {
    if (!isLineConfigured()) {
        return { success: false, error: 'LINE is not configured' };
    }

    try {
        // Get employee and user info
        const { data: employee, error: empError } = await supabaseAdmin
            .from('employees')
            .select('id, full_name, user_id')
            .eq('id', employeeId)
            .eq('company_id', companyId)
            .single();

        if (empError || !employee || !employee.user_id) {
            return { success: false, error: 'Employee not found or no user account' };
        }

        // Get LINE user ID
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('line_user_id')
            .eq('id', employee.user_id)
            .single();

        if (userError || !user?.line_user_id) {
            return { success: false, error: 'Employee has not linked their LINE account' };
        }

        // Check user preferences
        const shouldSend = await lineService.shouldNotify(employee.user_id, 'shiftChanged');
        if (!shouldSend) {
            return { success: true };
        }

        // Get template
        const templates = await lineService.listTemplates(companyId, {
            category: 'shift_change',
            isActive: true,
        });

        const defaultTemplate = {
            message: 'Your shift has been {{change_type}}. Date: {{date}}, Time: {{start_time}} - {{end_time}}. Location: {{location}}',
            messageTh: 'กะงานของคุณได้ถูก{{change_type}} วันที่: {{date}}, เวลา: {{start_time}} - {{end_time}} สถานที่: {{location}}',
        };

        const template = templates.length > 0
            ? { message: templates[0].message, messageTh: templates[0].messageTh }
            : defaultTemplate;

        // Format change type for Thai
        const changeTypeText = {
            created: { en: 'created', th: 'สร้างใหม่' },
            updated: { en: 'updated', th: 'แก้ไข' },
            cancelled: { en: 'cancelled', th: 'ยกเลิก' },
        };

        const variables = {
            employee_name: employee.full_name,
            change_type: changeTypeText[changeType].th,
            date: shiftDetails.date,
            start_time: shiftDetails.startTime.slice(0, 5),
            end_time: shiftDetails.endTime.slice(0, 5),
            location: shiftDetails.location || 'Not specified',
        };

        let message = template.messageTh || template.message;
        for (const [key, value] of Object.entries(variables)) {
            message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }

        // Send message
        await messagingApiClient.pushMessage({
            to: user.line_user_id,
            messages: [{ type: 'text', text: message }],
        });

        // Log success
        await lineService.logMessage(companyId, {
            recipientUserId: employee.user_id,
            recipientEmployeeId: employeeId,
            recipientLineUserId: user.line_user_id,
            recipientName: employee.full_name,
            message: message,
            status: 'sent',
            context: 'shift_change',
            contextData: { shiftId, changeType },
        });

        logger.info('Shift change notification sent', {
            shiftId,
            changeType,
            employeeId,
        });

        return { success: true };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to send shift change notification', {
            shiftId,
            error: errorMsg,
        });
        return { success: false, error: errorMsg };
    }
}

// ============================================================
// ATTENDANCE ALERTS
// ============================================================

/**
 * Send notification for attendance issues (late, missing clock-in).
 */
export async function sendAttendanceAlert(
    companyId: string,
    employeeId: string,
    alertType: 'late' | 'missing' | 'no_show',
    details: {
        date?: string;
        expectedTime?: string;
        actualTime?: string;
        minutesLate?: number;
        employeeName?: string;
        employeeCode?: string;
        shiftDate?: string;
        shiftTime?: string;
        location?: string;
    }
): Promise<{ success: boolean; error?: string }> {
    if (!isLineConfigured()) {
        return { success: false, error: 'LINE is not configured' };
    }

    try {
        // Get employee and user info
        const { data: employee, error: empError } = await supabaseAdmin
            .from('employees')
            .select('id, full_name, user_id')
            .eq('id', employeeId)
            .eq('company_id', companyId)
            .single();

        if (empError || !employee || !employee.user_id) {
            return { success: false, error: 'Employee not found or no user account' };
        }

        // Get LINE user ID
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('line_user_id')
            .eq('id', employee.user_id)
            .single();

        if (userError || !user?.line_user_id) {
            return { success: false, error: 'Employee has not linked their LINE account' };
        }

        // Check user preferences
        const preferenceType =
            alertType === 'late' ? 'attendanceLate' :
            alertType === 'missing' ? 'attendanceMissing' :
            'attendanceMissing'; // Use same preference for no_show
        const shouldSend = await lineService.shouldNotify(employee.user_id, preferenceType);
        if (!shouldSend) {
            return { success: true };
        }

        // Get template
        const templateCategory =
            alertType === 'late' ? 'attendance_late' :
            alertType === 'missing' ? 'attendance_missing' :
            'attendance_no_show';
        const templates = await lineService.listTemplates(companyId, {
            category: templateCategory,
            isActive: true,
        });

        const defaultTemplates = {
            late: {
                message: 'Attendance alert: You clocked in {{minutes_late}} minutes late on {{date}}. Expected: {{expected_time}}, Actual: {{actual_time}}',
                messageTh: 'แจ้งเตือนการลงเวลา: คุณเข้างานสาย {{minutes_late}} นาที วันที่ {{date}} เวลาที่กำหนด: {{expected_time}}, เวลาจริง: {{actual_time}}',
            },
            missing: {
                message: 'Attendance alert: Missing clock-in for your shift on {{date}}. Expected time: {{expected_time}}',
                messageTh: 'แจ้งเตือนการลงเวลา: ยังไม่ได้ลงเวลาเข้างานสำหรับกะวันที่ {{date}} เวลาที่กำหนด: {{expected_time}}',
            },
            no_show: {
                message: 'No-show alert: {{employee_name}} ({{employee_code}}) did not clock in for shift on {{shift_date}} {{shift_time}} at {{location}}',
                messageTh: 'แจ้งเตือน: {{employee_name}} ({{employee_code}}) ไม่มาทำงาน วันที่ {{shift_date}} เวลา {{shift_time}} สถานที่ {{location}}',
            },
        };

        const template = templates.length > 0
            ? { message: templates[0].message, messageTh: templates[0].messageTh }
            : defaultTemplates[alertType];

        const variables = {
            employee_name: details.employeeName || employee.full_name,
            employee_code: details.employeeCode || '',
            date: details.date || details.shiftDate || '',
            shift_date: details.shiftDate || details.date || '',
            shift_time: details.shiftTime || '',
            location: details.location || '',
            expected_time: details.expectedTime || 'N/A',
            actual_time: details.actualTime || 'N/A',
            minutes_late: details.minutesLate?.toString() || '0',
        };

        let message = template.messageTh || template.message;
        for (const [key, value] of Object.entries(variables)) {
            message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }

        // Send message
        await messagingApiClient.pushMessage({
            to: user.line_user_id,
            messages: [{ type: 'text', text: message }],
        });

        // Log success
        await lineService.logMessage(companyId, {
            recipientUserId: employee.user_id,
            recipientEmployeeId: employeeId,
            recipientLineUserId: user.line_user_id,
            recipientName: employee.full_name,
            message: message,
            status: 'sent',
            context: 'attendance_alert',
            contextData: { alertType, ...details },
        });

        logger.info('Attendance alert sent', {
            alertType,
            employeeId,
        });

        return { success: true };
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Failed to send attendance alert', {
            alertType,
            error: errorMsg,
        });
        return { success: false, error: errorMsg };
    }
}

// ============================================================
// ANNOUNCEMENT NOTIFICATIONS
// ============================================================

/**
 * Send announcement to all employees or specific employees.
 */
export async function sendAnnouncement(
    companyId: string,
    announcement: {
        title: string;
        message: string;
        messageTh?: string;
    },
    employeeIds?: string[] // If not provided, send to all employees with LINE
): Promise<{ sent: number; skipped: number; errors: number }> {
    if (!isLineConfigured()) {
        return { sent: 0, skipped: 0, errors: 0 };
    }

    let sent = 0;
    let skipped = 0;
    let errors = 0;

    try {
        // Get employees to notify
        let query = supabaseAdmin
            .from('employees')
            .select(`
                id,
                full_name,
                user_id,
                users!inner (
                    id,
                    line_user_id
                )
            `)
            .eq('company_id', companyId)
            .eq('status', 'active')
            .not('users.line_user_id', 'is', null);

        if (employeeIds && employeeIds.length > 0) {
            query = query.in('id', employeeIds);
        }

        const { data: employees, error: empError } = await query;

        if (empError || !employees || employees.length === 0) {
            logger.info('No employees to send announcement to');
            return { sent: 0, skipped: 0, errors: 0 };
        }

        // Format message
        const message = announcement.messageTh || announcement.message;
        const fullMessage = `[${announcement.title}]\n\n${message}`;

        // Send to each employee
        for (const emp of employees) {
            const empData = emp as unknown as EmployeeWithUsers;
            const userData = empData.users;
            if (!userData?.line_user_id) {
                skipped++;
                continue;
            }

            // Check user preferences
            try {
                const shouldSend = await lineService.shouldNotify(userData.id, 'announcements');
                if (!shouldSend) {
                    skipped++;
                    continue;
                }
            } catch {
                // Continue if preference check fails
            }

            try {
                await messagingApiClient.pushMessage({
                    to: userData.line_user_id,
                    messages: [{ type: 'text', text: fullMessage }],
                });

                // Log success
                await lineService.logMessage(companyId, {
                    recipientUserId: userData.id,
                    recipientEmployeeId: empData.id,
                    recipientLineUserId: userData.line_user_id,
                    recipientName: empData.full_name,
                    message: fullMessage,
                    status: 'sent',
                    context: 'announcement',
                    contextData: { title: announcement.title },
                });

                sent++;
            } catch (e) {
                errors++;
                const errorMsg = e instanceof Error ? e.message : 'Unknown error';

                await lineService.logMessage(companyId, {
                    recipientUserId: userData.id,
                    recipientEmployeeId: empData.id,
                    recipientLineUserId: userData.line_user_id,
                    recipientName: empData.full_name,
                    message: fullMessage,
                    status: 'failed',
                    errorMessage: errorMsg,
                    context: 'announcement',
                    contextData: { title: announcement.title },
                });
            }
        }

        logger.info('Announcement sent', { sent, skipped, errors });
        return { sent, skipped, errors };
    } catch (error) {
        logger.error('Failed to send announcement', error);
        throw error;
    }
}

export default {
    sendShiftReminders,
    sendLeaveNotification,
    sendShiftChangeNotification,
    sendAttendanceAlert,
    sendAnnouncement,
};
