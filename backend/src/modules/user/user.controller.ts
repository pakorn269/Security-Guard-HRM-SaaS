import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { userService } from './user.service.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/response.js';
import { ValidationError, ForbiddenError } from '../../utils/errors.js';
import {
    createUserSchema,
    updateUserSchema,
    linkLineSchema,
    changePasswordSchema,
    listUsersQuerySchema,
} from './user.validation.js';

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

class UserController {
    // GET /api/v1/users - List users in company
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            const validation = listUsersQuerySchema.safeParse(req.query);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const { users, total } = await userService.list(req.user.companyId, validation.data);
            sendPaginated(
                res,
                users,
                validation.data.page || 1,
                validation.data.pageSize || 20,
                total
            );
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/users - Create user
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins can create users
            if (!['super_admin', 'company_admin'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins can create users',
                    'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถสร้างผู้ใช้'
                );
            }

            const validation = createUserSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            // Prevent creating super_admin unless caller is super_admin
            if (validation.data.role === 'super_admin' && req.user.role !== 'super_admin') {
                throw new ForbiddenError(
                    'Only super admins can create super admin users',
                    'เฉพาะผู้ดูแลระบบระดับสูงเท่านั้นที่สามารถสร้างผู้ดูแลระบบระดับสูง'
                );
            }

            const user = await userService.create(req.user.companyId, validation.data);
            sendCreated(res, user);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/users/:id - Get user by ID
    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            const userId = req.params.id as string;
            const user = await userService.getById(userId, req.user.companyId);
            sendSuccess(res, user);
        } catch (error) {
            next(error);
        }
    }

    // PUT /api/v1/users/:id - Update user
    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            const userId = req.params.id as string;

            // Users can update themselves, admins can update anyone
            const isSelf = userId === req.user.userId;
            const isAdmin = ['super_admin', 'company_admin'].includes(req.user.role);

            if (!isSelf && !isAdmin) {
                throw new ForbiddenError(
                    'Cannot update this user',
                    'ไม่มีสิทธิ์แก้ไขข้อมูลผู้ใช้นี้'
                );
            }

            const validation = updateUserSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            // Non-admins can only update limited fields
            if (!isAdmin) {
                const { role, isActive, ...allowedFields } = validation.data;
                if (role || isActive !== undefined) {
                    throw new ForbiddenError(
                        'Cannot change role or active status',
                        'ไม่มีสิทธิ์เปลี่ยนบทบาทหรือสถานะ'
                    );
                }
                const user = await userService.update(userId, req.user.companyId, allowedFields);
                sendSuccess(res, user);
                return;
            }

            // Prevent changing role to super_admin unless caller is super_admin
            if (validation.data.role === 'super_admin' && req.user.role !== 'super_admin') {
                throw new ForbiddenError(
                    'Only super admins can grant super admin role',
                    'เฉพาะผู้ดูแลระบบระดับสูงเท่านั้นที่สามารถให้สิทธิ์ผู้ดูแลระบบระดับสูง'
                );
            }

            const user = await userService.update(userId, req.user.companyId, validation.data);
            sendSuccess(res, user);
        } catch (error) {
            next(error);
        }
    }

    // DELETE /api/v1/users/:id - Deactivate user
    async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins can deactivate users
            if (!['super_admin', 'company_admin'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins can deactivate users',
                    'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถปิดการใช้งานผู้ใช้'
                );
            }

            const userId = req.params.id as string;

            // Prevent self-deactivation
            if (userId === req.user.userId) {
                throw new ForbiddenError(
                    'Cannot deactivate yourself',
                    'ไม่สามารถปิดการใช้งานตัวเอง'
                );
            }

            await userService.deactivate(userId, req.user.companyId);
            sendNoContent(res);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/users/:id/reactivate - Reactivate user
    async reactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins can reactivate users
            if (!['super_admin', 'company_admin'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins can reactivate users',
                    'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเปิดการใช้งานผู้ใช้'
                );
            }

            const userId = req.params.id as string;
            await userService.reactivate(userId, req.user.companyId);
            sendSuccess(res, { message: 'User reactivated', message_th: 'เปิดการใช้งานผู้ใช้แล้ว' });
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/users/me - Get current user
    async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId || !req.user?.userId) {
                throw new ForbiddenError('No user context');
            }

            const user = await userService.getById(req.user.userId, req.user.companyId);
            sendSuccess(res, user);
        } catch (error) {
            next(error);
        }
    }

    // PUT /api/v1/users/me - Update current user
    async updateCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId || !req.user?.userId) {
                throw new ForbiddenError('No user context');
            }

            const validation = updateUserSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            // Users cannot change their own role or active status
            const { role, isActive, ...allowedFields } = validation.data;
            if (role || isActive !== undefined) {
                throw new ForbiddenError(
                    'Cannot change role or active status',
                    'ไม่มีสิทธิ์เปลี่ยนบทบาทหรือสถานะ'
                );
            }

            const user = await userService.update(
                req.user.userId,
                req.user.companyId,
                allowedFields
            );
            sendSuccess(res, user);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/users/me/change-password - Change current user's password
    async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId || !req.user?.userId) {
                throw new ForbiddenError('No user context');
            }

            const validation = changePasswordSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            await userService.changePassword(
                req.user.userId,
                req.user.companyId,
                validation.data.currentPassword,
                validation.data.newPassword
            );

            sendSuccess(res, {
                message: 'Password changed successfully',
                message_th: 'เปลี่ยนรหัสผ่านสำเร็จ',
            });
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/users/:id/link-line - Link LINE account
    async linkLine(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            const userId = req.params.id as string;

            // Users can only link their own account or admins can link for others
            const isSelf = userId === req.user.userId;
            const isAdmin = ['super_admin', 'company_admin'].includes(req.user.role);

            if (!isSelf && !isAdmin) {
                throw new ForbiddenError(
                    'Cannot link LINE for this user',
                    'ไม่มีสิทธิ์เชื่อมต่อ LINE สำหรับผู้ใช้นี้'
                );
            }

            const validation = linkLineSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const user = await userService.linkLine(userId, req.user.companyId, validation.data);
            sendSuccess(res, user);
        } catch (error) {
            next(error);
        }
    }

    // DELETE /api/v1/users/:id/link-line - Unlink LINE account
    async unlinkLine(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            const userId = req.params.id as string;

            // Users can only unlink their own account or admins can unlink for others
            const isSelf = userId === req.user.userId;
            const isAdmin = ['super_admin', 'company_admin'].includes(req.user.role);

            if (!isSelf && !isAdmin) {
                throw new ForbiddenError(
                    'Cannot unlink LINE for this user',
                    'ไม่มีสิทธิ์ยกเลิกการเชื่อมต่อ LINE สำหรับผู้ใช้นี้'
                );
            }

            const user = await userService.unlinkLine(userId, req.user.companyId);
            sendSuccess(res, user);
        } catch (error) {
            next(error);
        }
    }
}

export const userController = new UserController();
export default userController;
