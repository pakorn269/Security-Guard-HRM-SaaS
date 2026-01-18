import { Request, Response, NextFunction } from 'express';
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
}

export const attendanceController = new AttendanceController();
export default attendanceController;
