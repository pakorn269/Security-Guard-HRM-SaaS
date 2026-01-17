import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';

// JWT payload interface
export interface JwtPayload {
    userId: string;
    companyId: string;
    role: 'super_admin' | 'company_admin' | 'manager' | 'guard';
    email: string;
    employeeId?: string;
    lineUserId?: string;
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
    _res: Response,
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
            next();
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

export default authMiddleware;
