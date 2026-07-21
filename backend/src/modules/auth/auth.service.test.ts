import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock the dependencies
vi.mock('../../config/supabase.js', () => ({
    supabaseAdmin: {
        from: vi.fn(),
        rpc: vi.fn(),
    },
}));

vi.mock('./session.service.js', () => ({
    sessionService: {
        createSession: vi.fn().mockResolvedValue('test-session-id'),
        detectDeviceType: vi.fn().mockReturnValue('web'),
        validateRefreshToken: vi.fn().mockResolvedValue({
            id: 'test-session-id',
            user_id: 'user-123',
            company_id: 'company-123',
            refresh_token_hash: 'some-hash',
            device_name: 'Test Device',
            device_type: 'web',
            expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
            created_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
        }),
        rotateRefreshToken: vi.fn().mockResolvedValue(undefined),
        revokeSessionByToken: vi.fn().mockResolvedValue(true),
        getUserSessions: vi.fn().mockResolvedValue([]),
        revokeSession: vi.fn().mockResolvedValue(true),
        revokeAllSessions: vi.fn().mockResolvedValue(0),
        updateLastActivity: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('../../config/env.js', () => ({
    env: {
        JWT_SECRET: 'test-secret-key-minimum-32-characters',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
        LINE_CHANNEL_ID: 'test-channel-id',
    },
}));

vi.mock('../../utils/logger.js', () => {
    const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        request: vi.fn(),
    };
    return {
        logger: mockLogger,
        default: mockLogger,
    };
});

import { authService } from './auth.service.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { UnauthorizedError, ConflictError } from '../../utils/errors.js';

describe('AuthService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('login', () => {
        it('should successfully login with valid credentials', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password_hash: await bcrypt.hash('Password123', 12),
                company_id: 'company-123',
                role: 'company_admin',
                is_active: true,
                employee_id: 'emp-123',
            };

            const mockFrom = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
                update: vi.fn().mockReturnThis(),
            };

            vi.mocked(supabaseAdmin.from).mockReturnValue(mockFrom as any);

            const result = await authService.login({
                email: 'test@example.com',
                password: 'Password123',
            });

            expect(result.user.email).toBe('test@example.com');
            expect(result.tokens.accessToken).toBeDefined();
            expect(result.tokens.refreshToken).toBeDefined();
        });

        it('should throw UnauthorizedError for invalid email', async () => {
            const mockFrom = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            };

            vi.mocked(supabaseAdmin.from).mockReturnValue(mockFrom as any);

            await expect(authService.login({
                email: 'nonexistent@example.com',
                password: 'Password123',
            })).rejects.toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError for invalid password', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password_hash: await bcrypt.hash('CorrectPassword123', 12),
                company_id: 'company-123',
                role: 'company_admin',
                is_active: true,
            };

            const mockFrom = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
            };

            vi.mocked(supabaseAdmin.from).mockReturnValue(mockFrom as any);

            await expect(authService.login({
                email: 'test@example.com',
                password: 'WrongPassword123',
            })).rejects.toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError for deactivated account', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password_hash: await bcrypt.hash('Password123', 12),
                company_id: 'company-123',
                role: 'company_admin',
                is_active: false,
            };

            const mockFrom = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
            };

            vi.mocked(supabaseAdmin.from).mockReturnValue(mockFrom as any);

            await expect(authService.login({
                email: 'test@example.com',
                password: 'Password123',
            })).rejects.toThrow(UnauthorizedError);
        });
    });

    describe('refreshToken', () => {
        it('should successfully refresh tokens with valid refresh token', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                company_id: 'company-123',
                role: 'company_admin',
                is_active: true,
                employee_id: 'emp-123',
            };

            // Generate a valid refresh token
            const refreshToken = jwt.sign(
                { userId: 'user-123', type: 'refresh' },
                'test-secret-key-minimum-32-characters',
                { expiresIn: '7d' }
            );

            const mockFrom = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
            };

            vi.mocked(supabaseAdmin.from).mockReturnValue(mockFrom as any);

            const result = await authService.refreshToken(refreshToken);

            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
            expect(result.expiresIn).toBeGreaterThan(0);
        });

        it('should throw UnauthorizedError for expired refresh token', async () => {
            // Generate an expired token
            const expiredToken = jwt.sign(
                { userId: 'user-123', type: 'refresh' },
                'test-secret-key-minimum-32-characters',
                { expiresIn: '-1s' }
            );

            await expect(authService.refreshToken(expiredToken))
                .rejects.toThrow(UnauthorizedError);
        });

        it('should throw UnauthorizedError for invalid token type', async () => {
            // Generate an access token (wrong type)
            const accessToken = jwt.sign(
                { userId: 'user-123', type: 'access' },
                'test-secret-key-minimum-32-characters',
                { expiresIn: '15m' }
            );

            await expect(authService.refreshToken(accessToken))
                .rejects.toThrow(UnauthorizedError);
        });
    });

    describe('getCurrentUser', () => {
        it('should return user data for valid user ID', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                company_id: 'company-123',
                role: 'company_admin',
                is_active: true,
                language: 'th',
            };

            const mockFrom = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
            };

            vi.mocked(supabaseAdmin.from).mockReturnValue(mockFrom as any);

            const result = await authService.getCurrentUser('user-123');

            expect(result.id).toBe('user-123');
            expect(result.email).toBe('test@example.com');
            expect(result.role).toBe('company_admin');
        });

        it('should throw NotFoundError for non-existent user', async () => {
            const mockFrom = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            };

            vi.mocked(supabaseAdmin.from).mockReturnValue(mockFrom as any);

            await expect(authService.getCurrentUser('nonexistent-user'))
                .rejects.toThrow();
        });
    });
});
