import { supabaseAdmin } from '../../config/supabase.js';
import { NotFoundError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';
import { calculateDistance } from '../attendance/attendance.utils.js';
import type {
    Site,
    Zone,
    SiteWithZones,
    CreateSiteInput,
    UpdateSiteInput,
    CreateZoneInput,
    UpdateZoneInput,
    SiteQueryParams,
    PaginatedSitesResponse,
    ZoneOrderItem,
    GeofenceValidationResult,
    ZoneValidationResult,
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
            displayOrder: row.display_order,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    async listSites(companyId: string, params: SiteQueryParams = {}): Promise<PaginatedSitesResponse> {
        const {
            page = 1,
            pageSize = 10,
            sortBy = 'name',
            sortOrder = 'asc',
            search = '',
            status = 'all'
        } = params;

        // Build base query
        let query = supabaseAdmin
            .from('sites')
            .select(`
                *,
                zones!inner (*)
            `, { count: 'exact' })
            .eq('company_id', companyId)
            .order('display_order', { foreignTable: 'zones', ascending: true, nullsFirst: false });

        // Apply search filter
        if (search && search.trim()) {
            query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
        }

        // Apply status filter
        if (status === 'active') {
            query = query.eq('is_active', true);
        } else if (status === 'inactive') {
            query = query.eq('is_active', false);
        }

        // Apply sorting
        const sortColumn = sortBy === 'status' ? 'is_active' : sortBy;
        query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

        // Get total count before pagination
        const { count, error: countError } = await query;
        if (countError) {
            logger.error('Error counting sites:', countError);
            throw new Error('Failed to count sites');
        }

        // Apply pagination
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data, error } = await query;

        if (error) {
            logger.error('Error listing sites:', error);
            throw new Error('Failed to list sites');
        }

        const sites = data.map((site: any) => ({
            ...this.mapToSite(site),
            zones: (site.zones || []).map((z: any) => this.mapToZone(z)),
        }));

        return {
            data: sites,
            meta: {
                total: count || 0,
                page,
                pageSize,
                totalPages: Math.ceil((count || 0) / pageSize),
            },
        };
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
            .order('display_order', { foreignTable: 'zones', ascending: true, nullsFirst: false })
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

        // Get count of existing zones for this site (used for both code and display_order)
        const { count, error: countError } = await supabaseAdmin
            .from('zones')
            .select('*', { count: 'exact', head: true })
            .eq('site_id', input.siteId);

        if (countError) {
            logger.error('Error counting zones:', countError);
            throw new Error('Failed to count zones');
        }

        const nextNumber = (count || 0) + 1;

        // Auto-generate zone code if not provided
        let zoneCode = input.code;
        if (!zoneCode || zoneCode.trim() === '') {
            // Generate code in format Z-001, Z-002, etc.
            zoneCode = `Z-${nextNumber.toString().padStart(3, '0')}`;
            logger.info(`Auto-generated zone code: ${zoneCode} for site ${input.siteId}`);
        }

        const dbInput = {
            company_id: companyId,
            site_id: input.siteId,
            name: input.name,
            code: zoneCode,
            description: input.description,
            qr_code: input.qrCode,
            display_order: nextNumber
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
        if (input.displayOrder !== undefined) dbInput.display_order = input.displayOrder;

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

    async updateZoneOrder(companyId: string, siteId: string, zones: ZoneOrderItem[]): Promise<void> {
        // Verify site belongs to company
        await this.getSiteById(siteId, companyId);

        // Verify all zones belong to the site and company
        const { data: existingZones, error: fetchError } = await supabaseAdmin
            .from('zones')
            .select('id')
            .eq('site_id', siteId)
            .eq('company_id', companyId);

        if (fetchError) {
            logger.error('Error fetching zones for order update:', fetchError);
            throw new Error('Failed to verify zones');
        }

        const existingZoneIds = new Set(existingZones.map(z => z.id));
        const invalidZones = zones.filter(z => !existingZoneIds.has(z.id));

        if (invalidZones.length > 0) {
            throw new Error('Invalid zone IDs provided');
        }

        // Update each zone's display_order in a transaction-like manner
        // Supabase doesn't support traditional transactions, so we update one by one
        const updatePromises = zones.map(zone =>
            supabaseAdmin
                .from('zones')
                .update({
                    display_order: zone.displayOrder,
                    updated_at: new Date().toISOString()
                })
                .eq('id', zone.id)
                .eq('company_id', companyId)
        );

        const results = await Promise.all(updatePromises);

        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
            logger.error('Error updating zone order:', errors);
            throw new Error('Failed to update zone order');
        }

        logger.info(`Updated order for ${zones.length} zones in site ${siteId}`);
    }

    // Attendance Validation Methods

    /**
     * Validate if user is within the geofence of a site
     * @param siteId - The ID of the site to validate against
     * @param companyId - The company ID for security
     * @param userLat - User's current latitude
     * @param userLng - User's current longitude
     * @returns GeofenceValidationResult with isInside flag and distance
     */
    async validateGeofence(
        siteId: string,
        companyId: string,
        userLat: number,
        userLng: number
    ): Promise<GeofenceValidationResult> {
        // Fetch only the necessary fields for validation
        const { data: site, error } = await supabaseAdmin
            .from('sites')
            .select('id, name, latitude, longitude, radius, is_active')
            .eq('id', siteId)
            .eq('company_id', companyId)
            .single();

        if (error || !site) {
            throw new NotFoundError('Site', 'Site not found or does not belong to your company');
        }

        if (!site.is_active) {
            throw new Error('Site is not active');
        }

        // Check if site has geolocation configured
        if (site.latitude === null || site.longitude === null) {
            throw new Error('Site does not have geolocation configured');
        }

        // Calculate distance using Haversine formula
        const distance = calculateDistance(
            site.latitude,
            site.longitude,
            userLat,
            userLng
        );

        // Check if user is within the geofence radius
        const isInside = distance <= site.radius;

        logger.info(
            `Geofence validation for site ${siteId}: distance=${distance}m, radius=${site.radius}m, isInside=${isInside}`
        );

        return {
            isInside,
            distance,
            siteId: site.id,
            siteName: site.name,
        };
    }

    /**
     * Validate a Zone QR code and return zone information
     * @param qrCodeString - The QR code string to validate
     * @param companyId - The company ID for security
     * @returns ZoneValidationResult with zone and site information
     */
    async validateZoneQr(
        qrCodeString: string,
        companyId: string
    ): Promise<ZoneValidationResult> {
        // Query the zone by QR code
        const { data: zone, error } = await supabaseAdmin
            .from('zones')
            .select(`
                *,
                sites!inner (
                    id,
                    name,
                    is_active
                )
            `)
            .eq('qr_code', qrCodeString)
            .eq('company_id', companyId)
            .single();

        if (error || !zone) {
            logger.warn(`Invalid QR code attempted: ${qrCodeString}`);
            throw new NotFoundError('Zone', 'Invalid QR Code');
        }

        // Check if zone is active
        if (!zone.is_active) {
            throw new Error('Zone is not active');
        }

        // Check if site is active
        if (!zone.sites.is_active) {
            throw new Error('Site is not active');
        }

        logger.info(`QR code validated successfully for zone ${zone.id} at site ${zone.sites.id}`);

        // Map to proper Zone type and return result
        const mappedZone = this.mapToZone(zone);

        return {
            zone: mappedZone,
            site: {
                id: zone.sites.id,
                name: zone.sites.name,
            },
        };
    }
}

export const sitesService = new SitesService();
