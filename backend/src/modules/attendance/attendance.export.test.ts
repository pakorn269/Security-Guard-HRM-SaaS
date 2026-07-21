
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// 1. Mock Environment
vi.mock('../../config/env.js', () => ({
    env: {
        NODE_ENV: 'test',
        API_VERSION: 'v1',
        CORS_ORIGIN: 'http://localhost:3000',
        RATE_LIMIT_WINDOW_MS: '60000',
        RATE_LIMIT_MAX: '100',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'mock-service-role-key',
        SUPABASE_ANON_KEY: 'mock-anon-key',
        LINE_CHANNEL_ACCESS_TOKEN: 'mock-channel-token',
        LINE_CHANNEL_SECRET: 'mock-channel-secret',
        LINE_CHANNEL_ID: 'mock-channel-id'
    }
}));

// 2. Mock Auth Middleware
vi.mock('../../middleware/auth.middleware.js', () => ({
    authMiddleware: (req: any, res: any, next: any) => {
        req.user = {
            companyId: 'company-1',
            userId: 'user-1',
            role: 'manager',
            employeeId: 'emp-1'
        };
        next();
    },
    requireManager: (req: any, res: any, next: any) => next(),
    requireNonLiff: (req: any, res: any, next: any) => next(),
    requireLiffOnly: (req: any, res: any, next: any) => next(),
    optionalAuthMiddleware: (req: any, res: any, next: any) => next(),
    requireAdmin: (req: any, res: any, next: any) => next(),
    requireRoles: () => (req: any, res: any, next: any) => next(),
}));

// 3. Mock Service
vi.mock('./attendance.service.js', () => ({
    attendanceService: {
        generateExportData: vi.fn(),
    }
}));

import app from '../../app.js';
import { attendanceService } from './attendance.service.js';

describe('Export API Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should export excel file with records filtered by siteId', async () => {
        // Setup: 5 Mock records with valid UUIDs for siteId
        const siteA_ID = '11111111-1111-4111-8111-111111111111';
        const siteB_ID = '22222222-2222-4222-8222-222222222222';

        const mockRecords = [
            {
                id: '1',
                siteId: siteA_ID,
                status: 'on_time',
                clockInTime: '2026-01-28T08:00:00Z',
                employee: { employeeCode: 'E01', fullName: 'Guard A' },
                shift: { location: 'Site A' },
                clockInLatitude: 13.0, clockInLongitude: 100.0
            },
            {
                id: '2',
                siteId: siteA_ID,
                status: 'late',
                clockInTime: '2026-01-28T08:15:00Z',
                employee: { employeeCode: 'E02', fullName: 'Guard B' },
                shift: { location: 'Site A' },
                clockInLatitude: 13.0, clockInLongitude: 100.0
            },
            {
                id: '3',
                siteId: siteA_ID,
                status: 'on_time',
                clockInTime: '2026-01-28T08:00:00Z',
                employee: { employeeCode: 'E03', fullName: 'Guard C' },
                shift: { location: 'Site A' },
                clockInLatitude: 13.0, clockInLongitude: 100.0
            },
            {
                id: '4',
                siteId: siteB_ID,
                status: 'on_time',
                clockInTime: '2026-01-28T08:00:00Z',
                employee: { employeeCode: 'E04', fullName: 'Guard D' },
                shift: { location: 'Site B' },
                clockInLatitude: 13.1, clockInLongitude: 100.1
            },
            {
                id: '5',
                siteId: siteB_ID,
                status: 'completed',
                clockInTime: '2026-01-28T08:00:00Z',
                employee: { employeeCode: 'E05', fullName: 'Guard E' },
                shift: { location: 'Site B' },
                clockInLatitude: 13.1, clockInLongitude: 100.1
            },
        ];

        // Mock Implementation to simulate filtering
        vi.mocked(attendanceService.generateExportData).mockImplementation(async (companyId, filters) => {
            // Verify filters are passed correctly
            if (filters.siteId) {
                return mockRecords.filter(r => r.siteId === filters.siteId);
            }
            return mockRecords;
        });

        // Act: Call Export Endpoint with Filter
        const response = await request(app)
            .get('/api/v1/attendance/export')
            .query({ siteId: siteA_ID, format: 'excel' })
            .expect(200);

        // Assert: Headers
        expect(response.header['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        expect(response.header['content-disposition']).toContain('attachment; filename="attendance_');

        // Assert: Service Call
        expect(attendanceService.generateExportData).toHaveBeenCalledWith(
            'company-1',
            expect.objectContaining({ siteId: siteA_ID })
        );

        console.log('Export stream generated successfully with Content-Type:', response.header['content-type']);
    });
});
