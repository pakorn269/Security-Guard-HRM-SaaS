import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { supabaseAdmin } from '../../config/supabase.js';
import { sitesService } from '../sites/sites.service.js';

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

describe('Attendance Integration Tests', () => {
    // Helper to log error if status mismatch
    const checkStatus = (res: any, status: number) => {
        if (res.status !== status) {
            console.error(`Expected ${status}, got ${res.status}. Body:`, JSON.stringify(res.body, null, 2));
        }
        expect(res.status).toBe(status);
    };

    // Setup generic mock query builder
    const mockSelect = vi.fn();
    const mockInsert = vi.fn();
    const mockUpdate = vi.fn();
    const mockEq = vi.fn();
    const mockSingle = vi.fn();
    const mockMaybeSingle = vi.fn();
    const mockLimit = vi.fn();
    const mockOrder = vi.fn();
    const mockGte = vi.fn();
    const mockLte = vi.fn();
    const mockIs = vi.fn();
    const mockNot = vi.fn();

    const mockQueryBuilder = {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        eq: mockEq,
        single: mockSingle,
        maybeSingle: mockMaybeSingle,
        limit: mockLimit,
        order: mockOrder,
        gte: mockGte,
        lte: mockLte,
        is: mockIs,
        not: mockNot
    };

    const mockAttendanceRecord = {
        id: 'attendance-123',
        status: 'on_time',
        clock_in_time: new Date().toISOString(),
        company_id: 'company-123',
        employee_id: 'emp-123',
        employees: { id: 'emp-123', full_name: 'John Doe', employee_code: 'EMP01' },
        shifts: {
            id: 'shift-1',
            date: new Date().toISOString().split('T')[0],
            start_time: '08:00',
            end_time: '17:00',
            location: 'Bangkok'
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // 1. Setup Chainable Methods to return 'this' (the mockQueryBuilder)
        const chainableMethods = [
            mockSelect, mockUpdate, mockEq, mockOrder,
            mockGte, mockLte, mockIs, mockNot
        ];
        chainableMethods.forEach(fn => fn.mockReturnValue(mockQueryBuilder));

        // 2. Setup Terminating Methods (Default Responses)
        // These MUST return promises or objects, NOT the builder

        // Initial setup for from()
        (supabaseAdmin.from as any).mockReturnValue(mockQueryBuilder);

        // Common default responses
        // 1. Company Settings request (single)
        mockSingle.mockResolvedValue({ data: { settings: { timezone: 'Asia/Bangkok' } }, error: null });

        // 2. Existing active attendance check (maybeSingle) -> Return null (not clocked in)
        mockMaybeSingle.mockResolvedValue({ data: null, error: null });

        // 3. Shifts (limit) -> Return one shift
        mockLimit.mockResolvedValue({
            data: [{
                id: 'shift-1',
                start_time: '08:00',
                end_time: '17:00',
                date: new Date().toISOString().split('T')[0],
                location: { lat: 13.0, lng: 100.0 }
            }]
        });

        // 4. Insert -> Select -> Single (for creating attendance)
        // We override insert to return a chain that leads to single()
        mockInsert.mockReturnValue({
            select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                    data: mockAttendanceRecord,
                    error: null
                })
            })
        });
    });

    it('Clock In via GPS (Success)', async () => {
        const validSiteId = '123e4567-e89b-12d3-a456-426614174000';
        // Mock validateGeofence to return true
        const validateGeofenceSpy = vi.spyOn(sitesService, 'validateGeofence').mockResolvedValue({
            isInside: true,
            distance: 10,
            siteId: validSiteId,
            siteName: 'Test Site'
        });

        const payload = {
            latitude: 13.7563,
            longitude: 100.5018,
            accuracy: 10,
            siteId: validSiteId
        };

        const res = await request(app)
            .post('/api/v1/attendance/clock-in')
            .send(payload);

        checkStatus(res, 201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('on_time');
        expect(validateGeofenceSpy).toHaveBeenCalled();
    });

    it('Clock In via GPS (Fail) - Outside Geofence', async () => {
        const validSiteId = '123e4567-e89b-12d3-a456-426614174000';
        // Mock validateGeofence to return FALSE
        const validateGeofenceSpy = vi.spyOn(sitesService, 'validateGeofence').mockResolvedValue({
            isInside: false,
            distance: 500,
            siteId: validSiteId,
            siteName: 'Test Site'
        });

        const payload = {
            latitude: 13.7563,
            longitude: 100.5018,
            accuracy: 10,
            siteId: validSiteId
        };

        const res = await request(app)
            .post('/api/v1/attendance/clock-in')
            .send(payload);

        checkStatus(res, 400); // Service converts errors to BadRequest
        expect(res.body.success).toBe(false);
        // The service throws BadRequestError with detailed message
        expect(res.body.error.message).toContain('You are 500m away');
        expect(validateGeofenceSpy).toHaveBeenCalled();
    });

    it('Clock In via QR (Success)', async () => {
        const validSiteId = '123e4567-e89b-12d3-a456-426614174000';
        // Mock validateZoneQr
        const validateQrSpy = vi.spyOn(sitesService, 'validateZoneQr').mockResolvedValue({
            zone: { id: 'zone-1', name: 'Zone A', qrCode: 'QR-123' } as any,
            site: { id: validSiteId, name: 'Test Site' }
        });

        const payload = {
            latitude: 13.7563,
            longitude: 100.5018,
            accuracy: 10,
            siteId: validSiteId,
            zoneQrCode: 'QR-123'
        };

        const res = await request(app)
            .post('/api/v1/attendance/clock-in')
            .send(payload);

        checkStatus(res, 201);
        expect(res.body.success).toBe(true);
        expect(validateQrSpy).toHaveBeenCalledWith('QR-123', 'company-123');
    });

    it('Clock In via QR (Fail) - Invalid QR', async () => {
        const validSiteId = '123e4567-e89b-12d3-a456-426614174000';
        // Mock validateZoneQr to throw
        const validateQrSpy = vi.spyOn(sitesService, 'validateZoneQr').mockRejectedValue(
            new Error('Invalid QR Code')
        );

        const payload = {
            latitude: 13.7563,
            longitude: 100.5018,
            accuracy: 10,
            siteId: validSiteId,
            zoneQrCode: 'INVALID-QR'
        };

        const res = await request(app)
            .post('/api/v1/attendance/clock-in')
            .send(payload);

        checkStatus(res, 400); // Service converts errors to BadRequest
        expect(res.body.success).toBe(false);
        expect(res.body.error.message).toContain('Invalid QR Code');
    });
});
