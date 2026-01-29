import type { LeaveType, LeaveRequest, LeaveBalance } from '../../types/leave.types';
import type {
  LeaveBalanceWithType,
  LeaveRequestWithDetails,
  MyLeaveDataResponse,
  LeaveSummary,
} from '../../services/leave.service';

/**
 * Mock data for leave management tests
 * Provides comprehensive test fixtures for all leave-related scenarios
 */

// ============================================================================
// LEAVE TYPES
// ============================================================================

export const mockLeaveTypes: LeaveType[] = [
  {
    id: 'leave-type-1',
    companyId: 'company-123',
    name: 'Annual Leave',
    nameTh: 'ลาพักผ่อน',
    description: 'Paid annual vacation leave',
    isPaid: true,
    maxDaysPerYear: 10,
    requiresApproval: true,
    requiresDocument: false,
    isActive: true,
    sortOrder: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'leave-type-2',
    companyId: 'company-123',
    name: 'Sick Leave',
    nameTh: 'ลาป่วย',
    description: 'Medical leave with certificate',
    isPaid: true,
    maxDaysPerYear: 15,
    requiresApproval: true,
    requiresDocument: true, // Requires medical certificate
    isActive: true,
    sortOrder: 2,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'leave-type-3',
    companyId: 'company-123',
    name: 'Personal Leave',
    nameTh: 'ลากิจ',
    description: 'Personal matters',
    isPaid: false,
    maxDaysPerYear: 5,
    requiresApproval: true,
    requiresDocument: false,
    isActive: true,
    sortOrder: 3,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'leave-type-4',
    companyId: 'company-123',
    name: 'Maternity Leave',
    nameTh: 'ลาคลอด',
    description: 'Maternity leave with certificate',
    isPaid: true,
    maxDaysPerYear: 90,
    requiresApproval: true,
    requiresDocument: true,
    isActive: true,
    sortOrder: 4,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'leave-type-5',
    companyId: 'company-123',
    name: 'Inactive Leave Type',
    nameTh: 'ประเภทที่ไม่ใช้งาน',
    description: 'This type is inactive',
    isPaid: false,
    maxDaysPerYear: 0,
    requiresApproval: true,
    requiresDocument: false,
    isActive: false, // Inactive
    sortOrder: 99,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

// ============================================================================
// LEAVE BALANCES
// ============================================================================

export const mockLeaveBalances: LeaveBalance[] = [
  {
    id: 'balance-1',
    companyId: 'company-123',
    employeeId: 'employee-1',
    leaveTypeId: 'leave-type-1',
    year: 2024,
    entitledDays: 10,
    usedDays: 3,
    pendingDays: 2,
    remainingDays: 5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-15T00:00:00Z',
  },
  {
    id: 'balance-2',
    companyId: 'company-123',
    employeeId: 'employee-1',
    leaveTypeId: 'leave-type-2',
    year: 2024,
    entitledDays: 15,
    usedDays: 1,
    pendingDays: 0,
    remainingDays: 14,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-03-20T00:00:00Z',
  },
  {
    id: 'balance-3',
    companyId: 'company-123',
    employeeId: 'employee-1',
    leaveTypeId: 'leave-type-3',
    year: 2024,
    entitledDays: 5,
    usedDays: 5,
    pendingDays: 0,
    remainingDays: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-05-10T00:00:00Z',
  },
];

export const mockLeaveBalancesWithType: LeaveBalanceWithType[] = mockLeaveBalances.map(
  (balance) => ({
    ...balance,
    leaveType: mockLeaveTypes.find((type) => type.id === balance.leaveTypeId),
  })
);

// ============================================================================
// LEAVE REQUESTS
// ============================================================================

export const mockLeaveRequests: LeaveRequestWithDetails[] = [
  {
    id: 'request-1',
    companyId: 'company-123',
    employeeId: 'employee-1',
    leaveTypeId: 'leave-type-1',
    startDate: '2024-07-15',
    endDate: '2024-07-17',
    totalDays: 3,
    reason: 'Family vacation',
    documentUrl: null,
    status: 'pending',
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    createdAt: '2024-06-20T10:30:00Z',
    updatedAt: '2024-06-20T10:30:00Z',
    employee: {
      id: 'employee-1',
      fullName: 'สมชาย ใจดี',
      employeeCode: 'EMP001',
    },
    leaveType: {
      id: 'leave-type-1',
      name: 'Annual Leave',
      nameTh: 'ลาพักผ่อน',
      isPaid: true,
    },
    reviewer: null,
  },
  {
    id: 'request-2',
    companyId: 'company-123',
    employeeId: 'employee-2',
    leaveTypeId: 'leave-type-2',
    startDate: '2024-06-25',
    endDate: '2024-06-26',
    totalDays: 2,
    reason: 'Flu symptoms',
    documentUrl: 'company-123/request-2/medical-cert.pdf',
    status: 'approved',
    reviewedBy: 'user-manager',
    reviewedAt: '2024-06-21T14:00:00Z',
    reviewNotes: 'Approved. Get well soon.',
    createdAt: '2024-06-20T08:00:00Z',
    updatedAt: '2024-06-21T14:00:00Z',
    employee: {
      id: 'employee-2',
      fullName: 'สมหญิง รักงาน',
      employeeCode: 'EMP002',
    },
    leaveType: {
      id: 'leave-type-2',
      name: 'Sick Leave',
      nameTh: 'ลาป่วย',
      isPaid: true,
    },
    reviewer: {
      id: 'user-manager',
      email: 'manager@company.com',
    },
  },
  {
    id: 'request-3',
    companyId: 'company-123',
    employeeId: 'employee-3',
    leaveTypeId: 'leave-type-3',
    startDate: '2024-06-10',
    endDate: '2024-06-10',
    totalDays: 1,
    reason: 'Bank appointment',
    documentUrl: null,
    status: 'rejected',
    reviewedBy: 'user-manager',
    reviewedAt: '2024-06-08T11:00:00Z',
    reviewNotes: 'Insufficient notice. Please submit at least 3 days in advance.',
    createdAt: '2024-06-07T16:00:00Z',
    updatedAt: '2024-06-08T11:00:00Z',
    employee: {
      id: 'employee-3',
      fullName: 'สมศักดิ์ มานะ',
      employeeCode: 'EMP003',
    },
    leaveType: {
      id: 'leave-type-3',
      name: 'Personal Leave',
      nameTh: 'ลากิจ',
      isPaid: false,
    },
    reviewer: {
      id: 'user-manager',
      email: 'manager@company.com',
    },
  },
  {
    id: 'request-4',
    companyId: 'company-123',
    employeeId: 'employee-1',
    leaveTypeId: 'leave-type-1',
    startDate: '2024-08-01',
    endDate: '2024-08-02',
    totalDays: 2,
    reason: 'Personal matters',
    documentUrl: null,
    status: 'pending',
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    createdAt: '2024-06-22T09:00:00Z',
    updatedAt: '2024-06-22T09:00:00Z',
    employee: {
      id: 'employee-1',
      fullName: 'สมชาย ใจดี',
      employeeCode: 'EMP001',
    },
    leaveType: {
      id: 'leave-type-1',
      name: 'Annual Leave',
      nameTh: 'ลาพักผ่อน',
      isPaid: true,
    },
    reviewer: null,
  },
  {
    id: 'request-5',
    companyId: 'company-123',
    employeeId: 'employee-4',
    leaveTypeId: 'leave-type-1',
    startDate: '2024-05-01',
    endDate: '2024-05-03',
    totalDays: 3,
    reason: 'Songkran holiday',
    documentUrl: null,
    status: 'cancelled',
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: 'Cancelled by employee',
    createdAt: '2024-04-15T10:00:00Z',
    updatedAt: '2024-04-20T15:00:00Z',
    employee: {
      id: 'employee-4',
      fullName: 'สมหมาย เที่ยว',
      employeeCode: 'EMP004',
    },
    leaveType: {
      id: 'leave-type-1',
      name: 'Annual Leave',
      nameTh: 'ลาพักผ่อน',
      isPaid: true,
    },
    reviewer: null,
  },
];

// ============================================================================
// MY LEAVE DATA (For LIFF page)
// ============================================================================

export const mockMyLeaveData: MyLeaveDataResponse = {
  balances: mockLeaveBalancesWithType,
  pendingRequests: mockLeaveRequests.filter((r) => r.status === 'pending' && r.employeeId === 'employee-1'),
  recentRequests: mockLeaveRequests.filter((r) => r.employeeId === 'employee-1').slice(0, 5),
};

// ============================================================================
// LEAVE SUMMARY (Dashboard stats)
// ============================================================================

export const mockLeaveSummary: LeaveSummary = {
  pendingRequests: 2,
  approvedThisMonth: 5,
  employeesOnLeaveToday: 3,
  upcomingLeaves: 8,
};

// ============================================================================
// API RESPONSE MOCKS
// ============================================================================

export const mockApiResponse = {
  success: <T>(data: T, message = 'Success') => ({
    success: true,
    message,
    data,
    meta: {},
  }),
  error: (message: string, code = 'ERROR') => ({
    success: false,
    message,
    error: { code, message },
  }),
};

// ============================================================================
// FORM DATA MOCKS
// ============================================================================

export const mockLeaveRequestPayload = {
  valid: {
    leaveTypeId: 'leave-type-1',
    startDate: '2024-07-20',
    endDate: '2024-07-22',
    reason: 'Summer vacation',
  },
  withDocument: {
    leaveTypeId: 'leave-type-2',
    startDate: '2024-07-25',
    endDate: '2024-07-26',
    reason: 'Medical checkup',
  },
  invalidDates: {
    leaveTypeId: 'leave-type-1',
    startDate: '2024-07-25',
    endDate: '2024-07-20', // End before start
    reason: 'Invalid dates',
  },
  missingRequired: {
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
  },
};

export const mockLeaveTypePayload = {
  create: {
    name: 'Emergency Leave',
    nameTh: 'ลาฉุกเฉิน',
    description: 'Urgent personal emergency',
    isPaid: false,
    maxDaysPerYear: 3,
    requiresApproval: true,
    requiresDocument: false,
    isActive: true,
  },
  update: {
    name: 'Annual Leave (Updated)',
    nameTh: 'ลาพักผ่อน (แก้ไข)',
    maxDaysPerYear: 12,
  },
};

// ============================================================================
// FILE MOCKS (For document upload)
// ============================================================================

export const createMockFile = (
  name: string,
  size: number,
  type: string
): File => {
  const blob = new Blob(['mock content'], { type });
  const file = new File([blob], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

export const mockFiles = {
  validPdf: createMockFile('medical-cert.pdf', 1024 * 1024, 'application/pdf'),
  validJpg: createMockFile('photo.jpg', 500 * 1024, 'image/jpeg'),
  validPng: createMockFile('scan.png', 800 * 1024, 'image/png'),
  tooLarge: createMockFile('large.pdf', 6 * 1024 * 1024, 'application/pdf'), // 6MB > 5MB limit
  invalidType: createMockFile('document.docx', 100 * 1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
};

// ============================================================================
// CALENDAR DATA MOCKS
// ============================================================================

export const mockLeaveCalendarData = [
  {
    date: '2024-07-15',
    leaves: [
      {
        id: 'request-1',
        employeeName: 'สมชาย ใจดี',
        leaveType: 'ลาพักผ่อน',
        status: 'approved',
      },
    ],
  },
  {
    date: '2024-07-16',
    leaves: [
      {
        id: 'request-1',
        employeeName: 'สมชาย ใจดี',
        leaveType: 'ลาพักผ่อน',
        status: 'approved',
      },
      {
        id: 'request-6',
        employeeName: 'สมหญิง รักงาน',
        leaveType: 'ลากิจ',
        status: 'approved',
      },
    ],
  },
];

// ============================================================================
// ERROR MOCKS
// ============================================================================

export const mockErrors = {
  networkError: new Error('Network request failed'),
  unauthorized: new Error('Unauthorized access'),
  validation: new Error('Validation failed: Invalid date range'),
  insufficientBalance: new Error('Insufficient leave balance'),
  documentRequired: new Error('Document is required for this leave type'),
  fileTooBig: new Error('File size exceeds maximum limit of 5MB'),
  invalidFileType: new Error('Invalid file type. Only PDF, JPG, and PNG are allowed'),
};

// ============================================================================
// PAGINATION MOCKS
// ============================================================================

export const mockPaginationMeta = {
  page: 1,
  pageSize: 10,
  total: 25,
  totalPages: 3,
  hasNextPage: true,
  hasPreviousPage: false,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get mock leave requests by status
 */
export const getRequestsByStatus = (status: string) =>
  mockLeaveRequests.filter((r) => r.status === status);

/**
 * Get mock leave requests by employee
 */
export const getRequestsByEmployee = (employeeId: string) =>
  mockLeaveRequests.filter((r) => r.employeeId === employeeId);

/**
 * Get pending requests count
 */
export const getPendingCount = () =>
  mockLeaveRequests.filter((r) => r.status === 'pending').length;

/**
 * Create a custom leave request for testing
 */
export const createMockLeaveRequest = (
  overrides?: Partial<LeaveRequestWithDetails>
): LeaveRequestWithDetails => ({
  ...mockLeaveRequests[0],
  ...overrides,
});

/**
 * Create a custom leave type for testing
 */
export const createMockLeaveType = (
  overrides?: Partial<LeaveType>
): LeaveType => ({
  ...mockLeaveTypes[0],
  ...overrides,
});

/**
 * Create a custom leave balance for testing
 */
export const createMockLeaveBalance = (
  overrides?: Partial<LeaveBalance>
): LeaveBalance => ({
  ...mockLeaveBalances[0],
  ...overrides,
});
