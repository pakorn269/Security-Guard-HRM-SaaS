import { Router } from 'express';
import { authMiddleware, requireManager } from '../../middleware/auth.middleware.js';
import * as sitesController from './sites.controller.js';

const router = Router();

// Apply auth to all routes
router.use(authMiddleware);

// Sites - Guards can view sites (for clock-in), but only managers can modify
router.get('/', sitesController.listSites); // Guards allowed (for site selection)
router.post('/', requireManager, sitesController.createSite);
router.get('/:id', sitesController.getSite); // Guards allowed (for viewing site details)
router.put('/:id', requireManager, sitesController.updateSite);
router.delete('/:id', requireManager, sitesController.deleteSite);

// Zones - Manager only
router.post('/zones', requireManager, sitesController.createZone);
router.put('/zones/:id', requireManager, sitesController.updateZone);
router.delete('/zones/:id', requireManager, sitesController.deleteZone);
router.post('/zones/reorder', requireManager, sitesController.updateZoneOrder);

export default router;
