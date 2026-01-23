
import cron from 'node-cron';
import logger from '../utils/logger.js';
import { checkLicenses } from './licenseChecker.js';
import { sendShiftReminders } from './lineNotifications.js';

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

    // Schedule License Compliance Check
    // Run every day at midnight (0 0 * * *)
    cron.schedule('0 0 * * *', async () => {
        try {
            await checkLicenses();
        } catch (error) {
            logger.error('Error running License Compliance Check', error);
        }
    });

    logger.info('Job Scheduler initialized');
};
