/**
 * Reports Service
 * API service for fetching reports
 */

import api from './api';
import type {
    AttendanceSummaryReport,
    LeaveUsageReport,
    AttendanceTrendReport,
} from '../types/reports';

export interface AttendanceSummaryQuery {
    startDate: string;
    endDate: string;
    employeeId?: string;
    status?: string;
    format?: 'json' | 'csv';
}

export interface LeaveUsageQuery {
    year: number;
    leaveTypeId?: string;
    employeeId?: string;
    format?: 'json' | 'csv';
}

export interface AttendanceTrendQuery {
    startDate: string;
    endDate: string;
}

export const reportsService = {
    /**
     * Get attendance summary report
     */
    async getAttendanceSummary(query: AttendanceSummaryQuery): Promise<AttendanceSummaryReport> {
        const response = await api.get('/reports/attendance', { params: query });
        return response.data.data;
    },

    /**
     * Get leave usage report
     */
    async getLeaveUsage(query: LeaveUsageQuery): Promise<LeaveUsageReport> {
        const response = await api.get('/reports/leave', { params: query });
        return response.data.data;
    },

    /**
     * Get attendance trend for charts
     */
    async getAttendanceTrend(query: AttendanceTrendQuery): Promise<AttendanceTrendReport> {
        const response = await api.get('/reports/attendance/trend', { params: query });
        return response.data.data;
    },

    /**
     * Download attendance report as CSV
     */
    async downloadAttendanceCSV(query: AttendanceSummaryQuery): Promise<Blob> {
        const response = await api.get('/reports/attendance', {
            params: { ...query, format: 'csv' },
            responseType: 'blob',
        });
        return response.data;
    },

    /**
     * Download leave report as CSV
     */
    async downloadLeaveCSV(query: LeaveUsageQuery): Promise<Blob> {
        const response = await api.get('/reports/leave', {
            params: { ...query, format: 'csv' },
            responseType: 'blob',
        });
        return response.data;
    },
};

export default reportsService;
