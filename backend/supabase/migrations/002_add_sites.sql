-- ============================================================
-- Security Guard HRM SaaS - Add Sites and Zones
-- Version: 1.1.0
-- ============================================================

-- ============================================================
-- TABLE: sites
-- ============================================================
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    radius INTEGER DEFAULT 100, -- Geofence radius in meters
    contact_name VARCHAR(255),
    contact_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sites_company ON sites(company_id);
CREATE INDEX idx_sites_active ON sites(company_id, is_active);

-- ============================================================
-- TABLE: zones (Checkpoints within a site)
-- ============================================================
CREATE TABLE IF NOT EXISTS zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50), -- e.g., Z-001
    description TEXT,
    qr_code VARCHAR(255), -- Value stored in QR code
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_zones_site ON zones(site_id);
CREATE INDEX idx_zones_company ON zones(company_id);

-- ============================================================
-- UPDATE: employees (Add primary site assignment)
-- ============================================================
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS primary_site_id UUID REFERENCES sites(id) ON DELETE SET NULL;

CREATE INDEX idx_employees_site ON employees(primary_site_id);

-- ============================================================
-- UPDATE: shifts (Link shifts to sites)
-- ============================================================
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE SET NULL;

CREATE INDEX idx_shifts_site ON shifts(site_id);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON zones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 002 applied: Sites and Zones tables created.';
END $$;
