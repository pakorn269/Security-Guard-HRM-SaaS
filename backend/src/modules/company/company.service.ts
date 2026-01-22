import { supabaseAdmin } from '../../config/supabase.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';
import type {
    Company,
    CompanySettings,
    CompanyRow,
    CreateCompanyRequest,
    UpdateCompanyRequest,
    UpdateCompanySettingsRequest,
    PublicCompanyInfo,
} from './company.types.js';

class CompanyService {
    // Map database row to Company
    private mapToCompany(row: CompanyRow): Company {
        return {
            id: row.id,
            name: row.name,
            slug: row.slug,
            logoUrl: row.logo_url,
            address: row.address,
            phone: row.phone,
            email: row.email,
            settings: {
                timezone: row.settings.timezone || 'Asia/Bangkok',
                lateThresholdMinutes: row.settings.late_threshold_minutes || 15,
                earlyLeaveThresholdMinutes: row.settings.early_leave_threshold_minutes || 15,
                clockInBeforeShiftMinutes: row.settings.clock_in_before_shift_minutes || 30,
                leaveResetMonth: row.settings.leave_reset_month || 1,
                defaultLanguage: (row.settings.default_language as 'th' | 'en') || 'th',
                allowClockInOutsideGeofence: row.settings.allow_clock_in_outside_geofence !== undefined ? row.settings.allow_clock_in_outside_geofence : false,
                geofenceRadiusMeters: row.settings.geofence_radius_meters || 500,
            },
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            licenseNumber: row.license_number,
            licenseIssuedAt: row.license_issued_at,
            licenseExpiresAt: row.license_expires_at,
        };
    }

    // Generate company slug from name
    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    // Get company by ID
    async getById(companyId: string): Promise<Company> {
        const { data, error } = await supabaseAdmin
            .from('companies')
            .select('*')
            .eq('id', companyId)
            .single();

        if (error || !data) {
            throw new NotFoundError('Company', 'ไม่พบข้อมูลบริษัท');
        }

        return this.mapToCompany(data as CompanyRow);
    }

    // Get company by slug
    async getBySlug(slug: string): Promise<Company> {
        const { data, error } = await supabaseAdmin
            .from('companies')
            .select('*')
            .eq('slug', slug)
            .single();

        if (error || !data) {
            throw new NotFoundError('Company', 'ไม่พบข้อมูลบริษัท');
        }

        return this.mapToCompany(data as CompanyRow);
    }

    // Get public company info by slug (for login page)
    async getPublicBySlug(slug: string): Promise<PublicCompanyInfo> {
        const { data, error } = await supabaseAdmin
            .from('companies')
            .select('id, name, slug, logo_url, settings')
            .eq('slug', slug)
            .single();

        if (error || !data) {
            throw new NotFoundError('Company', 'ไม่พบข้อมูลบริษัท');
        }

        const row = data as CompanyRow;

        return {
            id: row.id,
            name: row.name,
            slug: row.slug,
            logoUrl: row.logo_url,
            settings: {
                defaultLanguage: (row.settings?.default_language as 'th' | 'en') || 'th'
            }
        };
    }

    // List all companies (super admin only)
    async list(
        page: number = 1,
        pageSize: number = 20,
        search?: string
    ): Promise<{ companies: Company[]; total: number }> {
        let query = supabaseAdmin
            .from('companies')
            .select('*', { count: 'exact' });

        if (search) {
            query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);

        if (error) {
            logger.error('Failed to list companies', error);
            throw error;
        }

        return {
            companies: (data || []).map((row) => this.mapToCompany(row as CompanyRow)),
            total: count || 0,
        };
    }

    // Create company (super admin only)
    async create(data: CreateCompanyRequest): Promise<Company> {
        const slug = data.slug || this.generateSlug(data.name);

        // Check if slug exists
        const { data: existing } = await supabaseAdmin
            .from('companies')
            .select('id')
            .eq('slug', slug)
            .single();

        if (existing) {
            throw new ConflictError(
                'Company slug already exists',
                'ชื่อย่อบริษัทถูกใช้แล้ว'
            );
        }

        const { data: company, error } = await supabaseAdmin
            .from('companies')
            .insert({
                name: data.name,
                slug,
                address: data.address,
                phone: data.phone,
                email: data.email,
                license_number: data.licenseNumber,
                license_issued_at: data.licenseIssuedAt,
                license_expires_at: data.licenseExpiresAt,
            })
            .select()
            .single();

        if (error || !company) {
            logger.error('Failed to create company', error);
            throw new Error('Failed to create company');
        }

        logger.info('Company created', { companyId: company.id, name: data.name });

        return this.mapToCompany(company as CompanyRow);
    }

