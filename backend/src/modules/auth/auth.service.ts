import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { supabaseAdmin } from '../../config/supabase.js';
import {
    ConflictError,
    UnauthorizedError,
    NotFoundError,
    ValidationError,
} from '../../utils/errors.js';
import logger from '../../utils/logger.js';
import type {
    RegisterRequest,
    LoginRequest,
    LineLoginRequest,
    TokenPair,
    AuthUser,
    RegisterResponse,
    LoginResponse,
    RefreshResponse,
    LineIdTokenPayload,
} from './auth.types.js';
import type { JwtPayload } from '../../middleware/auth.middleware.js';

// Constants
const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = env.JWT_ACCESS_EXPIRES_IN;
const REFRESH_TOKEN_EXPIRY = env.JWT_REFRESH_EXPIRES_IN;

// Convert time string to seconds
const parseTimeToSeconds = (time: string): number => {
    const match = time.match(/^(\d+)(m|h|d)$/);
    if (!match) return 900; // Default 15 minutes
    const [, value, unit] = match;
    const num = parseInt(value, 10);
    switch (unit) {
        case 'm':
            return num * 60;
        case 'h':
            return num * 60 * 60;
        case 'd':
            return num * 60 * 60 * 24;
        default:
            return 900;
    }
};

class AuthService {
    // Generate JWT tokens
    private generateTokens(payload: JwtPayload): TokenPair {
        const accessExpiresInSeconds = parseTimeToSeconds(ACCESS_TOKEN_EXPIRY);
        const refreshExpiresInSeconds = parseTimeToSeconds(REFRESH_TOKEN_EXPIRY);

        const accessToken = jwt.sign(payload, env.JWT_SECRET, {
            expiresIn: accessExpiresInSeconds,
        });

        const refreshToken = jwt.sign(
            { userId: payload.userId, type: 'refresh' },
            env.JWT_SECRET,
            { expiresIn: refreshExpiresInSeconds }
        );

        return {
            accessToken,
            refreshToken,
            expiresIn: accessExpiresInSeconds,
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

    // Hash password
    private async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, SALT_ROUNDS);
    }

    // Verify password
    private async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    // Map database user to AuthUser
    private mapToAuthUser(user: Record<string, unknown>): AuthUser {
        return {
            id: user.id as string,
            email: user.email as string,
            role: user.role as AuthUser['role'],
            companyId: user.company_id as string,
            employeeId: user.employee_id as string | undefined,
            lineUserId: user.line_user_id as string | undefined,
            lineDisplayName: user.line_display_name as string | undefined,
            linePictureUrl: user.line_picture_url as string | undefined,
            language: (user.language as string) || 'th',
            isActive: user.is_active as boolean,
        };
    }

    // Register new company and admin user
    async register(data: RegisterRequest): Promise<RegisterResponse> {
        const { email, password, companyName, companySlug, fullName, phone } = data;

        // Generate or use provided slug
        const slug = companySlug || this.generateSlug(companyName);

        // Check if email exists
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        if (existingUser) {
            throw new ConflictError(
                'Email already registered',
                'อีเมลนี้ถูกลงทะเบียนแล้ว'
            );
        }

        // Check if company slug exists
        const { data: existingCompany } = await supabaseAdmin
            .from('companies')
            .select('id')
            .eq('slug', slug)
            .single();

        if (existingCompany) {
            throw new ConflictError(
                'Company slug already taken',
                'ชื่อย่อบริษัทถูกใช้แล้ว'
            );
        }

        // Hash password
        const passwordHash = await this.hashPassword(password);

        // Create company
        const { data: company, error: companyError } = await supabaseAdmin
            .from('companies')
            .insert({
                name: companyName,
                slug,
            })
            .select()
            .single();

        if (companyError || !company) {
            logger.error('Failed to create company', companyError);
            throw new Error('Failed to create company');
        }

        // Create admin user
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .insert({
                company_id: company.id,
                email: email.toLowerCase(),
                password_hash: passwordHash,
                role: 'company_admin',
                language: 'th',
            })
            .select()
            .single();

        if (userError || !user) {
            // Rollback company creation
            await supabaseAdmin.from('companies').delete().eq('id', company.id);
            logger.error('Failed to create user', userError);
            throw new Error('Failed to create user');
        }

        // Create employee record for admin
        const { data: employee, error: employeeError } = await supabaseAdmin
            .from('employees')
            .insert({
                company_id: company.id,
                user_id: user.id,
                employee_code: 'ADMIN-001',
                full_name: fullName,
                phone,
                hire_date: new Date().toISOString().split('T')[0],
                status: 'active',
            })
            .select()
            .single();

        if (employeeError) {
            logger.warn('Failed to create employee record', employeeError);
        }

        // Update user with employee_id
        if (employee) {
            await supabaseAdmin
                .from('users')
                .update({ employee_id: employee.id })
                .eq('id', user.id);
        }

        // Create default leave types
        await this.createDefaultLeaveTypes(company.id);

        // Create default shift templates
        await this.createDefaultShiftTemplates(company.id);

        // Generate tokens
        const tokens = this.generateTokens({
            userId: user.id,
            companyId: company.id,
            role: 'company_admin',
            email: user.email,
            employeeId: employee?.id,
        });

        logger.info('New company registered', {
            companyId: company.id,
            companyName,
            userId: user.id,
        });

        return {
            user: this.mapToAuthUser({
                ...user,
                employee_id: employee?.id,
            }),
            company: {
                id: company.id,
                name: company.name,
                slug: company.slug,
            },
            tokens,
        };
    }

