import { Router } from 'express';
import { shiftController } from './shift.controller.js';
import { authMiddleware, requireManager } from '../../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================================================
// SHIFT TEMPLATE ROUTES
// ============================================================================

// List shift templates (all authenticated users)
router.get('/templates', shiftController.listTemplates);

// Get shift template by ID (all authenticated users)
router.get('/templates/:id', shiftController.getTemplateById);

// Create shift template (managers and above)
router.post('/templates', requireManager, shiftController.createTemplate);

// Update shift template (managers and above)
router.put('/templates/:id', requireManager, shiftController.updateTemplate);

// Delete shift template (managers and above)
router.delete('/templates/:id', requireManager, shiftController.deleteTemplate);

// ============================================================================
// SHIFT ROUTES
// ============================================================================

// Special routes (must come before :id routes)
router.get('/calendar', shiftController.getCalendar);
router.get('/my', shiftController.getMyShifts);

// Bulk operations (managers and above)
router.post('/bulk', requireManager, shiftController.bulkCreate);
router.post('/bulk/publish', requireManager, shiftController.bulkPublish);
router.post('/bulk/delete', requireManager, shiftController.bulkDelete);
router.post('/publish', requireManager, shiftController.publish);
router.post('/copy', requireManager, shiftController.copyShifts);

// Candidates (Must be before /:id)
router.get('/candidates', requireManager, shiftController.getReplacementCandidates);

// Shift CRUD
router.get('/', shiftController.list);
router.post('/', requireManager, shiftController.create);
router.get('/:id', shiftController.getById);
router.put('/:id', requireManager, shiftController.update);
router.delete('/:id', requireManager, shiftController.delete);

// Substitution
router.post('/:id/offer-replacement', requireManager, shiftController.offerReplacement);
router.post('/:id/claim', shiftController.claim);

export default router;
