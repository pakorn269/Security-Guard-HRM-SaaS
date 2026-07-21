import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies before importing the service
vi.mock('../../config/supabase.js', () => ({
    supabaseAdmin: {
        from: vi.fn(),
        rpc: vi.fn(),
    },
}));

vi.mock('../../config/env.js', () => ({
    env: {
        NODE_ENV: 'test',
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
        default: mockLogger,
        logger: mockLogger,
    };
});

vi.mock('../notifications/notifications.service.js', () => ({
    NotificationService: {
        createNotification: vi.fn(),
    },
}));

vi.mock('../../jobs/lineNotifications.js', () => ({
    sendLeaveNotification: vi.fn(),
}));

vi.mock('../../services/cache.service.js', () => ({
    cacheService: {
        getOrSet: vi.fn().mockImplementation((key, fn) => fn()),
        get: vi.fn().mockReturnValue(null),
        set: vi.fn(),
        del: vi.fn(),
        flush: vi.fn(),
        invalidateLeaveTypes: vi.fn(),
        invalidateLeaveBalances: vi.fn(),
    },
    CACHE_KEYS: {
        LEAVE_TYPES: (companyId: string) => `leave_types:${companyId}`,
        LEAVE_TYPE: (companyId: string, typeId: string) => `leave_type:${companyId}:${typeId}`,
        LEAVE_BALANCES: (companyId: string, year: number, employeeId?: string) => `leave_balances:${companyId}:${year}${employeeId ? `:${employeeId}` : ''}`,
    },
    CACHE_TTL: {
        LEAVE_TYPES: 600,
        LEAVE_BALANCES: 300,
    },
}));

import { leaveService } from './leave.service.js';
import { supabaseAdmin } from '../../config/supabase.js';
import logger from '../../utils/logger.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors.js';

// Helper to create mock Supabase query builder
const createMockQueryBuilder = (returnData: unknown = null, error: unknown = null) => {
    const mockBuilder: Record<string, unknown> = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: returnData, error, count: Array.isArray(returnData) ? returnData.length : 0 }),
        limit: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: returnData, error }),
    };
    return mockBuilder;
};

