-- ============================================================
-- Migration: Enhanced LINE Account Integration
-- Version: 012
-- Purpose: Add link status tracking, session management, and audit logging
-- Features: Strict access control, force unlink, unlink requests
-- ============================================================

BEGIN;

-- ============================================================
-- SECTION 1: Enhance users table with LINE link status
-- ============================================================

-- Add line_link_status enum check
DO $$ BEGIN
    -- Drop existing constraint if it exists
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_line_link_status_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS
    line_link_status VARCHAR(20) DEFAULT 'unlinked';

-- Add constraint after column is created
ALTER TABLE users ADD CONSTRAINT users_line_link_status_check
    CHECK (line_link_status IN ('unlinked', 'pending', 'linked', 'force_unlinked'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS line_linked_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS line_unlinked_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS line_unlinked_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS line_unlink_reason TEXT;

-- Create index for line_link_status
CREATE INDEX IF NOT EXISTS idx_users_line_link_status
    ON users(line_link_status)
    WHERE line_link_status != 'unlinked';

-- Comment columns for documentation
COMMENT ON COLUMN users.line_link_status IS 'LINE account linkage status: unlinked (default), pending (awaiting approval), linked (active), force_unlinked (admin revoked)';
COMMENT ON COLUMN users.line_linked_at IS 'Timestamp when LINE account was approved and linked';
COMMENT ON COLUMN users.line_unlinked_at IS 'Timestamp when LINE account was unlinked';
COMMENT ON COLUMN users.line_unlinked_by IS 'Admin user who performed force unlink';
COMMENT ON COLUMN users.line_unlink_reason IS 'Reason for unlinking (for audit trail)';

-- ============================================================
-- SECTION 2: Enhance line_link_requests table with unlink support
-- ============================================================

-- Add request_type to support both link and unlink requests
ALTER TABLE line_link_requests ADD COLUMN IF NOT EXISTS
    request_type VARCHAR(20) DEFAULT 'link';

-- Drop existing constraint if it exists
DO $$ BEGIN
    ALTER TABLE line_link_requests DROP CONSTRAINT IF EXISTS line_link_requests_request_type_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Add constraint
ALTER TABLE line_link_requests ADD CONSTRAINT line_link_requests_request_type_check
    CHECK (request_type IN ('link', 'unlink'));

-- Add unlink_reason column
ALTER TABLE line_link_requests ADD COLUMN IF NOT EXISTS unlink_reason TEXT;

-- Make entered_phone and entered_employee_code nullable (not needed for unlink requests)
ALTER TABLE line_link_requests ALTER COLUMN entered_phone DROP NOT NULL;
ALTER TABLE line_link_requests ALTER COLUMN entered_employee_code DROP NOT NULL;

-- Create index for request_type queries
CREATE INDEX IF NOT EXISTS idx_line_link_requests_type
    ON line_link_requests(request_type, status, company_id);

-- Comment columns
COMMENT ON COLUMN line_link_requests.request_type IS 'Type of request: link (new linkage) or unlink (guard-initiated unlink request)';
COMMENT ON COLUMN line_link_requests.unlink_reason IS 'User-provided reason for unlink request (only for unlink type)';

-- ============================================================
-- SECTION 3: Create line_session_tokens table
-- Purpose: Track active LINE LIFF sessions for immediate revocation
-- ============================================================

CREATE TABLE IF NOT EXISTS line_session_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User references
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    line_user_id VARCHAR(255) NOT NULL,

    -- Session tokens (hashed for security)
    access_token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    liff_session_id VARCHAR(255),

    -- Device/browser fingerprint for security
    user_agent TEXT,
    ip_address INET,

    -- Session lifecycle
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    revoke_reason TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_expiry CHECK (expires_at > issued_at),
    CONSTRAINT revoked_has_reason CHECK (
        (revoked_at IS NULL AND revoke_reason IS NULL) OR
        (revoked_at IS NOT NULL)
    )
);

-- Indices for performance
CREATE INDEX idx_line_sessions_user
    ON line_session_tokens(user_id, is_active);

CREATE INDEX idx_line_sessions_line_user
    ON line_session_tokens(line_user_id);

CREATE INDEX idx_line_sessions_active
    ON line_session_tokens(is_active, expires_at)
    WHERE is_active = true;

CREATE INDEX idx_line_sessions_company
    ON line_session_tokens(company_id, created_at DESC);

-- Comment table
COMMENT ON TABLE line_session_tokens IS 'Tracks active LINE LIFF sessions for immediate revocation on force unlink';
COMMENT ON COLUMN line_session_tokens.access_token_hash IS 'SHA256 hash of JWT access token';
COMMENT ON COLUMN line_session_tokens.refresh_token_hash IS 'SHA256 hash of refresh token';
COMMENT ON COLUMN line_session_tokens.user_agent IS 'Browser user agent for session fingerprinting';
COMMENT ON COLUMN line_session_tokens.ip_address IS 'IP address for session fingerprinting and audit';

-- ============================================================
-- SECTION 4: Create line_audit_log table
-- Purpose: Immutable audit trail for all LINE operations
-- ============================================================

-- Create audit action enum
DO $$ BEGIN
    CREATE TYPE line_audit_action AS ENUM (
        'link_request_created',
        'link_request_approved',
        'link_request_rejected',
        'link_request_expired',
        'unlink_request_created',
        'unlink_request_approved',
        'unlink_request_rejected',
        'force_unlink_executed',
        'session_revoked',
        'auto_link_matched',
        'manual_relink'
    );
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Type line_audit_action already exists, skipping';
END $$;

-- Create audit log table
CREATE TABLE IF NOT EXISTS line_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Company context
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Actor (who performed the action)
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role VARCHAR(20),
    actor_name VARCHAR(255),

    -- Target (who was affected)
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    target_line_user_id VARCHAR(255),

    -- Action details
    action line_audit_action NOT NULL,
    request_id UUID REFERENCES line_link_requests(id) ON DELETE SET NULL,

    -- Context metadata (flexible JSON for future extensibility)
    metadata JSONB DEFAULT '{}',

    -- Request context for forensics
    ip_address INET,
    user_agent TEXT,

    -- Immutable timestamp
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indices for audit queries
CREATE INDEX idx_line_audit_company
    ON line_audit_log(company_id, created_at DESC);

CREATE INDEX idx_line_audit_target_user
    ON line_audit_log(target_user_id, created_at DESC)
    WHERE target_user_id IS NOT NULL;

CREATE INDEX idx_line_audit_actor
    ON line_audit_log(actor_user_id, created_at DESC)
    WHERE actor_user_id IS NOT NULL;

CREATE INDEX idx_line_audit_action
    ON line_audit_log(action, company_id, created_at DESC);

CREATE INDEX idx_line_audit_request
    ON line_audit_log(request_id)
    WHERE request_id IS NOT NULL;

-- GIN index for metadata JSONB queries
CREATE INDEX idx_line_audit_metadata
    ON line_audit_log USING gin(metadata);

-- Comment table
COMMENT ON TABLE line_audit_log IS 'Immutable audit trail for all LINE account operations (link, unlink, force unlink, session revocation)';
COMMENT ON COLUMN line_audit_log.metadata IS 'Flexible JSON field for storing action-specific context (e.g., reason, affected sessions count, auto-approval flags)';
COMMENT ON COLUMN line_audit_log.created_at IS 'Immutable timestamp - audit logs cannot be modified or deleted';

-- ============================================================
-- SECTION 5: Migrate existing data
-- Purpose: Set line_link_status for existing linked users
-- ============================================================

-- Update existing users who have LINE linked
UPDATE users
SET
    line_link_status = 'linked',
    line_linked_at = COALESCE(line_linked_at, created_at)
WHERE line_user_id IS NOT NULL
  AND line_link_status = 'unlinked';

-- Create audit log entries for existing linked users
INSERT INTO line_audit_log (
    company_id,
    target_user_id,
    target_employee_id,
    target_line_user_id,
    action,
    metadata,
    created_at
)
SELECT
    company_id,
    id,
    employee_id,
    line_user_id,
    'auto_link_matched'::line_audit_action,
    jsonb_build_object(
        'migration', true,
        'note', 'Existing linked user migrated from migration 012'
    ),
    COALESCE(line_linked_at, created_at)
FROM users
WHERE line_user_id IS NOT NULL
  AND line_link_status = 'linked';

-- ============================================================
-- SECTION 6: Add trigger for updated_at on line_session_tokens
-- ============================================================

-- Reuse existing trigger function
DROP TRIGGER IF EXISTS update_line_session_tokens_updated_at ON line_session_tokens;

-- Note: We don't have updated_at column on line_session_tokens
-- Sessions are immutable once created, only revoked_at changes
-- No trigger needed

COMMIT;

-- ============================================================
-- Success message
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✅ Migration 012 completed successfully!';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Enhanced LINE Account Integration:';
    RAISE NOTICE '  ✓ Added line_link_status to users table';
    RAISE NOTICE '  ✓ Enhanced line_link_requests with unlink support';
    RAISE NOTICE '  ✓ Created line_session_tokens table';
    RAISE NOTICE '  ✓ Created line_audit_log table with audit actions';
    RAISE NOTICE '  ✓ Migrated % existing linked users', (
        SELECT COUNT(*) FROM users WHERE line_link_status = 'linked'
    );
    RAISE NOTICE '============================================================';
END $$;
