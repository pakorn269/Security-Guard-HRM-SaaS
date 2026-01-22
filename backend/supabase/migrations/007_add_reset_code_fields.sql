-- ============================================================
-- Migration: Add Reset Code fields to users table
-- Version: 007
-- Purpose: Support Forgot PIN flow with secure code storage
-- ============================================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_code_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_code_expires_at TIMESTAMPTZ;

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 007 completed: Added reset_code fields to users table';
END $$;
