import { Request, Response, NextFunction } from 'express';
import { sitesService } from './sites.service.js';
import { createSiteSchema, updateSiteSchema, createZoneSchema, updateZoneSchema } from './sites.validation.js';

export const listSites = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            page = '1',
            pageSize = '10',
            sortBy = 'name',
            sortOrder = 'asc',
            search = '',
            status = 'all'
        } = req.query;

        const queryParams = {
            page: parseInt(page as string, 10),
            pageSize: parseInt(pageSize as string, 10),
            sortBy: sortBy as string,
            sortOrder: sortOrder as 'asc' | 'desc',
            search: search as string,
            status: status as 'active' | 'inactive' | 'all',
        };

        const result = await sitesService.listSites(req.user!.companyId, queryParams);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const getSite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const site = await sitesService.getSiteById(req.params.id as string, req.user!.companyId);
        res.json({ success: true, data: { site } });
    } catch (error) {
        next(error);
    }
};

export const createSite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validated = createSiteSchema.parse(req.body);
        const site = await sitesService.createSite(req.user!.companyId, validated);
        res.status(201).json({ success: true, data: { site } });
    } catch (error) {
        next(error);
    }
};

export const updateSite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validated = updateSiteSchema.parse(req.body);
        const site = await sitesService.updateSite(req.params.id as string, req.user!.companyId, validated);
        res.json({ success: true, data: { site } });
    } catch (error) {
        next(error);
    }
};

export const deleteSite = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await sitesService.deleteSite(req.params.id as string, req.user!.companyId);
        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};

// Zones
export const createZone = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validated = createZoneSchema.parse(req.body);
        const zone = await sitesService.createZone(req.user!.companyId, validated);
        res.status(201).json({ success: true, data: { zone } });
    } catch (error) {
        next(error);
    }
};

export const updateZone = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validated = updateZoneSchema.parse(req.body);
        const zone = await sitesService.updateZone(req.params.id as string, req.user!.companyId, validated);
        res.json({ success: true, data: { zone } });
    } catch (error) {
        next(error);
    }
};

export const deleteZone = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await sitesService.deleteZone(req.params.id as string, req.user!.companyId);
        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};
