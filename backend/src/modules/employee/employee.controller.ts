import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { employeeService } from './employee.service.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/response.js';
import { ValidationError, ForbiddenError } from '../../utils/errors.js';
import {
    createEmployeeSchema,
    updateEmployeeSchema,
    terminateEmployeeSchema,
    listEmployeesQuerySchema,
    createCertificationSchema,
    updateCertificationSchema,
    sendLineMessageSchema,
    bulkLineMessageSchema,
    createUserAccountSchema,
} from './employee.validation.js';

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

class EmployeeController {
    // GET /api/v1/employees - List employees
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            const validation = listEmployeesQuerySchema.safeParse(req.query);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const { employees, total } = await employeeService.list(
                req.user.companyId,
                validation.data
            );
            sendPaginated(
                res,
                employees,
                validation.data.page || 1,
                validation.data.pageSize || 20,
                total
            );
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/employees - Create employee
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins and managers can create employees
            if (!['super_admin', 'company_admin', 'manager'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins and managers can create employees',
                    'เฉพาะผู้ดูแลระบบและผู้จัดการเท่านั้นที่สามารถสร้างพนักงาน'
                );
            }

            const validation = createEmployeeSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const employee = await employeeService.create(req.user.companyId, validation.data);
            sendCreated(res, employee);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/employees/:id - Get employee by ID
    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            const employeeId = req.params.id as string;
            const employee = await employeeService.getByIdWithUser(
                employeeId,
                req.user.companyId
            );
            sendSuccess(res, employee);
        } catch (error) {
            next(error);
        }
    }

    // PUT /api/v1/employees/:id - Update employee
    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins and managers can update employees
            if (!['super_admin', 'company_admin', 'manager'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins and managers can update employees',
                    'เฉพาะผู้ดูแลระบบและผู้จัดการเท่านั้นที่สามารถแก้ไขข้อมูลพนักงาน'
                );
            }

            const employeeId = req.params.id as string;

            const validation = updateEmployeeSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const employee = await employeeService.update(
                employeeId,
                req.user.companyId,
                validation.data
            );
            sendSuccess(res, employee);
        } catch (error) {
            next(error);
        }
    }

    // DELETE /api/v1/employees/:id - Terminate employee
    async terminate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins can terminate employees
            if (!['super_admin', 'company_admin'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins can terminate employees',
                    'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถยุติการทำงานของพนักงาน'
                );
            }

            const employeeId = req.params.id as string;

            const validation = terminateEmployeeSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const employee = await employeeService.terminate(
                employeeId,
                req.user.companyId,
                validation.data
            );
            sendSuccess(res, employee);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/employees/:id/reactivate - Reactivate employee
    async reactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins can reactivate employees
            if (!['super_admin', 'company_admin'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins can reactivate employees',
                    'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเปิดใช้งานพนักงานอีกครั้ง'
                );
            }

            const employeeId = req.params.id as string;
            const employee = await employeeService.reactivate(employeeId, req.user.companyId);
            sendSuccess(res, employee);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/employees/:id/create-user - Create user account for existing employee
    async createUserAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins and managers can create user accounts
            if (!['super_admin', 'company_admin', 'manager'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins and managers can create user accounts',
                    'เฉพาะผู้ดูแลระบบและผู้จัดการเท่านั้นที่สามารถสร้างบัญชีผู้ใช้'
                );
            }

            const employeeId = req.params.id as string;

            const validation = createUserAccountSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const employee = await employeeService.createUserAccount(
                employeeId,
                req.user.companyId,
                validation.data
            );
            sendCreated(res, employee);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/employees/:id/link-user - Link employee to user
    async linkToUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins can link employees to users
            if (!['super_admin', 'company_admin'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins can link employees to users',
                    'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเชื่อมต่อพนักงานกับผู้ใช้'
                );
            }

            const employeeId = req.params.id as string;
            const { userId } = req.body;

            if (!userId) {
                throw new ValidationError('User ID is required', [
                    { field: 'userId', message: 'User ID is required' },
                ]);
            }

            const employee = await employeeService.linkToUser(
                employeeId,
                userId,
                req.user.companyId
            );
            sendSuccess(res, employee);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/employees/:id/reset-pin - Reset employee PIN
    async resetPin(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins can reset PINs
            if (!['super_admin', 'company_admin'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins can reset PINs',
                    'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถรีเซ็ตรหัส PIN'
                );
            }

            const employeeId = req.params.id as string;

            // Get employee to find user ID
            const employee = await employeeService.getById(employeeId, req.user.companyId);

            if (!employee.userId) {
                throw new ValidationError('Employee does not have a user account');
            }

            // Call auth service to reset PIN
            const { authService } = await import('../auth/auth.service.js');
            await authService.adminResetPin(employee.userId);

            // Resolve any pending PIN reset request for this employee
            await authService.resolvePinResetRequestByEmployee(
                employeeId,
                req.user.companyId,
                req.user.userId
            );

            sendSuccess(res, { message: 'PIN reset successfully' });
        } catch (error) {
            next(error);
        }
    }

    // === Certification endpoints ===

    // GET /api/v1/employees/:id/certifications - Get certifications
    async getCertifications(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            const employeeId = req.params.id as string;
            const certifications = await employeeService.getCertifications(
                employeeId,
                req.user.companyId
            );
            sendSuccess(res, certifications);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/employees/:id/certifications - Create certification
    async createCertification(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins and managers can create certifications
            if (!['super_admin', 'company_admin', 'manager'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins and managers can add certifications',
                    'เฉพาะผู้ดูแลระบบและผู้จัดการเท่านั้นที่สามารถเพิ่มใบรับรอง'
                );
            }

            const employeeId = req.params.id as string;

            const validation = createCertificationSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const certification = await employeeService.createCertification(
                employeeId,
                req.user.companyId,
                validation.data
            );
            sendCreated(res, certification);
        } catch (error) {
            next(error);
        }
    }

    // PUT /api/v1/employees/:employeeId/certifications/:certId - Update certification
    async updateCertification(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins and managers can update certifications
            if (!['super_admin', 'company_admin', 'manager'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins and managers can update certifications',
                    'เฉพาะผู้ดูแลระบบและผู้จัดการเท่านั้นที่สามารถแก้ไขใบรับรอง'
                );
            }

            const certificationId = req.params.certId as string;

            const validation = updateCertificationSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const certification = await employeeService.updateCertification(
                certificationId,
                req.user.companyId,
                validation.data
            );
            sendSuccess(res, certification);
        } catch (error) {
            next(error);
        }
    }

    // DELETE /api/v1/employees/:employeeId/certifications/:certId - Delete certification
    async deleteCertification(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins and managers can delete certifications
            if (!['super_admin', 'company_admin', 'manager'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins and managers can delete certifications',
                    'เฉพาะผู้ดูแลระบบและผู้จัดการเท่านั้นที่สามารถลบใบรับรอง'
                );
            }

            const certificationId = req.params.certId as string;
            await employeeService.deleteCertification(certificationId, req.user.companyId);
            sendNoContent(res);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/employees/certifications/expiring - Get expiring certifications
    async getExpiringCertifications(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            const daysAhead = parseInt(req.query.days as string) || 30;
            const certifications = await employeeService.getExpiringCertifications(
                req.user.companyId,
                daysAhead
            );
            sendSuccess(res, certifications);
        } catch (error) {
            next(error);
        }
    }

    // === LINE Messaging Endpoints ===

    // POST /api/v1/employees/:id/line-message - Send LINE message to employee
    async sendLineMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins and managers can send LINE messages
            if (!['super_admin', 'company_admin', 'manager'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins and managers can send LINE messages',
                    'เฉพาะผู้ดูแลระบบและผู้จัดการเท่านั้นที่สามารถส่งข้อความ LINE'
                );
            }

            const employeeId = req.params.id as string;

            const validation = sendLineMessageSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const result = await employeeService.sendLineMessage(
                employeeId,
                req.user.companyId,
                validation.data,
                req.user.userId,
                req.user.email
            );

            if (!result.success) {
                sendSuccess(res, { success: false, error: result.error }, 200);
            } else {
                sendSuccess(res, { success: true, message: 'LINE message sent successfully' });
            }
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/employees/line-message/bulk - Send LINE message to multiple employees
    async sendBulkLineMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            // Only admins and managers can send bulk LINE messages
            if (!['super_admin', 'company_admin', 'manager'].includes(req.user.role)) {
                throw new ForbiddenError(
                    'Only admins and managers can send bulk LINE messages',
                    'เฉพาะผู้ดูแลระบบและผู้จัดการเท่านั้นที่สามารถส่งข้อความ LINE แบบกลุ่ม'
                );
            }

            const validation = bulkLineMessageSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const result = await employeeService.sendBulkLineMessage(
                req.user.companyId,
                validation.data,
                req.user.userId,
                req.user.email
            );

            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/employees/line-linked - Get employees with LINE linked
    async getLineLinkedEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            const employees = await employeeService.getLineLinkedEmployees(req.user.companyId);
            sendSuccess(res, employees);
        } catch (error) {
            next(error);
        }
    }
}

export const employeeController = new EmployeeController();
export default employeeController;
