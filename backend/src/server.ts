// IMPORTANT: Import instrument.js at the top of your file.
import './instrument.js';

import * as Sentry from '@sentry/node';
import app from './app.js';
import { env } from './config/env.js';
import logger from './utils/logger.js';

import { initScheduler } from './jobs/scheduler.js';

const PORT = parseInt(env.PORT, 10);

const server = app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📚 API Version: ${env.API_VERSION}`);
    logger.info(`🌍 Environment: ${env.NODE_ENV}`);
    logger.info(`🔗 API URL: http://localhost:${PORT}/api/${env.API_VERSION}`);

    // Initialize Scheduler
    if (env.NODE_ENV !== 'test') {
        initScheduler();
    }
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    Sentry.captureException(error);
    logger.error('Uncaught Exception', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    Sentry.captureException(reason);
    logger.error('Unhandled Rejection', reason as Error, { promise: String(promise) });
});

export default server;
