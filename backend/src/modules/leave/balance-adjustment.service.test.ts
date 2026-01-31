import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BalanceAdjustmentService } from './balance-adjustment.service';
import { supabaseAdmin } from '../../config/supabase';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import type { AdjustmentFieldName } from './leave.types';

// Mock Supabase
vi.mock('../../config/supabase', () => ({
    supabaseAdmin: {
        from: vi.fn(),
        rpc: vi.fn(),
    },
}));

describe('BalanceAdjustmentService', () => {
    let service: BalanceAdjustmentService;

    // Mock builder to handle chaining
    const mockBuilder: any = {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        eq: vi.fn(),
        single: vi.fn(),
        order: vi.fn(),
        range: vi.fn(),
        // Make the builder thenable to handle 'await ...eq()'
        then: (resolve: Function) => resolve({ data: null, error: null }),
    };

    // Helper to reset chain mocks
    const resetChainMocks = () => {
        // Reset all spies
        mockBuilder.select.mockReset().mockReturnValue(mockBuilder);
        mockBuilder.insert.mockReset().mockReturnValue(mockBuilder);
        mockBuilder.update.mockReset().mockReturnValue(mockBuilder);
        mockBuilder.eq.mockReset().mockReturnValue(mockBuilder);
        mockBuilder.order.mockReset().mockReturnValue(mockBuilder);
        mockBuilder.range.mockReset().mockReturnValue(mockBuilder);

        // single() is terminal, returns a specific Promise, not the builder
        mockBuilder.single.mockReset();
    };

    beforeEach(() => {
        vi.clearAllMocks();
        resetChainMocks();
        service = new BalanceAdjustmentService();

        // Default implementation for from()
        (supabaseAdmin.from as any).mockReturnValue(mockBuilder);
    });

    describe('adjustBalance (Atomic Adjustment)', () => {
        const balanceId = 'bal-123';
        const companyId = 'comp-123';
        const adjustedBy = 'user-admin';
        const validRequest = {
            fieldName: 'entitled_days' as AdjustmentFieldName,
            newValue: 15,
            reason: 'Correction of record',
            adjustmentType: 'manual' as const,
        };

        const mockBalance = {
            id: balanceId,
            company_id: companyId,
            employee_id: 'emp-1',
            leave_type_id: 'lt-1',
            year: 2024,
            entitled_days: 10, // Previous value
            employees: { id: 'emp-1', full_name: 'John Doe', employee_code: 'EMP01' },
            leave_types: { id: 'lt-1', name: 'Annual Leave', name_th: 'พักร้อน' },
        };

        const mockAdjustmentLog = {
            id: 'adj-1',
            balance_id: balanceId,
            company_id: companyId,
            employee_id: 'emp-1',
            leave_type_id: 'lt-1',
            previous_value: 10,
            new_value: 15,
            reason: 'Correction of record',
            created_at: new Date().toISOString(),
            adjuster: { id: adjustedBy, email: 'admin@test.com' },
            employee: { id: 'emp-1', full_name: 'John Doe', employee_code: 'EMP01' },
            leave_type: { id: 'lt-1', name: 'Annual Leave', name_th: 'พักร้อน' },
        };

        it('should successfully update balance and create audit log', async () => {
            // 1. Mock fetch balance
            // The service calls single() twice if insert().select().single() is called?
            // adjustBalance:
            // 1. fetch balance: .single()
            // 2. insert log: .insert().select().single()

            mockBuilder.single
                .mockResolvedValueOnce({ data: mockBalance, error: null }) // Fetch balance
                .mockResolvedValueOnce({ data: mockAdjustmentLog, error: null }); // Insert result

            const result = await service.adjustBalance(balanceId, companyId, adjustedBy, validRequest);

            // Verify operations
            // 1. Fetch
            expect(supabaseAdmin.from).toHaveBeenCalledWith('leave_balances');
            expect(mockBuilder.select).toHaveBeenCalled();
            expect(mockBuilder.eq).toHaveBeenCalledWith('id', balanceId);

            // 2. Update
            expect(supabaseAdmin.from).toHaveBeenCalledWith('leave_balances');
            expect(mockBuilder.update).toHaveBeenCalledWith({ [validRequest.fieldName]: validRequest.newValue });

            // 3. Audit Log
            expect(supabaseAdmin.from).toHaveBeenCalledWith('leave_balance_adjustments');
            expect(mockBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
                balance_id: balanceId,
                previous_value: 10,
                new_value: 15,
                reason: validRequest.reason
            }));

            // Verify result
            expect(result.id).toBe(mockAdjustmentLog.id);
            expect(result.previousValue).toBe(10);
            expect(result.newValue).toBe(15);
        });
    });

    describe('Validation Rules', () => {
        const balanceId = 'bal-123';
        const companyId = 'comp-123';
        const adjustedBy = 'user-admin';

        it('should throw BadRequestError if new value is negative', async () => {
            const request = {
                fieldName: 'entitled_days' as AdjustmentFieldName,
                newValue: -5,
                reason: 'Test',
                adjustmentType: 'manual' as const,
            };

            await expect(service.adjustBalance(balanceId, companyId, adjustedBy, request))
                .rejects.toThrow(BadRequestError);

            expect(supabaseAdmin.from).not.toHaveBeenCalled();
        });

        it('should throw BadRequestError if field name does not exist on balance', async () => {
            const mockBalance = {
                id: balanceId,
                company_id: companyId,
                // entitled_days is missing (undefined)
            };

            mockBuilder.single.mockResolvedValueOnce({ data: mockBalance, error: null });

            const request = {
                fieldName: 'invalid_field' as any, // Cast to force test
                newValue: 10,
                reason: 'Test',
                adjustmentType: 'manual' as const,
            };

            await expect(service.adjustBalance(balanceId, companyId, adjustedBy, request))
                .rejects.toThrow(BadRequestError);
        });

        it('should throw BadRequestError if new value equals previous value', async () => {
            const mockBalance = {
                id: balanceId,
                entitled_days: 10,
            };
            mockBuilder.single.mockResolvedValueOnce({ data: mockBalance, error: null });

            const request = {
                fieldName: 'entitled_days' as AdjustmentFieldName,
                newValue: 10, // Same as previous
                reason: 'Test',
                adjustmentType: 'manual' as const,
            };

            await expect(service.adjustBalance(balanceId, companyId, adjustedBy, request))
                .rejects.toThrow('New value must be different');
        });

        it('should throw NotFoundError if balance not found', async () => {
            mockBuilder.single.mockResolvedValueOnce({ data: null, error: null });

            const request = {
                fieldName: 'entitled_days' as AdjustmentFieldName,
                newValue: 10,
                reason: 'Test',
                adjustmentType: 'manual' as const,
            };

            await expect(service.adjustBalance(balanceId, companyId, adjustedBy, request))
                .rejects.toThrow(NotFoundError);
        });
    });

    describe('Bulk Operations', () => {
        it('should throw BadRequestError if items > 100', async () => {
            const adjustments = Array(101).fill({
                balanceId: '1',
                fieldName: 'entitled_days',
                newValue: 10,
                reason: 'test',
                adjustmentType: 'manual'
            });

            await expect(service.bulkAdjust('comp-1', 'user-1', adjustments))
                .rejects.toThrow('Limit Exceeded');
        });

        it('should process valid items calling adjustBalance for each', async () => {
            // We can spy on adjustBalance to verify calls
            const adjustBalanceSpy = vi.spyOn(service, 'adjustBalance');
            // Mock implementation of adjustBalance to avoid deep db calls for this test
            adjustBalanceSpy.mockResolvedValue({ id: 'adj-1' } as any);

            const adjustments = [
                { balanceId: 'b1', fieldName: 'entitled_days' as AdjustmentFieldName, newValue: 10, reason: 'r1', adjustmentType: 'manual' as const },
                { balanceId: 'b2', fieldName: 'used_days' as AdjustmentFieldName, newValue: 5, reason: 'r2', adjustmentType: 'manual' as const }
            ];

            const result = await service.bulkAdjust('comp-1', 'user-1', adjustments);

            expect(adjustBalanceSpy).toHaveBeenCalledTimes(2);
            expect(result.successful).toBe(2);
            expect(result.failed).toBe(0);
        });

        it('should handle failures in bulk processing', async () => {
            const adjustBalanceSpy = vi.spyOn(service, 'adjustBalance');

            // First succeeds, second fails
            adjustBalanceSpy
                .mockResolvedValueOnce({ id: 'adj-1' } as any)
                .mockRejectedValueOnce(new Error('Update failed'));

            const adjustments = [
                { balanceId: 'b1', fieldName: 'entitled_days' as AdjustmentFieldName, newValue: 10, reason: 'r1', adjustmentType: 'manual' as const },
                { balanceId: 'b2', fieldName: 'used_days' as AdjustmentFieldName, newValue: 5, reason: 'r2', adjustmentType: 'manual' as const }
            ];

            const result = await service.bulkAdjust('comp-1', 'user-1', adjustments);

            expect(adjustBalanceSpy).toHaveBeenCalledTimes(2);
            expect(result.successful).toBe(1);
            expect(result.failed).toBe(1);
            expect(result.errors[0].balanceId).toBe('b2');
        });
    });

    describe('History Retrieval', () => {
        it('should fetch history sorted by created_at desc', async () => {
            const mockData = [
                { id: '1', created_at: '2024-01-02' },
                { id: '2', created_at: '2024-01-01' }
            ];

            // Setup chain for list
            // from -> select -> eq -> eq -> order
            // Note: service.getAdjustmentHistory calls:
            // .from().select().eq().eq().order()
            // The service AWAITS the result of `order()`. 
            // In our mockBuilder, `order()` returns `this` (the builder).
            // `await builder` uses `builder.then`.
            // So we need `builder.then` to yield the data.

            // Customize "then" for this test, or just set data on the builder itself if we mocked "then" to return a property?
            // Our "then" implementation: `then: (resolve) => resolve({ data: null, error: null })`

            // We can override the "then" method for this test scope.
            mockBuilder.then = (resolve: Function) => resolve({ data: mockData, error: null });

            const result = await service.getAdjustmentHistory('bal-1', 'comp-1');

            expect(supabaseAdmin.from).toHaveBeenCalledWith('leave_balance_adjustments');
            expect(mockBuilder.eq).toHaveBeenCalledWith('balance_id', 'bal-1');
            expect(mockBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
            expect(result).toHaveLength(2);
        });
    });
});
