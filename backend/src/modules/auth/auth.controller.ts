import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { authService } from './auth.service.js';
import { lineLinkingService } from './line-linking.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { createLiffContextFromRequest } from '../../middleware/liff-context.middleware.js';
import type { SessionContext } from './auth.types.js';
import {
    registerSchema,
    loginSchema,
    phoneLoginSchema,
    setPinSchema,
    setupPinSchema,
    forgotPinSchema,
    verifyResetCodeSchema,
    lineLoginSchema,
    refreshTokenSchema,
    linkLineSchema,
    lineVerifySchema,
    linkEmployeeSchema,
    autoLinkSchema,
    linkCredentialsSchema,
    liffEmployeeLoginSchema,
    changePasswordSchema,
    requestPinResetSchema,
    revokeSessionSchema,
    revokeAllSessionsSchema,
    logoutSchema,
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

// Helper to extract session context from request
const getSessionContext = (req: Request): SessionContext => {
    // Get IP address, handling proxies
    const forwardedFor = req.headers['x-forwarded-for'];
    const ipAddress = forwardedFor
        ? (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0]).trim()
        : req.ip || req.socket.remoteAddress;

    // Check if request is from LIFF
    const isLiff = !!(req.headers['x-liff-id'] || req.headers['x-liff-context']);

    return {
        userAgent: req.headers['user-agent'],
        ipAddress,
        isLiff,
    };
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

            const sessionContext = getSessionContext(req);
            const result = await authService.login(validation.data, sessionContext);
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/auth/login-phone - Phone + PIN login
    async phoneLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validation = phoneLoginSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const sessionContext = getSessionContext(req);
            const result = await authService.phoneLogin(validation.data, sessionContext);
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/auth/set-pin - Set/Update PIN
    async setPin(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) {
                throw new Error('User not authenticated');
            }

            const validation = setPinSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            await authService.setPin(req.user.userId, validation.data);
            sendSuccess(res, {
                message: 'PIN updated successfully',
                message_th: 'ตั้งรหัส PIN สำเร็จ'
            });
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/auth/setup-pin - First-time PIN setup (public, for users whose PIN was reset by admin)
    async setupPin(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validation = setupPinSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const result = await authService.setupPin(validation.data);
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/auth/forgot-pin - Request PIN reset
    async forgotPin(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validation = forgotPinSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            await authService.forgotPin(validation.data);
            // Always return success to prevent enumeration
            sendSuccess(res, {
                message: 'If the phone number exists, a reset code has been sent.',
                message_th: 'หากเบอร์โทรศัพท์ถูกต้อง ระบบได้ส่งรหัสรีเซ็ตไปแล้ว'
            });
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/auth/verify-reset-code - Verify reset code
    async verifyResetCode(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validation = verifyResetCodeSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const result = await authService.verifyResetCode(validation.data);
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

            const sessionContext = getSessionContext(req);
            const result = await authService.lineLogin(validation.data, sessionContext);
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

    // POST /api/v1/auth/logout - Logout (revoke session)
    async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) {
                throw new Error('User not authenticated');
            }

            const validation = logoutSchema.safeParse(req.body);
            const refreshToken = validation.success ? validation.data.refreshToken : undefined;

            await authService.logout(req.user.userId, refreshToken);

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

            const sessionContext = getSessionContext(req);
            const result = await authService.linkEmployee(
                validation.data.idToken,
                validation.data.liffId,
                validation.data.employeeCode,
                validation.data.phone,
                validation.data.companySlug,
                sessionContext
            );
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/auth/line/auto-link - Auto-link LINE to employee via code + phone
    async autoLink(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validation = autoLinkSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const result = await lineLinkingService.autoLinkEmployee(
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

            const sessionContext = getSessionContext(req);
            const result = await authService.linkCredentials(
                validation.data.idToken,
                validation.data.liffId,
                validation.data.email,
                validation.data.password,
                sessionContext
            );
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/auth/password - Change password
    async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) {
                throw new Error('User not authenticated');
            }

            const validation = changePasswordSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            await authService.changePassword(
                req.user.userId,
                validation.data.oldPassword,
                validation.data.newPassword
            );

            sendSuccess(res, {
                message: 'Password updated successfully',
                message_th: 'เปลี่ยนรหัสผ่านสำเร็จ',
            });
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

    // ============================================================
    // LIFF Email Login (Without LINE)
    // ============================================================

    // POST /api/v1/auth/liff/employee-login - LIFF login for guards without LINE
    async liffEmployeeLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validation = liffEmployeeLoginSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const sessionContext = getSessionContext(req);
            const result = await authService.liffEmployeeLogin(
                validation.data.employeeCode,
                validation.data.phone,
                validation.data.password,
                validation.data.companySlug,
                sessionContext
            );
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    // ============================================================
    // PIN Reset Request Endpoints (Hybrid Approach)
    // ============================================================

    // POST /api/v1/auth/request-pin-reset - Guard requests PIN reset (public)
    async requestPinReset(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const validation = requestPinResetSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            await authService.requestPinReset(
                validation.data.companySlug,
                validation.data.phone
            );

            // Always return success to prevent enumeration
            sendSuccess(res, {
                message: 'If the phone number exists, your request has been submitted to the administrator.',
                message_th: 'หากเบอร์โทรศัพท์ถูกต้อง คำขอของคุณได้ถูกส่งไปยังผู้ดูแลระบบแล้ว'
            });
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/auth/me/request-pin-reset - Authenticated guard requests PIN reset
    async requestPinResetMe(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) {
                throw new Error('User not authenticated');
            }

            await authService.requestPinResetMe(req.user.userId);

            sendSuccess(res, {
                message: 'Your PIN reset request has been submitted to the administrator.',
                message_th: 'ส่งคำขอรีเซ็ต PIN ไปยังผู้ดูแลระบบแล้ว'
            });
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/auth/pin-reset-requests - Admin gets pending requests (protected)
    async getPinResetRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) {
                throw new Error('User not authenticated');
            }

            const requests = await authService.getPinResetRequests(req.user.companyId);
            sendSuccess(res, { requests });
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/auth/pin-reset-requests/count - Admin gets pending request count (protected)
    async getPendingPinResetCount(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) {
                throw new Error('User not authenticated');
            }

            const count = await authService.getPendingPinResetCount(req.user.companyId);
            sendSuccess(res, { count });
        } catch (error) {
            next(error);
        }
    }

    // ============================================================
    // Session Management Endpoints
    // ============================================================

    // GET /api/v1/auth/sessions - Get all active sessions for current user
    async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) {
                throw new Error('User not authenticated');
            }

            // Get current session ID from token
            const currentSessionId = req.user.sessionId;

            const sessions = await authService.getUserSessions(req.user.userId, currentSessionId);
            sendSuccess(res, { sessions });
        } catch (error) {
            next(error);
        }
    }

    // DELETE /api/v1/auth/sessions/:sessionId - Revoke a specific session
    async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) {
                throw new Error('User not authenticated');
            }

            const validation = revokeSessionSchema.safeParse({ sessionId: req.params.sessionId });
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const revoked = await authService.revokeSession(validation.data.sessionId, req.user.userId);

            if (!revoked) {
                throw new NotFoundError('Session', 'ไม่พบ Session');
            }

            sendSuccess(res, {
                message: 'Session revoked successfully',
                message_th: 'ยกเลิก Session สำเร็จ',
            });
        } catch (error) {
            next(error);
        }
    }

    // DELETE /api/v1/auth/sessions - Revoke all sessions except current
    async revokeAllSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) {
                throw new Error('User not authenticated');
            }

            const validation = revokeAllSessionsSchema.safeParse(req.body);
            const excludeCurrent = validation.success ? validation.data.excludeCurrent : true;

            // Get current session ID from token
            const currentSessionId = excludeCurrent ? req.user.sessionId : undefined;

            const count = await authService.revokeAllSessions(req.user.userId, currentSessionId);

            sendSuccess(res, {
                message: `${count} session(s) revoked successfully`,
                message_th: `ยกเลิก ${count} Session สำเร็จ`,
                count,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const authController = new AuthController();
export default authController;

