import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the dependencies before importing the service
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

vi.mock('../../utils/logger.js', () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

import { attendanceService } from './attendance.service.js';
import { supabaseAdmin } from '../../config/supabase.js';
import { BadRequestError } from '../../utils/errors.js';

// Create a chainable mock builder that properly resolves
const createChainableMock = (finalData: unknown = null, error: unknown = null, _isArray = false) => {
    const resolveValue = { data: finalData, error };

    const createChain = (): Record<string, ReturnType<typeof vi.fn>> => {
        const chain: Record<string, ReturnType<typeof vi.fn>> = {
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
            limit: vi.fn(() => chain), // limit returns chain for further chaining
            in: vi.fn(() => chain),
            single: vi.fn(() => Promise.resolve(resolveValue)),
            maybeSingle: vi.fn(() => Promise.resolve(resolveValue)),
            then: vi.fn((resolve) => resolve(resolveValue)), // For direct Promise resolution
        };
        return chain;
    };

    return createChain();
};

describe('AttendanceService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // =========================================================================
    // Overnight Shift Tests
    // =========================================================================

    describe('Overnight Shift Handling', () => {
        describe('Scenario 1: Standard Overnight Shift Clock-Out', () => {
            it('should return canClockOut: true when guard clocked in yesterday for overnight shift', async () => {
                // Scenario: Guard clocked in at 21:55 on Day 1 for 22:00-06:00 shift
                // Now it's 06:05 on Day 2, guard wants to clock out

                const day2Morning = new Date('2026-01-26T06:05:00');
                vi.setSystemTime(day2Morning);

                const mockActiveAttendance = {
                    id: 'attendance-1',
                    company_id: 'company-1',
                    employee_id: 'employee-1',
                    shift_id: 'shift-1',
                    clock_in_time: '2026-01-25T21:55:00Z',
                    clock_out_time: null,
                    clock_in_latitude: 13.7563,
                    clock_in_longitude: 100.5018,
                    clock_in_accuracy: 10,
                    clock_out_latitude: null,
                    clock_out_longitude: null,
                    clock_out_accuracy: null,
                    status: 'on_time',
                    total_hours: null,
                    overtime_hours: null,
                    notes: null,
                    adjusted_by: null,
                    adjustment_reason: null,
                    created_at: '2026-01-25T21:55:00Z',
                    updated_at: '2026-01-25T21:55:00Z',
                    employees: {
                        id: 'employee-1',
                        full_name: 'John Guard',
                        employee_code: 'G001',
                    },
                    shifts: {
                        id: 'shift-1',
                        date: '2026-01-25',
                        start_time: '22:00:00',
                        end_time: '06:00:00',
                        location: 'Site A',
                    },
                };

                // First query finds active attendance - returns immediately with canClockOut: true
                vi.mocked(supabaseAdmin.from).mockReturnValue(
                    createChainableMock(mockActiveAttendance) as ReturnType<typeof supabaseAdmin.from>
                );

                const result = await attendanceService.getTodayAttendance('company-1', 'employee-1');

                expect(result.canClockOut).toBe(true);
                expect(result.canClockIn).toBe(false);
                expect(result.currentStatus).toBe('clocked_in');
                expect(result.hasShiftToday).toBe(true);
                expect(result.shift).not.toBeNull();
                expect(result.shift?.id).toBe('shift-1');
                expect(result.shift?.startTime).toBe('22:00:00');
                expect(result.shift?.endTime).toBe('06:00:00');
            });
        });

        describe('Scenario 2: Late Clock-in for Overnight Shift', () => {
            it('should allow clock-in for yesterday overnight shift when clocking in after midnight', async () => {
                // Scenario: Shift is 22:00-06:00 (yesterday)
                // Guard is late and wants to clock in at 00:30 on Day 2

                const clockInTime = new Date('2026-01-26T00:30:00');
                vi.setSystemTime(clockInTime);

                const mockYesterdayShift = {
                    id: 'shift-overnight',
                    date: '2026-01-25',
                    start_time: '22:00:00',
                    end_time: '06:00:00',
                    location: 'Main Gate',
                };

                const mockCreatedAttendance = {
                    id: 'attendance-new',
                    company_id: 'company-1',
                    employee_id: 'employee-1',
                    shift_id: 'shift-overnight',
                    clock_in_time: clockInTime.toISOString(),
                    clock_out_time: null,
                    clock_in_latitude: 13.7563,
                    clock_in_longitude: 100.5018,
                    clock_in_accuracy: 10,
                    clock_out_latitude: null,
                    clock_out_longitude: null,
                    clock_out_accuracy: null,
                    status: 'late',
                    total_hours: null,
                    overtime_hours: null,
                    notes: null,
                    adjusted_by: null,
                    adjustment_reason: null,
                    created_at: clockInTime.toISOString(),
                    updated_at: clockInTime.toISOString(),
                    employees: {
                        id: 'employee-1',
                        full_name: 'John Guard',
                        employee_code: 'G001',
                    },
                };

                let attendanceCallCount = 0;
                let shiftsCallCount = 0;
                vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                    // Company settings are fetched first for timezone
                    if (table === 'companies') {
                        return createChainableMock({
                            settings: { timezone: 'Asia/Bangkok', late_threshold_minutes: 15 },
                        }) as ReturnType<typeof supabaseAdmin.from>;
                    }

                    if (table === 'attendance_logs') {
                        attendanceCallCount++;
                        if (attendanceCallCount === 1) {
                            // Check for existing active clock-in - none
                            return createChainableMock(null) as ReturnType<typeof supabaseAdmin.from>;
                        }
                        // Insert new attendance
                        return createChainableMock(mockCreatedAttendance) as ReturnType<typeof supabaseAdmin.from>;
                    }

                    if (table === 'shifts') {
                        shiftsCallCount++;
                        if (shiftsCallCount === 1) {
                            // Check today's shifts - none
                            return createChainableMock([], null, true) as ReturnType<typeof supabaseAdmin.from>;
                        }
                        // Check yesterday's shifts - find overnight shift
                        return createChainableMock([mockYesterdayShift], null, true) as ReturnType<typeof supabaseAdmin.from>;
                    }

                    return createChainableMock(null) as ReturnType<typeof supabaseAdmin.from>;
                });

                const result = await attendanceService.clockIn('company-1', 'employee-1', {
                    latitude: 13.7563,
                    longitude: 100.5018,
                    accuracy: 10,
                });

                // Should successfully clock in using yesterday's overnight shift
                expect(result.attendance).not.toBeNull();
                expect(result.attendance.shiftId).toBe('shift-overnight');
            });
        });

        describe('Scenario 3: Normal Day Shift (Regression)', () => {
            it('should handle normal day shift clock-in correctly', async () => {
                const morningTime = new Date('2026-01-26T08:00:00');
                vi.setSystemTime(morningTime);

                const mockTodayShift = {
                    id: 'shift-day',
                    date: '2026-01-26',
                    start_time: '08:00:00',
                    end_time: '17:00:00',
                    location: 'Office',
                };

                const mockCreatedAttendance = {
                    id: 'attendance-day',
                    company_id: 'company-1',
                    employee_id: 'employee-1',
                    shift_id: 'shift-day',
                    clock_in_time: morningTime.toISOString(),
                    clock_out_time: null,
                    clock_in_latitude: 13.7563,
                    clock_in_longitude: 100.5018,
                    clock_in_accuracy: 10,
                    clock_out_latitude: null,
                    clock_out_longitude: null,
                    clock_out_accuracy: null,
                    status: 'on_time',
                    total_hours: null,
                    overtime_hours: null,
                    notes: null,
                    adjusted_by: null,
                    adjustment_reason: null,
                    created_at: morningTime.toISOString(),
                    updated_at: morningTime.toISOString(),
                    employees: {
                        id: 'employee-1',
                        full_name: 'John Guard',
                        employee_code: 'G001',
                    },
                };

                let attendanceCallCount = 0;
                vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                    // Company settings are fetched first for timezone
                    if (table === 'companies') {
                        return createChainableMock({
                            settings: { timezone: 'Asia/Bangkok', late_threshold_minutes: 15 },
                        }) as ReturnType<typeof supabaseAdmin.from>;
                    }

                    if (table === 'attendance_logs') {
                        attendanceCallCount++;
                        if (attendanceCallCount === 1) {
                            // Check for existing active clock-in - none
                            return createChainableMock(null) as ReturnType<typeof supabaseAdmin.from>;
                        }
                        // Insert new attendance
                        return createChainableMock(mockCreatedAttendance) as ReturnType<typeof supabaseAdmin.from>;
                    }

                    if (table === 'shifts') {
                        // Check today's shifts - found
                        return createChainableMock([mockTodayShift], null, true) as ReturnType<typeof supabaseAdmin.from>;
                    }

                    return createChainableMock(null) as ReturnType<typeof supabaseAdmin.from>;
                });

                const result = await attendanceService.clockIn('company-1', 'employee-1', {
                    latitude: 13.7563,
                    longitude: 100.5018,
                    accuracy: 10,
                });

                // Should successfully clock in for today's shift
                expect(result.attendance).not.toBeNull();
                expect(result.attendance.shiftId).toBe('shift-day');
                expect(result.message).toBe('Clocked in on time!');
            });

            it('should return canClockOut: true when already clocked in for day shift', async () => {
                const middayTime = new Date('2026-01-26T12:00:00');
                vi.setSystemTime(middayTime);

                const mockActiveAttendance = {
                    id: 'attendance-day',
                    company_id: 'company-1',
                    employee_id: 'employee-1',
                    shift_id: 'shift-day',
                    clock_in_time: '2026-01-26T08:00:00Z',
                    clock_out_time: null,
                    clock_in_latitude: 13.7563,
                    clock_in_longitude: 100.5018,
                    clock_in_accuracy: 10,
                    clock_out_latitude: null,
                    clock_out_longitude: null,
                    clock_out_accuracy: null,
                    status: 'on_time',
                    total_hours: null,
                    overtime_hours: null,
                    notes: null,
                    adjusted_by: null,
                    adjustment_reason: null,
                    created_at: '2026-01-26T08:00:00Z',
                    updated_at: '2026-01-26T08:00:00Z',
                    employees: {
                        id: 'employee-1',
                        full_name: 'John Guard',
                        employee_code: 'G001',
                    },
                    shifts: {
                        id: 'shift-day',
                        date: '2026-01-26',
                        start_time: '08:00:00',
                        end_time: '17:00:00',
                        location: 'Office',
                    },
                };

                vi.mocked(supabaseAdmin.from).mockReturnValue(
                    createChainableMock(mockActiveAttendance) as ReturnType<typeof supabaseAdmin.from>
                );

                const result = await attendanceService.getTodayAttendance('company-1', 'employee-1');

                expect(result.hasShiftToday).toBe(true);
                expect(result.canClockIn).toBe(false);
                expect(result.canClockOut).toBe(true);
                expect(result.currentStatus).toBe('clocked_in');
            });
        });
    });

    // =========================================================================
    // Clock Out Tests
    // =========================================================================

    describe('Clock Out', () => {
        it('should successfully clock out for overnight shift', async () => {
            const clockOutTime = new Date('2026-01-26T06:00:00');
            vi.setSystemTime(clockOutTime);

            const mockActiveAttendance = {
                id: 'attendance-1',
                company_id: 'company-1',
                employee_id: 'employee-1',
                shift_id: 'shift-1',
                clock_in_time: '2026-01-25T22:00:00Z',
                clock_out_time: null,
                clock_in_latitude: 13.7563,
                clock_in_longitude: 100.5018,
                clock_in_accuracy: 10,
                clock_out_latitude: null,
                clock_out_longitude: null,
                clock_out_accuracy: null,
                status: 'on_time',
                total_hours: null,
                overtime_hours: null,
                notes: null,
                adjusted_by: null,
                adjustment_reason: null,
                created_at: '2026-01-25T22:00:00Z',
                updated_at: '2026-01-25T22:00:00Z',
                employees: {
                    id: 'employee-1',
                    full_name: 'John Guard',
                    employee_code: 'G001',
                },
                shifts: {
                    id: 'shift-1',
                    date: '2026-01-25',
                    start_time: '22:00:00',
                    end_time: '06:00:00',
                    location: 'Site A',
                },
            };

            const mockUpdatedAttendance = {
                ...mockActiveAttendance,
                clock_out_time: clockOutTime.toISOString(),
                clock_out_latitude: 13.7563,
                clock_out_longitude: 100.5018,
                clock_out_accuracy: 10,
                status: 'completed',
                total_hours: 8,
            };

            let callCount = 0;
            vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                callCount++;

                if (table === 'companies') {
                    return createChainableMock({
                        settings: { early_leave_threshold_minutes: 15 },
                    }) as ReturnType<typeof supabaseAdmin.from>;
                }

                if (table === 'attendance_logs' && callCount <= 2) {
                    // Find active attendance
                    return createChainableMock(mockActiveAttendance) as ReturnType<typeof supabaseAdmin.from>;
                }

                if (table === 'attendance_logs') {
                    // Update attendance
                    return createChainableMock(mockUpdatedAttendance) as ReturnType<typeof supabaseAdmin.from>;
                }

                return createChainableMock(null) as ReturnType<typeof supabaseAdmin.from>;
            });

            const result = await attendanceService.clockOut('company-1', 'employee-1', {
                latitude: 13.7563,
                longitude: 100.5018,
                accuracy: 10,
            });

            expect(result.attendance).not.toBeNull();
            expect(result.message).toBe('Clocked out successfully!');
            // Total hours is calculated from actual clock-in/out times
            // The mock returns a calculated value, so we just verify it's a positive number
            expect(result.totalHours).toBeGreaterThan(0);
        });

        it('should throw error when trying to clock out without clocking in', async () => {
            const morningTime = new Date('2026-01-26T17:00:00');
            vi.setSystemTime(morningTime);

            let callCount = 0;
            vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                callCount++;

                if (table === 'companies') {
                    return createChainableMock({ settings: {} }) as ReturnType<typeof supabaseAdmin.from>;
                }

                if (table === 'attendance_logs') {
                    // No active attendance found
                    return createChainableMock(null) as ReturnType<typeof supabaseAdmin.from>;
                }

                return createChainableMock(null) as ReturnType<typeof supabaseAdmin.from>;
            });

            await expect(
                attendanceService.clockOut('company-1', 'employee-1', {
                    latitude: 13.7563,
                    longitude: 100.5018,
                    accuracy: 10,
                })
            ).rejects.toThrow(BadRequestError);
        });
    });

    // =========================================================================
    // Helper Function Tests
    // =========================================================================

    describe('isOvernightShift Helper', () => {
        it('should detect overnight shift (22:00 - 06:00)', () => {
            const service = attendanceService as unknown as {
                isOvernightShift: (s: string, e: string) => boolean;
            };
            expect(service.isOvernightShift('22:00:00', '06:00:00')).toBe(true);
        });

        it('should detect overnight shift (23:30 - 07:30)', () => {
            const service = attendanceService as unknown as {
                isOvernightShift: (s: string, e: string) => boolean;
            };
            expect(service.isOvernightShift('23:30:00', '07:30:00')).toBe(true);
        });

        it('should NOT detect day shift as overnight (08:00 - 17:00)', () => {
            const service = attendanceService as unknown as {
                isOvernightShift: (s: string, e: string) => boolean;
            };
            expect(service.isOvernightShift('08:00:00', '17:00:00')).toBe(false);
        });

        it('should NOT detect evening shift as overnight (14:00 - 22:00)', () => {
            const service = attendanceService as unknown as {
                isOvernightShift: (s: string, e: string) => boolean;
            };
            expect(service.isOvernightShift('14:00:00', '22:00:00')).toBe(false);
        });

        it('should detect midnight-spanning shift (21:00 - 05:00)', () => {
            const service = attendanceService as unknown as {
                isOvernightShift: (s: string, e: string) => boolean;
            };
            expect(service.isOvernightShift('21:00:00', '05:00:00')).toBe(true);
        });
    });

    // =========================================================================
    // Edge Cases
    // =========================================================================

    describe('Edge Cases', () => {
        it('should throw error when trying to clock in while already clocked in', async () => {
            const morningTime = new Date('2026-01-26T08:00:00');
            vi.setSystemTime(morningTime);

            const mockExistingAttendance = {
                id: 'attendance-existing',
                clock_in_time: '2026-01-26T07:55:00Z',
                clock_out_time: null,
            };

            vi.mocked(supabaseAdmin.from).mockReturnValue(
                createChainableMock(mockExistingAttendance) as ReturnType<typeof supabaseAdmin.from>
            );

            await expect(
                attendanceService.clockIn('company-1', 'employee-1', {
                    latitude: 13.7563,
                    longitude: 100.5018,
                    accuracy: 10,
                })
            ).rejects.toThrow(BadRequestError);
        });

        it('should return no_shift when employee has no shift today', async () => {
            const morningTime = new Date('2026-01-26T09:00:00');
            vi.setSystemTime(morningTime);

            vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                // Company settings are fetched first for timezone
                if (table === 'companies') {
                    return createChainableMock({
                        settings: { timezone: 'Asia/Bangkok' },
                    }) as ReturnType<typeof supabaseAdmin.from>;
                }

                if (table === 'attendance_logs') {
                    // No active attendance / no attendance records
                    return createChainableMock(null) as ReturnType<typeof supabaseAdmin.from>;
                }

                if (table === 'shifts') {
                    // No shifts found (today or yesterday)
                    return createChainableMock([], null, true) as ReturnType<typeof supabaseAdmin.from>;
                }

                return createChainableMock(null) as ReturnType<typeof supabaseAdmin.from>;
            });

            const result = await attendanceService.getTodayAttendance('company-1', 'employee-1');

            expect(result.hasShiftToday).toBe(false);
            expect(result.canClockIn).toBe(false);
            expect(result.canClockOut).toBe(false);
            expect(result.currentStatus).toBe('no_shift');
            expect(result.shift).toBeNull();
        });
    });

    // =========================================================================
    // Timezone Bug Tests - Early Leave Detection
    // =========================================================================

    describe('Timezone-aware Early Leave Detection', () => {
        it('should mark as completed (not early_leave) when clocking out AFTER shift end', async () => {
            // Scenario: Shift 22:00-07:00, clock out at 11:40 (4h 40min AFTER shift end)
            // Expected: status = 'completed', overtime calculated
            // Bug: Without timezone fix, 07:00 was interpreted as UTC (14:00 Bangkok)
            // so 11:40 Bangkok < 14:00 Bangkok → incorrectly marked as early_leave

            const clockOutTime = new Date('2026-01-26T11:40:00'); // 11:40 Bangkok
            vi.setSystemTime(clockOutTime);

            const mockActiveAttendance = {
                id: 'attendance-overtime',
                company_id: 'company-1',
                employee_id: 'employee-1',
                shift_id: 'shift-overnight',
                clock_in_time: '2026-01-25T22:15:00Z', // Clocked in 22:15
                clock_out_time: null,
                clock_in_latitude: 13.7563,
                clock_in_longitude: 100.5018,
                clock_in_accuracy: 10,
                clock_out_latitude: null,
                clock_out_longitude: null,
                clock_out_accuracy: null,
                status: 'on_time',
                total_hours: null,
                overtime_hours: null,
                notes: null,
                adjusted_by: null,
                adjustment_reason: null,
                created_at: '2026-01-25T22:15:00Z',
                updated_at: '2026-01-25T22:15:00Z',
                employees: {
                    id: 'employee-1',
                    full_name: 'John Guard',
                    employee_code: 'G001',
                },
                shifts: {
                    id: 'shift-overnight',
                    date: '2026-01-25',
                    start_time: '22:00:00',
                    end_time: '07:00:00', // Shift ends at 07:00
                    location: 'Site A',
                    companies: {
                        settings: {
                            timezone: 'Asia/Bangkok',
                            early_leave_threshold_minutes: 15,
                        },
                    },
                },
            };

            const mockUpdatedAttendance = {
                ...mockActiveAttendance,
                clock_out_time: clockOutTime.toISOString(),
                clock_out_latitude: 13.7563,
                clock_out_longitude: 100.5018,
                clock_out_accuracy: 10,
                status: 'completed',
                total_hours: 13.42, // ~13h 25min
                overtime_hours: 4.67, // ~4h 40min overtime
            };

            let callCount = 0;
            vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                callCount++;

                if (table === 'companies') {
                    return createChainableMock({
                        settings: {
                            timezone: 'Asia/Bangkok',
                            early_leave_threshold_minutes: 15,
                        },
                    }) as ReturnType<typeof supabaseAdmin.from>;
                }

                if (table === 'attendance_logs' && callCount <= 2) {
                    // Find active attendance
                    return createChainableMock(mockActiveAttendance) as ReturnType<typeof supabaseAdmin.from>;
                }

                if (table === 'attendance_logs') {
                    // Update attendance
                    return createChainableMock(mockUpdatedAttendance) as ReturnType<typeof supabaseAdmin.from>;
                }

                return createChainableMock(null) as ReturnType<typeof supabaseAdmin.from>;
            });

            const result = await attendanceService.clockOut('company-1', 'employee-1', {
                latitude: 13.7563,
                longitude: 100.5018,
                accuracy: 10,
            });

            // KEY ASSERTION: Should be 'completed' NOT 'early_leave'
            expect(result.message).toBe('Clocked out successfully!');
            expect(result.totalHours).toBeGreaterThan(0);
        });

        it('should correctly identify early leave when clocking out BEFORE shift end', async () => {
            // Scenario: Shift 22:00-07:00, clock out at 05:30 (1.5h BEFORE shift end)
            // Expected: status = 'early_leave'

            const clockOutTime = new Date('2026-01-26T05:30:00'); // 05:30 Bangkok (early)
            vi.setSystemTime(clockOutTime);

            const mockActiveAttendance = {
                id: 'attendance-early',
                company_id: 'company-1',
                employee_id: 'employee-1',
                shift_id: 'shift-overnight',
                clock_in_time: '2026-01-25T22:00:00Z',
                clock_out_time: null,
                clock_in_latitude: 13.7563,
                clock_in_longitude: 100.5018,
                clock_in_accuracy: 10,
                clock_out_latitude: null,
                clock_out_longitude: null,
                clock_out_accuracy: null,
                status: 'on_time',
                total_hours: null,
                overtime_hours: null,
                notes: null,
                adjusted_by: null,
                adjustment_reason: null,
                created_at: '2026-01-25T22:00:00Z',
                updated_at: '2026-01-25T22:00:00Z',
                employees: {
                    id: 'employee-1',
                    full_name: 'John Guard',
                    employee_code: 'G001',
                },
                shifts: {
                    id: 'shift-overnight',
                    date: '2026-01-25',
                    start_time: '22:00:00',
                    end_time: '07:00:00',
                    location: 'Site A',
                    companies: {
                        settings: {
                            timezone: 'Asia/Bangkok',
                            early_leave_threshold_minutes: 15,
                        },
                    },
                },
            };

            const mockUpdatedAttendance = {
                ...mockActiveAttendance,
                clock_out_time: clockOutTime.toISOString(),
                clock_out_latitude: 13.7563,
                clock_out_longitude: 100.5018,
                clock_out_accuracy: 10,
                status: 'early_leave',
                total_hours: 7.5,
                overtime_hours: 0,
            };

            let callCount = 0;
            vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                callCount++;

                if (table === 'companies') {
                    return createChainableMock({
                        settings: {
                            timezone: 'Asia/Bangkok',
                            early_leave_threshold_minutes: 15,
                        },
                    }) as ReturnType<typeof supabaseAdmin.from>;
                }

                if (table === 'attendance_logs' && callCount <= 2) {
                    return createChainableMock(mockActiveAttendance) as ReturnType<typeof supabaseAdmin.from>;
                }

                if (table === 'attendance_logs') {
                    return createChainableMock(mockUpdatedAttendance) as ReturnType<typeof supabaseAdmin.from>;
                }

                return createChainableMock(null) as ReturnType<typeof supabaseAdmin.from>;
            });

            const result = await attendanceService.clockOut('company-1', 'employee-1', {
                latitude: 13.7563,
                longitude: 100.5018,
                accuracy: 10,
            });

            // Should be early_leave since 05:30 < 07:00 (90 minutes early)
            expect(result.message).toBe('Clocked out (early leave)');
        });
    });

    // =========================================================================
    // Helper Method Tests - Timezone Functions
    // =========================================================================

    describe('createDateInTimezone Helper', () => {
        it('should create date in Bangkok timezone correctly', () => {
            const service = attendanceService as unknown as {
                createDateInTimezone: (d: string, t: string, tz: string) => Date;
            };

            const result = service.createDateInTimezone('2026-01-26', '07:00', 'Asia/Bangkok');

            // The result should represent 07:00 Bangkok time
            expect(result.getHours()).toBe(7);
            expect(result.getMinutes()).toBe(0);
        });

        it('should handle time with seconds', () => {
            const service = attendanceService as unknown as {
                createDateInTimezone: (d: string, t: string, tz: string) => Date;
            };

            const result = service.createDateInTimezone('2026-01-26', '07:30:45', 'Asia/Bangkok');

            expect(result.getHours()).toBe(7);
            expect(result.getMinutes()).toBe(30);
            expect(result.getSeconds()).toBe(45);
        });
    });

    describe('getNowInTimezone Helper', () => {
        it('should return current time in specified timezone', () => {
            const testTime = new Date('2026-01-26T10:00:00Z'); // 17:00 Bangkok
            vi.setSystemTime(testTime);

            const service = attendanceService as unknown as {
                getNowInTimezone: (tz: string) => Date;
            };

            const result = service.getNowInTimezone('Asia/Bangkok');

            // Result should be 17:00 in Bangkok (UTC+7)
            expect(result.getHours()).toBe(17);
            expect(result.getMinutes()).toBe(0);
        });
    });

    // =========================================================================
    // Integration-like Tests
    // =========================================================================

    describe('Complete Overnight Shift Workflow', () => {
        it('should handle full overnight shift lifecycle: clock-in -> next day -> clock-out', async () => {
            // This test simulates the complete flow described in the bug:
            // 1. Guard clocks in at 22:00 on Day 1
            // 2. Next morning at 06:00 on Day 2, they should see clock-out button

            // Step 1: At 06:00 on Day 2, check if clock-out is available
            const day2Morning = new Date('2026-01-26T06:00:00');
            vi.setSystemTime(day2Morning);

            const mockActiveOvernightAttendance = {
                id: 'attendance-overnight',
                company_id: 'company-1',
                employee_id: 'guard-1',
                shift_id: 'shift-overnight',
                clock_in_time: '2026-01-25T22:00:00Z', // Clocked in yesterday
                clock_out_time: null, // Not clocked out
                clock_in_latitude: 13.7563,
                clock_in_longitude: 100.5018,
                clock_in_accuracy: 10,
                clock_out_latitude: null,
                clock_out_longitude: null,
                clock_out_accuracy: null,
                status: 'on_time',
                total_hours: null,
                overtime_hours: null,
                notes: null,
                adjusted_by: null,
                adjustment_reason: null,
                created_at: '2026-01-25T22:00:00Z',
                updated_at: '2026-01-25T22:00:00Z',
                employees: {
                    id: 'guard-1',
                    full_name: 'Night Guard',
                    employee_code: 'NG001',
                },
                shifts: {
                    id: 'shift-overnight',
                    date: '2026-01-25', // Shift belongs to yesterday
                    start_time: '22:00:00',
                    end_time: '06:00:00', // Ends today
                    location: 'Front Gate',
                },
            };

            // The first query for active attendance should return the overnight shift
            vi.mocked(supabaseAdmin.from).mockReturnValue(
                createChainableMock(mockActiveOvernightAttendance) as ReturnType<typeof supabaseAdmin.from>
            );

            const result = await attendanceService.getTodayAttendance('company-1', 'guard-1');

            // THE KEY FIX: This should work now!
            // Before the fix: currentStatus would be 'no_shift' because shift.date (2026-01-25) != today (2026-01-26)
            // After the fix: We check for active attendance FIRST, so it returns canClockOut: true
            expect(result.currentStatus).toBe('clocked_in');
            expect(result.canClockOut).toBe(true);
            expect(result.canClockIn).toBe(false);
            expect(result.hasShiftToday).toBe(true);
            expect(result.shift?.id).toBe('shift-overnight');

            // Verify shift details are from yesterday's overnight shift
            expect(result.shift?.date).toBe('2026-01-25');
            expect(result.shift?.startTime).toBe('22:00:00');
            expect(result.shift?.endTime).toBe('06:00:00');
        });
    });
});
