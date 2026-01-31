/**
 * Analytics Service
 * Handles leave analytics and reporting API calls
 */

import api from './api';
import type { ApiResponse } from './api';

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
    utilizationRate: number;
}

export interface TrendingDataPoint {
    date: string;
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
    approvalRate: number;
    rejectionRate: number;
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

const analyticsService = {
    /**
     * Get KPI summary
     */
    getKPISummary: async (year?: number): Promise<KPISummary> => {
        const response = await api.get<ApiResponse<KPISummary>>('/leave/reports/kpi', {
            params: { year },
        });
        return response.data.data!;
    },

    /**
     * Get employee utilization report
     */
    getUtilizationReport: async (options?: {
        year?: number;
        departmentId?: string;
        limit?: number;
    }): Promise<UtilizationReport[]> => {
        const response = await api.get<ApiResponse<UtilizationReport[]>>(
            '/leave/reports/utilization',
            { params: options }
        );
        return response.data.data || [];
    },

    /**
     * Get trending data
     */
    getTrendingReport: async (options: {
        startDate: string;
        endDate: string;
        granularity?: 'daily' | 'monthly';
    }): Promise<TrendingDataPoint[]> => {
        const response = await api.get<ApiResponse<TrendingDataPoint[]>>(
            '/leave/reports/trending',
            { params: options }
        );
        return response.data.data || [];
    },

    /**
     * Get leave type distribution
     */
    getTypeDistribution: async (year?: number): Promise<TypeDistribution[]> => {
        const response = await api.get<ApiResponse<TypeDistribution[]>>(
            '/leave/reports/type-distribution',
            { params: { year } }
        );
        return response.data.data || [];
    },

    /**
     * Get approval metrics
     */
    getApprovalMetrics: async (options: {
        startDate: string;
        endDate: string;
    }): Promise<ApprovalMetrics> => {
        const response = await api.get<ApiResponse<ApprovalMetrics>>(
            '/leave/reports/approval-metrics',
            { params: options }
        );
        return response.data.data!;
    },

    /**
     * Get heatmap data
     */
    getHeatmapData: async (options: {
        startDate: string;
        endDate: string;
    }): Promise<HeatmapData[]> => {
        const response = await api.get<ApiResponse<HeatmapData[]>>(
            '/leave/reports/heatmap',
            { params: options }
        );
        return response.data.data || [];
    },
};

export default analyticsService;