    // Email/password login
    async login(data: LoginRequest): Promise<LoginResponse> {
        const { email, password } = data;

        // Find user by email
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (error || !user) {
            throw new UnauthorizedError(
                'Invalid email or password',
                'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            );
        }

        // Check if user is active
        if (!user.is_active) {
            throw new UnauthorizedError(
                'Account is deactivated',
                'บัญชีถูกระงับ'
            );
        }

        // Verify password
        if (!user.password_hash) {
            throw new UnauthorizedError(
                'Please use LINE Login for this account',
                'กรุณาเข้าสู่ระบบด้วย LINE'
            );
        }

        const isValid = await this.verifyPassword(password, user.password_hash);
        if (!isValid) {
            throw new UnauthorizedError(
                'Invalid email or password',
                'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            );
        }

        // Update last login
        await supabaseAdmin
            .from('users')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', user.id);

        // Generate tokens
        const tokens = this.generateTokens({
            userId: user.id,
            companyId: user.company_id,
            role: user.role,
            email: user.email,
            employeeId: user.employee_id,
            lineUserId: user.line_user_id,
        });

        logger.info('User logged in', { userId: user.id, email: user.email });

        return {
            user: this.mapToAuthUser(user),
            tokens,
        };
    }

    // LINE Login
    async lineLogin(data: LineLoginRequest): Promise<LoginResponse> {
        const { idToken, liffId } = data;

        logger.info('LINE login attempt', { liffId });

        // Verify LINE ID token
        const lineUser = await this.verifyLineIdToken(idToken, liffId);

        logger.info('LINE token verified successfully', {
            lineUserId: lineUser.sub,
            name: lineUser.name
        });

        // Find or create user by LINE user ID
        const { data: existingUser, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('line_user_id', lineUser.sub)
            .single();

        logger.info('User lookup result', {
            found: !!existingUser,
            error: userError?.message,
            lineUserId: lineUser.sub
        });

        if (existingUser) {
            // Existing user - update profile and login
            await supabaseAdmin
                .from('users')
                .update({
                    line_display_name: lineUser.name,
                    line_picture_url: lineUser.picture,
                    last_login_at: new Date().toISOString(),
                })
                .eq('id', existingUser.id);

            if (!existingUser.is_active) {
                throw new UnauthorizedError(
                    'Account is deactivated',
                    'บัญชีถูกระงับ'
                );
            }

            const tokens = this.generateTokens({
                userId: existingUser.id,
                companyId: existingUser.company_id,
                role: existingUser.role,
                email: existingUser.email,
                employeeId: existingUser.employee_id,
                lineUserId: existingUser.line_user_id,
            });

            logger.info('LINE user logged in', {
                userId: existingUser.id,
                lineUserId: lineUser.sub,
            });

            return {
                user: this.mapToAuthUser({
                    ...existingUser,
                    line_display_name: lineUser.name,
                    line_picture_url: lineUser.picture,
                }),
                tokens,
            };
        }

        // New LINE user - auto-create a guard account
        logger.info('Auto-creating guard user for LINE', {
            lineUserId: lineUser.sub,
            name: lineUser.name,
        });

        // Get the first company (or use a default company)
        const { data: company } = await supabaseAdmin
            .from('companies')
            .select('id')
            .limit(1)
            .single();

        if (!company) {
            throw new NotFoundError(
                'Company',
                'ไม่พบข้อมูลบริษัท กรุณาสร้างบริษัทก่อน'
            );
        }

        // Create a new guard user
        const { data: newUser, error: createError } = await supabaseAdmin
            .from('users')
            .insert({
                company_id: company.id,
                email: `line_${lineUser.sub}@guard.local`,
                role: 'guard',
                line_user_id: lineUser.sub,
                line_display_name: lineUser.name,
                line_picture_url: lineUser.picture,
                is_active: true,
                language: 'th',
            })
            .select()
            .single();

        if (createError || !newUser) {
            logger.error('Failed to create guard user', createError);
            throw new Error('Failed to create user account');
        }

        // Create an employee record for the guard
        const { data: newEmployee } = await supabaseAdmin
            .from('employees')
            .insert({
                company_id: company.id,
                user_id: newUser.id,
                employee_code: `GUARD-${lineUser.sub.slice(-6).toUpperCase()}`,
                full_name: lineUser.name || 'LINE User',
                status: 'active',
                hire_date: new Date().toISOString().split('T')[0],
            })
            .select()
            .single();

        // Update user with employee_id
        if (newEmployee) {
            await supabaseAdmin
                .from('users')
                .update({ employee_id: newEmployee.id })
                .eq('id', newUser.id);
        }

        const tokens = this.generateTokens({
            userId: newUser.id,
            companyId: company.id,
            role: 'guard',
            email: newUser.email,
            employeeId: newEmployee?.id,
            lineUserId: lineUser.sub,
        });

        logger.info('Created new guard user via LINE', {
            userId: newUser.id,
            employeeId: newEmployee?.id,
            lineUserId: lineUser.sub,
        });

        return {
            user: this.mapToAuthUser({
                ...newUser,
                employee_id: newEmployee?.id,
            }),
            tokens,
        };
    }

    // Verify LINE ID Token
    private async verifyLineIdToken(idToken: string, liffIdOrChannelId: string): Promise<LineIdTokenPayload> {
        try {
            // Extract channel ID from LIFF ID if provided (format: {channelId}-{appId})
            // LIFF ID looks like "2008914377-NDoaNvUa", we need just "2008914377"
            let channelId = liffIdOrChannelId;
            if (liffIdOrChannelId.includes('-')) {
                channelId = liffIdOrChannelId.split('-')[0];
            }

            logger.info('Verifying LINE ID token', { channelId, liffIdOrChannelId });

            // Call LINE's token verification endpoint
            const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    id_token: idToken,
                    client_id: channelId,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                logger.error('LINE token verification failed', error);
                throw new UnauthorizedError(
                    'Invalid LINE token',
                    'Token LINE ไม่ถูกต้อง'
                );
            }

            const payload = await response.json() as LineIdTokenPayload;
            return payload;
        } catch (error) {
            logger.error('LINE token verification error', error);
            throw new UnauthorizedError(
                'Failed to verify LINE token',
                'ไม่สามารถตรวจสอบ Token LINE ได้'
            );
        }
    }

    // Refresh access token
    async refreshToken(refreshToken: string): Promise<RefreshResponse> {
        try {
            const decoded = jwt.verify(refreshToken, env.JWT_SECRET) as {
                userId: string;
                type: string;
            };

            if (decoded.type !== 'refresh') {
                throw new UnauthorizedError('Invalid token type');
            }

            // Get user
            const { data: user, error } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('id', decoded.userId)
                .single();

            if (error || !user) {
                throw new UnauthorizedError('User not found');
            }

            if (!user.is_active) {
                throw new UnauthorizedError('Account is deactivated', 'บัญชีถูกระงับ');
            }

            // Generate new tokens
            const tokens = this.generateTokens({
                userId: user.id,
                companyId: user.company_id,
                role: user.role,
                email: user.email,
                employeeId: user.employee_id,
                lineUserId: user.line_user_id,
            });

            return tokens;
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new UnauthorizedError('Refresh token expired', 'Token หมดอายุ');
            }
            if (error instanceof jwt.JsonWebTokenError) {
                throw new UnauthorizedError('Invalid refresh token', 'Token ไม่ถูกต้อง');
            }
            throw error;
        }
    }

    // Get current user
    async getCurrentUser(userId: string): Promise<AuthUser> {
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !user) {
            throw new NotFoundError('User');
        }

        return this.mapToAuthUser(user);
    }

