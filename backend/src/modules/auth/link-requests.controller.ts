import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response.js';
import { linkRequestsService } from './link-requests.service.js';
import { UnauthorizedError, ValidationError } from '../../utils/errors.js';

class LinkRequestsController {
    /**
     * List pending link requests for company
     */
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user || !req.user.companyId) {
                throw new UnauthorizedError('User not authenticated or missing company');
            }

            const requests = await linkRequestsService.listRequests(req.user.companyId);

            sendSuccess(res, requests);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Approve a link request
     */
    async approve(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            if (!req.user || !req.user.companyId) {
                throw new UnauthorizedError('User not authenticated');
            }

            if (!id) {
                throw new ValidationError('Request ID is required', [{ field: 'id', message: 'Request ID is missing' }]);
            }

            await linkRequestsService.approveRequest(
                id as string,
                req.user.companyId,
                req.user.userId // Reviewed by
            );

            sendSuccess(res, {
                message: 'Request approved and user linked successfully',
                message_th: 'อนุมัติและเชื่อมต่อบัญชีเรียบร้อยแล้ว'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reject a link request
     */
    async reject(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { notes } = req.body;

            if (!req.user || !req.user.companyId) {
                throw new UnauthorizedError('User not authenticated');
            }

            if (!id) {
                throw new ValidationError('Request ID is required', [{ field: 'id', message: 'Request ID is missing' }]);
            }

            await linkRequestsService.rejectRequest(
                id as string,
                req.user.companyId,
                req.user.userId,
                notes
            );

            sendSuccess(res, {
                message: 'Request rejected',
                message_th: 'ปฏิเสธคำขอเรียบร้อยแล้ว'
            });
        } catch (error) {
            next(error);
        }
    }
}

export const linkRequestsController = new LinkRequestsController();
