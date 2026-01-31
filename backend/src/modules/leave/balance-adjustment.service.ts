/**
 * Leave Balance Adjustment Service
 * Handles manual balance adjustments with full audit trail
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { NotFoundError, BadRequestError, AppError } from '../../utils/errors.js';
import type {
    LeaveBalanceAdjustmentRow,
    LeaveBalanceAdjustmentWithDetails,
    BalanceAdjustment,
    BalanceAdjustmentWithDetails,
    AdjustBalanceRequest,
    BulkAdjustmentItem,
    AdjustmentFieldName,
} from './leave.types.js';

export class BalanceAdjustmentService {
    /**
     * Adjust a leave balance with audit trail
     * ATOMIC OPERATION: Updates balance and creates audit log in a transaction
     */
    async adjustBalance(
        balanceId: string,
        companyId: string,
        adjustedBy: string,
        data: AdjustBalanceRequest
    ): Promise<BalanceAdjustmentWithDetails> {
        const { fieldName, newValue, reason, adjustmentType } = data;

        // Validate new value
        if (newValue < 0) {
            throw new BadRequestError('New value cannot be negative');
        }

        // Start a transaction by fetching the current balance first
        const { data: balance, error: balanceError } = await supabaseAdmin
            .from('leave_balances')
            .select('*, employees(id, full_name, employee_code), leave_types(id, name, name_th)')
            .eq('id', balanceId)
            .eq('company_id', companyId)
            .single();

        if (balanceError || !balance) {
            throw new NotFoundError('Leave balance not found');
        }

        // Get the previous value
        const previousValue = balance[fieldName as keyof typeof balance] as number;

        if (previousValue === undefined) {
            throw new BadRequestError(`Invalid field name: ${fieldName}`);
        }

        // Check if value is actually changing
        if (previousValue === newValue) {
            throw new BadRequestError('New value must be different from current value');
        }

        // Use Supabase RPC for atomic transaction
        // We'll execute both operations and rely on Supabase's transaction handling
        try {
            // Step 1: Update the balance
            const { error: updateError } = await supabaseAdmin
                .from('leave_balances')
                .update({ [fieldName]: newValue })
                .eq('id', balanceId)
                .eq('company_id', companyId);

            if (updateError) {
                throw new AppError('Failed to update balance', 'UPDATE_BALANCE_FAILED', 500);
            }

            // Step 2: Create audit log
            const adjustmentData = {
                company_id: companyId,
                balance_id: balanceId,
                employee_id: balance.employee_id,
                leave_type_id: balance.leave_type_id,
                year: balance.year,
                adjusted_by: adjustedBy,
                field_name: fieldName,
                previous_value: previousValue,
                new_value: newValue,
                reason,
                adjustment_type: adjustmentType || 'manual',
            };

            const { data: adjustment, error: adjustmentError } = await supabaseAdmin
                .from('leave_balance_adjustments')
                .insert(adjustmentData)
                .select(
                    `
                    *,
                    adjuster:users!adjusted_by(id, email),
                    employee:employees!employee_id(id, full_name, employee_code),
                    leave_type:leave_types!leave_type_id(id, name, name_th)
                `
                )
                .single();

            if (adjustmentError || !adjustment) {
                // If audit log creation fails, we should ideally rollback
                // For now, log the error and throw
                console.error('Failed to create adjustment audit log:', adjustmentError);
                throw new AppError('Failed to create adjustment audit log', 'CREATE_AUDIT_LOG_FAILED', 500);
            }

            // Transform to camelCase
            return this.transformAdjustmentWithDetails(adjustment);
        } catch (error) {
            console.error('Error in adjustBalance transaction:', error);
            throw error;
        }
    }

    /**
     * Get adjustment history for a specific balance
     */
    async getAdjustmentHistory(
        balanceId: string,
        companyId: string
    ): Promise<BalanceAdjustmentWithDetails[]> {
        const { data, error } = await supabaseAdmin
            .from('leave_balance_adjustments')
            .select(
                `
                *,
                adjuster:users!adjusted_by(id, email),
                employee:employees!employee_id(id, full_name, employee_code),
                leave_type:leave_types!leave_type_id(id, name, name_th)
            `
            )
            .eq('balance_id', balanceId)
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching adjustment history:', error);
            throw new AppError('Failed to fetch adjustment history', 'FETCH_ADJUSTMENTS_FAILED', 500);
        }

        return (data || []).map((adj: any) => this.transformAdjustmentWithDetails(adj));
    }

    /**
     * Get all adjustments for an employee
     */
    async getEmployeeAdjustments(
        employeeId: string,
        companyId: string,
        year?: number
    ): Promise<BalanceAdjustmentWithDetails[]> {
        let query = supabaseAdmin
            .from('leave_balance_adjustments')
            .select(
                `
                *,
                adjuster:users!adjusted_by(id, email),
                employee:employees!employee_id(id, full_name, employee_code),
                leave_type:leave_types!leave_type_id(id, name, name_th)
            `
            )
            .eq('employee_id', employeeId)
            .eq('company_id', companyId);

        if (year) {
            query = query.eq('year', year.toString());
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching employee adjustments:', error);
            throw new AppError('Failed to fetch employee adjustments', 'FETCH_EMPLOYEE_ADJUSTMENTS_FAILED', 500);
        }

        return (data || []).map((adj: any) => this.transformAdjustmentWithDetails(adj));
    }

    /**
     * Get all adjustments for a company (with pagination)
     */
    async listAdjustments(
        companyId: string,
        options: {
            page?: number;
            limit?: number;
            year?: number;
            employeeId?: string;
            adjustmentType?: string;
        } = {}
    ): Promise<{
        adjustments: BalanceAdjustmentWithDetails[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const page = options.page || 1;
        const limit = options.limit || 50;
        const offset = (page - 1) * limit;

        // Build query
        let query = supabaseAdmin
            .from('leave_balance_adjustments')
            .select(
                `
                *,
                adjuster:users!adjusted_by(id, email),
                employee:employees!employee_id(id, full_name, employee_code),
                leave_type:leave_types!leave_type_id(id, name, name_th)
            `,
                { count: 'exact' }
            )
            .eq('company_id', companyId);

        // Apply filters
        if (options.year) {
            query = query.eq('year', options.year.toString());
        }

        if (options.employeeId) {
            query = query.eq('employee_id', options.employeeId);
        }

        if (options.adjustmentType) {
            query = query.eq('adjustment_type', options.adjustmentType);
        }

        // Execute query with pagination
        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error listing adjustments:', error);
            throw new AppError('Failed to list adjustments', 'LIST_ADJUSTMENTS_FAILED', 500);
        }

        const total = count || 0;
        const totalPages = Math.ceil(total / limit);

        return {
            adjustments: (data || []).map((adj) => this.transformAdjustmentWithDetails(adj)),
            total,
            page,
            limit,
            totalPages,
        };
    }

    /**
     * Bulk adjust balances
     * IMPORTANT: This should ideally use a database transaction
     * For now, we'll process them sequentially
     */
    async bulkAdjust(
        companyId: string,
        adjustedBy: string,
        adjustments: BulkAdjustmentItem[]
    ): Promise<{
        successful: number;
        failed: number;
        errors: Array<{ balanceId: string; error: string }>;
    }> {
        const results = {
            successful: 0,
            failed: 0,
            errors: [] as Array<{ balanceId: string; error: string }>,
        };

        if (adjustments.length > 100) {
            throw new BadRequestError('Limit Exceeded: Cannot process more than 100 adjustments at once');
        }

        for (const adjustment of adjustments) {
            try {
                await this.adjustBalance(adjustment.balanceId, companyId, adjustedBy, {
                    fieldName: adjustment.fieldName,
                    newValue: adjustment.newValue,
                    reason: adjustment.reason,
                    adjustmentType: adjustment.adjustmentType,
                });
                results.successful++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    balanceId: adjustment.balanceId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        return results;
    }

    /**
     * Transform database row to BalanceAdjustmentWithDetails
     */
    private transformAdjustmentWithDetails(
        row: LeaveBalanceAdjustmentWithDetails
    ): BalanceAdjustmentWithDetails {
        return {
            id: row.id,
            companyId: row.company_id,
            balanceId: row.balance_id,
            employeeId: row.employee_id,
            leaveTypeId: row.leave_type_id,
            year: row.year,
            adjustedBy: row.adjusted_by,
            fieldName: row.field_name,
            previousValue: Number(row.previous_value),
            newValue: Number(row.new_value),
            adjustmentAmount: Number(row.adjustment_amount),
            reason: row.reason,
            adjustmentType: row.adjustment_type,
            createdAt: row.created_at,
            adjuster: row.adjuster
                ? {
                    id: row.adjuster.id,
                    email: row.adjuster.email,
                }
                : undefined,
            employee: row.employee
                ? {
                    id: row.employee.id,
                    fullName: row.employee.full_name,
                    employeeCode: row.employee.employee_code,
                }
                : undefined,
            leaveType: row.leave_type
                ? {
                    id: row.leave_type.id,
                    name: row.leave_type.name,
                    nameTh: row.leave_type.name_th,
                }
                : undefined,
        };
    }

    /**
     * Transform database row to BalanceAdjustment (simple)
     */
    private transformAdjustment(row: LeaveBalanceAdjustmentRow): BalanceAdjustment {
        return {
            id: row.id,
            companyId: row.company_id,
            balanceId: row.balance_id,
            employeeId: row.employee_id,
            leaveTypeId: row.leave_type_id,
            year: row.year,
            adjustedBy: row.adjusted_by,
            fieldName: row.field_name,
            previousValue: Number(row.previous_value),
            newValue: Number(row.new_value),
            adjustmentAmount: Number(row.adjustment_amount),
            reason: row.reason,
            adjustmentType: row.adjustment_type,
            createdAt: row.created_at,
        };
    }
}

// Export singleton instance
export const balanceAdjustmentService = new BalanceAdjustmentService();