    // Update company
    async update(companyId: string, data: UpdateCompanyRequest): Promise<Company> {
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.address !== undefined) updateData.address = data.address;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.logoUrl !== undefined) updateData.logo_url = data.logoUrl;
        if (data.licenseNumber !== undefined) updateData.license_number = data.licenseNumber;
        if (data.licenseIssuedAt !== undefined) updateData.license_issued_at = data.licenseIssuedAt;
        if (data.licenseExpiresAt !== undefined) updateData.license_expires_at = data.licenseExpiresAt;

        const { data: company, error } = await supabaseAdmin
            .from('companies')
            .update(updateData)
            .eq('id', companyId)
            .select()
            .single();

        if (error || !company) {
            if (error?.code === 'PGRST116') {
                throw new NotFoundError('Company', 'ไม่พบข้อมูลบริษัท');
            }
            logger.error('Failed to update company', error);
            throw new Error('Failed to update company');
        }

        logger.info('Company updated', { companyId });

        return this.mapToCompany(company as CompanyRow);
    }

    // Get company settings
    async getSettings(companyId: string): Promise<CompanySettings> {
        const company = await this.getById(companyId);
        return company.settings;
    }

    // Update company settings
    async updateSettings(
        companyId: string,
        data: UpdateCompanySettingsRequest
    ): Promise<CompanySettings> {
        // Get current company to merge settings
        const current = await this.getById(companyId);

        const newSettings = {
            timezone: data.timezone ?? current.settings.timezone,
            late_threshold_minutes: data.lateThresholdMinutes ?? current.settings.lateThresholdMinutes,
            early_leave_threshold_minutes: data.earlyLeaveThresholdMinutes ?? current.settings.earlyLeaveThresholdMinutes,
            clock_in_before_shift_minutes: data.clockInBeforeShiftMinutes ?? current.settings.clockInBeforeShiftMinutes,
            leave_reset_month: data.leaveResetMonth ?? current.settings.leaveResetMonth,
            default_language: data.defaultLanguage ?? current.settings.defaultLanguage,
            allow_clock_in_outside_geofence: data.allowClockInOutsideGeofence ?? current.settings.allowClockInOutsideGeofence,
            geofence_radius_meters: data.geofenceRadiusMeters ?? current.settings.geofenceRadiusMeters,
        };

        const { data: company, error } = await supabaseAdmin
            .from('companies')
            .update({
                settings: newSettings,
                updated_at: new Date().toISOString(),
            })
            .eq('id', companyId)
            .select()
            .single();

        if (error || !company) {
            logger.error('Failed to update company settings', error);
            throw new Error('Failed to update company settings');
        }

        logger.info('Company settings updated', { companyId });

        return this.mapToCompany(company as CompanyRow).settings;
    }

    // Deactivate company (soft delete)
    async deactivate(companyId: string): Promise<void> {
        const { error } = await supabaseAdmin
            .from('companies')
            .update({
                is_active: false,
                updated_at: new Date().toISOString(),
            })
            .eq('id', companyId);

        if (error) {
            logger.error('Failed to deactivate company', error);
            throw new Error('Failed to deactivate company');
        }

        logger.info('Company deactivated', { companyId });
    }

    // Reactivate company
    async reactivate(companyId: string): Promise<void> {
        const { error } = await supabaseAdmin
            .from('companies')
            .update({
                is_active: true,
                updated_at: new Date().toISOString(),
            })
            .eq('id', companyId);

        if (error) {
            logger.error('Failed to reactivate company', error);
            throw new Error('Failed to reactivate company');
        }

        logger.info('Company reactivated', { companyId });
    }
}

export const companyService = new CompanyService();
export default companyService;
