import { Router } from 'express';
import { companyController } from './company.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.get('/by-slug/:slug/public', companyController.getPublicBySlug);

// All routes require authentication
router.use(authMiddleware);

// Get current user's company
router.get('/current', companyController.getCurrent);

// Company CRUD
router.get('/', companyController.list);
router.post('/', companyController.create);
router.get('/:id', companyController.getById);
router.put('/:id', companyController.update);
router.delete('/:id', companyController.deactivate);

// Company settings
router.get('/:id/settings', companyController.getSettings);
router.put('/:id/settings', companyController.updateSettings);

// Company activation
router.post('/:id/reactivate', companyController.reactivate);

export default router;
