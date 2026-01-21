import { supabaseAdmin } from '../../config/supabase.js';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';
import bcrypt from 'bcryptjs';
import type {
    User,
    UserRow,
    CreateUserRequest,
    UpdateUserRequest,
    LinkLineRequest,
    ListUsersQuery,
} from './user.types.js';

class UserService {
    // Map database row to User
    private mapToUser(row: UserRow): User {
        return {
            id: row.id,
            companyId: row.company_id,
            employeeId: row.employee_id,
            email: row.email,
            role: row.role,
            lineUserId: row.line_user_id,
            lineDisplayName: row.line_display_name,
            linePictureUrl: row.line_picture_url,
            lineLinkedAt: row.line_linked_at,
            isActive: row.is_active,
            language: row.language,
            lastLoginAt: row.last_login_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    // Get user by ID
    async getById(userId: string, companyId: string): Promise<User> {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userId)
            .eq('company_id', companyId)
            .single();

        if (error || !data) {
            throw new NotFoundError('User', 'ไม่พบข้อมูลผู้ใช้');
        }

        return this.mapToUser(data as UserRow);
    }

    // Get user by email
    async getByEmail(email: string, companyId: string): Promise<User | null> {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('company_id', companyId)
            .single();

        if (error || !data) {
            return null;
        }

        return this.mapToUser(data as UserRow);
    }

    // List users
    async list(
        companyId: string,
        query: ListUsersQuery
    ): Promise<{ users: User[]; total: number }> {
        const page = query.page || 1;
        const pageSize = query.pageSize || 20;

        let queryBuilder = supabaseAdmin
            .from('users')
            .select('*', { count: 'exact' })
            .eq('company_id', companyId);

        // Apply filters
        if (query.search) {
            queryBuilder = queryBuilder.or(
                `email.ilike.%${query.search}%,line_display_name.ilike.%${query.search}%`
            );
        }

        if (query.role) {
            queryBuilder = queryBuilder.eq('role', query.role);
        }

        if (query.isActive !== undefined) {
            queryBuilder = queryBuilder.eq('is_active', query.isActive);
        }

        const { data, error, count } = await queryBuilder
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);

        if (error) {
            logger.error('Failed to list users', error);
            throw error;
        }

        return {
            users: (data || []).map((row) => this.mapToUser(row as UserRow)),
            total: count || 0,
        };
    }

    // Create user
    async create(companyId: string, data: CreateUserRequest): Promise<User> {
        // Check if email already exists in this company
        const existing = await this.getByEmail(data.email, companyId);
        if (existing) {
            throw new ConflictError(
                'Email already exists in this company',
                'อีเมลนี้มีอยู่ในระบบแล้ว'
            );
        }

        // Hash password if provided
        let passwordHash: string | null = null;
        if (data.password) {
            passwordHash = await bcrypt.hash(data.password, 12);
        }

        const { data: user, error } = await supabaseAdmin
            .from('users')
            .insert({
                company_id: companyId,
                email: data.email.toLowerCase(),
                password_hash: passwordHash,
                role: data.role,
                employee_id: data.employeeId || null,
                language: data.language || 'th',
            })
            .select()
            .single();

        if (error || !user) {
            logger.error('Failed to create user', error);
            throw new Error('Failed to create user');
        }

        logger.info('User created', { userId: user.id, email: data.email });

        return this.mapToUser(user as UserRow);
    }

