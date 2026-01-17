// Custom error classes for the application

export class AppError extends Error {
    public readonly code: string;
    public readonly statusCode: number;
    public readonly messageTh?: string;
    public readonly isOperational: boolean;

    constructor(
        message: string,
        code: string,
        statusCode = 400,
        messageTh?: string,
        isOperational = true
    ) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.messageTh = messageTh;
        this.isOperational = isOperational;

        Error.captureStackTrace(this, this.constructor);
    }
}

// Common error types
export class ValidationError extends AppError {
    public readonly details: Array<{
        field: string;
        message: string;
        message_th?: string;
    }>;

    constructor(
        message: string,
        details: Array<{ field: string; message: string; message_th?: string }> = []
    ) {
        super(message, 'VALIDATION_ERROR', 400, 'การตรวจสอบข้อมูลล้มเหลว');
        this.details = details;
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized', messageTh = 'ไม่ได้รับอนุญาต') {
        super(message, 'UNAUTHORIZED', 401, messageTh);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden', messageTh = 'ไม่มีสิทธิ์เข้าถึง') {
        super(message, 'FORBIDDEN', 403, messageTh);
    }
}

export class NotFoundError extends AppError {
    constructor(resource = 'Resource', messageTh = 'ไม่พบข้อมูล') {
        super(`${resource} not found`, 'NOT_FOUND', 404, messageTh);
    }
}

export class ConflictError extends AppError {
    constructor(message: string, messageTh = 'ข้อมูลซ้ำ') {
        super(message, 'CONFLICT', 409, messageTh);
    }
}

// Attendance-specific errors
export class AlreadyClockedInError extends AppError {
    constructor() {
        super(
            'Already clocked in for this shift',
            'ALREADY_CLOCKED_IN',
            400,
            'ลงเวลาเข้างานแล้ว'
        );
    }
}

export class ShiftNotFoundError extends AppError {
    constructor() {
        super('No shift found for today', 'SHIFT_NOT_FOUND', 400, 'ไม่พบกะงานสำหรับวันนี้');
    }
}

// Leave-specific errors
export class InsufficientBalanceError extends AppError {
    constructor() {
        super(
            'Insufficient leave balance',
            'INSUFFICIENT_BALANCE',
            400,
            'จำนวนวันลาไม่เพียงพอ'
        );
    }
}

export class LeaveConflictError extends AppError {
    constructor() {
        super(
            'Leave dates conflict with existing shifts',
            'LEAVE_CONFLICT',
            409,
            'วันลาซ้อนทับกับกะงานที่มีอยู่'
        );
    }
}
