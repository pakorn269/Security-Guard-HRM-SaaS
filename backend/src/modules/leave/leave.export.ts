/**
 * Leave Export Service
 * Handles iCal (.ics) export for leave requests
 */

import ical, { ICalCalendar, ICalEventData } from 'ical-generator';
import { leaveService } from './leave.service.js';
import type { LeaveRequestWithDetails } from './leave.types.js';

interface ExportFilters {
    startDate?: string;
    endDate?: string;
    teamId?: string;
    employeeId?: string;
    status?: string;
}

export class LeaveExportService {
    /**
     * Generate iCal file from leave requests
     */
    async generateICalendar(
        companyId: string,
        filters: ExportFilters = {}
    ): Promise<ICalCalendar> {
        // Fetch leave requests based on filters
        const leaveRequests = await this.fetchLeaveRequests(companyId, filters);

        // Create calendar
        const calendar = ical({
            name: 'Leave Calendar',
            prodId: {
                company: 'Security Guard HRM',
                product: 'Leave Management',
            },
            timezone: 'Asia/Bangkok',
        });

        // Add each leave request as an event
        for (const leave of leaveRequests) {
            this.addLeaveEvent(calendar, leave);
        }

        return calendar;
    }

    /**
     * Fetch leave requests based on filters
     */
    private async fetchLeaveRequests(
        companyId: string,
        filters: ExportFilters
    ): Promise<LeaveRequestWithDetails[]> {
        // Build query filters
        const queryFilters: any = {};

        if (filters.startDate && filters.endDate) {
            queryFilters.startDate = filters.startDate;
            queryFilters.endDate = filters.endDate;
        }

        if (filters.employeeId) {
            queryFilters.employeeId = filters.employeeId;
        }

        if (filters.status) {
            queryFilters.status = filters.status;
        }

        // Fetch from leave service
        const result = await leaveService.listLeaveRequests(companyId, {
            page: 1,
            limit: 1000, // Get all within reasonable limit
            ...queryFilters,
        });

        return result.requests;
    }

    /**
     * Add a leave request as an iCal event
     */
    private addLeaveEvent(calendar: ICalCalendar, leave: LeaveRequestWithDetails): void {
        const startDate = new Date(leave.startDate);
        const endDate = new Date(leave.endDate);

        // For multi-day leave, set end date to next day (iCal all-day events are exclusive)
        const exclusiveEndDate = new Date(endDate);
        exclusiveEndDate.setDate(exclusiveEndDate.getDate() + 1);

        const employeeName = leave.employee?.fullName || 'Unknown';
        const leaveTypeName = leave.leaveType?.name || 'Leave';

        const eventData: ICalEventData = {
            start: startDate,
            end: exclusiveEndDate,
            summary: `${employeeName} - ${leaveTypeName}`,
            description: this.buildEventDescription(leave),
            allDay: true,
            status: this.mapLeaveStatusToICalStatus(leave.status) as any,
            categories: [
                {
                    name: leaveTypeName,
                },
            ],
        };

        // Add organizer info if available
        if (leave.employee?.fullName) {
            eventData.organizer = leave.employee.fullName;
        }

        calendar.createEvent(eventData);
    }

    /**
     * Build event description from leave details
     */
    private buildEventDescription(leave: LeaveRequestWithDetails): string {
        const parts: string[] = [];

        if (leave.employee?.fullName) {
            parts.push(`Employee: ${leave.employee.fullName}`);
        }

        if (leave.leaveType?.name) {
            parts.push(`Leave Type: ${leave.leaveType.name}`);
        }

        parts.push(`Status: ${leave.status.toUpperCase()}`);

        parts.push(
            `Duration: ${leave.totalDays} day${leave.totalDays !== 1 ? 's' : ''}`
        );

        if (leave.reason) {
            parts.push(`Reason: ${leave.reason}`);
        }

        if (leave.reviewNotes) {
            parts.push(`Review Notes: ${leave.reviewNotes}`);
        }

        if (leave.reviewer?.email) {
            parts.push(`Reviewed By: ${leave.reviewer.email}`);
        }

        return parts.join('\n');
    }

    /**
     * Map leave request status to iCal event status
     */
    private mapLeaveStatusToICalStatus(
        status: string
    ): 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED' {
        switch (status) {
            case 'approved':
                return 'CONFIRMED';
            case 'pending':
                return 'TENTATIVE';
            case 'rejected':
            case 'cancelled':
                return 'CANCELLED';
            default:
                return 'TENTATIVE';
        }
    }

    /**
     * Generate and return iCal string
     */
    async generateICalString(
        companyId: string,
        filters: ExportFilters = {}
    ): Promise<string> {
        const calendar = await this.generateICalendar(companyId, filters);
        return calendar.toString();
    }

    /**
     * Generate and return iCal buffer (for download)
     */
    async generateICalBuffer(
        companyId: string,
        filters: ExportFilters = {}
    ): Promise<Buffer> {
        const icalString = await this.generateICalString(companyId, filters);
        return Buffer.from(icalString, 'utf-8');
    }

    /**
     * Generate filename for export
     */
    generateFilename(filters: ExportFilters = {}): string {
        const timestamp = new Date().toISOString().split('T')[0];
        const parts = ['leave-calendar'];

        if (filters.startDate && filters.endDate) {
            parts.push(`${filters.startDate}-to-${filters.endDate}`);
        } else {
            parts.push(timestamp);
        }

        return `${parts.join('_')}.ics`;
    }
}

// Export singleton instance
export const leaveExportService = new LeaveExportService();
