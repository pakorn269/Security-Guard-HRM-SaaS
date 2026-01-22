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

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 008 completed: Added pin_reset_requests table';
END $$;
