-- Migration: 009_add_session_management.sql

-- ============================================
-- User Sessions Table
-- ============================================
-- Tracks all active sessions per user across devices
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Token tracking (store hash, never plaintext)
    refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
    
    -- Device/Client identification
    device_name VARCHAR(255),                    -- e.g., "Chrome on Windows", "LINE App"
    device_type VARCHAR(50) NOT NULL DEFAULT 'web',  -- 'web', 'mobile', 'tablet', 'liff'
    user_agent TEXT,
    ip_address INET,
    
    -- Session metadata
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Revocation (NULL = active, timestamp = revoked)
    revoked_at TIMESTAMPTZ,
    revoked_reason VARCHAR(100),                 -- 'user_logout', 'remote_logout', 'password_change', 'admin_revoke'
    
    -- Indexes for performance
    CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_session_company FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Index for finding active sessions by user
CREATE INDEX idx_sessions_user_active ON user_sessions(user_id, revoked_at) 
    WHERE revoked_at IS NULL;

-- Index for refresh token lookup (critical for token validation)
CREATE INDEX idx_sessions_refresh_token ON user_sessions(refresh_token_hash) 
    WHERE revoked_at IS NULL;

-- Index for cleanup job (expired sessions)
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- Index for company-wide session management
CREATE INDEX idx_sessions_company ON user_sessions(company_id, revoked_at) 
    WHERE revoked_at IS NULL;

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view own sessions"
ON user_sessions FOR SELECT
USING (user_id = auth.uid() OR public.is_super_admin());

-- Users can only delete (revoke) their own sessions
CREATE POLICY "Users can revoke own sessions"
ON user_sessions FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Company admins can view all sessions in their company
CREATE POLICY "Company admins can view company sessions"
ON user_sessions FOR SELECT
USING (
    company_id = public.get_current_company_id() 
    AND public.get_current_user_role() IN ('super_admin', 'company_admin')
);
