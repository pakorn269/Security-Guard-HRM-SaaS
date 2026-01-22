-- ============================================================
-- Migration: Add PIN login support
-- Version: 006
-- Purpose: Add fields for PIN login and security
-- ============================================================

-- Add PIN security fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS pin_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pin_set_at TIMESTAMPTZ;

-- Add index for fast phone lookup in employees table
-- This supports finding the employee/user by company_slug + phone
CREATE INDEX IF NOT EXISTS idx_employees_company_phone ON employees(company_id, phone);

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 006 completed: Added PIN login support fields and indexes';
END $$;
