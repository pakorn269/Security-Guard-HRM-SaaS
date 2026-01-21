import { z } from 'zod';

export const createSiteSchema = z.object({
    name: z.string().min(1, 'Site name is required'),
    address: z.string().optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    radius: z.number().positive('Radius must be positive').optional(),
    contactName: z.string().optional(),
    contactPhone: z.string().optional(),
});

export const updateSiteSchema = createSiteSchema.partial().extend({
    isActive: z.boolean().optional(),
});

export const createZoneSchema = z.object({
    siteId: z.string().uuid('Invalid site ID'),
    name: z.string().min(1, 'Zone name is required'),
    code: z.string().optional(),
    description: z.string().optional(),
    qrCode: z.string().optional(),
});

export const updateZoneSchema = createZoneSchema.omit({ siteId: true }).partial().extend({
    isActive: z.boolean().optional(),
});
