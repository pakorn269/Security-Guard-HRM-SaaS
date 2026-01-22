// Tests for Employee List functionality
// Uses mocking to test the service logic

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies BEFORE importing the service
vi.mock('../../config/supabase.js', () => ({
    supabaseAdmin: {
        from: vi.fn(),
    },
}));

vi.mock('../../utils/logger.js', () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.mock('../../utils/errors.js', () => ({
    NotFoundError: class NotFoundError extends Error {
        constructor(message: string, messageTh?: string) {
            super(message);
            this.name = 'NotFoundError';
        }
    },
    ConflictError: class ConflictError extends Error {
        constructor(message: string, messageTh?: string) {
            super(message);
            this.name = 'ConflictError';
        }
    },
}));

vi.mock('../user/user.service.js', () => ({
    userService: {
        create: vi.fn(),
    },
}));

import { employeeService } from './employee.service.js';
import { supabaseAdmin } from '../../config/supabase.js';

describe('EmployeeService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('list', () => {
        it('should list employees for a company', async () => {
            const mockEmployees = [
                {
                    id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                    company_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                    employee_code: 'EMP-001',
                    full_name: 'Test Employee',
                    full_name_th: 'พนักงานทดสอบ',
                    phone: '0812345678',
                    email: 'test@email.com',
                    status: 'active',
                    hire_date: '2024-01-01',
                    users: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            ];

            const mockFrom = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
                not: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({
                    data: mockEmployees,
                    count: 1,
                    error: null,
                }),
            };

            vi.mocked(supabaseAdmin.from).mockReturnValue(mockFrom as any);

            const result = await employeeService.list(
                'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                { page: 1, pageSize: 10 }
            );

            expect(result.employees).toHaveLength(1);
            expect(result.total).toBe(1);
            expect(result.employees[0].employeeCode).toBe('EMP-001');
            expect(result.employees[0].fullName).toBe('Test Employee');
        });

        it('should map snake_case to camelCase correctly', async () => {
            const mockEmployees = [
                {
                    id: 'emp-123',
                    company_id: 'company-123',
                    employee_code: 'EMP-001',
                    full_name: 'Test User',
                    full_name_th: 'ทดสอบ',
                    phone: '0812345678',
                    email: 'test@test.com',
                    address: '123 Main St',
                    emergency_contact_name: 'Emergency Contact',
                    emergency_contact_phone: '0899999999',
                    hire_date: '2024-01-01',
                    termination_date: null,
                    status: 'active',
                    profile_image_url: null,
                    notes: null,
                    license_number: 'LIC-001',
                    license_issued_at: '2024-01-01',
                    license_expires_at: '2025-01-01',
                    created_at: '2024-01-01T00:00:00Z',
                    updated_at: '2024-01-01T00:00:00Z',
                    users: {
                        id: 'user-123',
                        email: 'user@test.com',
                        role: 'guard',
                        is_active: true,
                    },
                },
            ];

            const mockFrom = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
                not: vi.fn().mockReturnThis(),
                is: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({
                    data: mockEmployees,
                    count: 1,
                    error: null,
                }),
            };

            vi.mocked(supabaseAdmin.from).mockReturnValue(mockFrom as any);

            const result = await employeeService.list('company-123', { page: 1, pageSize: 10 });

            const employee = result.employees[0];

            // Check camelCase mapping
            expect(employee.employeeCode).toBe('EMP-001');
            expect(employee.fullName).toBe('Test User');
            expect(employee.fullNameTh).toBe('ทดสอบ');
            expect(employee.emergencyContactName).toBe('Emergency Contact');
            expect(employee.emergencyContactPhone).toBe('0899999999');
            expect(employee.hireDate).toBe('2024-01-01');
            expect(employee.profileImageUrl).toBe(null);
            expect(employee.licenseNumber).toBe('LIC-001');
            expect(employee.licenseIssuedAt).toBe('2024-01-01');
            expect(employee.licenseExpiresAt).toBe('2025-01-01');

            // Check user mapping
            expect(employee.user).toBeDefined();
            expect(employee.user?.id).toBe('user-123');
            expect(employee.user?.email).toBe('user@test.com');
            expect(employee.user?.role).toBe('guard');
            expect(employee.user?.isActive).toBe(true);
        });

        it('should apply search filter', async () => {
            const mockFrom = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({
                    data: [],
                    count: 0,
                    error: null,
                }),
            };

            vi.mocked(supabaseAdmin.from).mockReturnValue(mockFrom as any);

            await employeeService.list('company-123', { page: 1, pageSize: 10, search: 'TEST' });

            // Verify that or() was called for search
            expect(mockFrom.or).toHaveBeenCalled();
            const orCall = mockFrom.or.mock.calls[0][0];
            expect(orCall).toContain('TEST');
        });

        it('should apply status filter', async () => {
            const mockFrom = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({
                    data: [],
                    count: 0,
                    error: null,
                }),
            };

            vi.mocked(supabaseAdmin.from).mockReturnValue(mockFrom as any);

            await employeeService.list('company-123', { page: 1, pageSize: 10, status: 'active' });

            // Verify eq was called with status
            expect(mockFrom.eq).toHaveBeenCalledWith('status', 'active');
        });

        it('should handle pagination correctly', async () => {
            const mockFrom = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({
                    data: [],
                    count: 0,
                    error: null,
                }),
            };

            vi.mocked(supabaseAdmin.from).mockReturnValue(mockFrom as any);

            await employeeService.list('company-123', { page: 2, pageSize: 10 });

            // Page 2 with pageSize 10 should be range(10, 19)
            expect(mockFrom.range).toHaveBeenCalledWith(10, 19);
        });

        it('should return empty array for no results', async () => {
            const mockFrom = {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                range: vi.fn().mockResolvedValue({
                    data: [],
                    count: 0,
                    error: null,
                }),
            };

            vi.mocked(supabaseAdmin.from).mockReturnValue(mockFrom as any);

            const result = await employeeService.list('company-123', { page: 1, pageSize: 10 });

            expect(result.employees).toEqual([]);
            expect(result.total).toBe(0);
        });
    });
});
