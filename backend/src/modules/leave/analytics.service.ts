/**
 * Leave Analytics Service
 * Provides aggregated reports and analytics for leave management
 */

import { supabaseAdmin } from '../../config/supabase.js';
import { AppError } from '../../utils/errors.js';

// ============================================================================
// TYPES
// ============================================================================

export interface UtilizationReport {
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    totalEntitled: number;
    totalUsed: number;
    totalPending: number;
    totalRemaining: number;
    utilizationRate: number; // Percentage (0-100)
}

export interface TrendingDataPoint {
    date: string; // YYYY-MM-DD or YYYY-MM
    count: number;
    approved: number;
    pending: number;
    rejected: number;
}

export interface TypeDistribution {
    leaveTypeId: string;
    leaveTypeName: string;
    leaveTypeNameTh: string | null;
    isPaid: boolean;
    count: number;
    totalDays: number;
}

export interface ApprovalMetrics {
    totalRequests: number;
    approved: number;
    rejected: number;
    pending: number;
    cancelled: number;
    approvalRate: number; // Percentage
    rejectionRate: number; // Percentage
    avgApprovalTimeHours: number | null;
}

export interface KPISummary {
    totalRequests: number;
    totalDays: number;
    approvalRate: number;
    pendingCount: number;
    avgProcessingHours: number | null;
    mostUsedLeaveType: string | null;
}

export interface HeatmapData {
    date: string;
    count: number;
    employeeNames: string[];
}

// ============================================================================
// ANALYTICS SERVICE
// ============================================================================

export class AnalyticsService {
    /**
     * Get employee utilization report
     */
    async getUtilizationReport(
        companyId: string,
        year: number,
        options: {
            departmentId?: string;
            limit?: number;
        } = {}
    ): Promise<UtilizationReport[]> {
        try {
            // Query leave balances with employee info
            let query = supabaseAdmin
                .from('leave_balances')
                .select(
                    `
                    employee_id,
                    entitled_days,
                    used_days,
                    pending_days,
                    employees!inner(id, full_name, employee_code, department_id)
                `
                )
                .eq('company_id', companyId)
                .eq('year', year);

            // Filter by department if provided
            if (options.departmentId) {
                query = query.eq('employees.department_id', options.departmentId);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching utilization report:', error);
                throw new AppError(
                    'Failed to fetch utilization report',
                    'FETCH_UTILIZATION_FAILED',
                    500
                );
            }

            // Group by employee and aggregate
            const employeeMap = new Map<
                string,
                {
                    name: string;
                    code: string;
                    totalEntitled: number;
                    totalUsed: number;
                    totalPending: number;
                }
            >();

            for (const row of data || []) {
                const empId = row.employee_id;
                if (!employeeMap.has(empId)) {
                    employeeMap.set(empId, {
                        name: (row.employees as any).full_name,
                        code: (row.employees as any).employee_code,
                        totalEntitled: 0,
                        totalUsed: 0,
                        totalPending: 0,
                    });
                }

                const emp = employeeMap.get(empId)!;
                emp.totalEntitled += Number(row.entitled_days);
                emp.totalUsed += Number(row.used_days);
                emp.totalPending += Number(row.pending_days);
            }

            // Convert to array and calculate metrics
            let report: UtilizationReport[] = Array.from(employeeMap.entries()).map(
                ([employeeId, emp]) => {
                    const totalRemaining =
                        emp.totalEntitled - emp.totalUsed - emp.totalPending;
                    const utilizationRate =
                        emp.totalEntitled > 0
                            ? (emp.totalUsed / emp.totalEntitled) * 100
                            : 0;

                    return {
                        employeeId,
                        employeeName: emp.name,
                        employeeCode: emp.code,
                        totalEntitled: emp.totalEntitled,
                        totalUsed: emp.totalUsed,
                        totalPending: emp.totalPending,
                        totalRemaining,
                        utilizationRate: Math.round(utilizationRate * 100) / 100,
                    };
                }
            );

            // Sort by utilization rate descending
            report.sort((a, b) => b.utilizationRate - a.utilizationRate);

            // Apply limit if provided
            if (options.limit) {
                report = report.slice(0, options.limit);
            }

            return report;
        } catch (error) {
            console.error('Error in getUtilizationReport:', error);
            throw error;
        }
    }

