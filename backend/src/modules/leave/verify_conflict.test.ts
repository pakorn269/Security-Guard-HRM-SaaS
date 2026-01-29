import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
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
import logger from '../../utils/logger.js';

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

describe('Shift Conflict Verification', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

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
});
