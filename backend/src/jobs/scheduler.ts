
import cron from 'node-cron';
import axios from 'axios';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

export const initScheduler = () => {
    logger.info('⏳ Initializing Job Scheduler...');

    // Schedule Shift Reminders
    // Run every hour at minute 0 (0 * * * *)
    // For testing: every minute (* * * * *) or every 10 mins (*/10 * * * *)
    cron.schedule('0 * * * *', async () => {
        try {
            logger.info('⏰ Running scheduled job: Shift Reminders');
            const port = env.PORT || 3000;
            const apiUrl = `http://127.0.0.1:${port}/api/${env.API_VERSION}/notifications/reminders`;

            // Look ahead 2 hours by default
            const response = await axios.post(apiUrl, {
                hours: 2
            });

            logger.info('✅ Shift Reminders job completed', {
                sent: response.data.data?.sent,
                skipped: response.data.data?.skipped
            });
        } catch (error) {
            logger.error('❌ Error running Shift Reminders job', error);
        }
    });

    logger.info('✅ Job Scheduler initialized');
};
