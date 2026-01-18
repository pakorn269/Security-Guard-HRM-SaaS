import { Router } from 'express';
import { employeeController } from './employee.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Special route for expiring certifications (must be before :id routes)
router.get('/certifications/expiring', employeeController.getExpiringCertifications);

// Employee CRUD
router.get('/', employeeController.list);
router.post('/', employeeController.create);
router.get('/:id', employeeController.getById);
router.put('/:id', employeeController.update);
router.delete('/:id', employeeController.terminate);

// Employee actions
router.post('/:id/reactivate', employeeController.reactivate);
router.post('/:id/link-user', employeeController.linkToUser);

// Certifications
router.get('/:id/certifications', employeeController.getCertifications);
router.post('/:id/certifications', employeeController.createCertification);
router.put('/:employeeId/certifications/:certId', employeeController.updateCertification);
router.delete('/:employeeId/certifications/:certId', employeeController.deleteCertification);

export default router;
