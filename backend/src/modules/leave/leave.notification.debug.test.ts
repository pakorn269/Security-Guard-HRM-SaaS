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

import { leaveService } from './leave.service.js';
import { supabaseAdmin } from '../../config/supabase.js';
import logger from '../../utils/logger.js';
import { NotificationService } from '../notifications/notifications.service.js';

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

describe('LeaveService Notification Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
            console.log('Mock from called with table:', table);
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

        try {
            await leaveService.approveLeaveRequest('request-1', 'company-1', 'manager-1');
        } catch (e) {
            console.error('Test failed with error:', e);
            throw e;
        }

        // Wait for async notification to complete (fire-and-forget pattern)
        await new Promise(resolve => setTimeout(resolve, 50));

        if (vi.mocked(logger.error).mock.calls.length > 0) {
            console.log('Logger Error calls:', vi.mocked(logger.error).mock.calls);
        }

        expect(NotificationService.createNotification).toHaveBeenCalled();
    });
});
