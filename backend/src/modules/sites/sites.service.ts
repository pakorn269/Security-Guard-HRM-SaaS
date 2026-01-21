import { supabaseAdmin } from '../../config/supabase.js';
import { NotFoundError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';
import type {
    Site,
    Zone,
    SiteWithZones,
    CreateSiteInput,
    UpdateSiteInput,
    CreateZoneInput,
    UpdateZoneInput,
} from './sites.types.js';

export class SitesService {
    // Map DB row to Site object
    private mapToSite(row: any): Site {
        return {
            id: row.id,
            companyId: row.company_id,
            name: row.name,
            address: row.address,
            latitude: row.latitude,
            longitude: row.longitude,
            radius: row.radius,
            contactName: row.contact_name,
            contactPhone: row.contact_phone,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    private mapToZone(row: any): Zone {
        return {
            id: row.id,
            siteId: row.site_id,
            companyId: row.company_id,
            name: row.name,
            code: row.code,
            description: row.description,
            qrCode: row.qr_code,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    async listSites(companyId: string): Promise<SiteWithZones[]> {
        const { data, error } = await supabaseAdmin
            .from('sites')
            .select(`
                *,
                zones (*)
            `)
            .eq('company_id', companyId)
            .order('name');

        if (error) {
            logger.error('Error listing sites:', error);
            throw new Error('Failed to list sites');
        }

        return data.map((site: any) => ({
            ...this.mapToSite(site),
            zones: (site.zones || []).map((z: any) => this.mapToZone(z)),
        }));
    }

    async getSiteById(siteId: string, companyId: string): Promise<SiteWithZones> {
        const { data, error } = await supabaseAdmin
            .from('sites')
            .select(`
                *,
                zones (*)
            `)
            .eq('id', siteId)
            .eq('company_id', companyId)
            .single();

        if (error || !data) {
            throw new NotFoundError('Site', 'Site not found');
        }

        return {
            ...this.mapToSite(data),
            zones: (data.zones || []).map((z: any) => this.mapToZone(z)),
        };
    }

    async createSite(companyId: string, input: CreateSiteInput): Promise<Site> {
        const dbInput = {
            company_id: companyId,
            name: input.name,
            address: input.address,
            latitude: input.latitude,
            longitude: input.longitude,
            radius: input.radius,
            contact_name: input.contactName,
            contact_phone: input.contactPhone
        };

        const { data, error } = await supabaseAdmin
            .from('sites')
            .insert(dbInput)
            .select()
            .single();

        if (error) {
            logger.error('Error creating site:', error);
            throw new Error('Failed to create site');
        }

        return this.mapToSite(data);
    }

    async updateSite(siteId: string, companyId: string, input: UpdateSiteInput): Promise<Site> {
        const dbInput: any = {
            updated_at: new Date().toISOString()
        };

        if (input.name !== undefined) dbInput.name = input.name;
        if (input.address !== undefined) dbInput.address = input.address;
        if (input.latitude !== undefined) dbInput.latitude = input.latitude;
        if (input.longitude !== undefined) dbInput.longitude = input.longitude;
        if (input.radius !== undefined) dbInput.radius = input.radius;
        if (input.contactName !== undefined) dbInput.contact_name = input.contactName;
        if (input.contactPhone !== undefined) dbInput.contact_phone = input.contactPhone;
        if (input.isActive !== undefined) dbInput.is_active = input.isActive;

        const { data, error } = await supabaseAdmin
            .from('sites')
            .update(dbInput)
            .eq('id', siteId)
            .eq('company_id', companyId)
            .select()
            .single();

        if (error) {
            logger.error('Error updating site:', error);
            throw new Error('Failed to update site');
        }

        return this.mapToSite(data);
    }

    async deleteSite(siteId: string, companyId: string): Promise<void> {
        const { error } = await supabaseAdmin
            .from('sites')
            .delete()
            .eq('id', siteId)
            .eq('company_id', companyId);

        if (error) {
            logger.error('Error deleting site:', error);
            throw new Error('Failed to delete site');
        }
    }

    // Zones
    async createZone(companyId: string, input: CreateZoneInput): Promise<Zone> {
        // Verify site belongs to company
        await this.getSiteById(input.siteId, companyId);

        const dbInput = {
            company_id: companyId,
            site_id: input.siteId,
            name: input.name,
            code: input.code,
            description: input.description,
            qr_code: input.qrCode
        };

        const { data, error } = await supabaseAdmin
            .from('zones')
            .insert(dbInput)
            .select()
            .single();

        if (error) {
            logger.error('Error creating zone:', error);
            throw new Error('Failed to create zone');
        }

        return this.mapToZone(data);
    }

    async updateZone(zoneId: string, companyId: string, input: UpdateZoneInput): Promise<Zone> {
        const dbInput: any = {
            updated_at: new Date().toISOString()
        };

        if (input.name !== undefined) dbInput.name = input.name;
        if (input.code !== undefined) dbInput.code = input.code;
        if (input.description !== undefined) dbInput.description = input.description;
        if (input.qrCode !== undefined) dbInput.qr_code = input.qrCode;
        if (input.isActive !== undefined) dbInput.is_active = input.isActive;

        const { data, error } = await supabaseAdmin
            .from('zones')
            .update(dbInput)
            .eq('id', zoneId)
            .eq('company_id', companyId)
            .select()
            .single();

        if (error) {
            logger.error('Error updating zone:', error);
            throw new Error('Failed to update zone');
        }

        return this.mapToZone(data);
    }

    async deleteZone(zoneId: string, companyId: string): Promise<void> {
        const { error } = await supabaseAdmin
            .from('zones')
            .delete()
            .eq('id', zoneId)
            .eq('company_id', companyId);

        if (error) {
            logger.error('Error deleting zone:', error);
            throw new Error('Failed to delete zone');
        }
    }
}

export const sitesService = new SitesService();
