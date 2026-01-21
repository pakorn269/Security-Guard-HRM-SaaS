import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { authService } from './auth.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.js';
import { ValidationError } from '../../utils/errors.js';
import {
    registerSchema,
    loginSchema,
    lineLoginSchema,
    refreshTokenSchema,
    linkLineSchema,
    lineVerifySchema,
    linkEmployeeSchema,
    linkCredentialsSchema,
} from './auth.validation.js';

// Helper to convert Zod error to ValidationError
const formatZodError = (error: ZodError): ValidationError => {
    return new ValidationError(
        'Validation failed',
        error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
        }))
    );
};

class AuthController {
    // POST /api/v1/auth/register - Register new company and admin
    async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validation = registerSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const result = await authService.register(validation.data);
            sendCreated(res, result);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/auth/login - Email/password login
    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validation = loginSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const result = await authService.login(validation.data);
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/auth/line - LINE Login
    async lineLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validation = lineLoginSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const result = await authService.lineLogin(validation.data);
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/auth/refresh - Refresh access token
    async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validation = refreshTokenSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const result = await authService.refreshToken(validation.data.refreshToken);
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/auth/logout - Logout (client-side token removal)
    async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // JWT tokens are stateless - client removes them
            // For added security, we could implement a token blacklist with Redis
            sendSuccess(res, {
                message: 'Logged out successfully',
                message_th: 'ออกจากระบบสำเร็จ',
            });
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/auth/me - Get current user
    async me(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) {
                throw new Error('User not authenticated');
            }

            const user = await authService.getCurrentUser(req.user.userId);
            sendSuccess(res, user);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/auth/link-line - Link LINE account to current user
    async linkLine(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) {
                throw new Error('User not authenticated');
            }

            const validation = linkLineSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const user = await authService.linkLineAccount(
                req.user.userId,
                validation.data.idToken,
                validation.data.liffId
            );
            sendSuccess(res, user);
        } catch (error) {
            next(error);
        }
    }

    // ============================================================
    // LIFF Account Linking Endpoints
    // ============================================================

    // POST /api/v1/auth/line/verify - Verify LINE token and check if linked
    async lineVerify(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validation = lineVerifySchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const result = await authService.lineVerify(
                validation.data.idToken,
                validation.data.liffId
            );
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/auth/line/link-employee - Link LINE to employee via code + phone
    async linkEmployee(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validation = linkEmployeeSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const result = await authService.linkEmployee(
                validation.data.idToken,
                validation.data.liffId,
                validation.data.employeeCode,
                validation.data.phone,
                validation.data.companySlug
            );
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/auth/line/link-credentials - Link LINE to user via email/password
    async linkCredentials(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validation = linkCredentialsSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const result = await authService.linkCredentials(
                validation.data.idToken,
                validation.data.liffId,
                validation.data.email,
                validation.data.password
            );
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/auth/line/unlink - Unlink LINE account (protected)
    async unlinkLineAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) {
                throw new Error('User not authenticated');
            }

            const user = await authService.unlinkLine(req.user.userId);
            sendSuccess(res, {
                message: 'LINE account unlinked successfully',
                message_th: 'ยกเลิกการเชื่อมต่อ LINE สำเร็จ',
                user,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const authController = new AuthController();
export default authController;
