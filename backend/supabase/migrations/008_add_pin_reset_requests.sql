-- ============================================================
-- Migration: Add PIN Reset Requests table
-- Version: 008
-- Purpose: Support hybrid PIN reset flow (guard requests, admin approves)
-- ============================================================

-- Create enum for request status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pin_reset_request_status') THEN
        CREATE TYPE pin_reset_request_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END$$;

-- Create pin_reset_requests table
CREATE TABLE IF NOT EXISTS pin_reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    status pin_reset_request_status DEFAULT 'pending' NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fast lookup of pending requests by company
CREATE INDEX IF NOT EXISTS idx_pin_reset_requests_company_status 
    ON pin_reset_requests(company_id, status) 
    WHERE status = 'pending';

-- Index for lookup by employee
CREATE INDEX IF NOT EXISTS idx_pin_reset_requests_employee
    ON pin_reset_requests(employee_id);

-- 1. Add PIN and LINE fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pin_set_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pin_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS line_user_id VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS line_display_name VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS line_picture_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS line_linked_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reset_code VARCHAR(10) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reset_code_expires_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create the pin_reset_requests table
CREATE TABLE IF NOT EXISTS pin_reset_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    STATUS VARCHAR(20) NOT NULL CHECK (STATUS IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pin_reset_requests_company_id ON pin_reset_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_pin_reset_requests_status ON pin_reset_requests(STATUS);
-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 008 completed: Added pin_reset_requests table';
END $$;
