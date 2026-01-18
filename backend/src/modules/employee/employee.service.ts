import { supabaseAdmin } from '../../config/supabase.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';
import { userService } from '../user/user.service.js';
import logger from '../../utils/logger.js';
import type {
    Employee,
    EmployeeRow,
    EmployeeWithUser,
    CreateEmployeeRequest,
    UpdateEmployeeRequest,
    ListEmployeesQuery,
    TerminateEmployeeRequest,
    Certification,
    CertificationRow,
    CreateCertificationRequest,
    UpdateCertificationRequest,
    CertificationStatus,
} from './employee.types.js';

class EmployeeService {
    // Map database row to Employee
    private mapToEmployee(row: EmployeeRow): Employee {
        return {
            id: row.id,
            companyId: row.company_id,
            userId: row.user_id,
            employeeCode: row.employee_code,
            fullName: row.full_name,
            fullNameTh: row.full_name_th,
            phone: row.phone,
            email: row.email,
            address: row.address,
            emergencyContactName: row.emergency_contact_name,
            emergencyContactPhone: row.emergency_contact_phone,
            hireDate: row.hire_date,
            terminationDate: row.termination_date,
            status: row.status,
            profileImageUrl: row.profile_image_url,
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    // Map database row to Certification
    private mapToCertification(row: CertificationRow): Certification {
        return {
            id: row.id,
            companyId: row.company_id,
            employeeId: row.employee_id,
            type: row.type,
            typeTh: row.type_th,
            licenseNumber: row.license_number,
            issueDate: row.issue_date,
            expiryDate: row.expiry_date,
            documentUrl: row.document_url,
            status: row.status,
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    // Calculate certification status based on expiry date
    private calculateCertificationStatus(expiryDate: string | null): CertificationStatus {
        if (!expiryDate) return 'valid';

        const today = new Date();
        const expiry = new Date(expiryDate);
        const daysUntilExpiry = Math.ceil(
            (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilExpiry < 0) return 'expired';
        if (daysUntilExpiry <= 30) return 'expiring_soon';
        return 'valid';
    }

    // Get employee by ID
    async getById(employeeId: string, companyId: string): Promise<Employee> {
        const { data, error } = await supabaseAdmin
            .from('employees')
            .select('*')
            .eq('id', employeeId)
            .eq('company_id', companyId)
            .single();

        if (error || !data) {
            throw new NotFoundError('Employee', 'ไม่พบข้อมูลพนักงาน');
        }

        return this.mapToEmployee(data as EmployeeRow);
    }

    // Get employee with user info
    async getByIdWithUser(employeeId: string, companyId: string): Promise<EmployeeWithUser> {
        const { data, error } = await supabaseAdmin
            .from('employees')
            .select(`
                *,
                users:user_id (
                    id,
                    email,
                    role,
                    is_active
                )
            `)
            .eq('id', employeeId)
            .eq('company_id', companyId)
            .single();

        if (error || !data) {
            throw new NotFoundError('Employee', 'ไม่พบข้อมูลพนักงาน');
        }

        const employee = this.mapToEmployee(data as EmployeeRow);
        const userData = (data as Record<string, unknown>).users as {
            id: string;
            email: string;
            role: string;
            is_active: boolean;
        } | null;

        return {
            ...employee,
            user: userData
                ? {
                    id: userData.id,
                    email: userData.email,
                    role: userData.role,
                    isActive: userData.is_active,
                }
                : null,
        };
    }

    // Get employee by code
    async getByCode(employeeCode: string, companyId: string): Promise<Employee | null> {
        const { data, error } = await supabaseAdmin
            .from('employees')
            .select('*')
            .eq('employee_code', employeeCode)
            .eq('company_id', companyId)
            .single();

        if (error || !data) {
            return null;
        }

        return this.mapToEmployee(data as EmployeeRow);
    }

    // List employees
    async list(
        companyId: string,
        query: ListEmployeesQuery
    ): Promise<{ employees: EmployeeWithUser[]; total: number }> {
        const page = query.page || 1;
        const pageSize = query.pageSize || 20;

        let queryBuilder = supabaseAdmin
            .from('employees')
            .select(
                `
                *,
                users:user_id (
                    id,
                    email,
                    role,
                    is_active
                )
            `,
                { count: 'exact' }
            )
            .eq('company_id', companyId);

        // Apply filters
        if (query.search) {
            queryBuilder = queryBuilder.or(
                `full_name.ilike.%${query.search}%,full_name_th.ilike.%${query.search}%,employee_code.ilike.%${query.search}%,phone.ilike.%${query.search}%,email.ilike.%${query.search}%`
            );
        }

        if (query.status) {
            queryBuilder = queryBuilder.eq('status', query.status);
        }

        if (query.hasUser !== undefined) {
            if (query.hasUser) {
                queryBuilder = queryBuilder.not('user_id', 'is', null);
            } else {
                queryBuilder = queryBuilder.is('user_id', null);
            }
        }

        const { data, error, count } = await queryBuilder
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);

        if (error) {
            logger.error('Failed to list employees', error);
            throw error;
        }

        const employees = (data || []).map((row) => {
            const employee = this.mapToEmployee(row as EmployeeRow);
            const userData = (row as Record<string, unknown>).users as {
                id: string;
                email: string;
                role: string;
                is_active: boolean;
            } | null;

            return {
                ...employee,
                user: userData
                    ? {
                        id: userData.id,
                        email: userData.email,
                        role: userData.role,
                        isActive: userData.is_active,
                    }
                    : null,
            };
        });

        return {
            employees,
            total: count || 0,
        };
    }

    // Create employee
    async create(companyId: string, data: CreateEmployeeRequest): Promise<Employee> {
        // Check if employee code already exists
        const existing = await this.getByCode(data.employeeCode, companyId);
        if (existing) {
            throw new ConflictError(
                'Employee code already exists',
                'รหัสพนักงานนี้มีอยู่ในระบบแล้ว'
            );
        }

        let userId: string | null = null;

        // Create user account if requested
        if (data.createUserAccount && data.email && data.userPassword) {
            const user = await userService.create(companyId, {
                email: data.email,
                password: data.userPassword,
                role: data.userRole || 'guard',
                language: 'th',
            });
            userId = user.id;
        }

        const { data: employee, error } = await supabaseAdmin
            .from('employees')
            .insert({
                company_id: companyId,
                user_id: userId,
                employee_code: data.employeeCode,
                full_name: data.fullName,
                full_name_th: data.fullNameTh || null,
                phone: data.phone || null,
                email: data.email || null,
                address: data.address || null,
                emergency_contact_name: data.emergencyContactName || null,
                emergency_contact_phone: data.emergencyContactPhone || null,
                hire_date: data.hireDate,
                notes: data.notes || null,
                profile_image_url: data.profileImageUrl || null,
            })
            .select()
            .single();

        if (error || !employee) {
            logger.error('Failed to create employee', error);
            throw new Error('Failed to create employee');
        }

        // If user was created, update the user's employee_id reference
        if (userId) {
            await supabaseAdmin
                .from('users')
                .update({ employee_id: employee.id })
                .eq('id', userId);
        }

        logger.info('Employee created', {
            employeeId: employee.id,
            employeeCode: data.employeeCode,
        });

        return this.mapToEmployee(employee as EmployeeRow);
    }

    // Update employee
    async update(
        employeeId: string,
        companyId: string,
        data: UpdateEmployeeRequest
    ): Promise<Employee> {
        // Check if employee code is being changed and if it's unique
        if (data.employeeCode) {
            const existing = await this.getByCode(data.employeeCode, companyId);
            if (existing && existing.id !== employeeId) {
                throw new ConflictError(
                    'Employee code already exists',
                    'รหัสพนักงานนี้มีอยู่ในระบบแล้ว'
                );
            }
        }

        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (data.employeeCode !== undefined) updateData.employee_code = data.employeeCode;
        if (data.fullName !== undefined) updateData.full_name = data.fullName;
        if (data.fullNameTh !== undefined) updateData.full_name_th = data.fullNameTh;
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.address !== undefined) updateData.address = data.address;
        if (data.emergencyContactName !== undefined)
            updateData.emergency_contact_name = data.emergencyContactName;
        if (data.emergencyContactPhone !== undefined)
            updateData.emergency_contact_phone = data.emergencyContactPhone;
        if (data.hireDate !== undefined) updateData.hire_date = data.hireDate;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.profileImageUrl !== undefined)
            updateData.profile_image_url = data.profileImageUrl;

        const { data: employee, error } = await supabaseAdmin
            .from('employees')
            .update(updateData)
            .eq('id', employeeId)
            .eq('company_id', companyId)
            .select()
            .single();

        if (error || !employee) {
            if (error?.code === 'PGRST116') {
                throw new NotFoundError('Employee', 'ไม่พบข้อมูลพนักงาน');
            }
            logger.error('Failed to update employee', error);
            throw new Error('Failed to update employee');
        }

        logger.info('Employee updated', { employeeId });

        return this.mapToEmployee(employee as EmployeeRow);
    }

    // Terminate employee
    async terminate(
        employeeId: string,
        companyId: string,
        data: TerminateEmployeeRequest
    ): Promise<Employee> {
        const { data: employee, error } = await supabaseAdmin
            .from('employees')
            .update({
                status: 'terminated',
                termination_date: data.terminationDate,
                notes: data.notes,
                updated_at: new Date().toISOString(),
            })
            .eq('id', employeeId)
            .eq('company_id', companyId)
            .select()
            .single();

        if (error || !employee) {
            throw new NotFoundError('Employee', 'ไม่พบข้อมูลพนักงาน');
        }

        // Deactivate the associated user if exists
        if (employee.user_id) {
            await supabaseAdmin
                .from('users')
                .update({
                    is_active: false,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', employee.user_id);
        }

        logger.info('Employee terminated', { employeeId });

        return this.mapToEmployee(employee as EmployeeRow);
    }

    // Reactivate employee
    async reactivate(employeeId: string, companyId: string): Promise<Employee> {
        const { data: employee, error } = await supabaseAdmin
            .from('employees')
            .update({
                status: 'active',
                termination_date: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', employeeId)
            .eq('company_id', companyId)
            .select()
            .single();

        if (error || !employee) {
            throw new NotFoundError('Employee', 'ไม่พบข้อมูลพนักงาน');
        }

        logger.info('Employee reactivated', { employeeId });

        return this.mapToEmployee(employee as EmployeeRow);
    }

    // Link employee to user
    async linkToUser(employeeId: string, userId: string, companyId: string): Promise<Employee> {
        // Verify user exists and belongs to the same company
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('id', userId)
            .eq('company_id', companyId)
            .single();

        if (!user) {
            throw new NotFoundError('User', 'ไม่พบข้อมูลผู้ใช้');
        }

        // Update employee
        const { data: employee, error } = await supabaseAdmin
            .from('employees')
            .update({
                user_id: userId,
                updated_at: new Date().toISOString(),
            })
            .eq('id', employeeId)
            .eq('company_id', companyId)
            .select()
            .single();

        if (error || !employee) {
            throw new NotFoundError('Employee', 'ไม่พบข้อมูลพนักงาน');
        }

        // Update user to reference this employee
        await supabaseAdmin
            .from('users')
            .update({
                employee_id: employeeId,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

        logger.info('Employee linked to user', { employeeId, userId });

        return this.mapToEmployee(employee as EmployeeRow);
    }

    // === Certification Methods ===

    // Get certifications for employee
    async getCertifications(employeeId: string, companyId: string): Promise<Certification[]> {
        const { data, error } = await supabaseAdmin
            .from('certifications')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('company_id', companyId)
            .order('expiry_date', { ascending: true, nullsFirst: false });

        if (error) {
            logger.error('Failed to get certifications', error);
            throw error;
        }

        return (data || []).map((row) => this.mapToCertification(row as CertificationRow));
    }

    // Get certification by ID
    async getCertificationById(
        certificationId: string,
        companyId: string
    ): Promise<Certification> {
        const { data, error } = await supabaseAdmin
            .from('certifications')
            .select('*')
            .eq('id', certificationId)
            .eq('company_id', companyId)
            .single();

        if (error || !data) {
            throw new NotFoundError('Certification', 'ไม่พบข้อมูลใบรับรอง');
        }

        return this.mapToCertification(data as CertificationRow);
    }

    // Create certification
    async createCertification(
        employeeId: string,
        companyId: string,
        data: CreateCertificationRequest
    ): Promise<Certification> {
        // Verify employee exists
        await this.getById(employeeId, companyId);

        const status = this.calculateCertificationStatus(data.expiryDate || null);

        const { data: certification, error } = await supabaseAdmin
            .from('certifications')
            .insert({
                company_id: companyId,
                employee_id: employeeId,
                type: data.type,
                type_th: data.typeTh || null,
                license_number: data.licenseNumber || null,
                issue_date: data.issueDate,
                expiry_date: data.expiryDate || null,
                document_url: data.documentUrl || null,
                status,
                notes: data.notes || null,
            })
            .select()
            .single();

        if (error || !certification) {
            logger.error('Failed to create certification', error);
            throw new Error('Failed to create certification');
        }

        logger.info('Certification created', {
            certificationId: certification.id,
            employeeId,
            type: data.type,
        });

        return this.mapToCertification(certification as CertificationRow);
    }

    // Update certification
    async updateCertification(
        certificationId: string,
        companyId: string,
        data: UpdateCertificationRequest
    ): Promise<Certification> {
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (data.type !== undefined) updateData.type = data.type;
        if (data.typeTh !== undefined) updateData.type_th = data.typeTh;
        if (data.licenseNumber !== undefined) updateData.license_number = data.licenseNumber;
        if (data.issueDate !== undefined) updateData.issue_date = data.issueDate;
        if (data.expiryDate !== undefined) {
            updateData.expiry_date = data.expiryDate;
            updateData.status = this.calculateCertificationStatus(data.expiryDate);
        }
        if (data.documentUrl !== undefined) updateData.document_url = data.documentUrl;
        if (data.notes !== undefined) updateData.notes = data.notes;

        const { data: certification, error } = await supabaseAdmin
            .from('certifications')
            .update(updateData)
            .eq('id', certificationId)
            .eq('company_id', companyId)
            .select()
            .single();

        if (error || !certification) {
            if (error?.code === 'PGRST116') {
                throw new NotFoundError('Certification', 'ไม่พบข้อมูลใบรับรอง');
            }
            logger.error('Failed to update certification', error);
            throw new Error('Failed to update certification');
        }

        logger.info('Certification updated', { certificationId });

        return this.mapToCertification(certification as CertificationRow);
    }

    // Delete certification
    async deleteCertification(certificationId: string, companyId: string): Promise<void> {
        const { error } = await supabaseAdmin
            .from('certifications')
            .delete()
            .eq('id', certificationId)
            .eq('company_id', companyId);

        if (error) {
            logger.error('Failed to delete certification', error);
            throw new Error('Failed to delete certification');
        }

        logger.info('Certification deleted', { certificationId });
    }

    // Get expiring certifications
    async getExpiringCertifications(
        companyId: string,
        daysAhead: number = 30
    ): Promise<Certification[]> {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        const { data, error } = await supabaseAdmin
            .from('certifications')
            .select('*')
            .eq('company_id', companyId)
            .lte('expiry_date', futureDate.toISOString().split('T')[0])
            .gte('expiry_date', new Date().toISOString().split('T')[0])
            .order('expiry_date', { ascending: true });

        if (error) {
            logger.error('Failed to get expiring certifications', error);
            throw error;
        }

        return (data || []).map((row) => this.mapToCertification(row as CertificationRow));
    }
}

export const employeeService = new EmployeeService();
export default employeeService;
