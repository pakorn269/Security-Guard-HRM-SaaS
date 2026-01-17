import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { UnauthorizedError } from '../utils/errors.js';
import logger from '../utils/logger.js';

// Extend Express Request type for tenant context
declare global {
    namespace Express {
        interface Request {
            tenantId?: string;
        }
    }
}

// Set tenant context for RLS
export const tenantMiddleware = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            throw new UnauthorizedError('User not authenticated');
        }

        const { companyId, role } = req.user;

        // Super admins can access all companies
        if (role === 'super_admin') {
            // For super admins, optionally get company from query/params
            const targetCompanyId = (req.query.companyId as string) ||
                (req.params.companyId as string) ||
                companyId;
            req.tenantId = targetCompanyId;
        } else {
            // Regular users are scoped to their company
            req.tenantId = companyId;
        }

        // Set RLS context in database
        if (req.tenantId) {
            await supabaseAdmin.rpc('set_config', {
                setting: 'app.current_company_id',
                value: req.tenantId,
            });
            await supabaseAdmin.rpc('set_config', {
                setting: 'app.current_user_role',
                value: role,
            });

            logger.debug('Tenant context set', {
                companyId: req.tenantId,
                role,
                userId: req.user.userId,
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

// Clear tenant context after request (optional, for cleanup)
export const clearTenantContext = async (): Promise<void> => {
    try {
        await supabaseAdmin.rpc('set_config', {
            setting: 'app.current_company_id',
            value: '',
        });
        await supabaseAdmin.rpc('set_config', {
            setting: 'app.current_user_role',
            value: '',
        });
    } catch (error) {
        logger.error('Failed to clear tenant context', error);
    }
};

export default tenantMiddleware;
