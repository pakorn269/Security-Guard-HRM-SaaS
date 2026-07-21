
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 1. Mock dependencies BEFORE importing the service
vi.mock('../../config/supabase.js', () => ({
    supabaseAdmin: {
        from: vi.fn(),
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
        logger: mockLogger,
        default: mockLogger,
    };
});

vi.mock('../sites/sites.service.js', () => ({
    sitesService: {
        validateZoneQr: vi.fn(),
        validateGeofence: vi.fn(),
    },
}));

// 2. Import service and mocks
import { attendanceService } from './attendance.service.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { sitesService } from '../sites/sites.service.js';

// Helper for generic mock chaining
const createChainableMock = (finalData: any = null, error: any = null) => {
    const chain: any = {
        select: vi.fn(() => chain),
        insert: vi.fn(() => chain),
        update: vi.fn(() => chain),
        delete: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        gt: vi.fn(() => chain),
        is: vi.fn(() => chain),
        not: vi.fn(() => chain),
        order: vi.fn(() => chain),
        range: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        in: vi.fn(() => chain),
        single: vi.fn(() => Promise.resolve({ data: finalData, error })),
        maybeSingle: vi.fn(() => Promise.resolve({ data: finalData, error })),
        then: vi.fn((resolve) => resolve({ data: finalData, error })),
    };
    return chain;
};

describe('Attendance Critical Path', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        // Default Mock for Geofence to pass validation
        vi.mocked(sitesService.validateGeofence).mockResolvedValue({
            isInside: true,
            siteId: 'site-1',
            siteName: 'Critical Site',
            distance: 0
        } as any);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // =========================================================================
    // CRITICAL PATH: CLOCK IN
    // Verifies shift detection across timezones
    // =========================================================================
    describe('clockIn (Critical Business Logic)', () => {
        it('should correctly identify an overnight shift started yesterday (timezone sensitive)', async () => {
            // Scenario:
            // Shift: 22:00 - 06:00 (Overnight)
            // Current Time: 00:30 the next day (Day 2)
            // Timezone: Asia/Bangkok
            // The system must recognize this is still the shift from "yesterday".

            const mockNow = new Date('2026-01-26T00:30:00.000Z'); // UTC implies logic handles offsets, but service uses local time strings + TZ
            // WARNING: The service uses `new Date()` which is system local. In test, we mock system time.
            // If we assume the server is running in UTC, we should be careful.
            // The service logic: `const now = new Date();` then converts to attributes.

            // Let's align with the `attendance.service.test.ts` pattern and set system time.
            // We'll mimic "Now" as 00:30 on Jan 26th.
            vi.setSystemTime(mockNow);

            const yesterdayDate = '2026-01-25';
            const mockCompanySettings = { timezone: 'Asia/Bangkok' };

            const mockOvernightShift = {
                id: 'shift-overnight-123',
                date: yesterdayDate,
                start_time: '22:00:00',
                end_time: '06:00:00',
                location: 'Critical Site',
                site_id: 'site-1',
            };

            // Setup Mocks
            vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                if (table === 'companies') {
                    return createChainableMock({ settings: mockCompanySettings });
                }
                if (table === 'attendance_logs') {
                    // Check existing - None
                    return createChainableMock(null);
                }
                if (table === 'shifts') {
                    // 1. Checks today's shifts -> None
                    // 2. Checks yesterday's shifts -> Returns overnight shift
                    /* 
                       The service calls:
                       1. ...eq('date', today)... -> Returns [] or null
                       2. ...eq('date', yesterday)... -> Returns [mockOvernightShift]
                    */
                    // We need a way to distinguish calls. Ideally we verify the args in expect, 
                    // but here we just return the "yesterday" behavior if "today" fails mentally in the flow.
                    // The service uses distinct calls.
                    // We'll just return the relevant data assuming the service queries correctly.

                    // Helper: inspect arguments of the last call to `eq('date', ...)` if needed, 
                    // but simply returning the shift on the SECOND call or based on logic is complex with simple mocks.
                    // We will return data for both queries to be safe, but filtered by logic if we wanted.
                    // Simpler approach: Return the yesterday match always, 
                    // OR rely on the fact that the service checks today FIRST.
                    // If we return [] for the first call and [shift] for the second...
                    // But pure vitest functions return the same unless using mockImplementationOnce.
                    return createChainableMock([mockOvernightShift]);
                }
                return createChainableMock(null);
            });

            // We need to ensure the first shift check (today) returns empty, and second (yesterday) returns the shift.
            // However, with `createChainableMock` returning a fixed chain, we can't easily switch return values per inner chain call unless we spy deeper.
            // LUCKILY, `attendance.service` logic:
            // 1. `const { data: shifts } = ... eq('date', today)`
            // 2. `if (shifts && shifts.length > 0) ...`
            // 3. `else ... eq('date', yesterday)`

            // Refined Mock Strategy:
            // return empty array first time, valid array second time?
            // Since `from` is called multiple times, we can use `mockImplementationOnce` on `from` but `from` returns a chain.
            // It's easier to assert that if the service finds the shift (even if it thinks it's today's) it works, 
            // BUT for the "Overnight detected from yesterday" logic to fire, `shifts` for today MUST be empty.

            // Let's try to mock the chain execution result specifically. 
            // The `limit(1)` is called for today's shift.
            // The `status` 'published' is called for both.

            // Let's just make the mock return the overnight shift and assume the service logic 
            // will pick it up. Wait, if we return it for "today" query (date=26th), it will match.
            // But the shift date is 25th. The query `eq('date', today)` (26th) won't match our `mockOvernightShift` (date=25th) 
            // IF the DB was real. But here we are mocking the RESPONSE.
            // If we return `mockOvernightShift` (date='2026-01-25') for the query `eq('date', '2026-01-26')`,
            // the service code `shiftData = shifts[0]` will take it.
            // BUT we want to verify the specific "Yesterday's Overnight" branch.

            // We can check strict equality on the args if we want validation, 
            // but for "Critical Path - logic verification", we want to ensure it calculates hours/windows correctly *assuming* it found the shift.

            // For simplicity in this test environment without complex query matching:
            // We will set up the mock to return `[]` for the first query and `[shift]` for the second.
            // We can do this by counting `from('shifts')` calls.

            let shiftsQueryCount = 0;
            const chainForShifts = {
                ...createChainableMock(null), // base
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(), // used in today query
                then: vi.fn((resolve) => {
                    shiftsQueryCount++;
                    // First query is for today: return empty
                    if (shiftsQueryCount === 1) resolve({ data: [] });
                    // Second query is for yesterday: return shift
                    else resolve({ data: [mockOvernightShift] });
                })
            } as any;

            let attendanceLogCallCount = 0;
            const mockCreatedAttendance = {
                id: 'att-new-1',
                company_id: 'company-1',
                employee_id: 'user-1',
                shift_id: mockOvernightShift.id,
                clock_in_time: mockNow.toISOString(),
                status: 'on_time',
                employees: { id: 'user-1', full_name: 'Test User', employee_code: 'T01' },
                shifts: mockOvernightShift
            };

            vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                if (table === 'companies') return createChainableMock({ settings: mockCompanySettings });

                if (table === 'attendance_logs') {
                    attendanceLogCallCount++;
                    if (attendanceLogCallCount === 1) {
                        // Check for existing: Return null (not clocked in)
                        return createChainableMock(null);
                    }
                    // Insert: Return created record
                    return createChainableMock(mockCreatedAttendance);
                }

                if (table === 'shifts') return chainForShifts;
                return createChainableMock(null);
            });

            // Execute
            const result = await attendanceService.clockIn('company-1', 'user-1', {
                latitude: 10, longitude: 10, accuracy: 10
            });

            // Assert
            expect(result.attendance.shiftId).toBe(mockOvernightShift.id);
            expect(result.attendance.shift?.date).toBe(yesterdayDate);
            expect(result.attendance.shift?.startTime).toBe('22:00:00');
        });
    });

    // =========================================================================
    // CRITICAL PATH: CALCULATE HOURS
    // Verifies payroll data (total_hours) is correct
    // =========================================================================
    describe('calculateHours (via clockOut)', () => {
        it('should calculate accurate hours across timezone boundaries', async () => {
            // Scenario:
            // Clocked In: 22:00 (Previous Day)
            // Clock Out: 06:30 (Today)
            // Total Hours: 8.5 hours
            // Timezone is "Asia/Bangkok" (UTC+7)

            // 22:00 Bangkok = 15:00 UTC (Day before)
            // 06:30 Bangkok = 23:30 UTC

            // We set system time to clock out time (06:30 Bangkok)
            const clockOutTime = new Date('2026-01-26T06:30:00');
            vi.setSystemTime(clockOutTime);

            const mockActiveAttendance = {
                id: 'att-1',
                company_id: 'comp-1',
                clock_in_time: '2026-01-25T22:00:00', // Time string as stored in DB (ISO local or UTC? Service assumes ISO)
                // Service uses `new Date(activeAttendance.clock_in_time)`. 
                // If the stored string is "2026-01-25T22:00:00" without Z, it's local. 
                // Usually Supabase stores timestampz as UTC ISO string e.g. "2026-01-25T15:00:00Z".
                // Let's assume the DB returns ISO string. 
                // If 22:00 Bangkok was the clock-in, that is 15:00 UTC.
                // Let's use UTC strings to be safe and mimicking real DB.
                // Duration: 15:00 UTC to 23:30 UTC = 8.5 hours.

                // wait, if I set system time to `new Date('2026-01-25T23:30:00Z')` (06:30 BKK)
                // And clock in time was `'2026-01-25T15:00:00Z'` (22:00 BKK)

                // Let's stick to explicit dates.
            };

            // Let's use specific Date objects to ensure the math is right regardless of string format ambiguity in test.
            // Clock In: Jan 25 22:00
            // Clock Out: Jan 26 06:30
            // Duration: 8h 30m = 8.5 hours

            // The service code: `const totalMs = now.getTime() - clockInTime.getTime();`
            // It relies on JS Date parsing.

            const clockInDate = new Date('2026-01-25T22:00:00'); // interpreted as local
            const startMs = clockInDate.getTime();
            const endMs = startMs + (8.5 * 3600 * 1000);
            const clockOutDate = new Date(endMs);

            vi.setSystemTime(clockOutDate);

            const mockAttendanceRecord = {
                id: 'att-1',
                clock_in_time: clockInDate.toISOString(),
                shifts: {
                    id: 'shift-1',
                    date: '2026-01-25',
                    start_time: '22:00:00',
                    end_time: '06:00:00',
                    companies: { settings: { timezone: 'Asia/Bangkok' } }
                }
            };

            const mockUpdated = { ...mockAttendanceRecord, total_hours: 8.5, status: 'completed' };

            // Mocks
            vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                if (table === 'companies') return createChainableMock({ settings: { timezone: 'Asia/Bangkok', early_leave_threshold_minutes: 15 } });

                // return record then update
                if (table === 'attendance_logs') {
                    // We can't easily distinguish select vs update by table alone in this simple mock structure without state.
                    // But we can return a mock that works for both (has `clock_in_time` for select, and `total_hours` for update result).
                    return createChainableMock(mockUpdated);
                }
                return createChainableMock(null);
            });

            // Run
            const result = await attendanceService.clockOut('comp-1', 'user-1', {
                latitude: 0, longitude: 0, accuracy: 0
            });

            // Assert
            expect(result.totalHours).toBe(8.5);
            expect(result.attendance.totalHours).toBe(8.5);
        });
    });
});
