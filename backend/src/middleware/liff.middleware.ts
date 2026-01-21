import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import type { JwtPayload } from './auth.middleware.js';

// LINE ID Token payload (decoded from LINE API response)
export interface LineProfile {
    userId: string;
    displayName: string | null;
    pictureUrl: string | null;
}

// Extend Express Request type for LIFF context
declare global {
    namespace Express {
        interface Request {
            lineProfile?: LineProfile;
            liffId?: string;
        }
    }
}

/**
 * LIFF Auth Middleware
 * 
 * This middleware supports two authentication methods for LIFF:
 * 1. JWT Bearer token - For linked users making subsequent requests
 * 2. LINE ID token - For initial verification during the linking flow
 * 
 * Priority: JWT > LINE Token
 * 
 * Usage:
 * - For protected LIFF routes that require linked users: use regular authMiddleware
 * - For routes that need to work with both linked and unlinked users: use liffAuthMiddleware
 */
export const liffAuthMiddleware = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            throw new UnauthorizedError('No authorization header', 'ไม่พบ Authorization header');
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2) {
            throw new UnauthorizedError('Invalid authorization format', 'รูปแบบ Authorization ไม่ถูกต้อง');
        }

        const [type, token] = parts;

        // Try JWT Bearer token first (for linked users)
        if (type === 'Bearer') {
            try {
                const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
                req.user = decoded;
                logger.debug('LIFF auth via JWT', { userId: decoded.userId });
                return next();
            } catch (jwtError) {
                if (jwtError instanceof jwt.TokenExpiredError) {
                    throw new UnauthorizedError('Token expired', 'Token หมดอายุ');
                }
                if (jwtError instanceof jwt.JsonWebTokenError) {
                    throw new UnauthorizedError('Invalid token', 'Token ไม่ถูกต้อง');
                }
                throw jwtError;
            }
        }

        // Try LINE token (for unlinked users in linking flow)
        if (type === 'LINE') {
            // LINE token format: "LINE {idToken}:{liffId}"
            const tokenParts = token.split(':');
            if (tokenParts.length !== 2) {
                throw new UnauthorizedError(
                    'Invalid LINE token format. Expected: LINE {idToken}:{liffId}',
                    'รูปแบบ LINE token ไม่ถูกต้อง'
                );
            }

            const [idToken, liffId] = tokenParts;

            // Verify LINE ID token
            const lineProfile = await verifyLineIdToken(idToken, liffId);
            req.lineProfile = lineProfile;
            req.liffId = liffId;

            logger.debug('LIFF auth via LINE token', { lineUserId: lineProfile.userId });
            return next();
        }

        throw new UnauthorizedError(
            'Invalid authorization type. Expected: Bearer or LINE',
            'ประเภท Authorization ไม่ถูกต้อง'
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Optional LIFF Auth Middleware
 * 
 * Same as liffAuthMiddleware but doesn't throw if no token is provided.
 * Useful for routes that can work with or without authentication.
 */
export const optionalLiffAuthMiddleware = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return next();
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2) {
            return next();
        }

        const [type, token] = parts;

        // Try JWT Bearer token
        if (type === 'Bearer') {
            try {
                const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
                req.user = decoded;
            } catch {
                // Ignore JWT errors for optional auth
            }
            return next();
        }

        // Try LINE token
        if (type === 'LINE') {
            try {
                const tokenParts = token.split(':');
                if (tokenParts.length === 2) {
                    const [idToken, liffId] = tokenParts;
                    const lineProfile = await verifyLineIdToken(idToken, liffId);
                    req.lineProfile = lineProfile;
                    req.liffId = liffId;
                }
            } catch {
                // Ignore LINE token errors for optional auth
            }
            return next();
        }

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Verify LINE ID Token with LINE API
 */
async function verifyLineIdToken(idToken: string, liffIdOrChannelId: string): Promise<LineProfile> {
    try {
        // Extract channel ID from LIFF ID if provided (format: {channelId}-{appId})
        let channelId = liffIdOrChannelId;
        if (liffIdOrChannelId.includes('-')) {
            channelId = liffIdOrChannelId.split('-')[0];
        }

        // Call LINE's token verification endpoint
        const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                id_token: idToken,
                client_id: channelId,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            logger.error('LINE token verification failed in middleware', error);
            throw new UnauthorizedError('Invalid LINE token', 'Token LINE ไม่ถูกต้อง');
        }

        const payload = await response.json() as {
            sub: string;
            name?: string;
            picture?: string;
        };

        return {
            userId: payload.sub,
            displayName: payload.name || null,
            pictureUrl: payload.picture || null,
        };
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            throw error;
        }
        logger.error('LINE token verification error in middleware', error);
        throw new UnauthorizedError(
            'Failed to verify LINE token',
            'ไม่สามารถตรวจสอบ Token LINE ได้'
        );
    }
}

/**
 * Require linked user middleware
 * 
 * Use after liffAuthMiddleware to ensure the request has a linked user (JWT auth).
 * This is useful for routes that require a fully authenticated, linked user.
 */
export const requireLinkedUser = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        return next(new UnauthorizedError(
            'This action requires a linked account',
            'การดำเนินการนี้ต้องเชื่อมต่อบัญชีก่อน'
        ));
    }
    next();
};

/**
 * Require LINE profile middleware
 * 
 * Use after liffAuthMiddleware to ensure the request has a LINE profile.
 * This is useful for routes in the linking flow that need LINE identity.
 */
export const requireLineProfile = (
    req: Request,
    _res: Response,
    next: NextFunction
): void => {
    if (!req.lineProfile && !req.user?.lineUserId) {
        return next(new UnauthorizedError(
            'LINE profile is required',
            'ต้องมีข้อมูล LINE profile'
        ));
    }
    next();
};

export default liffAuthMiddleware;
