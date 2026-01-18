// Attendance module exports

export { attendanceController } from './attendance.controller.js';
export { attendanceService } from './attendance.service.js';
export { default as attendanceRoutes } from './attendance.routes.js';

// Export types
export type {
    AttendanceStatus,
    AttendanceLog,
    AttendanceLogRow,
    AttendanceLogRowWithEmployee,
    AttendanceLogWithDetails,
    ClockInRequest,
    ClockOutRequest,
    AdjustAttendanceRequest,
    CreateAttendanceRequest,
    ListAttendanceQuery,
    ClockInResponse,
    ClockOutResponse,
    TodayAttendanceResponse,
    MyAttendanceResponse,
    AttendanceSummary,
    DailyAttendanceReport,
} from './attendance.types.js';

// Export validation schemas
export {
    clockInSchema,
    clockOutSchema,
    adjustAttendanceSchema,
    createAttendanceSchema,
    listAttendanceQuerySchema,
    myAttendanceQuerySchema,
    todayAttendanceQuerySchema,
    attendanceReportQuerySchema,
} from './attendance.validation.js';
