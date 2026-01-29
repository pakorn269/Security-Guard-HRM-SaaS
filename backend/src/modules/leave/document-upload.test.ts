
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { AppError } from '../../utils/errors';

// Define mocks using vi.hoisted to prevent hoisting issues
const { mockLeaveService, mockStorageService } = vi.hoisted(() => {
    return {
        mockLeaveService: {
            getLeaveRequestById: vi.fn(),
            updateDocumentUrl: vi.fn(),
        },
        mockStorageService: {
            uploadLeaveDocument: vi.fn(),
        },
    };
});

// Mock modules
vi.mock('./leave.service.js', () => ({
    leaveService: mockLeaveService,
}));

vi.mock('../../services/storage.service.js', () => ({
    storageService: mockStorageService,
}));

// Mock Auth Middleware
// We can keep mockAuthUser outside because we use it inside the factory function which is NOT hoisted the same way strictly speaking,
// BUT for safety let's define the mock factory fully inline or hoist the user object too.
// Actually, variables used in mock factory MUST be hoisted or inline.
// But for authMiddleware, I'm not using 'const mockAuthUser' in the factory directly, I'm using it in the implementation?
// Wait, I AM using `mockAuthUser` in the factory: `req.user = { ...mockAuthUser };`
// So mockAuthUser must also be hoisted.

const { mockAuthUser } = vi.hoisted(() => ({
    mockAuthUser: {
        id: 'user-1',
        companyId: 'company-1',
        role: 'employee',
        employeeId: 'employee-1',
        email: 'user@example.com',
    }
}));


vi.mock('../../middleware/auth.middleware.js', () => ({
    authMiddleware: (req: any, res: any, next: any) => {
        req.user = { ...mockAuthUser };
        next();
    },
    requireManager: (req: any, res: any, next: any) => {
        if (req.user.role === 'manager' || req.user.role === 'company_admin' || req.user.role === 'super_admin') {
            next();
        } else {
            res.status(403).json({ success: false, message: 'Forbidden' });
        }
    },
}));

// Import router AFTER mocking
import { leaveRequestsRouter } from './leave.routes.js';

describe('Document Upload Feature', () => {
    let app: express.Express;

    beforeEach(() => {
        vi.clearAllMocks();
        app = express();
        app.use(express.json());
        app.use('/leave-requests', leaveRequestsRouter);

        // Global error handler
        app.use((err: any, req: any, res: any, next: any) => {
            const status = err.statusCode || 500;
            const message = err.message || 'Internal Server Error';
            res.status(status).json({ success: false, message });
        });
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    // 1. Upload Success
    it('should successfully upload a valid PDF document for own leave request', async () => {
        // Setup mock data
        const requestId = 'request-1';
        const mockLeaveRequest = {
            id: requestId,
            companyId: 'company-1',
            employeeId: 'employee-1',
            employee: {
                id: 'employee-1',
                fullName: 'John Doe',
                employeeCode: 'E001',
                userId: 'user-1', // Matches mockAuthUser.id
            },
            status: 'pending',
        };

        mockLeaveService.getLeaveRequestById.mockResolvedValue(mockLeaveRequest);
        mockStorageService.uploadLeaveDocument.mockResolvedValue('leaves/company-1/request-1/doc.pdf');
        mockLeaveService.updateDocumentUrl.mockResolvedValue(undefined);

        // Create a dummy PDF buffer
        const pdfBuffer = Buffer.from('%PDF-1.4\n...');

        const response = await request(app)
            .post(`/leave-requests/${requestId}/document`)
            .attach('document', pdfBuffer, 'test.pdf')
            .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.documentUrl).toBe('leaves/company-1/request-1/doc.pdf');

        // Verify calls
        expect(mockLeaveService.getLeaveRequestById).toHaveBeenCalledWith(requestId, 'company-1');
        expect(mockStorageService.uploadLeaveDocument).toHaveBeenCalled();
        expect(mockLeaveService.updateDocumentUrl).toHaveBeenCalledWith(requestId, 'leaves/company-1/request-1/doc.pdf');
    });

    // 2. Validation Failure (Invalid File Type)
    it('should return 400 when uploading an invalid file type (.exe)', async () => {
        const requestId = 'request-1';
        // Even if ownership is correct, multer should reject it first (or validateUploadedFile)
        // But for multer to even process, we need to pass a file.
        // If we send a file with .exe extension and some binary content

        // Note: The middleware checks MIME type first.
        const response = await request(app)
            .post(`/leave-requests/${requestId}/document`)
            .attach('document', Buffer.from('binary data'), { filename: 'malware.exe', contentType: 'application/x-msdownload' })
            .expect(400);

        expect(response.body.message).toContain('Invalid file type');

        // Service should NOT be called
        expect(mockLeaveService.getLeaveRequestById).not.toHaveBeenCalled();
        expect(mockStorageService.uploadLeaveDocument).not.toHaveBeenCalled();
    });

    // 2. Validation Failure (File Size > 5MB)
    it('should return 400 when uploading a file larger than 5MB', async () => {
        const requestId = 'request-1';

        // Create a buffer > 5MB (5 * 1024 * 1024 + 1)
        const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 10);

        // We need to set a valid mime type so it passes the first check, only fast-fail on size
        const response = await request(app)
            .post(`/leave-requests/${requestId}/document`)
            .attach('document', largeBuffer, { filename: 'large.pdf', contentType: 'application/pdf' })
            .expect(400);

        expect(response.body.message).toContain('File size exceeds');

        expect(mockLeaveService.getLeaveRequestById).not.toHaveBeenCalled();
    });

    // 3. Auth Check (Not Owner)
    it('should return 403 when trying to upload to another user\'s request', async () => {
        const requestId = 'request-2';
        const mockLeaveRequest = {
            id: requestId,
            companyId: 'company-1',
            employeeId: 'employee-2',
            employee: {
                id: 'employee-2',
                fullName: 'Jane Doe',
                employeeCode: 'E002',
                userId: 'user-2', // Different from user-1
            },
            status: 'pending',
        };

        mockLeaveService.getLeaveRequestById.mockResolvedValue(mockLeaveRequest);

        const pdfBuffer = Buffer.from('%PDF-1.4\n...');

        const response = await request(app)
            .post(`/leave-requests/${requestId}/document`)
            .attach('document', pdfBuffer, 'test.pdf')
            .expect(403);

        expect(response.body.message).toContain('You do not have permission');
        expect(mockStorageService.uploadLeaveDocument).not.toHaveBeenCalled();
    });

    // 3. Auth Check (Manager can upload)
    it('should allow manager to upload to any request', async () => {
        // Change user role to manager
        mockAuthUser.role = 'manager';

        const requestId = 'request-2';
        const mockLeaveRequest = {
            id: requestId,
            companyId: 'company-1',
            employeeId: 'employee-2',
            employee: {
                id: 'employee-2',
                fullName: 'Jane Doe',
                employeeCode: 'E002',
                userId: 'user-2',
            },
            status: 'pending',
        };

        mockLeaveService.getLeaveRequestById.mockResolvedValue(mockLeaveRequest);
        mockStorageService.uploadLeaveDocument.mockResolvedValue('doc.pdf');

        const pdfBuffer = Buffer.from('%PDF-1.4\n...');

        await request(app)
            .post(`/leave-requests/${requestId}/document`)
            .attach('document', pdfBuffer, 'test.pdf')
            .expect(201);

        expect(mockStorageService.uploadLeaveDocument).toHaveBeenCalled();

        // Reset role
        mockAuthUser.role = 'employee';
    });
});
