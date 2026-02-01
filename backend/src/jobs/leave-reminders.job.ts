/**
 * Leave Reminders Job
 * Sends daily email reminders for upcoming leaves
 * Runs daily at 08:00 AM
 */

import cron from 'node-cron';
import { supabaseAdmin } from '../config/supabase.js';
import { emailService } from '../services/email.service.js';
import emailConfig from '../config/email.config.js';
import { logger } from '../utils/logger.js';

/**
 * Find all approved leaves starting tomorrow and send reminders
 */
async function sendDailyLeaveReminders() {
  try {
    logger.info('Starting daily leave reminders job');

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Find all approved leave requests starting tomorrow
    const { data: upcomingLeaves, error } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        id,
        start_date,
        end_date,
        total_days,
        reason,
        employee_id,
        company_id,
        employees:employee_id (
          id,
          full_name,
          user_id
        ),
        leave_types:leave_type_id (
          id,
          name,
          name_th
        )
      `)
      .eq('status', 'approved')
      .eq('start_date', tomorrowStr);

    if (error) {
      logger.error('Error fetching upcoming leaves:', error);
      return;
    }

    if (!upcomingLeaves || upcomingLeaves.length === 0) {
      logger.info('No upcoming leaves for tomorrow');
      return;
    }

    logger.info(`Found ${upcomingLeaves.length} upcoming leaves for tomorrow`);

    let sentCount = 0;
    let failedCount = 0;

    // Send reminder to each employee
    for (const leave of upcomingLeaves) {
      try {
        // Get user with email and preferences
        const employeeData = leave.employees as unknown as { user_id: string; full_name: string };
        const leaveTypeData = leave.leave_types as unknown as { name: string; name_th?: string };

        const { data: user, error: userError } = await supabaseAdmin
          .from('users')
          .select('email, email_notifications')
          .eq('id', employeeData.user_id)
          .single();

        if (userError || !user || !user.email) {
          logger.warn('User not found or no email for leave reminder', {
            leaveId: leave.id,
            employeeId: leave.employee_id,
          });
          failedCount++;
          continue;
        }

        // Check if user has reminder notifications enabled
        const emailPrefs = (user.email_notifications as { reminder?: boolean }) || {};
        if (emailPrefs.reminder === false) {
          logger.debug('User has disabled reminder notifications', {
            leaveId: leave.id,
          });
          continue;
        }

        const emailData = {
          employeeName: employeeData.full_name || 'Employee',
          leaveType: leaveTypeData.name_th || leaveTypeData.name || 'Leave',
          startDate: leave.start_date,
          endDate: leave.end_date,
          totalDays: leave.total_days,
          reason: leave.reason || '',
          dashboardUrl: emailConfig.templates.baseUrl,
          companyName: emailConfig.branding.companyName,
        };

        await emailService.sendLeaveReminder(user.email, emailData);
        sentCount++;

        logger.debug('Leave reminder sent', {
          leaveId: leave.id,
          email: user.email,
        });
      } catch (error) {
        logger.error('Failed to send leave reminder', {
          leaveId: leave.id,
          error,
        });
        failedCount++;
      }
    }

    logger.info('Daily leave reminders job completed', {
      total: upcomingLeaves.length,
      sent: sentCount,
      failed: failedCount,
    });
  } catch (error) {
    logger.error('Error in daily leave reminders job', error);
  }
}

/**
 * Schedule daily reminders at 08:00 AM (Bangkok timezone: Asia/Bangkok)
 * Cron format: second minute hour day month weekday
 * '0 8 * * *' = At 08:00 every day
 */
export function startLeaveRemindersJob() {
  // Run at 08:00 AM every day
  cron.schedule(
    '0 8 * * *',
    () => {
      sendDailyLeaveReminders();
    }
  );

  logger.info('Leave reminders job scheduled: Daily at 08:00 AM (Asia/Bangkok)');
}

// Export for manual testing
export { sendDailyLeaveReminders };
