import { Request, Response, NextFunction } from 'express';
import { leaveService } from './leave.service.js';
import {
    createLeaveTypeSchema,
    updateLeaveTypeSchema,
    createLeaveRequestSchema,
    approveLeaveRequestSchema,
    rejectLeaveRequestSchema,
    listLeaveTypesQuerySchema,
    listLeaveRequestsQuerySchema,
    myLeaveQuerySchema,
    leaveCalendarQuerySchema,
    listLeaveBalancesQuerySchema,
    updateLeaveBalanceSchema,
    initializeBalancesSchema,
} from './leave.validation.js';
import { success } from '../../utils/response.js';
import { BadRequestError, UnauthorizedError, ForbiddenError } from '../../utils/errors.js';
import { storageService } from '../../services/storage.service.js';

class LeaveController {
    // ========================================================================
    // LEAVE TYPE ENDPOINTS
    // ========================================================================

    // GET /leave-types - List all leave types
    async listLeaveTypes(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const query = listLeaveTypesQuerySchema.parse(req.query);
            const leaveTypes = await leaveService.listLeaveTypes(companyId, query);

            return res.json(
                success(leaveTypes, 'Leave types retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /leave-types/:id - Get leave type by ID
    async getLeaveTypeById(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const id = req.params.id as string;
            const leaveType = await leaveService.getLeaveTypeById(id, companyId);

            return res.json(
                success(leaveType, 'Leave type retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // POST /leave-types - Create leave type
    async createLeaveType(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const data = createLeaveTypeSchema.parse(req.body);
            const leaveType = await leaveService.createLeaveType(companyId, data);

            return res.status(201).json(
                success(leaveType, 'Leave type created successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // PUT /leave-types/:id - Update leave type
    async updateLeaveType(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const id = req.params.id as string;
            const data = updateLeaveTypeSchema.parse(req.body);
            const leaveType = await leaveService.updateLeaveType(id, companyId, data);

            return res.json(
                success(leaveType, 'Leave type updated successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // DELETE /leave-types/:id - Delete leave type
    async deleteLeaveType(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const id = req.params.id as string;
            await leaveService.deleteLeaveType(id, companyId);

            return res.json(
                success(null, 'Leave type deleted successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // ========================================================================
    // LEAVE REQUEST ENDPOINTS (GUARD - for LIFF)
    // ========================================================================

    // GET /leave-requests/my - Get my leave requests
    async getMyLeaveRequests(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            const employeeId = req.user?.employeeId;

            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }
            if (!employeeId) {
                throw new BadRequestError('Employee ID not found. Please link your account first.');
            }

            const requests = await leaveService.getMyLeaveRequests(companyId, employeeId);

            return res.json(
                success(requests, 'Leave requests retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /leave-balances/my - Get my leave balances
    async getMyBalances(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            const employeeId = req.user?.employeeId;

            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }
            if (!employeeId) {
                throw new BadRequestError('Employee ID not found. Please link your account first.');
            }

            const query = myLeaveQuerySchema.parse(req.query);
            const balances = await leaveService.getMyBalances(companyId, employeeId, query.year);

            return res.json(
                success(balances, 'Leave balances retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /leave/my - Get my complete leave data (balances + pending + recent)
    async getMyLeaveData(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            const employeeId = req.user?.employeeId;

            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }
            if (!employeeId) {
                throw new BadRequestError('Employee ID not found. Please link your account first.');
            }

            const query = myLeaveQuerySchema.parse(req.query);
            const data = await leaveService.getMyLeaveData(companyId, employeeId, query.year);

            return res.json(
                success(data, 'Leave data retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // POST /leave-requests - Create leave request
    async createLeaveRequest(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            const employeeId = req.user?.employeeId;

            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }
            if (!employeeId) {
                throw new BadRequestError('Employee ID not found. Please link your account first.');
            }

            const data = createLeaveRequestSchema.parse(req.body);
            const request = await leaveService.createLeaveRequest(companyId, employeeId, data);

            return res.status(201).json(
                success(request, 'Leave request created successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // POST /leave-requests/:id/cancel - Cancel my leave request
    async cancelMyLeaveRequest(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            const employeeId = req.user?.employeeId;

            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }
            if (!employeeId) {
                throw new BadRequestError('Employee ID not found. Please link your account first.');
            }

            const id = req.params.id as string;
            const request = await leaveService.cancelLeaveRequest(id, companyId, employeeId);

            return res.json(
                success(request, 'Leave request cancelled successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // ========================================================================
    // LEAVE REQUEST ENDPOINTS (MANAGER)
    // ========================================================================

    // GET /leave-requests - List all leave requests
    async listLeaveRequests(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const query = listLeaveRequestsQuerySchema.parse(req.query);
            const { requests, total } = await leaveService.listLeaveRequests(companyId, query);

            return res.json(
                success(requests, 'Leave requests retrieved successfully', undefined, {
                    pagination: {
                        page: query.page || 1,
                        pageSize: query.pageSize || 50,
                        total,
                        totalPages: Math.ceil(total / (query.pageSize || 50)),
                    },
                })
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /leave-requests/:id - Get leave request by ID
    async getLeaveRequestById(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const id = req.params.id as string;
            const request = await leaveService.getLeaveRequestById(id, companyId);

            return res.json(
                success(request, 'Leave request retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // POST /leave-requests/:id/approve - Approve leave request
    async approveLeaveRequest(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?.userId;

            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }
            if (!userId) {
                throw new UnauthorizedError('User ID not found');
            }

            const id = req.params.id as string;
            const data = approveLeaveRequestSchema.parse(req.body);
            const request = await leaveService.approveLeaveRequest(id, companyId, userId, data);

            return res.json(
                success(request, 'Leave request approved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // POST /leave-requests/:id/reject - Reject leave request
    async rejectLeaveRequest(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?.userId;

            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }
            if (!userId) {
                throw new UnauthorizedError('User ID not found');
            }

            const id = req.params.id as string;
            const data = rejectLeaveRequestSchema.parse(req.body);
            const request = await leaveService.rejectLeaveRequest(id, companyId, userId, data);

            return res.json(
                success(request, 'Leave request rejected successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /leave/calendar - Get leave calendar
    async getLeaveCalendar(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const query = leaveCalendarQuerySchema.parse(req.query);
            const calendar = await leaveService.getLeaveCalendar(
                companyId,
                query.startDate,
                query.endDate
            );

            return res.json(
                success(calendar, 'Leave calendar retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /leave/summary - Get leave summary for dashboard
    async getLeaveSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const summary = await leaveService.getLeaveSummary(companyId);

            return res.json(
                success(summary, 'Leave summary retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /leave/pending-count - Get pending leave requests count
    async getPendingCount(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const count = await leaveService.getPendingCount(companyId);

            return res.json(
                success({ count }, 'Pending count retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // ========================================================================
    // BALANCE MANAGEMENT (ADMIN)
    // ========================================================================

    // GET /leave-balances - List all leave balances
    async listBalances(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const query = listLeaveBalancesQuerySchema.parse(req.query);
            const { balances, total } = await leaveService.listBalances(companyId, query);

            return res.json(
                success(balances, 'Leave balances retrieved successfully', undefined, {
                    pagination: {
                        page: query.page || 1,
                        pageSize: query.pageSize || 50,
                        total,
                        totalPages: Math.ceil(total / (query.pageSize || 50)),
                    },
                })
            );
        } catch (error) {
            next(error);
        }
    }

    // PUT /leave-balances/:employeeId/:leaveTypeId - Update employee's leave balance
    async updateBalance(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const employeeId = req.params.employeeId as string;
            const leaveTypeId = req.params.leaveTypeId as string;
            const data = updateLeaveBalanceSchema.parse(req.body);
            const year = new Date().getFullYear();

            const balance = await leaveService.updateBalance(
                companyId,
                employeeId,
                leaveTypeId,
                year,
                data.entitledDays
            );

            return res.json(
                success(balance, 'Leave balance updated successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // POST /leave-balances/initialize - Initialize balances for year
    async initializeBalances(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const data = initializeBalancesSchema.parse(req.body);
            const result = await leaveService.initializeBalancesForYear(
                companyId,
                data.year,
                data.employeeIds
            );

            return res.json(
                success(result, `Initialized ${result.created} leave balances`)
            );
        } catch (error) {
            next(error);
        }
    }

    // ========================================================================
    // DOCUMENT MANAGEMENT ENDPOINTS
    // ========================================================================

    // POST /leave-requests/:id/document - Upload document for leave request
    async uploadDocument(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?.userId;
            const userRole = req.user?.role;

            if (!companyId || !userId) {
                throw new UnauthorizedError('User information not found');
            }

            const leaveRequestId = req.params.id as string;

            // Get the uploaded file from multer
            const file = req.file;
            if (!file) {
                throw new BadRequestError('No file uploaded');
            }

            // Get leave request to verify ownership or manager access
            const leaveRequest = await leaveService.getLeaveRequestById(leaveRequestId, companyId);

            // Check if user is request owner or manager
            const isOwner = leaveRequest.employee?.userId === userId;
            const isManager = userRole === 'manager' || userRole === 'company_admin' || userRole === 'super_admin';

            if (!isOwner && !isManager) {
                throw new ForbiddenError('You do not have permission to upload documents for this leave request');
            }

            // Upload document to storage
            const storagePath = await storageService.uploadLeaveDocument(
                file.buffer,
                file.originalname,
                file.mimetype,
                companyId,
                leaveRequestId
            );

            // Update leave request with document URL
            await leaveService.updateDocumentUrl(leaveRequestId, storagePath);

            return res.status(201).json(
                success(
                    { documentUrl: storagePath },
                    'Document uploaded successfully'
                )
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /leave-requests/:id/document - Get document URL for leave request
    async getDocumentUrl(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?.userId;
            const userRole = req.user?.role;

            if (!companyId || !userId) {
                throw new UnauthorizedError('User information not found');
            }

            const leaveRequestId = req.params.id as string;

            // Get leave request to verify ownership or manager access
            const leaveRequest = await leaveService.getLeaveRequestById(leaveRequestId, companyId);

            // Check if user is request owner or manager
            const isOwner = leaveRequest.employee?.userId === userId;
            const isManager = userRole === 'manager' || userRole === 'company_admin' || userRole === 'super_admin';

            if (!isOwner && !isManager) {
                throw new ForbiddenError('You do not have permission to view this document');
            }

            // Check if document exists
            if (!leaveRequest.documentUrl) {
                throw new BadRequestError('No document found for this leave request');
            }

            // Generate signed URL (valid for 1 hour)
            const signedUrl = await storageService.getLeaveDocumentUrl(leaveRequest.documentUrl);

            return res.json(
                success(
                    { url: signedUrl },
                    'Document URL generated successfully'
                )
            );
        } catch (error) {
            next(error);
        }
    }

    // DELETE /leave-requests/:id/document - Delete document from leave request
    async deleteDocument(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?.userId;
            const userRole = req.user?.role;

            if (!companyId || !userId) {
                throw new UnauthorizedError('User information not found');
            }

            const leaveRequestId = req.params.id as string;

            // Get leave request to verify ownership or manager access
            const leaveRequest = await leaveService.getLeaveRequestById(leaveRequestId, companyId);

            // Check if user is request owner or manager
            const isOwner = leaveRequest.employee?.userId === userId;
            const isManager = userRole === 'manager' || userRole === 'company_admin' || userRole === 'super_admin';

            if (!isOwner && !isManager) {
                throw new ForbiddenError('You do not have permission to delete this document');
            }

            // Check if document exists
            if (!leaveRequest.documentUrl) {
                throw new BadRequestError('No document found for this leave request');
            }

            // Delete document from storage
            await storageService.deleteLeaveDocument(leaveRequest.documentUrl);

            // Remove document URL from leave request
            await leaveService.updateDocumentUrl(leaveRequestId, null);

            return res.json(
                success(null, 'Document deleted successfully')
            );
        } catch (error) {
            next(error);
        }
    }
}

export const leaveController = new LeaveController();
export default leaveController;
