import { Request, Response, NextFunction } from 'express';
import { shiftService } from './shift.service.js';
import { employeeService } from '../employee/employee.service.js';
import {
    createShiftTemplateSchema,
    updateShiftTemplateSchema,
    listShiftTemplatesQuerySchema,
    createShiftSchema,
    bulkCreateShiftsSchema,
    updateShiftSchema,
    publishShiftsSchema,
    copyShiftsSchema,
    listShiftsQuerySchema,
    calendarQuerySchema,
    myShiftsQuerySchema,
} from './shift.validation.js';
import { success } from '../../utils/response.js';
import { BadRequestError, UnauthorizedError } from '../../utils/errors.js';

class ShiftController {
    // ========================================================================
    // SHIFT TEMPLATE ENDPOINTS
    // ========================================================================

    // GET /shift-templates - List all shift templates
    async listTemplates(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const query = listShiftTemplatesQuerySchema.parse(req.query);
            const templates = await shiftService.listTemplates(req.user.companyId, query);

            return res.json(success(templates, 'Shift templates retrieved'));
        } catch (error) {
            next(error);
        }
    }

    // GET /shift-templates/:id - Get shift template by ID
    async getTemplateById(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const id = req.params.id as string;
            const template = await shiftService.getTemplateById(id, req.user.companyId);

            return res.json(success(template, 'Shift template retrieved'));
        } catch (error) {
            next(error);
        }
    }

    // POST /shift-templates - Create shift template
    async createTemplate(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const data = createShiftTemplateSchema.parse(req.body);
            const template = await shiftService.createTemplate(req.user.companyId, data);

            return res.status(201).json(success(template, 'Shift template created', 'สร้างรูปแบบกะสำเร็จ'));
        } catch (error) {
            next(error);
        }
    }

    // PUT /shift-templates/:id - Update shift template
    async updateTemplate(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const id = req.params.id as string;
            const data = updateShiftTemplateSchema.parse(req.body);
            const template = await shiftService.updateTemplate(id, req.user.companyId, data);

            return res.json(success(template, 'Shift template updated', 'อัปเดตรูปแบบกะสำเร็จ'));
        } catch (error) {
            next(error);
        }
    }

    // DELETE /shift-templates/:id - Delete (deactivate) shift template
    async deleteTemplate(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const id = req.params.id as string;
            await shiftService.deleteTemplate(id, req.user.companyId);

            return res.json(success(null, 'Shift template deleted', 'ลบรูปแบบกะสำเร็จ'));
        } catch (error) {
            next(error);
        }
    }

    // ========================================================================
    // SHIFT ENDPOINTS
    // ========================================================================

    // GET /shifts - List shifts with filters
    async list(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const query = listShiftsQuerySchema.parse(req.query);
            const result = await shiftService.list(req.user.companyId, query);

            return res.json(success(result.shifts, 'Shifts retrieved', undefined, {
                pagination: {
                    page: query.page,
                    pageSize: query.pageSize,
                    total: result.total,
                    totalPages: Math.ceil(result.total / query.pageSize),
                },
            }));
        } catch (error) {
            next(error);
        }
    }

    // GET /shifts/calendar - Get calendar data
    async getCalendar(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const query = calendarQuerySchema.parse(req.query);
            const calendar = await shiftService.getCalendar(
                req.user.companyId,
                query.startDate,
                query.endDate,
                query.employeeId
            );

            return res.json(success(calendar, 'Calendar data retrieved'));
        } catch (error) {
            next(error);
        }
    }

    // GET /shifts/my - Get my shifts (for guards)
    async getMyShifts(req: Request, res: Response, next: NextFunction) {
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

            const query = myShiftsQuerySchema.parse(req.query);
            const myShifts = await shiftService.getMyShifts(
                req.user.companyId,
                req.user.employeeId,
                query.days
            );

            return res.json(success(myShifts, 'My shifts retrieved', 'ดึงข้อมูลกะของฉันสำเร็จ'));
        } catch (error) {
            next(error);
        }
    }

    // GET /shifts/:id - Get shift by ID
    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const id = req.params.id as string;
            const shift = await shiftService.getByIdWithDetails(id, req.user.companyId);

            return res.json(success(shift, 'Shift retrieved'));
        } catch (error) {
            next(error);
        }
    }

    // POST /shifts - Create single shift
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId || !req.user?.userId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const data = createShiftSchema.parse(req.body);
            const shift = await shiftService.create(
                req.user.companyId,
                data,
                req.user.userId
            );

            return res.status(201).json(success(shift, 'Shift created', 'สร้างกะสำเร็จ'));
        } catch (error) {
            next(error);
        }
    }

    // POST /shifts/bulk - Create multiple shifts
    async bulkCreate(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId || !req.user?.userId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const data = bulkCreateShiftsSchema.parse(req.body);
            const result = await shiftService.bulkCreate(
                req.user.companyId,
                data,
                req.user.userId
            );

            return res.status(201).json(success(result, 'Bulk shift creation completed', 'สร้างกะจำนวนมากสำเร็จ'));
        } catch (error) {
            next(error);
        }
    }

    // POST /shifts/publish - Publish shifts
    async publish(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const data = publishShiftsSchema.parse(req.body);
            const shifts = await shiftService.publish(req.user.companyId, data);

            return res.json(success(
                { publishedCount: shifts.length, shifts },
                'Shifts published',
                'ประกาศกะสำเร็จ'
            ));
        } catch (error) {
            next(error);
        }
    }

    // POST /shifts/copy - Copy shifts from one week to another
    async copyShifts(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId || !req.user?.userId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const data = copyShiftsSchema.parse(req.body);
            const result = await shiftService.copyShifts(
                req.user.companyId,
                data,
                req.user.userId
            );

            return res.status(201).json(success(result, 'Shifts copied', 'คัดลอกกะสำเร็จ'));
        } catch (error) {
            next(error);
        }
    }

    // PUT /shifts/:id - Update shift
    async update(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const id = req.params.id as string;
            const data = updateShiftSchema.parse(req.body);
            const shift = await shiftService.update(id, req.user.companyId, data);

            return res.json(success(shift, 'Shift updated', 'อัปเดตกะสำเร็จ'));
        } catch (error) {
            next(error);
        }
    }

    // DELETE /shifts/:id - Delete shift
    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const id = req.params.id as string;
            await shiftService.delete(id, req.user.companyId);

            return res.json(success(null, 'Shift deleted', 'ลบกะสำเร็จ'));
        } catch (error) {
            next(error);
        }
    }

    // GET /shifts/candidates - Get replacement candidates
    async getReplacementCandidates(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const { date, startTime, endTime, excludeEmployeeId } = req.query;

            if (!date || !startTime || !endTime) {
                throw new BadRequestError('Date, startTime, and endTime are required');
            }

            const candidates = await employeeService.findReplacements(
                req.user.companyId,
                date as string,
                startTime as string,
                endTime as string,
                excludeEmployeeId as string
            );

            return res.json(success(candidates, 'Candidates retrieved'));
        } catch (error) {
            next(error);
        }
    }

    // POST /shifts/:id/offer-replacement
    async offerReplacement(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }

            const shiftId = req.params.id as string;
            const { candidateIds } = req.body;

            if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
                throw new BadRequestError('candidateIds (string[]) is required');
            }

            // Get shift details for message
            const shift = await shiftService.getByIdWithDetails(shiftId, req.user.companyId);

            // Import NotificationService dynamically
            const { NotificationService } = await import('../notifications/notifications.service.js');
            const { supabaseAdmin } = await import('../../config/supabase.js');

            // Fetch user IDs for these employees
            const { data: users } = await supabaseAdmin
                .from('users')
                .select('id, employee_id')
                .in('employee_id', candidateIds);

            if (users) {
                for (const user of users) {
                    await NotificationService.createNotification({
                        companyId: req.user.companyId,
                        userId: user.id,
                        type: 'shift_offer',
                        title: 'Shift Replacement Offer',
                        titleTh: 'เสนอแทนกะงาน',
                        message: `You have been offered a shift replacement on ${shift.date} (${shift.startTime} - ${shift.endTime}).`,
                        messageTh: `คุณได้รับข้อเสนอให้แทนกะงานในวันที่ ${shift.date} (${shift.startTime} - ${shift.endTime})`,
                        data: {
                            shiftId: shift.id,
                            date: shift.date,
                            startTime: shift.startTime,
                            endTime: shift.endTime,
                            action: 'claim_shift' // for frontend to show button
                        },
                        channels: ['in_app', 'line']
                    });
                }
            }

            return res.json(success(null, 'Replacement offers sent', 'ส่งข้อเสนอเรียบร้อยแล้ว'));
        } catch (error) {
            next(error);
        }
    }

    // POST /shifts/:id/claim
    async claim(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?.companyId) {
                throw new UnauthorizedError('Company ID not found');
            }
            if (!req.user?.employeeId || !req.user?.userId) {
                throw new BadRequestError('User/Employee required');
            }

            const shiftId = req.params.id as string;
            const shift = await shiftService.claim(shiftId, req.user.companyId, req.user.employeeId);

            return res.json(success(shift, 'Shift claimed successfully', 'รับแทนกะสำเร็จ'));
        } catch (error) {
            next(error);
        }
    }
}

export const shiftController = new ShiftController();
export default shiftController;
