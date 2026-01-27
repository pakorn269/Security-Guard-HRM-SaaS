-- Add site_id and zone_id to attendance_logs for site-based clock-in
ALTER TABLE attendance_logs ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE SET NULL;
ALTER TABLE attendance_logs ADD COLUMN zone_id UUID REFERENCES zones(id) ON DELETE SET NULL;
ALTER TABLE attendance_logs ADD COLUMN check_in_method VARCHAR(10) CHECK (check_in_method IN ('GPS', 'QR'));

-- Add indexes for site and zone queries
CREATE INDEX idx_attendance_site ON attendance_logs(site_id);
CREATE INDEX idx_attendance_zone ON attendance_logs(zone_id);

-- Add comments
COMMENT ON COLUMN attendance_logs.site_id IS 'Site where the clock-in occurred';
COMMENT ON COLUMN attendance_logs.zone_id IS 'Specific zone (if QR code was used)';
COMMENT ON COLUMN attendance_logs.check_in_method IS 'Method used for clock-in: GPS or QR';
