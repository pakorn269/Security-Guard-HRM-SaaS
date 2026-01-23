import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors.js';

// List of allowed path patterns for guards
// Using simple string matching or regex
const GUARD_ALLOWED_PATHS = [
    // Auth
    /^\/api\/v\d+\/auth\/me$/,
    /^\/api\/v\d+\/auth\/logout$/,
    /^\/api\/v\d+\/auth\/refresh$/,
    /^\/api\/v\d+\/auth\/set-pin$/,
    /^\/api\/v\d+\/auth\/change-password$/,
    /^\/api\/v\d+\/auth\/me\/request-pin-reset$/,
    /^\/api\/v\d+\/auth\/line\/unlink$/,

    // Attendance
    /^\/api\/v\d+\/attendance\/clock-in$/,
    /^\/api\/v\d+\/attendance\/clock-out$/,
    /^\/api\/v\d+\/attendance\/status$/,
    /^\/api\/v\d+\/attendance\/history$/,
    /^\/api\/v\d+\/attendance\/today$/,

    // Shifts
    /^\/api\/v\d+\/shifts\/my$/, // Correct endpoint from routes
    /^\/api\/v\d+\/shifts\/upcoming$/,
    /^\/api\/v\d+\/shifts\/upcoming$/,

    // Leave
    /^\/api\/v\d+\/leave-requests$/, // GET (own), POST
    /^\/api\/v\d+\/leave-requests\/my$/, // GET my requests explicit
    /^\/api\/v\d+\/leave-requests\/.*$/, // GET specific, DELETE (cancel)
    /^\/api\/v\d+\/leave-balances$/,
    /^\/api\/v\d+\/leave-balances\/my$/, // GET my balances
    /^\/api\/v\d+\/leave-types$/,
    /^\/api\/v\d+\/leave\/my$/, // GET my summary data

    // Companies (for settings/info)
    /^\/api\/v\d+\/companies\/current$/,
    /^\/api\/v\d+\/companies\/[^\/]+$/, // Get company by ID

    // Notifications
    /^\/api\/v\d+\/notifications$/,
    /^\/api\/v\d+\/notifications\/.*$/,

    // Sites (viewing assigned sites)
    /^\/api\/v\d+\/sites\/.*$/, // Only specific operations allowed by controller logic, but path is open

    // Reports (Guards might need to submit incident reports? Assuming yes for now)
    /^\/api\/v\d+\/reports\/incident$/,

    // Employee Profile (for viewing own details)
    /^\/api\/v\d+\/employees\/[^\/]+$/, // Get By ID
    /^\/api\/v\d+\/employees\/[^\/]+\/certifications$/, // Get Certifications

    // Account Linking
    /^\/api\/v\d+\/auth\/link-line$/,
];

export const enforceGuardRestrictions = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // If user is not authenticated or not a guard, skip
    if (!req.user || req.user.role !== 'guard') {
        return next();
    }

    const path = req.originalUrl.split('?')[0]; // Ignore query params

    // Check if path matches any allowed pattern
    const isAllowed = GUARD_ALLOWED_PATHS.some(pattern => pattern.test(path));

    if (!isAllowed) {
        return next(
            new ForbiddenError(
                'Access denied: Security guards are restricted to mobile app functionality.',
                'ไม่มีสิทธิ์เข้าถึง: รปภ. สามารถใช้งานได้เฉพาะผ่านแอพมือถือเท่านั้น'
            )
        );
    }

    next();
};
