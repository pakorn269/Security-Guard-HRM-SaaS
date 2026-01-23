import { Request, Response, NextFunction } from 'express';
import type { LiffContext } from './auth.middleware.js';

// Extend Express Request type for LIFF context detection
declare global {
    namespace Express {
        interface Request {
            detectedLiffContext?: {
                isLiff: boolean;
                liffId?: string;
                liffVersion?: string;
                userAgent?: string;
            };
        }
    }
}

/**
 * Detect LIFF Context Middleware
 *
 * Detects if the request is coming from a LIFF app by checking custom headers.
 * This context is used when generating JWT tokens to bind them to LIFF.
 *
 * Usage:
 * app.use(detectLiffContext);
 *
 * Headers expected:
 * - x-liff-id: LIFF app ID (e.g., "2008914377-NDoaNvUa")
 * - x-liff-version: LIFF SDK version (optional)
 */
export const detectLiffContext = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    const liffId = req.headers['x-liff-id'] as string | undefined;
    const liffVersion = req.headers['x-liff-version'] as string | undefined;
    const userAgent = req.headers['user-agent'] as string | undefined;

    req.detectedLiffContext = {
        isLiff: !!liffId,
        liffId,
        liffVersion,
        userAgent,
    };

    next();
};

/**
 * Create LIFF Context from Request
 *
 * Helper function to create LiffContext object from request headers.
 * Used when generating JWT tokens.
 */
export const createLiffContextFromRequest = (req: Request): LiffContext | undefined => {
    if (!req.detectedLiffContext?.isLiff) {
        return undefined;
    }

    return {
        isLiff: true,
        liffId: req.detectedLiffContext.liffId,
        issuedAt: Date.now(),
        userAgent: req.detectedLiffContext.userAgent,
    };
};

export default detectLiffContext;
