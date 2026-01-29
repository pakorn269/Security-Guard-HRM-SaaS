import { Request, Response, NextFunction } from 'express';
import * as ExcelJS from 'exceljs';
import { attendanceService } from './attendance.service.js';
import {
    clockInSchema,
    clockOutSchema,
    adjustAttendanceSchema,
    createAttendanceSchema,
    listAttendanceQuerySchema,
    myAttendanceQuerySchema,
    todayAttendanceQuerySchema,
    attendanceReportQuerySchema,
    exportAttendanceQuerySchema,
    bulkUpdateAttendanceSchema,
} from './attendance.validation.js';
import { success } from '../../utils/response.js';
import { BadRequestError, UnauthorizedError } from '../../utils/errors.js';

class AttendanceController {
    // ========================================================================
    // CLOCK IN/OUT ENDPOINTS (for guards via LIFF)
    // ========================================================================

    // POST /attendance/clock-in - Clock in with GPS
    async clockIn(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }
            if (!req.user?.employeeId) {
                throw new BadRequestError(
                    'User is not linked to an employee record',
                    'ผู้ใช้ไม่ได้เชื่อมโยงกับข้อมูลพนักงาน'
                );
            }

            const data = clockInSchema.parse(req.body);
            const result = await attendanceService.clockIn(
                req.user.companyId,
                req.user.employeeId,
                data
            );