    // Create default leave types for a new company
    private async createDefaultLeaveTypes(companyId: string): Promise<void> {
        const defaultLeaveTypes = [
            {
                company_id: companyId,
                name: 'Annual Leave',
                name_th: 'ลาพักร้อน',
                is_paid: true,
                max_days_per_year: 6,
                requires_approval: true,
                sort_order: 1,
            },
            {
                company_id: companyId,
                name: 'Sick Leave',
                name_th: 'ลาป่วย',
                is_paid: true,
                max_days_per_year: 30,
                requires_approval: true,
                requires_document: true,
                sort_order: 2,
            },
            {
                company_id: companyId,
                name: 'Personal Leave',
                name_th: 'ลากิจ',
                is_paid: false,
                max_days_per_year: 3,
                requires_approval: true,
                sort_order: 3,
            },
            {
                company_id: companyId,
                name: 'Unpaid Leave',
                name_th: 'ลาโดยไม่รับค่าจ้าง',
                is_paid: false,
                max_days_per_year: null,
                requires_approval: true,
                sort_order: 4,
            },
        ];

        const { error } = await supabaseAdmin
            .from('leave_types')
            .insert(defaultLeaveTypes);

        if (error) {
            logger.warn('Failed to create default leave types', error);
        }
    }

    // Create default shift templates for a new company
    private async createDefaultShiftTemplates(companyId: string): Promise<void> {
        const defaultShiftTemplates = [
            {
                company_id: companyId,
                name: 'Day Shift',
                name_th: 'กะกลางวัน',
                start_time: '08:00',
                end_time: '17:00',
                break_minutes: 60,
                color: '#3B82F6',
            },
            {
                company_id: companyId,
                name: 'Night Shift',
                name_th: 'กะกลางคืน',
                start_time: '20:00',
                end_time: '08:00',
                break_minutes: 60,
                color: '#6366F1',
                is_overnight: true,
            },
            {
                company_id: companyId,
                name: 'Morning Shift',
                name_th: 'กะเช้า',
                start_time: '06:00',
                end_time: '14:00',
                break_minutes: 30,
                color: '#10B981',
            },
            {
                company_id: companyId,
                name: 'Evening Shift',
                name_th: 'กะบ่าย',
                start_time: '14:00',
                end_time: '22:00',
                break_minutes: 30,
                color: '#F59E0B',
            },
        ];

        const { error } = await supabaseAdmin
            .from('shift_templates')
            .insert(defaultShiftTemplates);

        if (error) {
            logger.warn('Failed to create default shift templates', error);
        }
    }

    // Link LINE account to existing user
    async linkLineAccount(
        userId: string,
        idToken: string,
        liffId: string
    ): Promise<AuthUser> {
        const lineUser = await this.verifyLineIdToken(idToken, liffId);

        // Check if LINE user ID is already linked
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('line_user_id', lineUser.sub)
            .single();

        if (existingUser && existingUser.id !== userId) {
            throw new ConflictError(
                'LINE account is already linked to another user',
                'บัญชี LINE นี้เชื่อมต่อกับผู้ใช้อื่นแล้ว'
            );
        }

        // Update user with LINE info
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .update({
                line_user_id: lineUser.sub,
                line_display_name: lineUser.name,
                line_picture_url: lineUser.picture,
            })
            .eq('id', userId)
            .select()
            .single();

        if (error || !user) {
            throw new Error('Failed to link LINE account');
        }

        logger.info('LINE account linked', {
            userId,
            lineUserId: lineUser.sub,
        });

        return this.mapToAuthUser(user);
    }
}

export const authService = new AuthService();
export default authService;
