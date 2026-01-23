-- ============================================================
-- Migration: Add LINE Link Requests Table
-- Purpose: Track and manage LINE account linking requests
-- Flow: Employee Code + Phone matching with auto-link or admin approval
-- ============================================================

-- Link request status enum
DO $$ BEGIN
    CREATE TYPE line_link_request_status AS ENUM (
        'pending',      -- Waiting for admin approval
        'approved',     -- Admin approved, linked
        'rejected',     -- Admin rejected
        'expired',      -- Request expired (after 7 days)
        'cancelled'     -- User cancelled
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- TABLE: line_link_requests
-- Tracks requests to link LINE accounts to employees
-- ============================================================
CREATE TABLE IF NOT EXISTS line_link_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- LINE user info (from LINE login)
    line_user_id VARCHAR(255) NOT NULL,
    line_display_name VARCHAR(255),
    line_picture_url TEXT,
    
    -- Target employee
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Verification data (what user entered)
    entered_phone VARCHAR(20) NOT NULL,
    entered_employee_code VARCHAR(50) NOT NULL,
    
    -- Match results
    phone_matched BOOLEAN DEFAULT false,
    code_matched BOOLEAN DEFAULT false,
    auto_approved BOOLEAN DEFAULT false,
    
    -- Status tracking
    status line_link_request_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    -- Timestamps
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_line_link_requests_company 
    ON line_link_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_line_link_requests_employee 
    ON line_link_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_line_link_requests_line_user 
    ON line_link_requests(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_link_requests_status 
    ON line_link_requests(status);

-- Unique constraint: Only one pending request per LINE user per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_line_link_requests_unique_pending
    ON line_link_requests(line_user_id, company_id) 
    WHERE status = 'pending';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_line_link_requests_updated_at ON line_link_requests;
CREATE TRIGGER update_line_link_requests_updated_at 
    BEFORE UPDATE ON line_link_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Add phone index on employees for faster matching
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees(phone);
CREATE INDEX IF NOT EXISTS idx_employees_code_phone ON employees(employee_code, phone);

-- ============================================================
-- Success message
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 011 completed: line_link_requests table created';
END $$;
