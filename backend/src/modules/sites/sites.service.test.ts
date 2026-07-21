import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sitesService } from './sites.service.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { NotFoundError } from '../../utils/errors.js';

// Mock dependnecies
vi.mock('../../config/supabase.js', () => ({
    supabaseAdmin: {
        from: vi.fn(),
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

describe('SitesService', () => {
    const mockCompanyId = 'company-123';
    const mockSiteId = 'site-123';

    // Mock Query Builder
    const mockSelect = vi.fn();
    const mockEq = vi.fn();
    const mockSingle = vi.fn();

    const mockQueryBuilder = {
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mock chain
        (supabaseAdmin.from as any).mockReturnValue(mockQueryBuilder);
        mockSelect.mockReturnValue(mockQueryBuilder);
        mockEq.mockReturnValue(mockQueryBuilder);
        // mockSingle will be defined in individual tests
    });

    describe('validateGeofence', () => {
        // Base site for testing
        const baseSite = {
            id: mockSiteId,
            name: 'Test Site',
            latitude: 13.75633, // Bangkok
            longitude: 100.50177,
            radius: 100, // 100 meters
            is_active: true,
        };

        it('Case 1 (Exact Match): User is at the exact same coordinate', async () => {
            // Setup mock
            mockSingle.mockResolvedValue({ data: baseSite, error: null });

            const result = await sitesService.validateGeofence(
                mockSiteId,
                mockCompanyId,
                13.75633,
                100.50177
            );

            expect(result.isInside).toBe(true);
            expect(result.distance).toBe(0); // Should be exactly 0
            expect(result.siteId).toBe(baseSite.id);
        });

        it('Case 2 (Inside): User is within the radius', async () => {
            mockSingle.mockResolvedValue({ data: baseSite, error: null });

            // A point roughly 50m away
            // Approximately 0.00045 degrees lat is ~50m
            const userLat = 13.75633 + 0.00045;
            const userLng = 100.50177;

            const result = await sitesService.validateGeofence(
                mockSiteId,
                mockCompanyId,
                userLat,
                userLng
            );

            expect(result.isInside).toBe(true);
            expect(result.distance).toBeGreaterThan(0);
            expect(result.distance).toBeLessThanOrEqual(100);
        });

        it('Case 3 (Boundary - Edge Case): User is just outside the radius', async () => {
            mockSingle.mockResolvedValue({ data: baseSite, error: null });

            // A point roughly 101m away
            // 0.00091 degrees lat is ~101m (1 deg ~ 111km -> 0.001 ~ 111m)
            // Let's use a more precise shift or verify the distance calc logic
            // 101m / 111139m/deg = 0.000908
            const userLat = 13.75633 + 0.00092;
            const userLng = 100.50177;

            const result = await sitesService.validateGeofence(
                mockSiteId,
                mockCompanyId,
                userLat,
                userLng
            );

            expect(result.isInside).toBe(false);
            expect(result.distance).toBeGreaterThan(100);
        });

        it('Case 4 (Outside): User is far away', async () => {
            mockSingle.mockResolvedValue({ data: baseSite, error: null });

            const result = await sitesService.validateGeofence(
                mockSiteId,
                mockCompanyId,
                14.000, // Very far away
                100.500
            );

            expect(result.isInside).toBe(false);
            expect(result.distance).toBeGreaterThan(1000);
        });

        it('should throw NotFoundError if site does not exist', async () => {
            mockSingle.mockResolvedValue({ data: null, error: { message: 'Not Found' } });

            await expect(sitesService.validateGeofence(
                mockSiteId,
                mockCompanyId,
                0, 0
            )).rejects.toThrow(NotFoundError);
        });

        it('should throw Error if site is inactive', async () => {
            mockSingle.mockResolvedValue({
                data: { ...baseSite, is_active: false },
                error: null
            });

            await expect(sitesService.validateGeofence(
                mockSiteId,
                mockCompanyId,
                0, 0
            )).rejects.toThrow('Site is not active');
        });

        it('should throw Error if site has no geolocation', async () => {
            mockSingle.mockResolvedValue({
                data: { ...baseSite, latitude: null, longitude: null },
                error: null
            });

            await expect(sitesService.validateGeofence(
                mockSiteId,
                mockCompanyId,
                0, 0
            )).rejects.toThrow('Site does not have geolocation configured');
        });
    });

    describe('validateZoneQr', () => {
        const validQrCode = 'VALID-QR-123';
        const invalidQrCode = 'INVALID-QR-999';

        const mockZoneDB = {
            id: 'zone-1',
            site_id: 'site-1',
            company_id: mockCompanyId,
            name: 'Main Gate',
            code: 'Z-001',
            description: 'Main entrance',
            qr_code: validQrCode,
            is_active: true,
            display_order: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sites: {
                id: 'site-1',
                name: 'HQ',
                is_active: true
            }
        };

        it('Case 1 (Valid): Input a valid QR string', async () => {
            mockSingle.mockResolvedValue({ data: mockZoneDB, error: null });

            const result = await sitesService.validateZoneQr(validQrCode, mockCompanyId);

            expect(result.zone).toBeDefined();
            expect(result.zone.qrCode).toBe(validQrCode);
            expect(result.site.id).toBe(mockZoneDB.sites.id);

            // Verify DB call
            expect(supabaseAdmin.from).toHaveBeenCalledWith('zones');
            expect(mockEq).toHaveBeenCalledWith('qr_code', validQrCode);
            expect(mockEq).toHaveBeenCalledWith('company_id', mockCompanyId);
        });

        it('Case 2 (Invalid Format/Random String): Input a random string', async () => {
            mockSingle.mockResolvedValue({ data: null, error: null }); // Not found

            await expect(sitesService.validateZoneQr(
                'random-string',
                mockCompanyId
            )).rejects.toThrow('Zone not found');
        });

        it('Case 3 (Not Found): Input a correctly formatted QR code that doesn\'t exist', async () => {
            mockSingle.mockResolvedValue({ data: null, error: null });

            await expect(sitesService.validateZoneQr(
                invalidQrCode,
                mockCompanyId
            )).rejects.toThrow('Zone not found');
        });

        it('should throw Error if zone is inactive', async () => {
            mockSingle.mockResolvedValue({
                data: { ...mockZoneDB, is_active: false },
                error: null
            });

            await expect(sitesService.validateZoneQr(
                validQrCode,
                mockCompanyId
            )).rejects.toThrow('Zone is not active');
        });

        it('should throw Error if site is inactive', async () => {
            mockSingle.mockResolvedValue({
                data: {
                    ...mockZoneDB,
                    sites: { ...mockZoneDB.sites, is_active: false }
                },
                error: null
            });

            await expect(sitesService.validateZoneQr(
                validQrCode,
                mockCompanyId
            )).rejects.toThrow('Site is not active');
        });
    });
});
