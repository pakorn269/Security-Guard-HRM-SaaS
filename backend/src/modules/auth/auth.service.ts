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
    PhoneLoginRequest,
    SetPinRequest,
    ForgotPinRequest,
    VerifyResetCodeRequest,
    SessionInfo,
    SessionContext,
} from './auth.types.js';
import type { JwtPayload, LiffContext } from '../../middleware/auth.middleware.js';
import { PhoneUtils } from '../../utils/phone.js';
import { sessionService } from './session.service.js';

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
    private generateTokens(
        payload: JwtPayload,
        sessionId: string,
        liffContext?: LiffContext
    ): TokenPair {
        const accessExpiresInSeconds = parseTimeToSeconds(ACCESS_TOKEN_EXPIRY);
        const refreshExpiresInSeconds = parseTimeToSeconds(REFRESH_TOKEN_EXPIRY);

        // Add LIFF context and sessionId to payload
        const fullPayload = {
            ...payload,
            sessionId,
            ...(liffContext && { liffContext }),
        };

        const accessToken = jwt.sign(fullPayload, env.JWT_SECRET, {
            expiresIn: accessExpiresInSeconds,
        });

        // Refresh token includes sessionId and LIFF context for inheritance
        const refreshToken = jwt.sign(
            {
                userId: payload.userId,
                sessionId,
                type: 'refresh',
                liffContext,
            },
            env.JWT_SECRET,
            { expiresIn: refreshExpiresInSeconds }
        );

        return {
            accessToken,
            refreshToken,
            expiresIn: accessExpiresInSeconds,
        };
    }

    // Get refresh token expiry date
    private getRefreshTokenExpiryDate(): Date {
        const expiresInSeconds = parseTimeToSeconds(REFRESH_TOKEN_EXPIRY);
        return new Date(Date.now() + expiresInSeconds * 1000);
    }

    // Create session and generate tokens
    private async createSessionAndTokens(
        payload: JwtPayload,
        options?: {
            userAgent?: string;
            ipAddress?: string;
            isLiff?: boolean;
            liffContext?: LiffContext;
        }
    ): Promise<TokenPair> {
        const expiresAt = this.getRefreshTokenExpiryDate();

        // Generate tokens first (we need the refresh token for hashing)
        // We'll use a temporary sessionId, then create the session with the token hash
        const tempTokens = this.generateTokens(payload, 'temp', options?.liffContext);

        // Create session and get the real sessionId
        const sessionId = await sessionService.createSession({
            userId: payload.userId,
            companyId: payload.companyId,
            refreshToken: tempTokens.refreshToken,
            deviceType: options?.isLiff ? 'liff' : sessionService.detectDeviceType(options?.userAgent),
            userAgent: options?.userAgent,
            ipAddress: options?.ipAddress,
            expiresAt,
        });

        // Generate final tokens with real sessionId
        return this.generateTokens(payload, sessionId, options?.liffContext);
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
            hasPin: !!(user.password_hash),
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

        // Create session and generate tokens
        const tokens = await this.createSessionAndTokens({
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
    async login(data: LoginRequest, sessionContext?: SessionContext): Promise<LoginResponse> {
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

        // Create session and generate tokens
        const tokens = await this.createSessionAndTokens(
            {
                userId: user.id,
                companyId: user.company_id,
                role: user.role,
                email: user.email,
                employeeId: user.employee_id,
                lineUserId: user.line_user_id,
            },
            {
                userAgent: sessionContext?.userAgent,
                ipAddress: sessionContext?.ipAddress,
                isLiff: sessionContext?.isLiff,
            }
        );

        logger.info('User logged in', { userId: user.id, email: user.email });

        return {
            user: this.mapToAuthUser(user),
            tokens,
        };
    }

    // Phone + PIN Login
    async phoneLogin(data: PhoneLoginRequest, sessionContext?: SessionContext): Promise<LoginResponse> {
        const { companySlug, phone, pin, turnstileToken } = data;

        // Verify Turnstile (skip in dev/test for now, or assume frontend handles it)
        // TODO: Implement Turnstile verification if keys are available

        // Normalize phone
        const normalizedPhone = PhoneUtils.normalize(phone);

        // Find company by slug
        const { data: company, error: companyError } = await supabaseAdmin
            .from('companies')
            .select('id')
            .eq('slug', companySlug)
            .single();

        if (companyError || !company) {
            // Use generic error for security, but log specific
            logger.warn(`Company not found for slug: ${companySlug}`);
            throw new UnauthorizedError(
                'Invalid phone number or PIN',
                'เบอร์โทรศัพท์หรือรหัส PIN ไม่ถูกต้อง'
            );
        }

        // Find employee by phone and company
        // We look up employee first because guards might not know their email/username
        const { data: employee, error: employeeError } = await supabaseAdmin
            .from('employees')
            .select('id, user_id')
            .eq('company_id', company.id)
            .eq('phone', normalizedPhone)
            .single();

        if (employeeError || !employee || !employee.user_id) {
            logger.warn(`Employee not found or no user linked for phone: ${normalizedPhone} in company: ${companySlug}`);
            throw new UnauthorizedError(
                'Invalid phone number or PIN',
                'เบอร์โทรศัพท์หรือรหัส PIN ไม่ถูกต้อง'
            );
        }

        // Get user details
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', employee.user_id)
            .single();

        if (userError || !user) {
            logger.warn(`User not found for employee: ${employee.user_id}`);
            throw new UnauthorizedError(
                'Invalid phone number or PIN',
                'เบอร์โทรศัพท์หรือรหัส PIN ไม่ถูกต้อง'
            );
        }

        // Check account status
        if (!user.is_active) {
            throw new UnauthorizedError(
                'Account is deactivated',
                'บัญชีถูกระงับ'
            );
        }

        // Check PIN lockout
        if (user.pin_locked_until && new Date(user.pin_locked_until) > new Date()) {
            const minutesLeft = Math.ceil((new Date(user.pin_locked_until).getTime() - new Date().getTime()) / 60000);
            throw new UnauthorizedError(
                `Account locked. Please wait ${minutesLeft} minutes.`,
                `บัญชีถูกล็อค กรุณารอ ${minutesLeft} นาที`
            );
        }

        // Verify PIN (using password logic)
        if (!user.password_hash) {
            throw new UnauthorizedError(
                'PIN not set. Please set PIN first.',
                'ยังไม่ได้ตั้งรหัส PIN กรุณาตั้งค่าก่อนใช้งาน'
            );
        }

        const isValid = await this.verifyPassword(pin, user.password_hash);

        if (!isValid) {
            // Increment failed attempts
            const attempts = (user.pin_attempts || 0) + 1;
            let lockedUntil: Date | null = null;

            // Lockout logic: 5 attempts = 15m, 10 attempts = 1h, 15 attempts = admin unlock (indefinite/long)
            if (attempts >= 15) {
                // Lock for 1 year (effective admin unlock needed)
                lockedUntil = new Date();
                lockedUntil.setFullYear(lockedUntil.getFullYear() + 1);
            } else if (attempts >= 10) {
                lockedUntil = new Date();
                lockedUntil.setHours(lockedUntil.getHours() + 1);
            } else if (attempts >= 5) {
                lockedUntil = new Date();
                lockedUntil.setMinutes(lockedUntil.getMinutes() + 15);
            }

            await supabaseAdmin
                .from('users')
                .update({
                    pin_attempts: attempts,
                    pin_locked_until: lockedUntil ? lockedUntil.toISOString() : null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            throw new UnauthorizedError(
                'Invalid phone number or PIN',
                'เบอร์โทรศัพท์หรือรหัส PIN ไม่ถูกต้อง'
            );
        }

        // Reset failed attempts on success AND ensure employee_id is linked
        const updateData: any = {
            pin_attempts: 0,
            pin_locked_until: null,
            last_login_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Self-heal: If user record is missing employee_id, link it now
        if (!user.employee_id && employee.id) {
            updateData.employee_id = employee.id;
            // Update local user object for token generation
            user.employee_id = employee.id;
        }

        await supabaseAdmin
            .from('users')
            .update(updateData)
            .eq('id', user.id);

        // Create session and generate tokens
        const tokens = await this.createSessionAndTokens(
            {
                userId: user.id,
                companyId: user.company_id,
                role: user.role,
                email: user.email,
                employeeId: user.employee_id,
                lineUserId: user.line_user_id,
            },
            {
                userAgent: sessionContext?.userAgent,
                ipAddress: sessionContext?.ipAddress,
                isLiff: sessionContext?.isLiff,
            }
        );

        logger.info('User logged in via phone', { userId: user.id, companyId: company.id });

        return {
            user: this.mapToAuthUser(user),
            tokens,
        };
    }

    // Set PIN
    async setPin(userId: string, data: SetPinRequest): Promise<void> {
        const { currentPin, newPin, resetToken } = data;

        // Get user to check current state
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error || !user) {
            throw new NotFoundError('User', 'ไม่พบข้อมูลผู้ใช้');
        }

        // Check if this is first-time setup
        const isFirstTime = !user.password_hash;

        if (!isFirstTime && !resetToken) {
            // Changing PIN - require current PIN
            if (!currentPin) {
                throw new ValidationError('Current PIN is required', [
                    { field: 'currentPin', message: 'กรุณาระรหัส PIN เดิม' }
                ]);
            }

            const isValid = await this.verifyPassword(currentPin, user.password_hash);
            if (!isValid) {
                throw new ValidationError('Current PIN is incorrect', [
                    { field: 'currentPin', message: 'รหัส PIN เดิมไม่ถูกต้อง' }
                ]);
            }
        }

        // Hash new PIN
        const pinHash = await this.hashPassword(newPin);

        // Update user
        await supabaseAdmin
            .from('users')
            .update({
                password_hash: pinHash,
                pin_set_at: new Date().toISOString(),
                pin_attempts: 0,
                pin_locked_until: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        logger.info('PIN set successfully', { userId });
    }

    // Setup PIN (First-time setup without authentication)
    // This is for users whose PIN was reset by admin
    async setupPin(data: { companySlug: string; phone: string; newPin: string }): Promise<LoginResponse> {
        const { companySlug, phone, newPin } = data;
        const normalizedPhone = PhoneUtils.normalize(phone);

        // Find company by slug
        const { data: company, error: companyError } = await supabaseAdmin
            .from('companies')
            .select('id')
            .eq('slug', companySlug)
            .single();

        if (companyError || !company) {
            throw new UnauthorizedError(
                'Invalid phone number',
                'เบอร์โทรศัพท์ไม่ถูกต้อง'
            );
        }

        // Find employee by phone and company
        const { data: employee, error: employeeError } = await supabaseAdmin
            .from('employees')
            .select('id, user_id')
            .eq('company_id', company.id)
            .eq('phone', normalizedPhone)
            .single();

        if (employeeError || !employee || !employee.user_id) {
            throw new UnauthorizedError(
                'Invalid phone number',
                'เบอร์โทรศัพท์ไม่ถูกต้อง'
            );
        }

        // Get user details
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', employee.user_id)
            .single();

        if (userError || !user) {
            throw new UnauthorizedError(
                'Invalid phone number',
                'เบอร์โทรศัพท์ไม่ถูกต้อง'
            );
        }

        // Check account status
        if (!user.is_active) {
            throw new UnauthorizedError(
                'Account is deactivated',
                'บัญชีถูกระงับ'
            );
        }

        // IMPORTANT: Only allow if PIN is not set (password_hash is null)
        // This prevents unauthorized PIN changes
        if (user.password_hash) {
            throw new UnauthorizedError(
                'PIN is already set. Please use login to access your account.',
                'รหัส PIN ถูกตั้งค่าแล้ว กรุณาเข้าสู่ระบบด้วยรหัส PIN ของคุณ'
            );
        }

        // Hash new PIN
        const pinHash = await this.hashPassword(newPin);

        // Update user with new PIN AND ensure employee_id is linked
        const updateData: any = {
            password_hash: pinHash,
            pin_set_at: new Date().toISOString(),
            pin_attempts: 0,
            pin_locked_until: null,
            last_login_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Self-heal: If user record is missing employee_id, link it now
        if (!user.employee_id && employee.id) {
            updateData.employee_id = employee.id;
            // Update local user object for token generation
            user.employee_id = employee.id;
        }

        await supabaseAdmin
            .from('users')
            .update(updateData)
            .eq('id', user.id);

        // Create session and generate tokens (auto-login after PIN setup)
        const tokens = await this.createSessionAndTokens({
            userId: user.id,
            companyId: user.company_id,
            role: user.role,
            email: user.email,
            employeeId: user.employee_id,
            lineUserId: user.line_user_id,
        });

        logger.info('First-time PIN setup successful', { userId: user.id, companyId: company.id });

        return {
            user: this.mapToAuthUser({ ...user, password_hash: pinHash }),
            tokens,
        };
    }

    // Forgot PIN - Send Reset Code
    async forgotPin(data: ForgotPinRequest): Promise<void> {
        const { companySlug, phone } = data;
        const normalizedPhone = PhoneUtils.normalize(phone);

        // Find company
        const { data: company } = await supabaseAdmin
            .from('companies')
            .select('id')
            .eq('slug', companySlug)
            .single();

        if (!company) {
            // Silent error to prevent enumeration
            return;
        }

        // Find employee
        const { data: employee } = await supabaseAdmin
            .from('employees')
            .select('user_id')
            .eq('company_id', company.id)
            .eq('phone', normalizedPhone)
            .single();

        if (!employee || !employee.user_id) {
            return;
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Hash code
        const codeHash = await this.hashPassword(code);

        // Expiry (10 mins)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        // Store code
        await supabaseAdmin
            .from('users')
            .update({
                reset_code_hash: codeHash,
                reset_code_expires_at: expiresAt.toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', employee.user_id);

        // Send SMS (Skipped as per request)
        // Log locally for testing
        logger.info(`[MOCK SMS] Reset code for ${phone}: ${code}`);
    }

    // Verify Reset Code
    async verifyResetCode(data: VerifyResetCodeRequest): Promise<LoginResponse> {
        const { companySlug, phone, code } = data;
        const normalizedPhone = PhoneUtils.normalize(phone);

        // Find company
        const { data: company } = await supabaseAdmin
            .from('companies')
            .select('id')
            .eq('slug', companySlug)
            .single();

        if (!company) {
            throw new UnauthorizedError('Invalid code', 'รหัสไม่ถูกต้อง');
        }

        // Find employee
        const { data: employee } = await supabaseAdmin
            .from('employees')
            .select('user_id')
            .eq('company_id', company.id)
            .eq('phone', normalizedPhone)
            .single();

        if (!employee || !employee.user_id) {
            throw new UnauthorizedError('Invalid code', 'รหัสไม่ถูกต้อง');
        }

        // Get user
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', employee.user_id)
            .single();

        if (!user || !user.reset_code_hash || !user.reset_code_expires_at) {
            throw new UnauthorizedError('Invalid code', 'รหัสไม่ถูกต้อง');
        }

        // Check expiry
        if (new Date() > new Date(user.reset_code_expires_at)) {
            throw new UnauthorizedError('Code expired', 'รหัสหมดอายุ');
        }

        // Verify code
        const isValid = await this.verifyPassword(code, user.reset_code_hash);
        if (!isValid) {
            throw new UnauthorizedError('Invalid code', 'รหัสไม่ถูกต้อง');
        }

        // Clear code
        await supabaseAdmin
            .from('users')
            .update({
                reset_code_hash: null,
                reset_code_expires_at: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        // Create session and generate tokens (auto-login after reset code verification)
        // User will be redirected to set-pin page by frontend
        const tokens = await this.createSessionAndTokens({
            userId: user.id,
            companyId: user.company_id,
            role: user.role,
            email: user.email,
            employeeId: user.employee_id,
            lineUserId: user.line_user_id,
        });

        return {
            user: this.mapToAuthUser(user),
            tokens
        };
    }

    // Admin Reset PIN (Clear PIN)
    async adminResetPin(userId: string): Promise<void> {
        // Find user
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

        if (error || !user) {
            throw new NotFoundError('User', 'ไม่พบข้อมูลผู้ใช้');
        }

        // Perform reset
        await supabaseAdmin
            .from('users')
            .update({
                password_hash: null, // Clear PIN
                pin_attempts: 0,
                pin_locked_until: null,
                pin_set_at: null,
                reset_code_hash: null,
                reset_code_expires_at: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        logger.info('PIN reset by admin', { userId });
    }

    // LINE Login
    async lineLogin(data: LineLoginRequest, sessionContext?: SessionContext): Promise<LoginResponse> {
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

            // Create session and generate tokens
            const tokens = await this.createSessionAndTokens(
                {
                    userId: existingUser.id,
                    companyId: existingUser.company_id,
                    role: existingUser.role,
                    email: existingUser.email,
                    employeeId: existingUser.employee_id,
                    lineUserId: existingUser.line_user_id,
                },
                {
                    userAgent: sessionContext?.userAgent,
                    ipAddress: sessionContext?.ipAddress,
                    isLiff: true, // LINE login is always LIFF
                }
            );

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

        // Create session and generate tokens
        const tokens = await this.createSessionAndTokens(
            {
                userId: newUser.id,
                companyId: company.id,
                role: 'guard',
                email: newUser.email,
                employeeId: newEmployee?.id,
                lineUserId: lineUser.sub,
            },
            {
                userAgent: sessionContext?.userAgent,
                ipAddress: sessionContext?.ipAddress,
                isLiff: true,
            }
        );

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

    // Refresh access token with session validation and rotation
    async refreshToken(refreshToken: string): Promise<RefreshResponse> {
        try {
            const decoded = jwt.verify(refreshToken, env.JWT_SECRET) as {
                userId: string;
                sessionId: string;
                type: string;
                liffContext?: LiffContext;
            };

            if (decoded.type !== 'refresh') {
                throw new UnauthorizedError('Invalid token type');
            }

            // Validate session exists and token matches
            const session = await sessionService.validateRefreshToken(refreshToken, decoded.sessionId);
            if (!session) {
                throw new UnauthorizedError('Session expired or revoked', 'Session หมดอายุหรือถูกยกเลิก');
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
                // Revoke session since user is deactivated
                await sessionService.revokeSession(decoded.sessionId, user.id, 'user_deactivated');
                throw new UnauthorizedError('Account is deactivated', 'บัญชีถูกระงับ');
            }

            // Generate new tokens with same sessionId
            const tokens = this.generateTokens(
                {
                    userId: user.id,
                    companyId: user.company_id,
                    role: user.role,
                    email: user.email,
                    employeeId: user.employee_id,
                    lineUserId: user.line_user_id,
                },
                decoded.sessionId,
                decoded.liffContext
            );

            // Rotate refresh token in database
            const newExpiresAt = this.getRefreshTokenExpiryDate();
            await sessionService.rotateRefreshToken(decoded.sessionId, tokens.refreshToken, newExpiresAt);

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
                line_linked_at: new Date().toISOString(),
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

    // ============================================================
    // LIFF Account Linking Methods
    // ============================================================

    // Verify LINE token and check if user is linked
    async lineVerify(idToken: string, liffId: string): Promise<{
        isLinked: boolean;
        user?: AuthUser;
        tokens?: TokenPair;
        lineProfile?: {
            userId: string;
            displayName: string | null;
            pictureUrl: string | null;
        };
    }> {
        logger.info('LINE verify attempt', { liffId });

        // Verify LINE ID token
        const lineUser = await this.verifyLineIdToken(idToken, liffId);

        logger.info('LINE token verified for verify endpoint', {
            lineUserId: lineUser.sub,
            name: lineUser.name
        });

        // Check if LINE user ID is already linked to a user
        const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('line_user_id', lineUser.sub)
            .single();

        if (existingUser) {
            // User is linked - return user data and tokens
            if (!existingUser.is_active) {
                throw new UnauthorizedError(
                    'Account is deactivated',
                    'บัญชีถูกระงับ'
                );
            }

            // Update profile info
            await supabaseAdmin
                .from('users')
                .update({
                    line_display_name: lineUser.name,
                    line_picture_url: lineUser.picture,
                    last_login_at: new Date().toISOString(),
                })
                .eq('id', existingUser.id);

            // Create session and generate tokens
            const tokens = await this.createSessionAndTokens(
                {
                    userId: existingUser.id,
                    companyId: existingUser.company_id,
                    role: existingUser.role,
                    email: existingUser.email,
                    employeeId: existingUser.employee_id,
                    lineUserId: existingUser.line_user_id,
                },
                {
                    isLiff: true,
                }
            );

            logger.info('LINE user verified - already linked', {
                userId: existingUser.id,
                lineUserId: lineUser.sub,
            });

            return {
                isLinked: true,
                user: this.mapToAuthUser({
                    ...existingUser,
                    line_display_name: lineUser.name,
                    line_picture_url: lineUser.picture,
                }),
                tokens,
            };
        }

        // User not linked - return LINE profile for linking flow
        logger.info('LINE user verified - not linked', {
            lineUserId: lineUser.sub,
        });

        return {
            isLinked: false,
            lineProfile: {
                userId: lineUser.sub,
                displayName: lineUser.name || null,
                pictureUrl: lineUser.picture || null,
            },
        };
    }

    // Link LINE account to employee via employee code + phone (for guards)
    async linkEmployee(
        idToken: string,
        liffId: string,
        employeeCode: string,
        phone: string,
        companySlug: string,
        sessionContext?: SessionContext
    ): Promise<LoginResponse> {
        logger.info('Link employee attempt', { employeeCode, companySlug });

        // Verify LINE ID token
        const lineUser = await this.verifyLineIdToken(idToken, liffId);

        // Check if this LINE is already linked to another account
        const { data: existingLineUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('line_user_id', lineUser.sub)
            .single();

        if (existingLineUser) {
            throw new ConflictError(
                'This LINE account is already linked to another user',
                'บัญชี LINE นี้เชื่อมต่อกับบัญชีอื่นแล้ว'
            );
        }

        // Find company by slug
        const { data: company, error: companyError } = await supabaseAdmin
            .from('companies')
            .select('id')
            .eq('slug', companySlug)
            .single();

        if (companyError || !company) {
            throw new NotFoundError(
                'Company not found',
                'ไม่พบข้อมูลบริษัท'
            );
        }

        // Find employee by company + employee_code
        const { data: employee, error: employeeError } = await supabaseAdmin
            .from('employees')
            .select('*, users!employees_user_id_fkey(*)')
            .eq('company_id', company.id)
            .eq('employee_code', employeeCode)
            .single();

        if (employeeError || !employee) {
            throw new NotFoundError(
                'Employee not found',
                'ไม่พบข้อมูลพนักงาน'
            );
        }

        // Normalize phone numbers for comparison (remove leading 0, spaces, dashes)
        const normalizePhone = (p: string | null): string => {
            if (!p) return '';
            return p.replace(/[\s\-]/g, '').replace(/^0/, '');
        };

        const inputPhone = normalizePhone(phone);
        const employeePhone = normalizePhone(employee.phone);

        if (inputPhone !== employeePhone) {
            throw new ValidationError(
                'Phone number does not match',
                [{
                    field: 'phone',
                    message: 'Phone number does not match employee record',
                    message_th: 'เบอร์โทรศัพท์ไม่ตรงกับข้อมูลพนักงาน',
                }]
            );
        }

        // Check if employee has a user account
        let user = employee.users;

        if (user) {
            // Check if user already has LINE linked
            if (user.line_user_id) {
                throw new ConflictError(
                    'This employee account is already linked to a LINE account',
                    'บัญชีพนักงานนี้เชื่อมต่อกับ LINE อื่นแล้ว'
                );
            }

            // Update existing user with LINE info
            const { data: updatedUser, error: updateError } = await supabaseAdmin
                .from('users')
                .update({
                    line_user_id: lineUser.sub,
                    line_display_name: lineUser.name,
                    line_picture_url: lineUser.picture,
                    line_linked_at: new Date().toISOString(),
                    last_login_at: new Date().toISOString(),
                })
                .eq('id', user.id)
                .select()
                .single();

            if (updateError || !updatedUser) {
                logger.error('Failed to update user with LINE info', updateError);
                throw new Error('Failed to link LINE account');
            }

            user = updatedUser;
        } else {
            // Create new user for employee with role 'guard'
            const { data: newUser, error: createError } = await supabaseAdmin
                .from('users')
                .insert({
                    company_id: company.id,
                    employee_id: employee.id,
                    email: `employee_${employee.id}@guard.local`,
                    role: 'guard',
                    line_user_id: lineUser.sub,
                    line_display_name: lineUser.name,
                    line_picture_url: lineUser.picture,
                    line_linked_at: new Date().toISOString(),
                    is_active: true,
                    language: 'th',
                })
                .select()
                .single();

            if (createError || !newUser) {
                logger.error('Failed to create user for employee', createError);
                throw new Error('Failed to create user account');
            }

            // Update employee with user_id
            await supabaseAdmin
                .from('employees')
                .update({ user_id: newUser.id })
                .eq('id', employee.id);

            user = newUser;
        }

        // Create session and generate tokens
        const tokens = await this.createSessionAndTokens(
            {
                userId: user.id,
                companyId: company.id,
                role: user.role,
                email: user.email,
                employeeId: employee.id,
                lineUserId: lineUser.sub,
            },
            {
                userAgent: sessionContext?.userAgent,
                ipAddress: sessionContext?.ipAddress,
                isLiff: true,
            }
        );

        logger.info('Employee linked to LINE', {
            userId: user.id,
            employeeId: employee.id,
            lineUserId: lineUser.sub,
        });

        return {
            user: this.mapToAuthUser({
                ...user,
                employee_id: employee.id,
            }),
            tokens,
        };
    }

    // Link LINE account to existing user via email/password (for managers/admins)
    async linkCredentials(
        idToken: string,
        liffId: string,
        email: string,
        password: string,
        sessionContext?: SessionContext
    ): Promise<LoginResponse> {
        logger.info('Link credentials attempt', { email });

        // Verify LINE ID token
        const lineUser = await this.verifyLineIdToken(idToken, liffId);

        // Check if this LINE is already linked to another account
        const { data: existingLineUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('line_user_id', lineUser.sub)
            .single();

        if (existingLineUser) {
            throw new ConflictError(
                'This LINE account is already linked to another user',
                'บัญชี LINE นี้เชื่อมต่อกับบัญชีอื่นแล้ว'
            );
        }

        // Find user by email
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (userError || !user) {
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
                'This account does not have a password set',
                'บัญชีนี้ไม่ได้ตั้งรหัสผ่าน'
            );
        }

        const isValid = await this.verifyPassword(password, user.password_hash);
        if (!isValid) {
            throw new UnauthorizedError(
                'Invalid email or password',
                'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            );
        }

        // Check if user already has LINE linked
        if (user.line_user_id) {
            throw new ConflictError(
                'This account is already linked to a LINE account',
                'บัญชีนี้เชื่อมต่อกับ LINE อื่นแล้ว'
            );
        }

        // Update user with LINE info
        const { data: updatedUser, error: updateError } = await supabaseAdmin
            .from('users')
            .update({
                line_user_id: lineUser.sub,
                line_display_name: lineUser.name,
                line_picture_url: lineUser.picture,
                line_linked_at: new Date().toISOString(),
                last_login_at: new Date().toISOString(),
            })
            .eq('id', user.id)
            .select()
            .single();

        if (updateError || !updatedUser) {
            logger.error('Failed to update user with LINE info', updateError);
            throw new Error('Failed to link LINE account');
        }

        // Create session and generate tokens
        const tokens = await this.createSessionAndTokens(
            {
                userId: updatedUser.id,
                companyId: updatedUser.company_id,
                role: updatedUser.role,
                email: updatedUser.email,
                employeeId: updatedUser.employee_id,
                lineUserId: lineUser.sub,
            },
            {
                userAgent: sessionContext?.userAgent,
                ipAddress: sessionContext?.ipAddress,
                isLiff: true,
            }
        );

        logger.info('Credentials linked to LINE', {
            userId: updatedUser.id,
            lineUserId: lineUser.sub,
        });

        return {
            user: this.mapToAuthUser(updatedUser),
            tokens,
        };
    }

    // Unlink LINE account from user
    async unlinkLine(userId: string): Promise<AuthUser> {
        logger.info('Unlink LINE attempt', { userId });

        const { data: user, error } = await supabaseAdmin
            .from('users')
            .update({
                line_user_id: null,
                line_display_name: null,
                line_picture_url: null,
                line_linked_at: null,
            })
            .eq('id', userId)
            .select()
            .single();

        if (error || !user) {
            logger.error('Failed to unlink LINE account', error);
            throw new Error('Failed to unlink LINE account');
        }

        logger.info('LINE account unlinked', { userId });

        return this.mapToAuthUser(user);
    }

    // ============================================================
    // LIFF Email Login (Without LINE)
    // ============================================================

    // Login for guards without LINE - uses employee code + phone + password
    async liffEmployeeLogin(
        employeeCode: string,
        phone: string,
        password: string,
        companySlug: string,
        sessionContext?: SessionContext
    ): Promise<LoginResponse> {
        logger.info('LIFF employee login attempt', { employeeCode, companySlug });

        // Find company by slug
        const { data: company, error: companyError } = await supabaseAdmin
            .from('companies')
            .select('id')
            .eq('slug', companySlug)
            .single();

        if (companyError || !company) {
            throw new NotFoundError(
                'Company not found',
                'ไม่พบข้อมูลบริษัท'
            );
        }

        // Find employee by company + employee_code
        const { data: employee, error: employeeError } = await supabaseAdmin
            .from('employees')
            .select('*, users!employees_user_id_fkey(*)')
            .eq('company_id', company.id)
            .eq('employee_code', employeeCode)
            .single();

        if (employeeError || !employee) {
            throw new NotFoundError(
                'Employee not found',
                'ไม่พบข้อมูลพนักงาน'
            );
        }

        // Normalize phone numbers for comparison (remove leading 0, spaces, dashes)
        const normalizePhone = (p: string | null): string => {
            if (!p) return '';
            return p.replace(/[\s\-]/g, '').replace(/^0/, '');
        };

        const inputPhone = normalizePhone(phone);
        const employeePhone = normalizePhone(employee.phone);

        if (inputPhone !== employeePhone) {
            throw new ValidationError(
                'Phone number does not match',
                [{
                    field: 'phone',
                    message: 'Phone number does not match employee record',
                    message_th: 'เบอร์โทรศัพท์ไม่ตรงกับข้อมูลพนักงาน',
                }]
            );
        }

        // Check if employee has a user account
        let user = employee.users;

        if (user) {
            // Existing user - verify password
            if (!user.password_hash) {
                throw new UnauthorizedError(
                    'This account does not have a password set. Please use LINE Login or contact HR.',
                    'บัญชีนี้ยังไม่ได้ตั้งรหัสผ่าน กรุณาใช้ LINE เข้าสู่ระบบ หรือติดต่อฝ่ายบุคคล'
                );
            }

            const isValid = await this.verifyPassword(password, user.password_hash);
            if (!isValid) {
                throw new UnauthorizedError(
                    'Invalid password',
                    'รหัสผ่านไม่ถูกต้อง'
                );
            }

            if (!user.is_active) {
                throw new UnauthorizedError(
                    'Account is deactivated',
                    'บัญชีถูกระงับ'
                );
            }

            // Update last login
            await supabaseAdmin
                .from('users')
                .update({ last_login_at: new Date().toISOString() })
                .eq('id', user.id);
        } else {
            // No user account - this employee needs a user account with password
            throw new UnauthorizedError(
                'No account found. Please contact HR to set up your account.',
                'ไม่พบบัญชีผู้ใช้ กรุณาติดต่อฝ่ายบุคคลเพื่อตั้งค่าบัญชี'
            );
        }

        // Create session and generate tokens
        const tokens = await this.createSessionAndTokens(
            {
                userId: user.id,
                companyId: company.id,
                role: user.role,
                email: user.email,
                employeeId: employee.id,
                lineUserId: user.line_user_id,
            },
            {
                userAgent: sessionContext?.userAgent,
                ipAddress: sessionContext?.ipAddress,
                isLiff: sessionContext?.isLiff ?? true, // LIFF login defaults to true
            }
        );

        logger.info('LIFF employee login successful', {
            userId: user.id,
            employeeId: employee.id,
        });

        return {
            user: this.mapToAuthUser({
                ...user,
                employee_id: employee.id,
            }),
            tokens,
        };
    }

    // Change password
    async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
        // Get user
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (!user) {
            throw new NotFoundError('User');
        }

        // Verify old password if set
        if (user.password_hash) {
            const isValid = await this.verifyPassword(oldPassword, user.password_hash);
            if (!isValid) {
                throw new UnauthorizedError(
                    'Invalid old password',
                    'รหัสผ่านเดิมไม่ถูกต้อง'
                );
            }
        }

        // Hash new password
        const passwordHash = await this.hashPassword(newPassword);

        // Update password
        const { error } = await supabaseAdmin
            .from('users')
            .update({ password_hash: passwordHash })
            .eq('id', userId);

        if (error) {
            throw new Error('Failed to update password');
        }
    }

    // ============================================================
    // PIN Reset Request Methods (Hybrid Approach)
    // ============================================================

    // Guard requests PIN reset (public endpoint)
    async requestPinReset(companySlug: string, phone: string): Promise<void> {
        const normalizedPhone = PhoneUtils.normalize(phone);

        // Find company
        const { data: company } = await supabaseAdmin
            .from('companies')
            .select('id')
            .eq('slug', companySlug)
            .single();

        if (!company) {
            // Silently return to prevent enumeration
            logger.warn(`PIN reset request: Company not found for slug: ${companySlug}`);
            return;
        }

        // Find employee
        const { data: employee } = await supabaseAdmin
            .from('employees')
            .select('id, user_id, full_name')
            .eq('company_id', company.id)
            .eq('phone', normalizedPhone)
            .single();

        if (!employee) {
            logger.warn(`PIN reset request: Employee not found for phone: ${normalizedPhone}`);
            return;
        }

        // Check if there's already a pending request for this employee
        const { data: existingRequest } = await supabaseAdmin
            .from('pin_reset_requests')
            .select('id')
            .eq('employee_id', employee.id)
            .eq('status', 'pending')
            .single();

        if (existingRequest) {
            // Already have a pending request
            logger.info(`PIN reset request: Already pending for employee: ${employee.id}`);
            return;
        }

        // Create request
        const { error } = await supabaseAdmin
            .from('pin_reset_requests')
            .insert({
                employee_id: employee.id,
                company_id: company.id,
                status: 'pending',
                requested_at: new Date().toISOString(),
            });

        if (error) {
            logger.error('Failed to create PIN reset request', error);
            throw new Error('Failed to create request');
        }

        logger.info('PIN reset request created', {
            employeeId: employee.id,
            employeeName: employee.full_name,
            companyId: company.id
        });
    }

    // Guard requests PIN reset (authenticated)
    async requestPinResetMe(userId: string): Promise<void> {
        // Get user and company info
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, company_id, employee_id')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            throw new NotFoundError('User');
        }

        // Get employee ID
        let employeeId = user.employee_id;
        if (!employeeId) {
            // Try to find employee by user_id
            const { data: emp } = await supabaseAdmin
                .from('employees')
                .select('id')
                .eq('user_id', userId)
                .single();

            if (emp) {
                employeeId = emp.id;
            }
        }

        if (!employeeId) {
            throw new Error('Employee record not found for this user');
        }

        // Check if there's already a pending request
        const { data: existingRequest } = await supabaseAdmin
            .from('pin_reset_requests')
            .select('id')
            .eq('employee_id', employeeId)
            .eq('status', 'pending')
            .single();

        if (existingRequest) {
            logger.info(`PIN reset request: Already pending for employee: ${employeeId}`);
            return;
        }

        // Create request
        const { error } = await supabaseAdmin
            .from('pin_reset_requests')
            .insert({
                employee_id: employeeId,
                company_id: user.company_id,
                status: 'pending',
                requested_at: new Date().toISOString(),
            });

        if (error) {
            logger.error('Failed to create PIN reset request', error);
            throw new Error('Failed to create request');
        }

        logger.info('PIN reset request created (authenticated)', {
            userId,
            employeeId,
            companyId: user.company_id
        });
    }

    // Admin gets pending PIN reset requests
    async getPinResetRequests(companyId: string): Promise<Array<{
        id: string;
        employeeId: string;
        employeeName: string;
        employeeCode: string;
        employeePhone: string;
        companyId: string;
        status: string;
        requestedAt: string;
        resolvedAt?: string;
        resolvedBy?: string;
    }>> {
        const { data, error } = await supabaseAdmin
            .from('pin_reset_requests')
            .select(`
                id,
                employee_id,
                company_id,
                status,
                requested_at,
                resolved_at,
                resolved_by,
                employees (
                    id,
                    full_name,
                    employee_code,
                    phone
                )
            `)
            .eq('company_id', companyId)
            .eq('status', 'pending')
            .order('requested_at', { ascending: true });

        if (error) {
            logger.error('Failed to fetch PIN reset requests', error);
            throw new Error('Failed to fetch requests');
        }

        return (data || []).map((row: any) => ({
            id: row.id,
            employeeId: row.employee_id,
            employeeName: row.employees?.full_name || 'Unknown',
            employeeCode: row.employees?.employee_code || '',
            employeePhone: row.employees?.phone || '',
            companyId: row.company_id,
            status: row.status,
            requestedAt: row.requested_at,
            resolvedAt: row.resolved_at,
            resolvedBy: row.resolved_by,
        }));
    }

    // Admin resolves PIN reset request (called after admin resets PIN)
    async resolvePinResetRequest(
        requestId: string,
        companyId: string,
        resolvedBy: string,
        status: 'approved' | 'rejected' = 'approved'
    ): Promise<void> {
        const { error } = await supabaseAdmin
            .from('pin_reset_requests')
            .update({
                status,
                resolved_at: new Date().toISOString(),
                resolved_by: resolvedBy,
                updated_at: new Date().toISOString(),
            })
            .eq('id', requestId)
            .eq('company_id', companyId);

        if (error) {
            logger.error('Failed to resolve PIN reset request', error);
            throw new Error('Failed to resolve request');
        }

        logger.info('PIN reset request resolved', { requestId, status, resolvedBy });
    }

    // Admin resolves PIN reset request by employee ID (called from employee detail page reset)
    async resolvePinResetRequestByEmployee(
        employeeId: string,
        companyId: string,
        resolvedBy: string
    ): Promise<void> {
        // Find any pending request for this employee and mark as approved
        const { error } = await supabaseAdmin
            .from('pin_reset_requests')
            .update({
                status: 'approved',
                resolved_at: new Date().toISOString(),
                resolved_by: resolvedBy,
                updated_at: new Date().toISOString(),
            })
            .eq('employee_id', employeeId)
            .eq('company_id', companyId)
            .eq('status', 'pending');

        if (error) {
            // Don't throw - this is a best-effort cleanup
            logger.warn('Failed to resolve PIN reset request by employee', error);
        } else {
            logger.info('PIN reset request resolved by employee', { employeeId, resolvedBy });
        }
    }

    // Get pending request count for admin notification badge
    async getPendingPinResetCount(companyId: string): Promise<number> {
        const { count, error } = await supabaseAdmin
            .from('pin_reset_requests')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('status', 'pending');

        if (error) {
            logger.error('Failed to count PIN reset requests', error);
            return 0;
        }

        return count || 0;
    }

    // ============================================================
    // Session Management Methods
    // ============================================================

    // Get all active sessions for current user
    async getUserSessions(userId: string, currentSessionId?: string): Promise<SessionInfo[]> {
        return sessionService.getUserSessions(userId, currentSessionId);
    }

    // Revoke a specific session
    async revokeSession(sessionId: string, userId: string): Promise<boolean> {
        return sessionService.revokeSession(sessionId, userId, 'remote_logout');
    }

    // Revoke all sessions except current
    async revokeAllSessions(userId: string, excludeCurrentSession?: string): Promise<number> {
        return sessionService.revokeAllSessions(userId, 'logout_all', excludeCurrentSession);
    }

    // Logout - revoke current session
    async logout(userId: string, refreshToken?: string): Promise<void> {
        if (refreshToken) {
            await sessionService.revokeSessionByToken(refreshToken, userId, 'user_logout');
        }
        logger.info('User logged out', { userId });
    }
}

export const authService = new AuthService();
export default authService;