            return res.status(201).json(
                success(
                    result.attendance,
                    result.message,
                    result.attendance.status === 'on_time'
                        ? 'ลงเวลาเข้างานสำเร็จ (ตรงเวลา)'
                        : 'ลงเวลาเข้างานสำเร็จ (สาย)'
                )
            );
        } catch (error) {
            next(error);
        }
    }

    // POST /attendance/clock-out - Clock out with GPS
    async clockOut(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }
            if (!req.user?.employeeId) {
                throw new BadRequestError(
                    'User is not linked to an employee record',
                    'ผู้ใช้ไม่ได้เชื่อมโยงกับข้อมูลพนักงาน'
                );
            }

            const data = clockOutSchema.parse(req.body);
            const result = await attendanceService.clockOut(
                req.user.companyId,
                req.user.employeeId,
                data
            );

            return res.json(
                success(
                    {
                        attendance: result.attendance,
                        totalHours: result.totalHours,
                    },
                    result.message,
                    `ลงเวลาออกสำเร็จ (${result.totalHours} ชั่วโมง)`
                )
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /attendance/today - Get today's attendance status
    async getTodayAttendance(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }
            if (!req.user?.employeeId) {
                throw new BadRequestError(
                    'User is not linked to an employee record',
                    'ผู้ใช้ไม่ได้เชื่อมโยงกับข้อมูลพนักงาน'
                );
            }

            const query = todayAttendanceQuerySchema.parse(req.query);
            const result = await attendanceService.getTodayAttendance(
                req.user.companyId,
                req.user.employeeId,
                query.date
            );

            return res.json(success(result, 'Today\'s attendance status', 'สถานะการลงเวลาวันนี้'));
        } catch (error) {
            next(error);
        }
    }

    // GET /attendance/my - Get my attendance history
    async getMyAttendance(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }
            if (!req.user?.employeeId) {
                throw new BadRequestError(
                    'User is not linked to an employee record',
                    'ผู้ใช้ไม่ได้เชื่อมโยงกับข้อมูลพนักงาน'
                );
            }

            const query = myAttendanceQuerySchema.parse(req.query);
            const result = await attendanceService.getMyAttendance(
                req.user.companyId,
                req.user.employeeId,
                query.days
            );

            return res.json(success(result, 'My attendance retrieved', 'ดึงข้อมูลการลงเวลาของฉันสำเร็จ'));
        } catch (error) {
            next(error);
        }
    }

    // ========================================================================
    // MANAGER ENDPOINTS
    // ========================================================================

    // GET /attendance - List all attendance records
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const query = listAttendanceQuerySchema.parse(req.query);
            const result = await attendanceService.list(req.user.companyId, query);

            return res.json(
                success(result.records, 'Attendance records retrieved', undefined, {
                    pagination: {
                        page: query.page,
                        pageSize: query.pageSize,
                        total: result.total,
                        totalPages: Math.ceil(result.total / query.pageSize),
                    },
                })
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /attendance/report - Get daily attendance report
    async getDailyReport(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const query = attendanceReportQuerySchema.parse(req.query);
            const result = await attendanceService.getDailyReport(req.user.companyId, query.date);

            return res.json(success(result, 'Daily attendance report', 'รายงานการลงเวลาประจำวัน'));
        } catch (error) {
            next(error);
        }
    }

    // GET /attendance/:id - Get attendance by ID
    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const id = req.params.id as string;
            const attendance = await attendanceService.getById(id, req.user.companyId);

            return res.json(success(attendance, 'Attendance record retrieved'));
        } catch (error) {
            next(error);
        }
    }

    // POST /attendance - Create attendance manually
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const data = createAttendanceSchema.parse(req.body);
            const attendance = await attendanceService.create(req.user.companyId, data);

            return res.status(201).json(
                success(attendance, 'Attendance record created', 'สร้างบันทึกการลงเวลาสำเร็จ')
            );
        } catch (error) {
            next(error);
        }
    }

    // PUT /attendance/:id - Adjust attendance
    async adjust(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId || !req.user?.userId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const id = req.params.id as string;
            const data = adjustAttendanceSchema.parse(req.body);
            const attendance = await attendanceService.adjust(
                id,
                req.user.companyId,
                req.user.userId,
                data
            );

            return res.json(
                success(attendance, 'Attendance record adjusted', 'แก้ไขบันทึกการลงเวลาสำเร็จ')
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /attendance/export - Export attendance records
    async export(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const query = exportAttendanceQuerySchema.parse(req.query);
            const { format, ...filters } = query;

            // Fetch data
            const records = await attendanceService.generateExportData(
                req.user.companyId,
                filters
            );

            if (format === 'csv') {
                // Generate CSV
                const csvLines: string[] = [];

                // Header row (Thai)
                csvLines.push([
                    'รหัสพนักงาน',
                    'ชื่อพนักงาน',
                    'วันที่เข้า',
                    'เวลาเข้า',
                    'ละติจูด (เข้า)',
                    'ลองจิจูด (เข้า)',
                    'วันที่ออก',
                    'เวลาออก',
                    'ละติจูด (ออก)',
                    'ลองจิจูด (ออก)',
                    'สถานะ',
                    'รวมชั่วโมง',
                    'ชั่วโมงล่วงเวลา',
                    'หมายเหตุ',
                    'กะงาน',
                    'สถานที่',
                ].join(','));

                // Data rows
                for (const record of records) {
                    const clockInDate = record.clockInTime
                        ? new Date(record.clockInTime).toLocaleDateString('th-TH')
                        : '-';
                    const clockInTime = record.clockInTime
                        ? new Date(record.clockInTime).toLocaleTimeString('th-TH')
                        : '-';
                    const clockOutDate = record.clockOutTime
                        ? new Date(record.clockOutTime).toLocaleDateString('th-TH')
                        : '-';
                    const clockOutTime = record.clockOutTime
                        ? new Date(record.clockOutTime).toLocaleTimeString('th-TH')
                        : '-';

                    const statusMap: Record<string, string> = {
                        on_time: 'ตรงเวลา',
                        late: 'สาย',
                        completed: 'เสร็จสิ้น',
                        early_leave: 'ออกก่อน',
                        no_show: 'ไม่มา',
                        pending: 'รอดำเนินการ',
                    };

                    const row = [
                        record.employee?.employeeCode || '-',
                        record.employee?.fullName || '-',
                        clockInDate,
                        clockInTime,
                        record.clockInLatitude?.toFixed(6) || '-',
                        record.clockInLongitude?.toFixed(6) || '-',
                        clockOutDate,
                        clockOutTime,
                        record.clockOutLatitude?.toFixed(6) || '-',
                        record.clockOutLongitude?.toFixed(6) || '-',
                        statusMap[record.status] || record.status,
                        record.totalHours?.toString() || '-',
                        record.overtimeHours?.toString() || '-',
                        (record.notes || '-').replace(/,/g, ';'), // Escape commas
                        record.shift
                            ? `${record.shift.startTime}-${record.shift.endTime}`
                            : '-',
                        record.shift?.location || '-',
                    ];

                    csvLines.push(row.map(v => `"${v}"`).join(','));
                }

                const csv = '\uFEFF' + csvLines.join('\n'); // Add BOM for Thai chars

                res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                res.setHeader(
                    'Content-Disposition',
                    `attachment; filename="attendance_${new Date().toISOString().split('T')[0]}.csv"`
                );
                return res.send(csv);
            } else {
                // Generate Excel
                const workbook = new ExcelJS.default.Workbook();
                const worksheet = workbook.addWorksheet('Attendance Records');

                // Define columns
                worksheet.columns = [
                    { header: 'รหัสพนักงาน', key: 'employeeCode', width: 15 },
                    { header: 'ชื่อพนักงาน', key: 'fullName', width: 25 },
                    { header: 'วันที่เข้า', key: 'clockInDate', width: 15 },
                    { header: 'เวลาเข้า', key: 'clockInTime', width: 12 },
                    { header: 'ละติจูด (เข้า)', key: 'clockInLat', width: 15 },
                    { header: 'ลองจิจูด (เข้า)', key: 'clockInLng', width: 15 },
                    { header: 'วันที่ออก', key: 'clockOutDate', width: 15 },
                    { header: 'เวลาออก', key: 'clockOutTime', width: 12 },
                    { header: 'ละติจูด (ออก)', key: 'clockOutLat', width: 15 },
                    { header: 'ลองจิจูด (ออก)', key: 'clockOutLng', width: 15 },
                    { header: 'สถานะ', key: 'status', width: 15 },
                    { header: 'รวมชั่วโมง', key: 'totalHours', width: 12 },
                    { header: 'ชั่วโมงล่วงเวลา', key: 'overtimeHours', width: 15 },
                    { header: 'หมายเหตุ', key: 'notes', width: 30 },
                    { header: 'กะงาน', key: 'shift', width: 20 },
                    { header: 'สถานที่', key: 'location', width: 25 },
                ];

                // Style header row
                worksheet.getRow(1).font = { bold: true };
                worksheet.getRow(1).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE0E0E0' },
                };

                // Add data rows
                const statusMap: Record<string, string> = {
                    on_time: 'ตรงเวลา',
                    late: 'สาย',
                    completed: 'เสร็จสิ้น',
                    early_leave: 'ออกก่อน',
                    no_show: 'ไม่มา',
                    pending: 'รอดำเนินการ',
                };

                for (const record of records) {
                    worksheet.addRow({
                        employeeCode: record.employee?.employeeCode || '-',
                        fullName: record.employee?.fullName || '-',
                        clockInDate: record.clockInTime
                            ? new Date(record.clockInTime).toLocaleDateString('th-TH')
                            : '-',
                        clockInTime: record.clockInTime
                            ? new Date(record.clockInTime).toLocaleTimeString('th-TH')
                            : '-',
                        clockInLat: record.clockInLatitude?.toFixed(6) || '-',
                        clockInLng: record.clockInLongitude?.toFixed(6) || '-',
                        clockOutDate: record.clockOutTime
                            ? new Date(record.clockOutTime).toLocaleDateString('th-TH')
                            : '-',
                        clockOutTime: record.clockOutTime
                            ? new Date(record.clockOutTime).toLocaleTimeString('th-TH')
                            : '-',
                        clockOutLat: record.clockOutLatitude?.toFixed(6) || '-',
                        clockOutLng: record.clockOutLongitude?.toFixed(6) || '-',
                        status: statusMap[record.status] || record.status,
                        totalHours: record.totalHours?.toString() || '-',
                        overtimeHours: record.overtimeHours?.toString() || '-',
                        notes: record.notes || '-',
                        shift: record.shift
                            ? `${record.shift.startTime}-${record.shift.endTime}`
                            : '-',
                        location: record.shift?.location || '-',
                    });
                }

                // Set response headers
                res.setHeader(
                    'Content-Type',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                );
                res.setHeader(
                    'Content-Disposition',
                    `attachment; filename="attendance_${new Date().toISOString().split('T')[0]}.xlsx"`
                );

                // Write to response
                await workbook.xlsx.write(res);
                return res.end();
            }
        } catch (error) {
            next(error);
        }
    }

    // POST /attendance/bulk - Bulk update attendance records
    async bulkUpdate(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId || !req.user?.userId) {
                throw new UnauthorizedError('Company ID or User ID not found');
            }

            const data = bulkUpdateAttendanceSchema.parse(req.body);
            const result = await attendanceService.bulkUpdate(
                req.user.companyId,
                req.user.userId,
                data
            );

            return res.json(
                success(
                    { updated: result.updated },
                    result.message,
                    result.messageTh
                )
            );
        } catch (error) {
            next(error);
        }
    }
}

export const attendanceController = new AttendanceController();
export default attendanceController;
