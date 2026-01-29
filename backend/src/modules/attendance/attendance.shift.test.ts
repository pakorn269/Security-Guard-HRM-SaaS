import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { supabaseAdmin } from '../../config/supabase.js';

// Mock Auth Middleware BEFORE importing app
vi.mock('../../middleware/auth.middleware.js', () => {
    const mockAuth = (req: any, res: any, next: any) => {
        req.user = {
            userId: 'user-123',
            companyId: 'company-123',
            employeeId: 'emp-123',
            role: 'guard'
        };
        next();
    };
    return {
        authMiddleware: mockAuth,
        requireManager: (req: any, res: any, next: any) => next(),
        requireAdmin: (req: any, res: any, next: any) => next(),
        requireNonLiff: (req: any, res: any, next: any) => next(),
        requireLiffOnly: (req: any, res: any, next: any) => next(),
        requireRoles: () => (req: any, res: any, next: any) => next(),
        optionalAuthMiddleware: (req: any, res: any, next: any) => next(),
        default: mockAuth
    };
});

// Mock Logger
vi.mock('../../utils/logger.js', () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        request: vi.fn()
    }
}));

// Mock Sentry
vi.mock('@sentry/node', () => ({
    init: vi.fn(),
    setupExpressErrorHandler: vi.fn(),
    captureException: vi.fn(),
    Handlers: {
        requestHandler: () => (req: any, res: any, next: any) => next(),
        errorHandler: () => (err: any, req: any, res: any, next: any) => next(err),
    }
}));

// Mock Supabase
vi.mock('../../config/supabase.js', () => ({
    supabaseAdmin: {
        from: vi.fn(),
    }
}));

// Import App after mocks
import app from '../../app.js';

describe('Attendance Shift Integration Tests', () => {
    const mockSelect = vi.fn();
    const mockEq = vi.fn();
    const mockSingle = vi.fn();
    const mockMaybeSingle = vi.fn();
    const mockOrder = vi.fn();
    const mockLimit = vi.fn();
    const mockGte = vi.fn();
    const mockLte = vi.fn();
    const mockIs = vi.fn();
    const mockNot = vi.fn();

    const mockQueryBuilder = {
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
        maybeSingle: mockMaybeSingle,
        order: mockOrder,
        limit: mockLimit,
        gte: mockGte,
        lte: mockLte,
        is: mockIs,
        not: mockNot
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Default chaining behavior
        mockSelect.mockReturnValue(mockQueryBuilder);
        mockEq.mockReturnValue(mockQueryBuilder);
        mockOrder.mockReturnValue(mockQueryBuilder);
        mockLimit.mockReturnValue(mockQueryBuilder);
        mockGte.mockReturnValue(mockQueryBuilder);
        mockLte.mockReturnValue(mockQueryBuilder);
        mockIs.mockReturnValue(mockQueryBuilder);
        mockNot.mockReturnValue(mockQueryBuilder);

        (supabaseAdmin.from as any).mockReturnValue(mockQueryBuilder);
    });

    it('Get Today Attendance with Assigned Site: Should return siteId and zoneId in shift', async () => {
        const mockSiteId = 'site-12345678-1234-1234-1234-123456789012';
        const mockZoneId = 'zone-87654321-4321-4321-4321-210987654321';

        // 1. Company Settings request (.single)
        mockSingle.mockResolvedValueOnce({
            data: { settings: { timezone: 'Asia/Bangkok' } },
            error: null
        });

        // 2. Existing active attendance check (.maybeSingle)
        mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

        // 3. Shifts check (resolves the builder itself)
        const mockShiftResponse = {
            data: [{
                id: 'shift-1',
                date: new Date().toISOString().split('T')[0],
                start_time: '08:00',
                end_time: '17:00',
                location: 'Bangkok Office',
                site_id: mockSiteId,
                zone_id: mockZoneId,
                status: 'published'
            }],
            error: null
        };

        // 4. Attendance log check (resolves matching nothing)
        const mockEmptyResponse = { data: [], error: null };

        let selectCallCount = 0;
        mockSelect.mockImplementation(() => {
            selectCallCount++;

            // Create a chainable mock that also behaves like a promise
            const chain = { ...mockQueryBuilder };

            // Re-mock all chain methods to return THIS chain
            Object.keys(chain).forEach(key => {
                if (typeof (chain as any)[key] === 'function' && key !== 'single' && key !== 'maybeSingle') {
                    (chain as any)[key] = vi.fn().mockReturnValue(chain);
                }
            });

            // Set up the result based on call count
            const result = selectCallCount === 3 ? mockShiftResponse : mockEmptyResponse;
            (chain as any).then = (resolve: any) => Promise.resolve(resolve(result));

            return chain;
        });

        const res = await request(app).get('/api/v1/attendance/today');

        if (res.status !== 200) {
            console.error('Failure Response:', JSON.stringify(res.body, null, 2));
        }

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.shift).not.toBeNull();
        expect(res.body.data.shift.siteId).toBe(mockSiteId);
        expect(res.body.data.shift.zoneId).toBe(mockZoneId);
    });
});