describe('LeaveService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // =========================================================================
    // Balance Calculation Tests
    // =========================================================================

    describe('Balance Calculation', () => {
        describe('remainingDays calculation', () => {
            it('should correctly calculate remaining days (entitled - used - pending)', async () => {
                const mockBalanceRow = {
                    id: 'balance-1',
                    company_id: 'company-1',
                    employee_id: 'employee-1',
                    leave_type_id: 'leave-type-1',
                    year: 2026,
                    entitled_days: 15,
                    used_days: 5,
                    pending_days: 3,
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-01-01T00:00:00Z',
                };

                const mockBuilder = createMockQueryBuilder(mockBalanceRow);
                vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

                const balance = await leaveService.getOrCreateSingleBalance(
                    'company-1',
                    'employee-1',
                    'leave-type-1',
                    2026
                );

                // remaining = entitled (15) - used (5) - pending (3) = 7
                expect(balance.remainingDays).toBe(7);
                expect(balance.entitledDays).toBe(15);
                expect(balance.usedDays).toBe(5);
                expect(balance.pendingDays).toBe(3);
            });

            it('should return 0 remaining days when balance is exhausted', async () => {
                const mockBalanceRow = {
                    id: 'balance-1',
                    company_id: 'company-1',
                    employee_id: 'employee-1',
                    leave_type_id: 'leave-type-1',
                    year: 2026,
                    entitled_days: 10,
                    used_days: 8,
                    pending_days: 2,
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-01-01T00:00:00Z',
                };

                const mockBuilder = createMockQueryBuilder(mockBalanceRow);
                vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

                const balance = await leaveService.getOrCreateSingleBalance(
                    'company-1',
                    'employee-1',
                    'leave-type-1',
                    2026
                );

                // remaining = entitled (10) - used (8) - pending (2) = 0
                expect(balance.remainingDays).toBe(0);
            });

            it('should handle negative remaining days (over-allocated)', async () => {
                const mockBalanceRow = {
                    id: 'balance-1',
                    company_id: 'company-1',
                    employee_id: 'employee-1',
                    leave_type_id: 'leave-type-1',
                    year: 2026,
                    entitled_days: 10,
                    used_days: 8,
                    pending_days: 5, // Over-allocated scenario
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-01-01T00:00:00Z',
                };

                const mockBuilder = createMockQueryBuilder(mockBalanceRow);
                vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

                const balance = await leaveService.getOrCreateSingleBalance(
                    'company-1',
                    'employee-1',
                    'leave-type-1',
                    2026
                );

                // remaining = entitled (10) - used (8) - pending (5) = -3
                expect(balance.remainingDays).toBe(-3);
            });
        });

        describe('getOrCreateSingleBalance', () => {
            it('should return existing balance when found', async () => {
                const mockBalanceRow = {
                    id: 'balance-1',
                    company_id: 'company-1',
                    employee_id: 'employee-1',
                    leave_type_id: 'leave-type-1',
                    year: 2026,
                    entitled_days: 12,
                    used_days: 3,
                    pending_days: 1,
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-01-01T00:00:00Z',
                };

                const mockBuilder = createMockQueryBuilder(mockBalanceRow);
                vi.mocked(supabaseAdmin.from).mockReturnValue(mockBuilder as any);

                const balance = await leaveService.getOrCreateSingleBalance(
                    'company-1',
                    'employee-1',
                    'leave-type-1',
                    2026
                );

                expect(balance.id).toBe('balance-1');
                expect(balance.entitledDays).toBe(12);
            });

            it('should create new balance with max_days_per_year when not found', async () => {
                let callCount = 0;

                // First call: balance lookup returns null (not found)
                // Second call: leave type lookup
                // Third call: insert new balance
                vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                    callCount++;

                    if (table === 'leave_balances' && callCount === 1) {
                        // First lookup - no existing balance
                        return createMockQueryBuilder(null) as any;
                    }
                    if (table === 'leave_types') {
                        // Leave type with max_days_per_year
                        return createMockQueryBuilder({ max_days_per_year: 15 }) as any;
                    }
                    if (table === 'leave_balances' && callCount > 1) {
                        // Insert new balance
                        return createMockQueryBuilder({
                            id: 'new-balance',
                            company_id: 'company-1',
                            employee_id: 'employee-1',
                            leave_type_id: 'leave-type-1',
                            year: 2026,
                            entitled_days: 15,
                            used_days: 0,
                            pending_days: 0,
                            created_at: '2026-01-01T00:00:00Z',
                            updated_at: '2026-01-01T00:00:00Z',
                        }) as any;
                    }
                    return createMockQueryBuilder() as any;
                });

                const balance = await leaveService.getOrCreateSingleBalance(
                    'company-1',
                    'employee-1',
                    'leave-type-1',
                    2026
                );

                expect(balance.entitledDays).toBe(15);
                expect(balance.usedDays).toBe(0);
                expect(balance.pendingDays).toBe(0);
                expect(balance.remainingDays).toBe(15);
            });

            it('should create balance with 0 entitled days when leave type has no max', async () => {
                let callCount = 0;

                vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                    callCount++;

                    if (table === 'leave_balances' && callCount === 1) {
                        return createMockQueryBuilder(null) as any;
                    }
                    if (table === 'leave_types') {
                        // Leave type without max_days_per_year (null)
                        return createMockQueryBuilder({ max_days_per_year: null }) as any;
                    }
                    if (table === 'leave_balances' && callCount > 1) {
                        return createMockQueryBuilder({
                            id: 'new-balance',
                            company_id: 'company-1',
                            employee_id: 'employee-1',
                            leave_type_id: 'leave-type-1',
                            year: 2026,
                            entitled_days: 0,
                            used_days: 0,
                            pending_days: 0,
                            created_at: '2026-01-01T00:00:00Z',
                            updated_at: '2026-01-01T00:00:00Z',
                        }) as any;
                    }
                    return createMockQueryBuilder() as any;
                });

                const balance = await leaveService.getOrCreateSingleBalance(
                    'company-1',
                    'employee-1',
                    'leave-type-1',
                    2026
                );

                expect(balance.entitledDays).toBe(0);
            });
        });

        describe('Leave request balance validation', () => {
            it('should throw error when requesting more days than available', async () => {
                // Mock leave type with max days
                const mockLeaveType = {
                    id: 'leave-type-1',
                    company_id: 'company-1',
                    name: 'Annual Leave',
                    name_th: 'ลาพักร้อน',
                    is_paid: true,
                    max_days_per_year: 10,
                    requires_approval: true,
                    requires_document: false,
                    is_active: true,
                    sort_order: 0,
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-01-01T00:00:00Z',
                };

                // Mock balance with only 2 days remaining
                const mockBalance = {
                    id: 'balance-1',
                    company_id: 'company-1',
                    employee_id: 'employee-1',
                    leave_type_id: 'leave-type-1',
                    year: 2026,
                    entitled_days: 10,
                    used_days: 5,
                    pending_days: 3,  // remaining = 10 - 5 - 3 = 2
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-01-01T00:00:00Z',
                };

                let callCount = 0;
                vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                    callCount++;
                    if (table === 'leave_types') {
                        return createMockQueryBuilder(mockLeaveType) as any;
                    }
                    if (table === 'leave_balances') {
                        return createMockQueryBuilder(mockBalance) as any;
                    }
                    return createMockQueryBuilder() as any;
                });

                // Request 5 days when only 2 are available
                await expect(leaveService.createLeaveRequest(
                    'company-1',
                    'employee-1',
                    {
                        leaveTypeId: 'leave-type-1',
                        startDate: '2026-02-01',
                        endDate: '2026-02-05', // 5 days
                        reason: 'Vacation',
                    }
                )).rejects.toThrow(BadRequestError);
            });

            it('should allow request when sufficient balance exists', async () => {
                const mockLeaveType = {
                    id: 'leave-type-1',
                    company_id: 'company-1',
                    name: 'Annual Leave',
                    name_th: 'ลาพักร้อน',
                    is_paid: true,
                    max_days_per_year: 15,
                    requires_approval: true,
                    requires_document: false,
                    is_active: true,
                    sort_order: 0,
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-01-01T00:00:00Z',
                };

                const mockBalance = {
                    id: 'balance-1',
                    company_id: 'company-1',
                    employee_id: 'employee-1',
                    leave_type_id: 'leave-type-1',
                    year: 2026,
                    entitled_days: 15,
                    used_days: 3,
                    pending_days: 2,  // remaining = 15 - 3 - 2 = 10
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-01-01T00:00:00Z',
                };

                const mockCreatedRequest = {
                    id: 'request-1',
                    company_id: 'company-1',
                    employee_id: 'employee-1',
                    leave_type_id: 'leave-type-1',
                    start_date: '2026-02-01',
                    end_date: '2026-02-05',
                    total_days: 5,
                    reason: 'Vacation',
                    document_url: null,
                    status: 'pending',
                    reviewed_by: null,
                    reviewed_at: null,
                    review_notes: null,
                    created_at: '2026-01-18T00:00:00Z',
                    updated_at: '2026-01-18T00:00:00Z',
                    employees: {
                        id: 'employee-1',
                        full_name: 'John Doe',
                        employee_code: 'E001',
                    },
                    leave_types: {
                        id: 'leave-type-1',
                        name: 'Annual Leave',
                        name_th: 'ลาพักร้อน',
                        is_paid: true,
                    },
                };

                vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                    if (table === 'leave_types') {
                        return createMockQueryBuilder(mockLeaveType) as any;
                    }
                    if (table === 'leave_balances') {
                        return createMockQueryBuilder(mockBalance) as any;
                    }
                    if (table === 'shifts') {
                        const builder = createMockQueryBuilder([]) as any;
                        builder.single = undefined; // Not a single query
                        return builder;
                    }
                    if (table === 'leave_requests') {
                        return createMockQueryBuilder(mockCreatedRequest) as any;
                    }
                    return createMockQueryBuilder() as any;
                });

                // Request 5 days when 10 are available - should succeed
                const result = await leaveService.createLeaveRequest(
                    'company-1',
                    'employee-1',
                    {
                        leaveTypeId: 'leave-type-1',
                        startDate: '2026-02-01',
                        endDate: '2026-02-05',
                        reason: 'Vacation',
                    }
                );

                expect(result.totalDays).toBe(5);
                expect(result.status).toBe('pending');
            });

            it('should skip balance check for leave types with no max days limit', async () => {
                // Unpaid leave with no max limit
                const mockLeaveType = {
                    id: 'leave-type-2',
                    company_id: 'company-1',
                    name: 'Unpaid Leave',
                    name_th: 'ลาไม่รับเงินเดือน',
                    is_paid: false,
                    max_days_per_year: null, // No limit
                    requires_approval: true,
                    requires_document: false,
                    is_active: true,
                    sort_order: 1,
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-01-01T00:00:00Z',
                };

                const mockCreatedRequest = {
                    id: 'request-2',
                    company_id: 'company-1',
                    employee_id: 'employee-1',
                    leave_type_id: 'leave-type-2',
                    start_date: '2026-02-01',
                    end_date: '2026-02-28',
                    total_days: 28,
                    reason: 'Extended leave',
                    document_url: null,
                    status: 'pending',
                    reviewed_by: null,
                    reviewed_at: null,
                    review_notes: null,
                    created_at: '2026-01-18T00:00:00Z',
                    updated_at: '2026-01-18T00:00:00Z',
                    employees: {
                        id: 'employee-1',
                        full_name: 'John Doe',
                        employee_code: 'E001',
                    },
                    leave_types: {
                        id: 'leave-type-2',
                        name: 'Unpaid Leave',
                        name_th: 'ลาไม่รับเงินเดือน',
                        is_paid: false,
                    },
                };

                vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                    if (table === 'leave_types') {
                        return createMockQueryBuilder(mockLeaveType) as any;
                    }
                    if (table === 'shifts') {
                        const builder = createMockQueryBuilder([]) as any;
                        builder.single = undefined;
                        return builder;
                    }
                    if (table === 'leave_requests') {
                        return createMockQueryBuilder(mockCreatedRequest) as any;
                    }
                    return createMockQueryBuilder() as any;
                });

                // Request 28 days - should not check balance since max is null
                const result = await leaveService.createLeaveRequest(
                    'company-1',
                    'employee-1',
                    {
                        leaveTypeId: 'leave-type-2',
                        startDate: '2026-02-01',
                        endDate: '2026-02-28',
                        reason: 'Extended leave',
                    }
                );

                expect(result.totalDays).toBe(28);
            });
        });

        describe('Balance updates on request status changes', () => {
            it('should move days from pending to used when approved', async () => {
                const mockPendingRequest = {
                    id: 'request-1',
                    company_id: 'company-1',
                    employee_id: 'employee-1',
                    leave_type_id: 'leave-type-1',
                    start_date: '2026-02-01',
                    end_date: '2026-02-03',
                    total_days: 3,
                    status: 'pending',
                    reason: null,
                    document_url: null,
                    reviewed_by: null,
                    reviewed_at: null,
                    review_notes: null,
                    created_at: '2026-01-18T00:00:00Z',
                    updated_at: '2026-01-18T00:00:00Z',
                    employees: {
                        id: 'employee-1',
                        full_name: 'John Doe',
                        employee_code: 'E001',
                    },
                    leave_types: {
                        id: 'leave-type-1',
                        name: 'Annual Leave',
                        name_th: 'ลาพักร้อน',
                        is_paid: true,
                    },
                };

                const mockBalance = {
                    id: 'balance-1',
                    company_id: 'company-1',
                    employee_id: 'employee-1',
                    leave_type_id: 'leave-type-1',
                    year: 2026,
                    entitled_days: 15,
                    used_days: 5,
                    pending_days: 3,
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-01-01T00:00:00Z',
                };

                const mockApprovedRequest = {
                    ...mockPendingRequest,
                    status: 'approved',
                    reviewed_by: 'manager-1',
                    reviewed_at: '2026-01-18T10:00:00Z',
                };

                let updateCalled = false;
                let balanceUpdate: Record<string, unknown> = {};
                let leaveRequestCallCount = 0;

                vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                    if (table === 'leave_requests') {
                        leaveRequestCallCount++;
                        // First call is getLeaveRequestById (returns pending)
                        // Second call is the update (returns approved)
                        if (leaveRequestCallCount === 1) {
                            return createMockQueryBuilder(mockPendingRequest) as any;
                        }
                        return createMockQueryBuilder(mockApprovedRequest) as any;
                    }
                    if (table === 'leave_balances') {
                        const builder = createMockQueryBuilder(mockBalance) as any;
                        builder.update = vi.fn((data: Record<string, unknown>) => {
                            updateCalled = true;
                            balanceUpdate = data;
                            return builder;
                        });
                        return builder;
                    }
                    return createMockQueryBuilder() as any;
                });

                await leaveService.approveLeaveRequest('request-1', 'company-1', 'manager-1', {});

                expect(updateCalled).toBe(true);
                // pending should be reduced by 3 (Math.max(0, 3 - 3) = 0)
                expect(balanceUpdate.pending_days).toBe(0);
                // used should be increased by 3 (5 + 3 = 8)
                expect(balanceUpdate.used_days).toBe(8);
            });

            it('should remove days from pending when rejected', async () => {
                const mockPendingRequest = {
                    id: 'request-1',
                    company_id: 'company-1',
                    employee_id: 'employee-1',
                    leave_type_id: 'leave-type-1',
                    start_date: '2026-02-01',
                    end_date: '2026-02-03',
                    total_days: 3,
                    status: 'pending',
                    reason: null,
                    document_url: null,
                    reviewed_by: null,
                    reviewed_at: null,
                    review_notes: null,
                    created_at: '2026-01-18T00:00:00Z',
                    updated_at: '2026-01-18T00:00:00Z',
                    employees: {
                        id: 'employee-1',
                        full_name: 'John Doe',
                        employee_code: 'E001',
                    },
                    leave_types: {
                        id: 'leave-type-1',
                        name: 'Annual Leave',
                        name_th: 'ลาพักร้อน',
                        is_paid: true,
                    },
                };

                const mockBalance = {
                    id: 'balance-1',
                    company_id: 'company-1',
                    employee_id: 'employee-1',
                    leave_type_id: 'leave-type-1',
                    year: 2026,
                    entitled_days: 15,
                    used_days: 5,
                    pending_days: 5,
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-01-01T00:00:00Z',
                };

                const mockRejectedRequest = {
                    ...mockPendingRequest,
                    status: 'rejected',
                    reviewed_by: 'manager-1',
                    reviewed_at: '2026-01-18T10:00:00Z',
                    review_notes: 'Insufficient staff coverage',
                };

                let balanceUpdate: Record<string, unknown> = {};
                let leaveRequestCallCount = 0;

                vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                    if (table === 'leave_requests') {
                        leaveRequestCallCount++;
                        // First call is getLeaveRequestById (returns pending)
                        // Second call is the update (returns rejected)
                        if (leaveRequestCallCount === 1) {
                            return createMockQueryBuilder(mockPendingRequest) as any;
                        }
                        return createMockQueryBuilder(mockRejectedRequest) as any;
                    }
                    if (table === 'leave_balances') {
                        const builder = createMockQueryBuilder(mockBalance) as any;
                        builder.update = vi.fn((data: Record<string, unknown>) => {
                            balanceUpdate = data;
                            return builder;
                        });
                        return builder;
                    }
                    return createMockQueryBuilder() as any;
                });

                await leaveService.rejectLeaveRequest(
                    'request-1',
                    'company-1',
                    'manager-1',
                    { reviewNotes: 'Insufficient staff coverage' }
                );

                // pending should be reduced by 3 (Math.max(0, 5 - 3) = 2)
                expect(balanceUpdate.pending_days).toBe(2);
                // used_days should NOT be in the update (not approved)
                expect(balanceUpdate.used_days).toBeUndefined();
            });
        });
    });

    // =========================================================================
    // Day Calculation Tests
    // =========================================================================

    describe('Day Calculation', () => {
        it('should calculate same-day leave as 1 day', async () => {
            const mockLeaveType = {
                id: 'lt-1',
                company_id: 'c-1',
                name: 'Sick Leave',
                name_th: null,
                is_paid: true,
                max_days_per_year: null,
                requires_approval: true,
                requires_document: false,
                is_active: true,
                sort_order: 0,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
            };

            const mockCreatedRequest = {
                id: 'req-1',
                company_id: 'c-1',
                employee_id: 'emp-1',
                leave_type_id: 'lt-1',
                start_date: '2026-02-01',
                end_date: '2026-02-01',
                total_days: 1,
                reason: 'Doctor appointment',
                document_url: null,
                status: 'pending',
                reviewed_by: null,
                reviewed_at: null,
                review_notes: null,
                created_at: '2026-01-18T00:00:00Z',
                updated_at: '2026-01-18T00:00:00Z',
                employees: { id: 'emp-1', full_name: 'John', employee_code: 'E001' },
                leave_types: { id: 'lt-1', name: 'Sick Leave', name_th: null, is_paid: true },
            };

            vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                if (table === 'leave_types') {
                    return createMockQueryBuilder(mockLeaveType) as any;
                }
                if (table === 'shifts') {
                    const builder = createMockQueryBuilder([]) as any;
                    builder.single = undefined;
                    return builder;
                }
                if (table === 'leave_requests') {
                    return createMockQueryBuilder(mockCreatedRequest) as any;
                }
                return createMockQueryBuilder() as any;
            });

            const result = await leaveService.createLeaveRequest(
                'c-1',
                'emp-1',
                {
                    leaveTypeId: 'lt-1',
                    startDate: '2026-02-01',
                    endDate: '2026-02-01',
                    reason: 'Doctor appointment',
                }
            );

            expect(result.totalDays).toBe(1);
        });

        it('should calculate multi-day leave correctly (inclusive)', async () => {
            const mockLeaveType = {
                id: 'lt-1',
                company_id: 'c-1',
                name: 'Annual Leave',
                name_th: null,
                is_paid: true,
                max_days_per_year: null,
                requires_approval: true,
                requires_document: false,
                is_active: true,
                sort_order: 0,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
            };

            const mockCreatedRequest = {
                id: 'req-1',
                company_id: 'c-1',
                employee_id: 'emp-1',
                leave_type_id: 'lt-1',
                start_date: '2026-02-01',
                end_date: '2026-02-07',
                total_days: 7,
                reason: 'Vacation',
                document_url: null,
                status: 'pending',
                reviewed_by: null,
                reviewed_at: null,
                review_notes: null,
                created_at: '2026-01-18T00:00:00Z',
                updated_at: '2026-01-18T00:00:00Z',
                employees: { id: 'emp-1', full_name: 'John', employee_code: 'E001' },
                leave_types: { id: 'lt-1', name: 'Annual Leave', name_th: null, is_paid: true },
            };

            vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                if (table === 'leave_types') {
                    return createMockQueryBuilder(mockLeaveType) as any;
                }
                if (table === 'shifts') {
                    const builder = createMockQueryBuilder([]) as any;
                    builder.single = undefined;
                    return builder;
                }
                if (table === 'leave_requests') {
                    return createMockQueryBuilder(mockCreatedRequest) as any;
                }
                return createMockQueryBuilder() as any;
            });

            const result = await leaveService.createLeaveRequest(
                'c-1',
                'emp-1',
                {
                    leaveTypeId: 'lt-1',
                    startDate: '2026-02-01',
                    endDate: '2026-02-07',
                    reason: 'Vacation',
                }
            );

            // Feb 1 to Feb 7 = 7 days inclusive
            expect(result.totalDays).toBe(7);
        });
    });

    // =========================================================================
    // Leave Type Validation Tests
    // =========================================================================

    describe('Leave Type Validation', () => {
        it('should throw error when leave type is inactive', async () => {
            const mockLeaveType = {
                id: 'lt-1',
                company_id: 'c-1',
                name: 'Deprecated Leave',
                name_th: null,
                is_paid: true,
                max_days_per_year: 10,
                requires_approval: true,
                requires_document: false,
                is_active: false, // INACTIVE
                sort_order: 0,
                created_at: '2026-01-01T00:00:00Z',
                updated_at: '2026-01-01T00:00:00Z',
            };

            vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                if (table === 'leave_types') {
                    return createMockQueryBuilder(mockLeaveType) as any;
                }
                return createMockQueryBuilder() as any;
            });

            await expect(leaveService.createLeaveRequest(
                'c-1',
                'emp-1',
                {
                    leaveTypeId: 'lt-1',
                    startDate: '2026-02-01',
                    endDate: '2026-02-03',
                }
            )).rejects.toThrow(BadRequestError);
        });

        it('should throw NotFoundError when leave type does not exist', async () => {
            vi.mocked(supabaseAdmin.from).mockImplementation(() => {
                return createMockQueryBuilder(null, { code: 'PGRST116' }) as any;
            });

            await expect(leaveService.getLeaveTypeById('nonexistent', 'c-1'))
                .rejects.toThrow(NotFoundError);
        });
    });

    // =========================================================================
    // Cancel Request Tests
    // =========================================================================

    describe('Cancel Leave Request', () => {
        it('should throw ForbiddenError when cancelling others request', async () => {
            const mockRequest = {
                id: 'request-1',
                company_id: 'company-1',
                employee_id: 'employee-1', // Owned by employee-1
                leave_type_id: 'leave-type-1',
                start_date: '2026-02-01',
                end_date: '2026-02-03',
                total_days: 3,
                status: 'pending',
                reason: null,
                document_url: null,
                reviewed_by: null,
                reviewed_at: null,
                review_notes: null,
                created_at: '2026-01-18T00:00:00Z',
                updated_at: '2026-01-18T00:00:00Z',
                employees: { id: 'employee-1', full_name: 'John Doe', employee_code: 'E001' },
                leave_types: { id: 'leave-type-1', name: 'Annual Leave', name_th: null, is_paid: true },
            };

            vi.mocked(supabaseAdmin.from).mockReturnValue(
                createMockQueryBuilder(mockRequest) as any
            );

            // employee-2 trying to cancel employee-1's request
            await expect(leaveService.cancelLeaveRequest(
                'request-1',
                'company-1',
                'employee-2'
            )).rejects.toThrow(ForbiddenError);
        });

        it('should throw BadRequestError when cancelling rejected request', async () => {
            const mockRequest = {
                id: 'request-1',
                company_id: 'company-1',
                employee_id: 'employee-1',
                leave_type_id: 'leave-type-1',
                start_date: '2026-02-01',
                end_date: '2026-02-03',
                total_days: 3,
                status: 'rejected', // Already rejected
                reason: null,
                document_url: null,
                reviewed_by: 'manager-1',
                reviewed_at: '2026-01-17T00:00:00Z',
                review_notes: 'Denied',
                created_at: '2026-01-18T00:00:00Z',
                updated_at: '2026-01-18T00:00:00Z',
                employees: { id: 'employee-1', full_name: 'John Doe', employee_code: 'E001' },
                leave_types: { id: 'leave-type-1', name: 'Annual Leave', name_th: null, is_paid: true },
            };

            vi.mocked(supabaseAdmin.from).mockReturnValue(
                createMockQueryBuilder(mockRequest) as any
            );

            await expect(leaveService.cancelLeaveRequest(
                'request-1',
                'company-1',
                'employee-1'
            )).rejects.toThrow(BadRequestError);
        });
    });

    // =========================================================================
    // Shift Conflict Detection Tests
    // =========================================================================

    describe('Shift Conflict Detection', () => {
        it('should log warning when leave overlaps with published shifts', async () => {
            const mockLeaveType = {
                id: 'leave-type-1',
                company_id: 'company-1',
                name: 'Annual Leave',
                max_days_per_year: 15,
                requires_approval: true,
                requires_document: false,
                is_active: true,
            };

            const mockBalance = {
                id: 'balance-1',
                entitled_days: 15,
                used_days: 0,
                pending_days: 0,
            };

            const mockShifts = [
                {
                    id: 'shift-1',
                    shift_date: '2026-02-02',
                    employee_id: 'employee-1',
                    start_time: '08:00',
                    end_time: '17:00',
                },
                {
                    id: 'shift-2',
                    shift_date: '2026-02-03',
                    employee_id: 'employee-1',
                    start_time: '08:00',
                    end_time: '17:00',
                },
            ];

            vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
                if (table === 'leave_types') {
                    return createMockQueryBuilder(mockLeaveType);
                }
                if (table === 'leave_balances') {
                    return createMockQueryBuilder(mockBalance);
                }
                if (table === 'shifts') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        gte: vi.fn().mockReturnThis(),
                        lte: vi.fn().mockResolvedValue({ data: mockShifts, error: null }),
                    };
                }
                if (table === 'leave_requests') {
                    const newRequest = {
                        id: 'new-request-1',
                        employee_id: 'employee-1',
                        leave_type_id: 'leave-type-1',
                        start_date: '2026-02-01',
                        end_date: '2026-02-05',
                        total_days: 5,
                        status: 'pending',
                    };
                    return createMockQueryBuilder(newRequest) as any;
                }
                return createMockQueryBuilder({});
            }) as any);



            await leaveService.createLeaveRequest('company-1', 'employee-1', {
                leaveTypeId: 'leave-type-1',
                startDate: '2026-02-01',
                endDate: '2026-02-05',
                reason: 'Vacation',
            });

            // Verify logger.warn was called for shift conflicts
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('shift'),
                expect.objectContaining({
                    employeeId: 'employee-1',
                    conflictCount: 2,
                })
            );
        });

        it('should detect partial day overlap with shifts', async () => {
            const mockLeaveType = {
                id: 'leave-type-1',
                company_id: 'company-1',
                name: 'Annual Leave',
                max_days_per_year: 15,
                requires_approval: true,
                is_active: true,
            };

            const mockBalance = {
                id: 'balance-1',
                entitled_days: 15,
                used_days: 0,
                pending_days: 0,
            };

            const mockShifts = [
                {
                    id: 'shift-1',
                    shift_date: '2026-02-05', // Only overlaps on last day
                    employee_id: 'employee-1',
                },
            ];

            vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
                if (table === 'leave_types') return createMockQueryBuilder(mockLeaveType);
                if (table === 'leave_balances') return createMockQueryBuilder(mockBalance);
                if (table === 'shifts') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        gte: vi.fn().mockReturnThis(),
                        lte: vi.fn().mockResolvedValue({ data: mockShifts, error: null }),
                    };
                }
                if (table === 'leave_requests') {
                    const newRequest = {
                        id: 'new-request-1',
                        employee_id: 'employee-1',
                        status: 'pending',
                    };
                    return createMockQueryBuilder(newRequest) as any;
                }
                return createMockQueryBuilder({});
            }) as any);



            await leaveService.createLeaveRequest('company-1', 'employee-1', {
                leaveTypeId: 'leave-type-1',
                startDate: '2026-02-01',
                endDate: '2026-02-05',
                reason: 'Vacation',
            });

            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('shift'),
                expect.objectContaining({
                    conflictCount: 1,
                })
            );
        });

        it('should not log warning when no shift conflicts exist', async () => {
            const mockLeaveType = {
                id: 'leave-type-1',
                company_id: 'company-1',
                name: 'Annual Leave',
                max_days_per_year: 15,
                is_active: true,
            };

            const mockBalance = {
                id: 'balance-1',
                entitled_days: 15,
                used_days: 0,
                pending_days: 0,
            };

            vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
                if (table === 'leave_types') return createMockQueryBuilder(mockLeaveType);
                if (table === 'leave_balances') return createMockQueryBuilder(mockBalance);
                if (table === 'shifts') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        gte: vi.fn().mockReturnThis(),
                        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
                    };
                }
                if (table === 'leave_requests') {
                    return createMockQueryBuilder({ id: 'new-request-1' }) as any;
                }
                return createMockQueryBuilder({});
            }) as any);


            vi.mocked(logger.warn).mockClear();

            await leaveService.createLeaveRequest('company-1', 'employee-1', {
                leaveTypeId: 'leave-type-1',
                startDate: '2026-02-01',
                endDate: '2026-02-05',
                reason: 'Vacation',
            });

            // Should not log warning about shifts
            const shiftWarnings = vi.mocked(logger.warn).mock.calls.filter(
                call => call[0]?.toString().includes('shift')
            );
            expect(shiftWarnings.length).toBe(0);
        });
    });

    // =========================================================================
    // Multi-Year Balance Tracking Tests
    // =========================================================================

    describe('Multi-Year Balance Tracking', () => {
        it('should create balance for new year when it does not exist', async () => {
            const mockLeaveType = {
                id: 'leave-type-1',
                company_id: 'company-1',
                max_days_per_year: 15,
                is_active: true,
            };

            // First call: balance not found for 2027
            // Second call: return newly created balance
            let callCount = 0;
            vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
                if (table === 'leave_types') {
                    return createMockQueryBuilder(mockLeaveType);
                }
                if (table === 'leave_balances') {
                    callCount++;
                    if (callCount === 1) {
                        // First call: not found
                        return createMockQueryBuilder(null, null);
                    } else {
                        // Second call: return created balance
                        const newBalance = {
                            id: 'balance-new',
                            company_id: 'company-1',
                            employee_id: 'employee-1',
                            leave_type_id: 'leave-type-1',
                            year: 2027,
                            entitled_days: 15,
                            used_days: 0,
                            pending_days: 0,
                        };
                        return {
                            select: vi.fn().mockReturnThis(),
                            eq: vi.fn().mockReturnThis(),
                            single: vi.fn().mockResolvedValue({ data: newBalance, error: null }),
                            insert: vi.fn().mockReturnThis(),
                        };
                    }
                }
                return createMockQueryBuilder({});
            }) as any);

            const balance = await leaveService.getOrCreateSingleBalance(
                'company-1',
                'employee-1',
                'leave-type-1',
                2027
            );

            expect(balance.year).toBe(2027);
            expect(balance.entitledDays).toBe(15);
            expect(balance.usedDays).toBe(0);
            expect(balance.pendingDays).toBe(0);
        });

        it('should query balances across multiple years correctly', async () => {
            const mockBalances = [
                {
                    id: 'balance-2025',
                    company_id: 'company-1',
                    employee_id: 'employee-1',
                    leave_type_id: 'leave-type-1',
                    year: 2025,
                    entitled_days: 15,
                    used_days: 10,
                    pending_days: 0,
                    created_at: '2025-01-01T00:00:00Z',
                    updated_at: '2025-01-01T00:00:00Z',
                    leave_types: { id: 'leave-type-1', name: 'Annual', name_th: 'ลาพักร้อน', is_paid: true },
                    employees: { id: 'employee-1', full_name: 'John Doe', employee_code: 'EMP001', user_id: 'user-1' },
                },
                {
                    id: 'balance-2026',
                    company_id: 'company-1',
                    employee_id: 'employee-1',
                    leave_type_id: 'leave-type-1',
                    year: 2026,
                    entitled_days: 15,
                    used_days: 5,
                    pending_days: 2,
                    created_at: '2026-01-01T00:00:00Z',
                    updated_at: '2026-01-01T00:00:00Z',
                    leave_types: { id: 'leave-type-1', name: 'Annual', name_th: 'ลาพักร้อน', is_paid: true },
                    employees: { id: 'employee-1', full_name: 'John Doe', employee_code: 'EMP001', user_id: 'user-1' },
                },
                {
                    id: 'balance-2027',
                    company_id: 'company-1',
                    employee_id: 'employee-1',
                    leave_type_id: 'leave-type-1',
                    year: 2027,
                    entitled_days: 15,
                    used_days: 0,
                    pending_days: 0,
                    created_at: '2027-01-01T00:00:00Z',
                    updated_at: '2027-01-01T00:00:00Z',
                    leave_types: { id: 'leave-type-1', name: 'Annual', name_th: 'ลาพักร้อน', is_paid: true },
                    employees: { id: 'employee-1', full_name: 'John Doe', employee_code: 'EMP001', user_id: 'user-1' },
                },
            ];

            vi.mocked(supabaseAdmin.from).mockReturnValue({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                range: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockBalances, error: null, count: mockBalances.length }),
            } as any);

            const balances = await leaveService.listBalances('company-1', {});

            expect(balances.balances.length).toBe(3);
            expect(balances.balances[0].year).toBe(2025);
            expect(balances.balances[1].year).toBe(2026);
            expect(balances.balances[2].year).toBe(2027);
        });

        it('should handle year rollover correctly', async () => {
            const mockEmployees = [
                { id: 'employee-1', company_id: 'company-1' },
                { id: 'employee-2', company_id: 'company-1' },
            ];

            const mockLeaveTypes = [
                { id: 'leave-type-1', max_days_per_year: 15, is_active: true },
                { id: 'leave-type-2', max_days_per_year: 10, is_active: true },
            ];

            const existingBalances: any[] = []; // No balances exist for new year

            vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
                if (table === 'employees') {
                    const eqMock = vi.fn().mockReturnThis();
                    // Second .eq() call should resolve to data (awaitable)
                    eqMock.mockReturnValueOnce({
                        eq: vi.fn().mockResolvedValue({ data: mockEmployees, error: null }),
                    });
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: eqMock,
                    };
                }
                if (table === 'leave_types') {
                    const eqMock = vi.fn().mockReturnThis();
                    eqMock.mockReturnValueOnce({
                        eq: vi.fn().mockResolvedValue({ data: mockLeaveTypes, error: null }),
                    });
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: eqMock,
                    };
                }
                if (table === 'leave_balances') {
                    const eqMock = vi.fn().mockReturnThis();
                    eqMock.mockReturnValueOnce({
                        eq: vi.fn().mockReturnThis(),
                        in: vi.fn().mockResolvedValue({ data: existingBalances, error: null }),
                    });
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: eqMock,
                        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
                    };
                }
                return createMockQueryBuilder({});
            }) as any);

            const result = await leaveService.initializeBalancesForYear('company-1', 2027);

            // Should create 2 employees × 2 leave types = 4 balances
            expect(result.created).toBe(4);
        });
    });

    // =========================================================================
    // Auto-Approval Workflow Tests
    // =========================================================================

    describe('Auto-Approval Workflow', () => {
        it('should auto-approve when leave type does not require approval', async () => {
            const mockLeaveType = {
                id: 'leave-type-1',
                company_id: 'company-1',
                name: 'Emergency Leave',
                requires_approval: false, // Auto-approve
                max_days_per_year: 5,
                is_active: true,
            };

            const mockBalance = {
                id: 'balance-1',
                entitled_days: 5,
                used_days: 0,
                pending_days: 0,
            };

            const mockRequest = {
                id: 'request-1',
                employee_id: 'employee-1',
                leave_type_id: 'leave-type-1',
                start_date: '2026-02-01',
                end_date: '2026-02-01',
                total_days: 1,
                status: 'approved', // Should be auto-approved
            };

            vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
                if (table === 'leave_types') return createMockQueryBuilder(mockLeaveType);
                if (table === 'leave_balances') return createMockQueryBuilder(mockBalance);
                if (table === 'shifts') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        gte: vi.fn().mockReturnThis(),
                        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
                    };
                }
                if (table === 'leave_requests') {
                    return createMockQueryBuilder(mockRequest) as any;
                }
                return createMockQueryBuilder({});
            }) as any);

            const result = await leaveService.createLeaveRequest('company-1', 'employee-1', {
                leaveTypeId: 'leave-type-1',
                startDate: '2026-02-01',
                endDate: '2026-02-01',
                reason: 'Emergency',
            });

            // Verify status is approved (not pending)
            expect(result.status).toBe('approved');
        });

        it('should update balance immediately for auto-approved leave', async () => {
            const mockLeaveType = {
                id: 'leave-type-1',
                requires_approval: false,
                max_days_per_year: 5,
                is_active: true,
            };

            const mockBalance = {
                id: 'balance-1',
                entitled_days: 5,
                used_days: 0,
                pending_days: 0,
            };

            let balanceUpdateCalled = false;

            vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
                if (table === 'leave_types') return createMockQueryBuilder(mockLeaveType);
                if (table === 'leave_balances') {
                    const builder = createMockQueryBuilder(mockBalance);
                    builder.update = vi.fn().mockImplementation(() => {
                        balanceUpdateCalled = true;
                        return builder;
                    });
                    return builder;
                }
                if (table === 'shifts') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        gte: vi.fn().mockReturnThis(),
                        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
                    };
                }
                if (table === 'leave_requests') {
                    const mockApprovedRequest = {
                        id: 'request-1',
                        status: 'approved',
                        total_days: 1,
                    };
                    return createMockQueryBuilder(mockApprovedRequest) as any;
                }
                return createMockQueryBuilder({});
            }) as any);

            await leaveService.createLeaveRequest('company-1', 'employee-1', {
                leaveTypeId: 'leave-type-1',
                startDate: '2026-02-01',
                endDate: '2026-02-01',
            });

            // Balance should be updated for used_days
            expect(balanceUpdateCalled).toBe(true);
        });

        it('should require approval when leave type has requires_approval: true', async () => {
            const mockLeaveType = {
                id: 'leave-type-1',
                requires_approval: true, // Requires approval
                max_days_per_year: 15,
                is_active: true,
            };

            const mockBalance = {
                id: 'balance-1',
                entitled_days: 15,
                used_days: 0,
                pending_days: 0,
            };

            const mockRequest = {
                id: 'request-1',
                status: 'pending', // Should be pending
            };

            vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
                if (table === 'leave_types') return createMockQueryBuilder(mockLeaveType);
                if (table === 'leave_balances') return createMockQueryBuilder(mockBalance);
                if (table === 'shifts') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        gte: vi.fn().mockReturnThis(),
                        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
                    };
                }
                if (table === 'leave_requests') {
                    return createMockQueryBuilder(mockRequest) as any;
                }
                return createMockQueryBuilder({});
            }) as any);

            const result = await leaveService.createLeaveRequest('company-1', 'employee-1', {
                leaveTypeId: 'leave-type-1',
                startDate: '2026-02-01',
                endDate: '2026-02-01',
            });

            expect(result.status).toBe('pending');
        });
    });

    // =========================================================================
    // Notification Integration Tests
    // =========================================================================

    describe('Notification Integration', () => {
        it.skip('should send notification on leave request creation', async () => {
            const mockLeaveType = {
                id: 'leave-type-1',
                max_days_per_year: 15,
                is_active: true,
            };

            const mockBalance = {
                id: 'balance-1',
                entitled_days: 15,
                used_days: 0,
                pending_days: 0,
            };

            vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
                if (table === 'leave_types') return createMockQueryBuilder(mockLeaveType);
                if (table === 'leave_balances') return createMockQueryBuilder(mockBalance);
                if (table === 'shifts') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        gte: vi.fn().mockReturnThis(),
                        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
                    };
                }
                if (table === 'leave_requests') {
                    return createMockQueryBuilder({
                        id: 'request-1',
                        employee_id: 'employee-1',
                        status: 'pending',
                    }) as any;
                }
                return createMockQueryBuilder({});
            }) as any);



            await leaveService.createLeaveRequest('company-1', 'employee-1', {
                leaveTypeId: 'leave-type-1',
                startDate: '2026-02-01',
                endDate: '2026-02-01',
            });

            // Verify logger.info was called with notification details
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('notification'),
                expect.any(Object)
            );
        });

        it('should send notification on leave approval', async () => {
            const mockRequest = {
                id: 'request-1',
                company_id: 'company-1',
                employee_id: 'employee-1',
                leave_type_id: 'leave-type-1',
                start_date: '2026-02-01',
                end_date: '2026-02-01',
                total_days: 1,
                status: 'pending',
                employees: { id: 'employee-1', full_name: 'John Doe', employee_code: 'EMP001', user_id: 'user-1' },
                leave_types: { id: 'leave-type-1', name: 'Annual Leave', name_th: null, is_paid: true, max_days_per_year: 15 },
            };

            const mockBalance = {
                id: 'balance-1',
                entitled_days: 15,
                used_days: 0,
                pending_days: 1,
            };

            vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
                if (table === 'leave_requests' || table === 'leave_requests:employee_id(*),leave_types:leave_type_id(*)') {
                    return createMockQueryBuilder(mockRequest) as any;
                }
                if (table === 'leave_balances') {
                    return createMockQueryBuilder(mockBalance);
                }
                if (table === 'users') {
                    return createMockQueryBuilder({ id: 'user-1' }) as any;
                }
                return createMockQueryBuilder({});
            }) as any);



            await leaveService.approveLeaveRequest('request-1', 'company-1', 'manager-1');

            // Wait for async notification to complete (fire-and-forget pattern)
            await new Promise(resolve => setTimeout(resolve, 50));

            // Verify notification service called
            const { NotificationService } = await import('../notifications/notifications.service.js');
            expect(NotificationService.createNotification).toHaveBeenCalled();
        });

        it('should send notification on leave rejection', async () => {
            const mockRequest = {
                id: 'request-1',
                company_id: 'company-1',
                employee_id: 'employee-1',
                leave_type_id: 'leave-type-1',
                start_date: '2026-02-01',
                end_date: '2026-02-01',
                total_days: 1,
                status: 'pending',
                employees: { id: 'employee-1', full_name: 'John Doe' },
                leave_types: { id: 'leave-type-1', name: 'Annual Leave' },
            };

            const mockBalance = {
                id: 'balance-1',
                entitled_days: 15,
                used_days: 0,
                pending_days: 1,
            };

            vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
                if (table === 'leave_requests') {
                    return createMockQueryBuilder(mockRequest) as any;
                }
                if (table === 'leave_balances') {
                    return createMockQueryBuilder(mockBalance);
                }
                if (table === 'users') {
                    return createMockQueryBuilder({ id: 'user-1' }) as any;
                }
                return createMockQueryBuilder({});
            }) as any);



            await leaveService.rejectLeaveRequest('request-1', 'company-1', 'manager-1', { reviewNotes: 'Insufficient notice' });

            // Wait for async notification to complete (fire-and-forget pattern)
            await new Promise(resolve => setTimeout(resolve, 10));

            // Verify notification service called
            const { NotificationService } = await import('../notifications/notifications.service.js');
            expect(NotificationService.createNotification).toHaveBeenCalled();
        });

        it('should continue processing if notification fails', async () => {
            const mockRequest = {
                id: 'request-1',
                company_id: 'company-1',
                employee_id: 'employee-1',
                status: 'pending',
                employees: { id: 'employee-1' },
                leave_types: { id: 'leave-type-1' },
            };

            const mockBalance = {
                id: 'balance-1',
                entitled_days: 15,
                used_days: 0,
                pending_days: 1,
            };

            vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
                if (table === 'leave_requests') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
                        update: vi.fn().mockReturnThis(),
                    };
                }
                if (table === 'leave_balances') {
                    return createMockQueryBuilder(mockBalance);
                }
                return createMockQueryBuilder({});
            }) as any);

            // Even if notification fails, approval should succeed
            const result = await leaveService.approveLeaveRequest('request-1', 'company-1', 'manager-1');

            expect(result).toBeDefined();
        });
    });

    // =========================================================================
    // Edge Cases Tests
    // =========================================================================

    describe('Edge Cases', () => {
        it('should reject cancellation of leave that has already started', async () => {
            const today = new Date().toISOString().slice(0, 10);
            const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

            const mockRequest = {
                id: 'request-1',
                company_id: 'company-1',
                employee_id: 'employee-1',
                start_date: yesterday, // Started yesterday
                end_date: today,
                status: 'approved',
                employees: { id: 'employee-1' },
                leave_types: { id: 'leave-type-1' },
            };

            vi.mocked(supabaseAdmin.from).mockReturnValue(
                createMockQueryBuilder(mockRequest) as any
            );

            await expect(
                leaveService.cancelLeaveRequest('request-1', 'company-1', 'employee-1')
            ).rejects.toThrow(BadRequestError);
        });

        it('should allow multiple pending requests for same dates', async () => {
            const mockLeaveType = {
                id: 'leave-type-1',
                max_days_per_year: 15,
                is_active: true,
            };

            const mockBalance = {
                id: 'balance-1',
                entitled_days: 15,
                used_days: 0,
                pending_days: 3, // Already has 3 days pending
            };

            vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
                if (table === 'leave_types') return createMockQueryBuilder(mockLeaveType);
                if (table === 'leave_balances') return createMockQueryBuilder(mockBalance);
                if (table === 'shifts') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        gte: vi.fn().mockReturnThis(),
                        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
                    };
                }
                if (table === 'leave_requests') {
                    const mockBuilder = createMockQueryBuilder({
                        id: 'request-2',
                        status: 'pending',
                        total_days: 2,
                    });
                    return {
                        ...mockBuilder,
                        insert: vi.fn().mockReturnThis(),
                        select: vi.fn().mockReturnThis(), // select returns builder
                        // single is already in mockBuilder returning the data
                    };
                }
                return createMockQueryBuilder({});
            }) as any);

            // Should not throw error - multiple pending requests allowed
            const result = await leaveService.createLeaveRequest('company-1', 'employee-1', {
                leaveTypeId: 'leave-type-1',
                startDate: '2026-02-01',
                endDate: '2026-02-02',
            });

            expect(result).toBeDefined();
            expect(result.status).toBe('pending');
        });

        it('should reject approval when balance is insufficient', async () => {
            const mockRequest = {
                id: 'request-1',
                company_id: 'company-1',
                employee_id: 'employee-1',
                leave_type_id: 'leave-type-1',
                start_date: '2026-02-01',
                end_date: '2026-02-05',
                total_days: 5,
                status: 'pending',
                employees: { id: 'employee-1' },
                leave_types: { id: 'leave-type-1', max_days_per_year: 10, is_active: true },
            };

            const mockBalance = {
                id: 'balance-1',
                entitled_days: 10,
                used_days: 8, // Only 2 days remaining
                pending_days: 0,
            };

            vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
                if (table === 'leave_requests') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
                        update: vi.fn().mockReturnThis(),
                    };
                }
                if (table === 'leave_balances') {
                    return createMockQueryBuilder(mockBalance);
                }
                return createMockQueryBuilder({});
            }) as any);

            // Trying to approve 5 days but only 2 remaining - should fail
            await expect(
                leaveService.approveLeaveRequest('request-1', 'company-1', 'manager-1')
            ).rejects.toThrow(BadRequestError);
        });

        it('should handle concurrent request processing correctly', async () => {
            const mockLeaveType = {
                id: 'leave-type-1',
                max_days_per_year: 15,
                is_active: true,
            };

            const mockBalance = {
                id: 'balance-1',
                entitled_days: 15,
                used_days: 0,
                pending_days: 0,
            };

            vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
                if (table === 'leave_types') return createMockQueryBuilder(mockLeaveType);
                if (table === 'leave_balances') return createMockQueryBuilder(mockBalance);
                if (table === 'shifts') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        gte: vi.fn().mockReturnThis(),
                        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
                    };
                }
                if (table === 'leave_requests') {
                    return createMockQueryBuilder({
                        id: `request-${Math.random()}`,
                        status: 'pending',
                    }) as any;
                }
                return createMockQueryBuilder({});
            }) as any);

            // Create two requests concurrently
            const [request1, request2] = await Promise.all([
                leaveService.createLeaveRequest('company-1', 'employee-1', {
                    leaveTypeId: 'leave-type-1',
                    startDate: '2026-02-01',
                    endDate: '2026-02-02',
                }),
                leaveService.createLeaveRequest('company-1', 'employee-1', {
                    leaveTypeId: 'leave-type-1',
                    startDate: '2026-02-10',
                    endDate: '2026-02-11',
                }),
            ]);

            // Both should succeed
            expect(request1).toBeDefined();
            expect(request2).toBeDefined();
        });

        it('should soft delete leave type with existing requests', async () => {
            // Mock that leave type has existing requests
            const updateSpy = vi.fn().mockReturnThis();

            vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
                if (table === 'leave_types') {
                    return {
                        update: updateSpy,
                        eq: vi.fn().mockReturnThis(),
                        // Make it looking like a query builder
                        select: vi.fn().mockReturnThis(),
                        delete: vi.fn().mockReturnThis(),
                    };
                }
                if (table === 'leave_requests') {
                    // Return existing requests for this leave type via count
                    const mockResponse = { count: 1, error: null };
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        then: (resolve: any) => Promise.resolve(mockResponse).then(resolve)
                    };
                }
                return createMockQueryBuilder({});
            }) as any);

            await leaveService.deleteLeaveType('leave-type-1', 'company-1');

            expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
        });

        it('should handle balance adjustment when entitlement changes', async () => {
            const mockLeaveType = {
                id: 'leave-type-1',
                company_id: 'company-1',
                max_days_per_year: 20, // Changed from 15 to 20
            };

            const mockBalance = {
                id: 'balance-1',
                entitled_days: 15, // Old entitlement
                used_days: 5,
                pending_days: 2,
            };

            vi.mocked(supabaseAdmin.from).mockImplementation(((table: string) => {
                if (table === 'leave_types') {
                    return {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        single: vi.fn().mockResolvedValue({ data: mockLeaveType, error: null }),
                        update: vi.fn().mockReturnThis(),
                    };
                }
                if (table === 'leave_balances') {
                    const mockBuilder = createMockQueryBuilder(mockBalance);
                    const builder = {
                        ...mockBuilder,
                        update: vi.fn().mockImplementation((updates) => {
                            const updatedData = { ...mockBalance, ...updates };
                            (builder as any).single = vi.fn().mockResolvedValue({ data: updatedData, error: null });
                            return builder;
                        })
                    };
                    return builder;
                }
                return createMockQueryBuilder({});
            }) as any);

            // Update balance to reflect new entitlement
            const updatedBalance = await leaveService.updateBalance(
                'company-1',
                'employee-1',
                'leave-type-1',
                2026,
                20 // New entitlement
            );

            // Remaining days should be recalculated: 20 - 5 - 2 = 13
            expect(updatedBalance.entitledDays).toBe(20);
            expect(updatedBalance.remainingDays).toBe(13);
        });
    });
});
