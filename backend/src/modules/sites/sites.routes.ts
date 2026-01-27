import { Router } from 'express';
import { authMiddleware, requireManager } from '../../middleware/auth.middleware.js';
import * as sitesController from './sites.controller.js';

const router = Router();

// Apply auth to all routes
router.use(authMiddleware);
router.use(requireManager);

// Sites
router.get('/', sitesController.listSites);
router.post('/', sitesController.createSite);
router.get('/:id', sitesController.getSite);
router.put('/:id', sitesController.updateSite);
router.delete('/:id', sitesController.deleteSite);

// Zones
router.post('/zones', sitesController.createZone);
router.put('/zones/:id', sitesController.updateZone);
router.delete('/zones/:id', sitesController.deleteZone);
router.post('/zones/reorder', sitesController.updateZoneOrder);

export default router;