    // Update user
    async update(userId: string, companyId: string, data: UpdateUserRequest): Promise<User> {
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (data.email !== undefined) {
            // Check if email is taken by another user
            const existing = await this.getByEmail(data.email, companyId);
            if (existing && existing.id !== userId) {
                throw new ConflictError(
                    'Email already exists in this company',
                    'อีเมลนี้มีอยู่ในระบบแล้ว'
                );
            }
            updateData.email = data.email.toLowerCase();
        }

        if (data.role !== undefined) updateData.role = data.role;
        if (data.employeeId !== undefined) updateData.employee_id = data.employeeId;
        if (data.isActive !== undefined) updateData.is_active = data.isActive;
        if (data.language !== undefined) updateData.language = data.language;

        const { data: user, error } = await supabaseAdmin
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .eq('company_id', companyId)
            .select()
            .single();

        if (error || !user) {
            if (error?.code === 'PGRST116') {
                throw new NotFoundError('User', 'ไม่พบข้อมูลผู้ใช้');
            }
            logger.error('Failed to update user', error);
            throw new Error('Failed to update user');
        }

        logger.info('User updated', { userId });

        return this.mapToUser(user as UserRow);
    }

    // Change password
    async changePassword(
        userId: string,
        companyId: string,
        currentPassword: string,
        newPassword: string
    ): Promise<void> {
        // Get user with password hash
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('password_hash')
            .eq('id', userId)
            .eq('company_id', companyId)
            .single();

        if (error || !user) {
            throw new NotFoundError('User', 'ไม่พบข้อมูลผู้ใช้');
        }

        if (!user.password_hash) {
            throw new ValidationError('User does not have a password set', [
                { field: 'currentPassword', message: 'User does not have a password set' },
            ]);
        }

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValid) {
            throw new ValidationError('Current password is incorrect', [
                { field: 'currentPassword', message: 'Current password is incorrect' },
            ]);
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 12);

        // Update password
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
                password_hash: newPasswordHash,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
            .eq('company_id', companyId);

        if (updateError) {
            logger.error('Failed to change password', updateError);
            throw new Error('Failed to change password');
        }

        logger.info('Password changed', { userId });
    }

    // Link LINE account
    async linkLine(userId: string, companyId: string, data: LinkLineRequest): Promise<User> {
        // Check if LINE user ID is already linked to another user
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('line_user_id', data.lineUserId)
            .single();

        if (existingUser && existingUser.id !== userId) {
            throw new ConflictError(
                'This LINE account is already linked to another user',
                'บัญชี LINE นี้เชื่อมต่อกับผู้ใช้อื่นแล้ว'
            );
        }

        const { data: user, error } = await supabaseAdmin
            .from('users')
            .update({
                line_user_id: data.lineUserId,
                line_display_name: data.lineDisplayName || null,
                line_picture_url: data.linePictureUrl || null,
                line_linked_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
            .eq('company_id', companyId)
            .select()
            .single();

        if (error || !user) {
            logger.error('Failed to link LINE account', error);
            throw new Error('Failed to link LINE account');
        }

        logger.info('LINE account linked', { userId, lineUserId: data.lineUserId });

        return this.mapToUser(user as UserRow);
    }

    // Unlink LINE account
    async unlinkLine(userId: string, companyId: string): Promise<User> {
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .update({
                line_user_id: null,
                line_display_name: null,
                line_picture_url: null,
                line_linked_at: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
            .eq('company_id', companyId)
            .select()
            .single();

        if (error || !user) {
            logger.error('Failed to unlink LINE account', error);
            throw new Error('Failed to unlink LINE account');
        }

        logger.info('LINE account unlinked', { userId });

        return this.mapToUser(user as UserRow);
    }

    // Deactivate user (soft delete)
    async deactivate(userId: string, companyId: string): Promise<void> {
        const { error } = await supabaseAdmin
            .from('users')
            .update({
                is_active: false,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
            .eq('company_id', companyId);

        if (error) {
            logger.error('Failed to deactivate user', error);
            throw new Error('Failed to deactivate user');
        }

        logger.info('User deactivated', { userId });
    }

    // Reactivate user
    async reactivate(userId: string, companyId: string): Promise<void> {
        const { error } = await supabaseAdmin
            .from('users')
            .update({
                is_active: true,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId)
            .eq('company_id', companyId);

        if (error) {
            logger.error('Failed to reactivate user', error);
            throw new Error('Failed to reactivate user');
        }

        logger.info('User reactivated', { userId });
    }
}

export const userService = new UserService();
export default userService;
