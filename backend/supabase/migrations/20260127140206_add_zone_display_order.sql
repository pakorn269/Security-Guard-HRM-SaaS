-- Add display_order column to zones table
ALTER TABLE zones ADD COLUMN display_order INTEGER;

-- Update existing zones to have sequential display_order based on created_at
-- This ensures existing zones maintain their current order
WITH ranked_zones AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY site_id ORDER BY created_at ASC) as row_num
  FROM zones
)
UPDATE zones
SET display_order = ranked_zones.row_num
FROM ranked_zones
WHERE zones.id = ranked_zones.id;

-- Add comment
COMMENT ON COLUMN zones.display_order IS 'Display order for zones within a site. Lower numbers appear first.';
