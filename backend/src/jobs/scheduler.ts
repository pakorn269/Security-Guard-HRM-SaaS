
import cron from 'node-cron';
import logger from '../utils/logger.js';
import { checkLicenses } from './licenseChecker.js';
import { sendShiftReminders } from './lineNotifications.js';
import { detectNoShows, detectMissedClockOuts } from './noShowDetection.js';
import { sendDailyLeaveReminders } from './leave-reminders.job.js';

export const initScheduler = () => {
    logger.info('Initializing Job Scheduler...');

    // Schedule LINE Shift Reminders
    // Run every hour at minute 0 (0 * * * *)
    // For testing: every minute (* * * * *) or every 10 mins (*/10 * * * *)
    cron.schedule('0 * * * *', async () => {
        try {
            logger.info('Running scheduled job: LINE Shift Reminders');

            // Look ahead 2 hours by default
            const result = await sendShiftReminders(2);

            logger.info('LINE Shift Reminders job completed', {
                sent: result.sent,
                skipped: result.skipped,
                errors: result.errors,
            });
        } catch (error) {
            logger.error('Error running LINE Shift Reminders job', error);
        }
    });

    // Schedule No-Show Detection
    // Run every 30 minutes (*/30 * * * *)
    // Detects shifts that started 30+ minutes ago without clock-in
    cron.schedule('*/30 * * * *', async () => {
        try {
            logger.info('Running scheduled job: No-Show Detection');

            // Grace period: 30 minutes after shift start
            const result = await detectNoShows(30);

            logger.info('No-Show Detection job completed', {
                detected: result.detected,
                marked: result.marked,
                notified: result.notified,
                errors: result.errors,
            });
        } catch (error) {
            logger.error('Error running No-Show Detection job', error);
        }
    });

    // Schedule Missed Clock-Out Detection
    // Run every hour at minute 15 (15 * * * *)
    // Detects shifts that ended without clock-out
    cron.schedule('15 * * * *', async () => {
        try {
            logger.info('Running scheduled job: Missed Clock-Out Detection');

            // Check shifts that ended 1+ hours ago
            const result = await detectMissedClockOuts(1);

            logger.info('Missed Clock-Out Detection job completed', {
                detected: result.detected,
                marked: result.marked,
                notified: result.notified,
                errors: result.errors,
            });
        } catch (error) {
            logger.error('Error running Missed Clock-Out Detection job', error);
        }
    });

    // Schedule License Compliance Check
    // Run every day at midnight (0 0 * * *)
    cron.schedule('0 0 * * *', async () => {
        try {
            await checkLicenses();
        } catch (error) {
            logger.error('Error running License Compliance Check', error);
        }
    });

    // Schedule Leave Reminders
    // Run every day at 08:00 AM (0 8 * * *)
    cron.schedule('0 8 * * *', async () => {
        try {
            logger.info('Running scheduled job: Leave Reminders');
            await sendDailyLeaveReminders();
            logger.info('Leave Reminders job completed');
        } catch (error) {
            logger.error('Error running Leave Reminders job', error);
        }
    }, {
        timezone: 'Asia/Bangkok',
    });

    logger.info('Job Scheduler initialized successfully');
    logger.info('Scheduled jobs:');
    logger.info('  - Shift Reminders: Every hour (0 * * * *)');
    logger.info('  - No-Show Detection: Every 30 minutes (*/30 * * * *)');
    logger.info('  - Missed Clock-Out Detection: Every hour at :15 (15 * * * *)');
    logger.info('  - License Compliance Check: Daily at midnight (0 0 * * *)');
    logger.info('  - Leave Reminders: Daily at 08:00 AM Bangkok time (0 8 * * *)');
};
