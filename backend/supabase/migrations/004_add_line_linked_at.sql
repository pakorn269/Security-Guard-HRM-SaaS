-- ============================================================
-- Migration: Add line_linked_at column to users table
-- Version: 004
-- Purpose: Track when a user linked their LINE account
-- ============================================================

-- Add line_linked_at column to track when LINE account was linked
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS line_linked_at TIMESTAMPTZ;

-- Update existing linked users to have a linked_at timestamp
-- (Uses updated_at as a reasonable approximation for existing data)
UPDATE users 
SET line_linked_at = updated_at 
WHERE line_user_id IS NOT NULL AND line_linked_at IS NULL;

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 004 completed: Added line_linked_at column to users table';
END $$;
