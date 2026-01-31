// Leave module exports

export { leaveController } from './leave.controller.js';
export { leaveService } from './leave.service.js';
export { templateService } from './template.service.js';
export {
    leaveTypesRouter,
    leaveRequestsRouter,
    leaveBalancesRouter,
    leaveTemplatesRouter,
    leaveRouter,
} from './leave.routes.js';

// Export types
export type {
    LeaveRequestStatus,
    LeaveType,
    LeaveTypeRow,
    LeaveRequest,
    LeaveRequestRow,
    LeaveRequestRowWithDetails,
    LeaveRequestWithDetails,
    LeaveBalance,
    LeaveBalanceRow,
    LeaveBalanceRowWithType,
    LeaveBalanceWithType,
    CreateLeaveTypeRequest,
    UpdateLeaveTypeRequest,
    CreateLeaveRequestPayload,
    ApproveLeaveRequest,
    RejectLeaveRequest,
    ListLeaveTypesQuery,
    ListLeaveRequestsQuery,
    MyLeaveDataResponse,
    LeaveCalendarEntry,
    LeaveSummary,
} from './leave.types.js';

// Export validation schemas
export {
    createLeaveTypeSchema,
    updateLeaveTypeSchema,
    createLeaveRequestSchema,
    approveLeaveRequestSchema,
    rejectLeaveRequestSchema,
    listLeaveTypesQuerySchema,
    listLeaveRequestsQuerySchema,
    myLeaveQuerySchema,
    leaveCalendarQuerySchema,
    updateLeaveBalanceSchema,
    initializeBalancesSchema,
} from './leave.validation.js';
