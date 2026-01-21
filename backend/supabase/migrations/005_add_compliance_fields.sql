-- ============================================================
-- Security Guard HRM SaaS - Regulatory Compliance Fields
-- Version: 1.2.0
-- Adds Tor Phor 2 (Company) and Tor Phor 7 (Employee) fields
-- ============================================================

-- ============================================================
-- UPDATE: employment_status ENUM
-- ============================================================
-- Add 'suspended' status for when license expires
ALTER TYPE employment_status ADD VALUE IF NOT EXISTS 'suspended';

-- ============================================================
-- UPDATE: companies (Tor Phor 2 License)
-- ============================================================
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS license_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS license_issued_at DATE,
ADD COLUMN IF NOT EXISTS license_expires_at DATE;

-- ============================================================
-- UPDATE: employees (Tor Phor 7 License)
-- ============================================================
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS license_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS license_issued_at DATE,
ADD COLUMN IF NOT EXISTS license_expires_at DATE;

-- Create index for checking expiry
CREATE INDEX IF NOT EXISTS idx_employees_license_expiry ON employees(company_id, license_expires_at);
CREATE INDEX IF NOT EXISTS idx_companies_license_expiry ON companies(license_expires_at);

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 005 applied: Compliance fields added.';
END $$;
