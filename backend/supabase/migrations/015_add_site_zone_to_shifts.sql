-- Migration: Add zone_id to shifts table
-- Purpose: Link shifts to specific zones/checkpoints within sites
-- Date: 2026-01-25
-- Note: site_id was already added in migration 002_add_sites.sql

-- Add zone_id column to shifts table
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES zones(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_shifts_zone_id ON shifts(zone_id);

-- Add comments for documentation
COMMENT ON COLUMN shifts.site_id IS 'Reference to the site where this shift takes place';
COMMENT ON COLUMN shifts.zone_id IS 'Reference to the specific zone/checkpoint within the site';

-- Note: location field remains as fallback for custom locations not in sites table
