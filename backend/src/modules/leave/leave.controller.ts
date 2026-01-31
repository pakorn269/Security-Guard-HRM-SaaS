import { Request, Response, NextFunction } from 'express';
import { leaveService } from './leave.service.js';
import { replacementService } from './replacement.service.js';
import { leaveExportService } from './leave.export.js';
import { balanceAdjustmentService } from './balance-adjustment.service.js';
import { templateService } from './template.service.js';
import { analyticsService } from './analytics.service.js';
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
    approveLeaveWithReplacementsSchema,
    assignReplacementsSchema,
    adjustBalanceSchema,
    listAdjustmentsQuerySchema,
    bulkAdjustSchema,
    createTemplateSchema,
    updateTemplateSchema,
    applyTemplateSchema,
    listTemplatesQuerySchema,
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

    // GET /leave-requests/:id/conflicts - Get shift conflicts for leave request
    async getLeaveRequestConflicts(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const id = req.params.id as string;
            const conflicts = await leaveService.getLeaveRequestConflicts(id, companyId);

            return res.json(
                success(conflicts, 'Shift conflicts retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /shifts/:id/available-replacements - Get available replacement guards for a shift
    async getAvailableReplacements(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const shiftId = req.params.id as string;
            const replacements = await replacementService.getAvailableReplacements(shiftId, companyId);

            return res.json(
                success(replacements, 'Available replacements retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // POST /leave-requests/:id/approve-with-replacements - Approve leave with replacement assignments
    async approveLeaveWithReplacements(req: Request, res: Response, next: NextFunction) {
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
            const data = approveLeaveWithReplacementsSchema.parse(req.body);
            const result = await leaveService.approveLeaveRequestWithReplacements(
                id,
                companyId,
                userId,
                data
            );

            return res.json(
                success(result, 'Leave request approved with replacements successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // POST /leave-requests/:id/assign-replacements - Bulk assign replacements for leave request
    async assignReplacementsForLeave(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const id = req.params.id as string;
            const data = assignReplacementsSchema.parse(req.body);
            const result = await replacementService.assignReplacementsForLeave(
                data.replacements,
                companyId,
                id
            );

            return res.json(
                success(result, 'Replacements assigned successfully')
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

    // ========================================================================
    // EXPORT ENDPOINTS
    // ========================================================================

    // GET /leave/export/ical - Export leave calendar as iCal (.ics) file
    async exportICalendar(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            // Parse query filters
            const filters: any = {};

            if (req.query.startDate) {
                filters.startDate = req.query.startDate as string;
            }

            if (req.query.endDate) {
                filters.endDate = req.query.endDate as string;
            }

            if (req.query.teamId) {
                filters.teamId = req.query.teamId as string;
            }

            if (req.query.employeeId) {
                filters.employeeId = req.query.employeeId as string;
            }

            if (req.query.status) {
                filters.status = req.query.status as string;
            }

            // Generate iCal file
            const icalBuffer = await leaveExportService.generateICalBuffer(companyId, filters);
            const filename = leaveExportService.generateFilename(filters);

            // Set headers for file download
            res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', icalBuffer.length.toString());

            // Send buffer
            return res.send(icalBuffer);
        } catch (error) {
            next(error);
        }
    }

    // ========================================================================
    // BALANCE ADJUSTMENT ENDPOINTS
    // ========================================================================

    // POST /leave-balances/:id/adjust - Adjust leave balance with audit trail
    async adjustBalance(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?.userId;

            if (!companyId || !userId) {
                throw new UnauthorizedError('User information not found');
            }

            const balanceId = req.params.id as string;
            const data = adjustBalanceSchema.parse(req.body);

            // Perform adjustment with audit trail
            const adjustment = await balanceAdjustmentService.adjustBalance(
                balanceId,
                companyId,
                userId,
                data
            );

            return res.json(
                success(adjustment, 'Balance adjusted successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /leave-balances/:id/adjustments - Get adjustment history for a balance
    async getBalanceAdjustments(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const balanceId = req.params.id as string;

            const adjustments = await balanceAdjustmentService.getAdjustmentHistory(
                balanceId,
                companyId
            );

            return res.json(
                success(adjustments, 'Adjustment history retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /leave-balances/adjustments - List all adjustments with filters
    async listAdjustments(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const query = listAdjustmentsQuerySchema.parse(req.query);

            const result = await balanceAdjustmentService.listAdjustments(companyId, query);

            return res.json(
                success(result, 'Adjustments retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /employees/:id/adjustments - Get adjustment history for an employee
    async getEmployeeAdjustments(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;

            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const employeeId = req.params.id as string;
            const year = req.query.year ? parseInt(req.query.year as string) : undefined;

            const adjustments = await balanceAdjustmentService.getEmployeeAdjustments(
                employeeId,
                companyId,
                year
            );

            return res.json(
                success(adjustments, 'Employee adjustment history retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // POST /leave-balances/bulk-adjust - Bulk adjust balances
    async bulkAdjustBalances(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?.userId;

            if (!companyId || !userId) {
                throw new UnauthorizedError('User information not found');
            }

            const data = bulkAdjustSchema.parse(req.body);

            const result = await balanceAdjustmentService.bulkAdjust(
                companyId,
                userId,
                data.adjustments
            );

            return res.json(
                success(result, 'Bulk adjustment completed')
            );
        } catch (error) {
            next(error);
        }
    }

    // ========================================================================
    // LEAVE REQUEST TEMPLATE ENDPOINTS
    // ========================================================================

    // GET /leave-templates - List all templates
    async listTemplates(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const query = listTemplatesQuerySchema.parse(req.query);

            const templates = await templateService.listTemplates(companyId, query);

            return res.json(
                success(templates, 'Templates retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /leave-templates/:id - Get a single template
    async getTemplate(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const templateId = req.params.id as string;

            const template = await templateService.getTemplateById(templateId, companyId);

            return res.json(
                success(template, 'Template retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // POST /leave-templates - Create a new template
    async createTemplate(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            const userId = req.user?.userId;

            if (!companyId || !userId) {
                throw new UnauthorizedError('User information not found');
            }

            const data = createTemplateSchema.parse(req.body);

            const template = await templateService.createTemplate(companyId, userId, data);

            return res.json(
                success(template, 'Template created successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // PUT /leave-templates/:id - Update a template
    async updateTemplate(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const templateId = req.params.id as string;
            const data = updateTemplateSchema.parse(req.body);

            const template = await templateService.updateTemplate(templateId, companyId, data);

            return res.json(
                success(template, 'Template updated successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // DELETE /leave-templates/:id - Delete a template
    async deleteTemplate(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const templateId = req.params.id as string;

            await templateService.deleteTemplate(templateId, companyId);

            return res.json(
                success(null, 'Template deleted successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // POST /leave-templates/:id/apply - Apply a template to get draft data
    async applyTemplate(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const templateId = req.params.id as string;
            const data = applyTemplateSchema.parse(req.body);

            const draft = await templateService.applyTemplate(
                templateId,
                companyId,
                data.startDate
            );

            return res.json(
                success(draft, 'Template applied successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // ========================================================================
    // ANALYTICS & REPORTING ENDPOINTS
    // ========================================================================

    // GET /leave/reports/kpi - Get KPI summary
    async getKPISummary(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const year = parseInt(req.query.year as string) || new Date().getFullYear();

            const summary = await analyticsService.getKPISummary(companyId, year);

            return res.json(
                success(summary, 'KPI summary retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /leave/reports/utilization - Get employee utilization report
    async getUtilizationReport(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const year = parseInt(req.query.year as string) || new Date().getFullYear();
            const departmentId = req.query.departmentId as string | undefined;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

            const report = await analyticsService.getUtilizationReport(companyId, year, {
                departmentId,
                limit,
            });

            return res.json(
                success(report, 'Utilization report retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /leave/reports/trending - Get trending data
    async getTrendingReport(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const startDate = req.query.startDate as string;
            const endDate = req.query.endDate as string;
            const granularity = (req.query.granularity as 'daily' | 'monthly') || 'daily';

            if (!startDate || !endDate) {
                throw new BadRequestError('startDate and endDate are required');
            }

            const report = await analyticsService.getTrendingReport(companyId, {
                startDate,
                endDate,
                granularity,
            });

            return res.json(
                success(report, 'Trending report retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /leave/reports/type-distribution - Get leave type distribution
    async getTypeDistribution(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const year = parseInt(req.query.year as string) || new Date().getFullYear();

            const report = await analyticsService.getTypeDistribution(companyId, year);

            return res.json(
                success(report, 'Type distribution retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /leave/reports/approval-metrics - Get approval metrics
    async getApprovalMetrics(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const startDate = req.query.startDate as string;
            const endDate = req.query.endDate as string;

            if (!startDate || !endDate) {
                throw new BadRequestError('startDate and endDate are required');
            }

            const metrics = await analyticsService.getApprovalMetrics(companyId, {
                startDate,
                endDate,
            });

            return res.json(
                success(metrics, 'Approval metrics retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }

    // GET /leave/reports/heatmap - Get heatmap data
    async getHeatmapData(req: Request, res: Response, next: NextFunction) {
        try {
            const companyId = req.user?.companyId;
            if (!companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const startDate = req.query.startDate as string;
            const endDate = req.query.endDate as string;

            if (!startDate || !endDate) {
                throw new BadRequestError('startDate and endDate are required');
            }

            const heatmap = await analyticsService.getHeatmapData(companyId, {
                startDate,
                endDate,
            });

            return res.json(
                success(heatmap, 'Heatmap data retrieved successfully')
            );
        } catch (error) {
            next(error);
        }
    }
}

export const leaveController = new LeaveController();
export default leaveController;
