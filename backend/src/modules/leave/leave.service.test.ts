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

vi.mock('../../utils/logger.js', () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

import { leaveService } from './leave.service.js';
import { supabaseAdmin } from '../../config/supabase.js';
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
        range: vi.fn().mockReturnThis(),
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
});
