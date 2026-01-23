import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';
import { enforceGuardRestrictions } from './rbac.middleware.js';

// LIFF context tracking for RBAC
export interface LiffContext {
    isLiff: boolean;           // Token issued from LIFF
    liffId?: string;           // LIFF app ID
    issuedAt: number;          // Timestamp
    userAgent?: string;        // Browser fingerprint (optional)
}

// JWT payload interface
export interface JwtPayload {
    userId: string;
    companyId: string;
    role: 'super_admin' | 'company_admin' | 'manager' | 'guard';
    email: string;
    employeeId?: string;
    lineUserId?: string;
    sessionId?: string;        // Session ID for session management
    liffContext?: LiffContext; // Track if token issued from LIFF
}

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

// Verify JWT token and attach user to request
export const authMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            throw new UnauthorizedError('No authorization header');
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            throw new UnauthorizedError('Invalid authorization format');
        }

        const token = parts[1];

        try {
            const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
            req.user = decoded;

            // Enforce RBAC for guards
            enforceGuardRestrictions(req, res, next);
        } catch (jwtError) {
            if (jwtError instanceof jwt.TokenExpiredError) {
                throw new UnauthorizedError('Token expired', 'Token หมดอายุ');
            }
            if (jwtError instanceof jwt.JsonWebTokenError) {
                throw new UnauthorizedError('Invalid token', 'Token ไม่ถูกต้อง');
            }
            throw jwtError;
        }
    } catch (error) {
        next(error);
    }
};

// Optional auth - doesn't throw if no token
export const optionalAuthMiddleware = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return next();
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return next();
        }

        const token = parts[1];

        try {
            const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
            req.user = decoded;
        } catch {
            // Ignore token errors for optional auth
        }

        next();
    } catch (error) {
        next(error);
    }
};

// Role-based access control middleware factory
export const requireRoles = (...allowedRoles: JwtPayload['role'][]) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            return next(new UnauthorizedError('Not authenticated'));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(new UnauthorizedError('Insufficient permissions', 'สิทธิ์ไม่เพียงพอ'));
        }

        next();
    };
};

// Convenience middleware for admin-only routes
export const requireAdmin = requireRoles('super_admin', 'company_admin');

// Convenience middleware for manager and above
export const requireManager = requireRoles('super_admin', 'company_admin', 'manager');

// ============================================================
// LIFF-Only Access Control (RBAC for Guards)
// ============================================================

/**
 * Require LIFF-Only Access Middleware
 *
 * Enforces that users with 'guard' role can ONLY access endpoints via LIFF.
 * This prevents guards from using tokens in a regular web browser.
 *
 * Usage:
 * router.get('/api/v1/shifts/my', authMiddleware, requireLiffOnly, getMyShifts);
 */
export const requireLiffOnly = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        return next(new UnauthorizedError('Not authenticated', 'ไม่ได้รับการยืนยันตัวตน'));
    }

    // Only enforce LIFF requirement for guard role
    if (req.user.role === 'guard') {
        if (!req.user.liffContext?.isLiff) {
            return next(new UnauthorizedError(
                'Guard users must access this endpoint via LINE LIFF only',
                'ยามจำเป็นต้องเข้าใช้งานผ่าน LINE เท่านั้น'
            ));
        }
    }

    // Non-guard roles can access freely
    next();
};

/**
 * Require Non-LIFF Access Middleware
 *
 * Blocks guard users from accessing web-only endpoints.
 * Prevents guards from accessing admin/manager dashboards.
 *
 * Usage:
 * router.get('/api/v1/employees', authMiddleware, requireNonLiff, requireManager, getEmployees);
 */
export const requireNonLiff = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        return next(new UnauthorizedError('Not authenticated', 'ไม่ได้รับการยืนยันตัวตน'));
    }

    // Block guards from accessing non-LIFF/web routes
    if (req.user.role === 'guard') {
        return next(new UnauthorizedError(
            'Access denied. Guard users cannot access web routes.',
            'ไม่อนุญาตให้เข้าถึง ยามต้องใช้ LINE LIFF เท่านั้น'
        ));
    }

    // Non-guard roles can access
    next();
};

export default authMiddleware;
