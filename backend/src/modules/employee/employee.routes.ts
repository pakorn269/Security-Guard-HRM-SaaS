import { Router } from 'express';
import { employeeController } from './employee.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Special routes (must be before :id routes)
router.get('/certifications/expiring', employeeController.getExpiringCertifications);
router.get('/line-linked', employeeController.getLineLinkedEmployees);
router.post('/line-message/bulk', employeeController.sendBulkLineMessage);

// Employee CRUD
router.get('/', employeeController.list);
router.post('/', employeeController.create);
router.get('/:id', employeeController.getById);
router.put('/:id', employeeController.update);
router.delete('/:id', employeeController.terminate);

// Employee actions
router.post('/:id/reactivate', employeeController.reactivate);
router.post('/:id/create-user', employeeController.createUserAccount);
router.post('/:id/link-user', employeeController.linkToUser);
router.post('/:id/reset-pin', employeeController.resetPin);
router.post('/:id/line-message', employeeController.sendLineMessage);

// Certifications
router.get('/:id/certifications', employeeController.getCertifications);
router.post('/:id/certifications', employeeController.createCertification);
router.put('/:employeeId/certifications/:certId', employeeController.updateCertification);
router.delete('/:employeeId/certifications/:certId', employeeController.deleteCertification);

export default router;
