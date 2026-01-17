import { env } from '../config/env.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const CURRENT_LEVEL: LogLevel = env.NODE_ENV === 'production' ? 'info' : 'debug';

const formatMessage = (level: LogLevel, message: string, meta?: object): string => {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
};

const shouldLog = (level: LogLevel): boolean => {
    return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LEVEL];
};

export const logger = {
    debug: (message: string, meta?: object): void => {
        if (shouldLog('debug')) {
            console.debug(formatMessage('debug', message, meta));
        }
    },

    info: (message: string, meta?: object): void => {
        if (shouldLog('info')) {
            console.info(formatMessage('info', message, meta));
        }
    },

    warn: (message: string, meta?: object): void => {
        if (shouldLog('warn')) {
            console.warn(formatMessage('warn', message, meta));
        }
    },

    error: (message: string, error?: Error | unknown, meta?: object): void => {
        if (shouldLog('error')) {
            const errorMeta = error instanceof Error
                ? { ...meta, error: { message: error.message, stack: error.stack } }
                : { ...meta, error };
            console.error(formatMessage('error', message, errorMeta));
        }
    },

    // Request logging helper
    request: (method: string, path: string, statusCode: number, duration: number): void => {
        const message = `${method} ${path} ${statusCode} ${duration}ms`;
        if (statusCode >= 500) {
            logger.error(message);
        } else if (statusCode >= 400) {
            logger.warn(message);
        } else {
            logger.info(message);
        }
    },
};

export default logger;
