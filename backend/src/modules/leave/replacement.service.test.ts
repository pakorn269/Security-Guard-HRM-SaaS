
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../config/supabase.js', () => ({
    supabaseAdmin: {
        from: vi.fn(),
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

import { replacementService } from './replacement.service.js';
import { supabaseAdmin } from '../../config/supabase.js';

// Helper for mocking Supabase builder
const createMockQueryBuilder = (returnData: unknown = null, error: unknown = null) => {
    const result = { data: returnData, error };
    const mockBuilder: any = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: returnData, error, count: Array.isArray(returnData) ? returnData.length : 0 }),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(result),
        maybeSingle: vi.fn().mockResolvedValue(result),
        then: (onfulfilled: any) => Promise.resolve(result).then(onfulfilled),
    };
    return mockBuilder;
};

describe('ReplacementService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('findConflictingShifts', () => {
        it('should return conflicting shifts for a given date range', async () => {
            const companyId = 'company-1';
            const employeeId = 'emp-1';
            const startDate = '2026-02-01';
            const endDate = '2026-02-02';

            const mockShifts = [
                {
                    id: 'shift-1',
                    date: '2026-02-01',
                    start_time: '08:00',
                    end_time: '16:00',
                    employee_id: employeeId,
                    site_id: 'site-1',
                    status: 'scheduled',
                    sites: { name: 'Site A', zone: 'Zone 1' },
                    employees: { full_name: 'John Doe' }
                }
            ];

            vi.mocked(supabaseAdmin.from).mockReturnValue(createMockQueryBuilder(mockShifts) as any);

            const result = await replacementService.findConflictingShifts(
                companyId,
                employeeId,
                startDate,
                endDate
            );

            expect(result).toHaveLength(1);
            expect(result[0].shiftId).toBe('shift-1');
            expect(result[0].date).toBe('2026-02-01');
        });
    });

    describe('getAvailableReplacements', () => {
        it('should return only available employees (not assigned to other shifts)', async () => {
            const companyId = 'company-1';
            const shiftId = 'shift-1';
            const originalEmployeeId = 'emp-1';
            const shiftDate = '2026-02-01';

            // 1. Get Shift
            const mockShift = {
                id: shiftId,
                date: shiftDate,
                employee_id: originalEmployeeId,
                site_id: 'site-1'
            };

            // 2. Get Employees (Emp A, Emp B)
            const mockEmployees = [
                { id: 'emp-2', full_name: 'Emp A', employee_code: 'E002', position: 'Guard' },
                { id: 'emp-3', full_name: 'Emp B', employee_code: 'E003', position: 'Guard' }
            ];

            // 3. Check Leaves (Empty)
            const mockLeaves: any[] = [];

            // 4. Check shifts on date - Emp A has a shift
            const mockShiftsOnDate = [
                { employee_id: 'emp-2' }
            ];

            // 5. Check upcoming shifts (for sorting) - empty for simplicity
            const mockUpcomingShifts: any[] = [];

            let shiftsCallCount = 0;
            vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                if (table === 'shifts') {
                    shiftsCallCount++;
                    if (shiftsCallCount === 1) return createMockQueryBuilder(mockShift) as any;
                    if (shiftsCallCount === 2) return createMockQueryBuilder(mockShiftsOnDate) as any;
                    if (shiftsCallCount === 3) return createMockQueryBuilder(mockUpcomingShifts) as any;
                }
                if (table === 'employees') return createMockQueryBuilder(mockEmployees) as any;
                if (table === 'leave_requests') return createMockQueryBuilder(mockLeaves) as any;

                return createMockQueryBuilder([]) as any;
            });

            const result = await replacementService.getAvailableReplacements(shiftId, companyId);

            // Emp A ('emp-2') has a shift, so should be filtered out.
            // Emp B ('emp-3') is free.
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('emp-3');
            expect(result[0].fullName).toBe('Emp B');
        });
    });

    describe('assignReplacement', () => {
        it('should update the shift with replacement details', async () => {
            const companyId = 'company-1';
            const shiftId = 'shift-1';
            const originalEmployeeId = 'emp-1';
            const replacementEmployeeId = 'emp-2';
            const reason = 'Leave replacement';

            // 1. Get Original Shift
            const mockOriginalShift = {
                id: shiftId,
                company_id: companyId,
                employee_id: originalEmployeeId,
                site_id: 'site-1',
                status: 'scheduled'
            };

            // 2. Validate Replacement Employee
            const mockReplacementEmp = {
                id: replacementEmployeeId,
                status: 'active'
            };

            // 3. Update Shift (Return Updated)
            const mockUpdatedShift = {
                ...mockOriginalShift,
                replaced_by_employee_id: replacementEmployeeId,
                is_replacement: true,
                original_employee_id: originalEmployeeId,
                replacement_reason: reason,
                // Nested relations for the return map
                employee: { id: originalEmployeeId, full_name: 'Orig', employee_code: 'E1' },
                replacementEmployee: { id: replacementEmployeeId, full_name: 'Rep', employee_code: 'E2' },
                originalEmployee: { id: originalEmployeeId, full_name: 'Orig', employee_code: 'E1' },
                site: { id: 'site-1', name: 'Site 1', zone: 'Z1' }
            };

            let shiftsCallCount = 0;
            vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
                if (table === 'shifts') {
                    shiftsCallCount++;
                    if (shiftsCallCount === 1) {
                        // Get original shift
                        return createMockQueryBuilder(mockOriginalShift) as any;
                    }
                    if (shiftsCallCount === 2) {
                        // Update shift
                        const builder = createMockQueryBuilder(mockUpdatedShift) as any;
                        builder.update = vi.fn().mockImplementation((payload) => {
                            expect(payload.replaced_by_employee_id).toBe(replacementEmployeeId);
                            expect(payload.is_replacement).toBe(true);
                            return builder;
                        });
                        return builder;
                    }
                }
                if (table === 'employees') {
                    return createMockQueryBuilder(mockReplacementEmp) as any;
                }
                return createMockQueryBuilder() as any;
            });

            const result = await replacementService.assignReplacement(
                shiftId,
                replacementEmployeeId,
                companyId,
                reason
            );

            expect(result.id).toBe(shiftId);
            expect(result.replacedByEmployeeId).toBe(replacementEmployeeId);
            expect(result.isReplacement).toBe(true);
            expect(result.replacementReason).toBe(reason);
        });
    });
});
