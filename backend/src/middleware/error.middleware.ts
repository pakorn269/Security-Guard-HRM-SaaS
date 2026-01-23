import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors.js';
import { sendError } from '../utils/response.js';
import logger from '../utils/logger.js';
import { env } from '../config/env.js';

// Extend Error Response type for validation errors
interface ExtendedErrorResponse {
    code: string;
    message: string;
    message_th?: string;
    details?: Array<{
        field: string;
        message: string;
        message_th?: string;
    }>;
    stack?: string;
}

export const errorMiddleware = (
    err: Error | AppError,
    req: Request,
    res: Response,
    _next: NextFunction
): Response => {
    // Log the error
    logger.error('Request error', err, {
        method: req.method,
        path: req.path,
        body: req.body,
        user: (req as Request & { user?: { id: string } }).user?.id,
    });

    // Handle known AppError types
    if (err instanceof AppError) {
        const response: ExtendedErrorResponse = {
            code: err.code,
            message: err.message,
            message_th: err.messageTh,
        };

        // Add validation details if present
        if (err instanceof ValidationError) {
            response.details = err.details;
        }

        // Add stack trace in development
        if (env.NODE_ENV === 'development') {
            response.stack = err.stack;
        }

        return res.status(err.statusCode).json({
            success: false,
            error: response,
        });
    }

    // Handle unknown errors
    const statusCode = 500;
    const message = err.message || 'Internal server error';
    const messageTh = 'เกิดข้อผิดพลาดภายในระบบ';

    // In non-production, expose more error details for debugging
    if (env.NODE_ENV !== 'production') {
        return res.status(statusCode).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message,
                message_th: messageTh,
                debug: {
                    name: err.name,
                    stack: err.stack,
                },
            },
        });
    }

    return sendError(res, 'INTERNAL_ERROR', message, statusCode, messageTh);
};

// 404 handler for unmatched routes
export const notFoundMiddleware = (req: Request, res: Response): Response => {
    return sendError(
        res,
        'NOT_FOUND',
        `Route ${req.method} ${req.path} not found`,
        404,
        'ไม่พบเส้นทางที่ร้องขอ'
    );
};

export default errorMiddleware;
