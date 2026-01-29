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

describe('LeaveService Repro', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

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

        expect(balance.remainingDays).toBe(7);
        expect(balance.entitledDays).toBe(15);
        expect(balance.usedDays).toBe(5);
        expect(balance.pendingDays).toBe(3);
    });
});
