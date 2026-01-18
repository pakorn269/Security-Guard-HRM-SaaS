/**
 * Reports Controller
 * HTTP request handlers for report endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { reportsService } from './reports.service.js';
import {
    attendanceSummaryQuerySchema,
    leaveUsageQuerySchema,
    attendanceTrendQuerySchema,
} from './reports.validation.js';
import { BadRequestError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

export class ReportsController {
    /**
     * GET /api/v1/reports/attendance
     * Get attendance summary report
     */
    async getAttendanceSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new BadRequestError('Company ID is required');
            }

            const result = attendanceSummaryQuerySchema.safeParse(req.query);
            if (!result.success) {
                throw new BadRequestError(result.error.issues[0].message);
            }

            const report = await reportsService.getAttendanceSummary(companyId, result.data);

            // Check if CSV export is requested
            if (req.query.format === 'csv') {
                const headers = [
                    'employeeCode',
                    'employeeName',
                    'totalShifts',
                    'onTimeCount',
                    'lateCount',
                    'absentCount',
                    'totalHoursWorked',
                    'overtimeHours',
                    'attendanceRate',
                ];
                const csv = reportsService.generateCSV(report.employees, headers);

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${result.data.startDate}_${result.data.endDate}.csv`);
                return res.send(csv);
            }

            res.json({
                success: true,
                data: report,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/reports/leave
     * Get leave usage report
     */
    async getLeaveUsage(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new BadRequestError('Company ID is required');
            }

            const result = leaveUsageQuerySchema.safeParse(req.query);
            if (!result.success) {
                throw new BadRequestError(result.error.issues[0].message);
            }

            const report = await reportsService.getLeaveUsage(companyId, result.data);

            // Check if CSV export is requested
            if (req.query.format === 'csv') {
                const headers = [
                    'employeeCode',
                    'employeeName',
                    'leaveTypeName',
                    'entitledDays',
                    'usedDays',
                    'pendingDays',
                    'remainingDays',
                    'usageRate',
                ];
                const csv = reportsService.generateCSV(report.employees, headers);

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename=leave_report_${result.data.year}.csv`);
                return res.send(csv);
            }

            res.json({
                success: true,
                data: report,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/reports/attendance/trend
     * Get attendance trend data for charts
     */
    async getAttendanceTrend(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new BadRequestError('Company ID is required');
            }

            const result = attendanceTrendQuerySchema.safeParse(req.query);
            if (!result.success) {
                throw new BadRequestError(result.error.issues[0].message);
            }

            const report = await reportsService.getAttendanceTrend(
                companyId,
                result.data.startDate,
                result.data.endDate
            );

            res.json({
                success: true,
                data: report,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const reportsController = new ReportsController();
export default reportsController;
