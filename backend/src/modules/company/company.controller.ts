import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { companyService } from './company.service.js';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/response.js';
import { ValidationError, ForbiddenError } from '../../utils/errors.js';
import {
    createCompanySchema,
    updateCompanySchema,
    updateCompanySettingsSchema,
} from './company.validation.js';

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

class CompanyController {
    // GET /api/v1/companies/by-slug/:slug/public - Get public company info
    async getPublicBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const slug = req.params.slug as string;
            const company = await companyService.getPublicBySlug(slug);
            sendSuccess(res, company);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/companies - List all companies (super admin only)
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (req.user?.role !== 'super_admin') {
                throw new ForbiddenError(
                    'Only super admins can list all companies',
                    'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถดูรายชื่อบริษัททั้งหมด'
                );
            }

            const page = parseInt(req.query.page as string) || 1;
            const pageSize = parseInt(req.query.pageSize as string) || 20;
            const search = req.query.search as string | undefined;

            const { companies, total } = await companyService.list(page, pageSize, search);
            sendPaginated(res, companies, page, pageSize, total);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/companies - Create company (super admin only)
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (req.user?.role !== 'super_admin') {
                throw new ForbiddenError(
                    'Only super admins can create companies',
                    'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถสร้างบริษัท'
                );
            }

            const validation = createCompanySchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const company = await companyService.create(validation.data);
            sendCreated(res, company);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/companies/:id - Get company by ID
    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = req.params.id as string;

            // Non-super admins can only view their own company
            if (req.user?.role !== 'super_admin' && req.user?.companyId !== id) {
                throw new ForbiddenError(
                    'Cannot access other companies',
                    'ไม่สามารถเข้าถึงข้อมูลบริษัทอื่น'
                );
            }

            const company = await companyService.getById(id);
            sendSuccess(res, company);
        } catch (error) {
            next(error);
        }
    }

    // PUT /api/v1/companies/:id - Update company
    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = req.params.id as string;

            // Only super admin or company admin of this company can update
            if (
                req.user?.role !== 'super_admin' &&
                (req.user?.role !== 'company_admin' || req.user?.companyId !== id)
            ) {
                throw new ForbiddenError(
                    'Cannot update this company',
                    'ไม่มีสิทธิ์แก้ไขข้อมูลบริษัทนี้'
                );
            }

            const validation = updateCompanySchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const company = await companyService.update(id, validation.data);
            sendSuccess(res, company);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/companies/:id/settings - Get company settings
    async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = req.params.id as string;

            // Only super admin or company admin of this company can view settings
            if (
                req.user?.role !== 'super_admin' &&
                (req.user?.role !== 'company_admin' || req.user?.companyId !== id)
            ) {
                throw new ForbiddenError(
                    'Cannot view settings for this company',
                    'ไม่มีสิทธิ์ดูการตั้งค่าบริษัทนี้'
                );
            }

            const settings = await companyService.getSettings(id);
            sendSuccess(res, settings);
        } catch (error) {
            next(error);
        }
    }

    // PUT /api/v1/companies/:id/settings - Update company settings
    async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const id = req.params.id as string;

            // Only super admin or company admin of this company can update settings
            if (
                req.user?.role !== 'super_admin' &&
                (req.user?.role !== 'company_admin' || req.user?.companyId !== id)
            ) {
                throw new ForbiddenError(
                    'Cannot update settings for this company',
                    'ไม่มีสิทธิ์แก้ไขการตั้งค่าบริษัทนี้'
                );
            }

            const validation = updateCompanySettingsSchema.safeParse(req.body);
            if (!validation.success) {
                throw formatZodError(validation.error);
            }

            const settings = await companyService.updateSettings(id, validation.data);
            sendSuccess(res, settings);
        } catch (error) {
            next(error);
        }
    }

    // DELETE /api/v1/companies/:id - Deactivate company (super admin only)
    async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (req.user?.role !== 'super_admin') {
                throw new ForbiddenError(
                    'Only super admins can deactivate companies',
                    'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถระงับบริษัท'
                );
            }

            const id = req.params.id as string;
            await companyService.deactivate(id);
            sendNoContent(res);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/v1/companies/:id/reactivate - Reactivate company (super admin only)
    async reactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (req.user?.role !== 'super_admin') {
                throw new ForbiddenError(
                    'Only super admins can reactivate companies',
                    'เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเปิดใช้งานบริษัท'
                );
            }

            const id = req.params.id as string;
            await companyService.reactivate(id);
            sendSuccess(res, { message: 'Company reactivated', message_th: 'เปิดใช้งานบริษัทแล้ว' });
        } catch (error) {
            next(error);
        }
    }

    // GET /api/v1/companies/current - Get current user's company
    async getCurrent(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user?.companyId) {
                throw new ForbiddenError('No company associated with user');
            }

            const company = await companyService.getById(req.user.companyId);
            sendSuccess(res, company);
        } catch (error) {
            next(error);
        }
    }
}

export const companyController = new CompanyController();
export default companyController;