    /**
     * Get trending data (daily or monthly)
     */
    async getTrendingReport(
        companyId: string,
        options: {
            startDate: string;
            endDate: string;
            granularity?: 'daily' | 'monthly';
        }
    ): Promise<TrendingDataPoint[]> {
        try {
            const { startDate, endDate, granularity = 'daily' } = options;

            // Query leave requests in date range
            const { data, error } = await supabaseAdmin
                .from('leave_requests')
                .select('start_date, end_date, total_days, status, created_at')
                .eq('company_id', companyId)
                .gte('start_date', startDate)
                .lte('end_date', endDate);

            if (error) {
                console.error('Error fetching trending report:', error);
                throw new AppError(
                    'Failed to fetch trending report',
                    'FETCH_TRENDING_FAILED',
                    500
                );
            }

            // Group by date
            const dateMap = new Map<
                string,
                { count: number; approved: number; pending: number; rejected: number }
            >();

            for (const request of data || []) {
                // Expand date range for each request
                const start = new Date(request.start_date);
                const end = new Date(request.end_date);

                let current = new Date(start);
                while (current <= end) {
                    const dateKey =
                        granularity === 'monthly'
                            ? `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
                            : current.toISOString().split('T')[0];

                    if (!dateMap.has(dateKey)) {
                        dateMap.set(dateKey, {
                            count: 0,
                            approved: 0,
                            pending: 0,
                            rejected: 0,
                        });
                    }

                    const stats = dateMap.get(dateKey)!;
                    stats.count++;

                    if (request.status === 'approved') stats.approved++;
                    else if (request.status === 'pending') stats.pending++;
                    else if (request.status === 'rejected') stats.rejected++;

                    // Move to next day/month
                    if (granularity === 'monthly') {
                        current.setMonth(current.getMonth() + 1);
                        current.setDate(1);
                    } else {
                        current.setDate(current.getDate() + 1);
                    }
                }
            }

            // Convert to array and sort by date
            const report: TrendingDataPoint[] = Array.from(dateMap.entries())
                .map(([date, stats]) => ({
                    date,
                    ...stats,
                }))
                .sort((a, b) => a.date.localeCompare(b.date));

            return report;
        } catch (error) {
            console.error('Error in getTrendingReport:', error);
            throw error;
        }
    }

    /**
     * Get leave type distribution
     */
    async getTypeDistribution(
        companyId: string,
        year: number
    ): Promise<TypeDistribution[]> {
        try {
            // Query leave requests grouped by type
            const { data, error } = await supabaseAdmin
                .from('leave_requests')
                .select(
                    `
                    leave_type_id,
                    total_days,
                    leave_types!inner(id, name, name_th, is_paid)
                `
                )
                .eq('company_id', companyId)
                .gte('start_date', `${year}-01-01`)
                .lte('end_date', `${year}-12-31`)
                .in('status', ['approved', 'pending']);

            if (error) {
                console.error('Error fetching type distribution:', error);
                throw new AppError(
                    'Failed to fetch type distribution',
                    'FETCH_TYPE_DISTRIBUTION_FAILED',
                    500
                );
            }

            // Group by leave type
            const typeMap = new Map<
                string,
                {
                    name: string;
                    nameTh: string | null;
                    isPaid: boolean;
                    count: number;
                    totalDays: number;
                }
            >();

            for (const row of data || []) {
                const typeId = row.leave_type_id;
                const leaveType = row.leave_types as any;

                if (!typeMap.has(typeId)) {
                    typeMap.set(typeId, {
                        name: leaveType.name,
                        nameTh: leaveType.name_th,
                        isPaid: leaveType.is_paid,
                        count: 0,
                        totalDays: 0,
                    });
                }

                const type = typeMap.get(typeId)!;
                type.count++;
                type.totalDays += Number(row.total_days);
            }

            // Convert to array and sort by count descending
            const report: TypeDistribution[] = Array.from(typeMap.entries())
                .map(([leaveTypeId, type]) => ({
                    leaveTypeId,
                    leaveTypeName: type.name,
                    leaveTypeNameTh: type.nameTh,
                    isPaid: type.isPaid,
                    count: type.count,
                    totalDays: type.totalDays,
                }))
                .sort((a, b) => b.count - a.count);

            return report;
        } catch (error) {
            console.error('Error in getTypeDistribution:', error);
            throw error;
        }
    }

    /**
     * Get approval metrics
     */
    async getApprovalMetrics(
        companyId: string,
        options: {
            startDate: string;
            endDate: string;
        }
    ): Promise<ApprovalMetrics> {
        try {
            const { startDate, endDate } = options;

            // Query leave requests
            const { data, error } = await supabaseAdmin
                .from('leave_requests')
                .select('status, created_at, reviewed_at')
                .eq('company_id', companyId)
                .gte('created_at', startDate)
                .lte('created_at', endDate);

            if (error) {
                console.error('Error fetching approval metrics:', error);
                throw new AppError(
                    'Failed to fetch approval metrics',
                    'FETCH_APPROVAL_METRICS_FAILED',
                    500
                );
            }

            let approved = 0;
            let rejected = 0;
            let pending = 0;
            let cancelled = 0;
            let totalProcessingTimeMs = 0;
            let processedCount = 0;

            for (const request of data || []) {
                if (request.status === 'approved') {
                    approved++;
                    if (request.reviewed_at) {
                        const processingTime =
                            new Date(request.reviewed_at).getTime() -
                            new Date(request.created_at).getTime();
                        totalProcessingTimeMs += processingTime;
                        processedCount++;
                    }
                } else if (request.status === 'rejected') {
                    rejected++;
                    if (request.reviewed_at) {
                        const processingTime =
                            new Date(request.reviewed_at).getTime() -
                            new Date(request.created_at).getTime();
                        totalProcessingTimeMs += processingTime;
                        processedCount++;
                    }
                } else if (request.status === 'pending') {
                    pending++;
                } else if (request.status === 'cancelled') {
                    cancelled++;
                }
            }

            const totalRequests = data?.length || 0;
            const approvalRate =
                totalRequests > 0 ? (approved / totalRequests) * 100 : 0;
            const rejectionRate =
                totalRequests > 0 ? (rejected / totalRequests) * 100 : 0;
            const avgApprovalTimeHours =
                processedCount > 0
                    ? totalProcessingTimeMs / processedCount / (1000 * 60 * 60)
                    : null;

            return {
                totalRequests,
                approved,
                rejected,
                pending,
                cancelled,
                approvalRate: Math.round(approvalRate * 100) / 100,
                rejectionRate: Math.round(rejectionRate * 100) / 100,
                avgApprovalTimeHours: avgApprovalTimeHours
                    ? Math.round(avgApprovalTimeHours * 100) / 100
                    : null,
            };
        } catch (error) {
            console.error('Error in getApprovalMetrics:', error);
            throw error;
        }
    }

    /**
     * Get KPI summary for dashboard
     */
    async getKPISummary(
        companyId: string,
        year: number
    ): Promise<KPISummary> {
        try {
            // Get approval metrics for the year
            const metrics = await this.getApprovalMetrics(companyId, {
                startDate: `${year}-01-01`,
                endDate: `${year}-12-31`,
            });

            // Get type distribution to find most used
            const distribution = await this.getTypeDistribution(companyId, year);
            const mostUsedLeaveType =
                distribution.length > 0
                    ? distribution[0].leaveTypeNameTh || distribution[0].leaveTypeName
                    : null;

            // Calculate total days
            const { data: requests } = await supabaseAdmin
                .from('leave_requests')
                .select('total_days')
                .eq('company_id', companyId)
                .gte('start_date', `${year}-01-01`)
                .lte('end_date', `${year}-12-31`)
                .eq('status', 'approved');

            const totalDays = (requests || []).reduce(
                (sum, r) => sum + Number(r.total_days),
                0
            );

            return {
                totalRequests: metrics.totalRequests,
                totalDays,
                approvalRate: metrics.approvalRate,
                pendingCount: metrics.pending,
                avgProcessingHours: metrics.avgApprovalTimeHours,
                mostUsedLeaveType,
            };
        } catch (error) {
            console.error('Error in getKPISummary:', error);
            throw error;
        }
    }

    /**
     * Get heatmap data for calendar view
     */
    async getHeatmapData(
        companyId: string,
        options: {
            startDate: string;
            endDate: string;
        }
    ): Promise<HeatmapData[]> {
        try {
            const { startDate, endDate } = options;

            // Query approved leave requests with employee info
            const { data, error } = await supabaseAdmin
                .from('leave_requests')
                .select(
                    `
                    start_date,
                    end_date,
                    employees!inner(full_name)
                `
                )
                .eq('company_id', companyId)
                .eq('status', 'approved')
                .gte('start_date', startDate)
                .lte('end_date', endDate);

            if (error) {
                console.error('Error fetching heatmap data:', error);
                throw new AppError(
                    'Failed to fetch heatmap data',
                    'FETCH_HEATMAP_FAILED',
                    500
                );
            }

            // Group by date
            const dateMap = new Map<string, Set<string>>();

            for (const request of data || []) {
                const start = new Date(request.start_date);
                const end = new Date(request.end_date);
                const employeeName = (request.employees as any).full_name;

                let current = new Date(start);
                while (current <= end) {
                    const dateKey = current.toISOString().split('T')[0];

                    if (!dateMap.has(dateKey)) {
                        dateMap.set(dateKey, new Set());
                    }

                    dateMap.get(dateKey)!.add(employeeName);

                    current.setDate(current.getDate() + 1);
                }
            }

            // Convert to array
            const heatmap: HeatmapData[] = Array.from(dateMap.entries())
                .map(([date, employeeSet]) => ({
                    date,
                    count: employeeSet.size,
                    employeeNames: Array.from(employeeSet),
                }))
                .sort((a, b) => a.date.localeCompare(b.date));

            return heatmap;
        } catch (error) {
            console.error('Error in getHeatmapData:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
