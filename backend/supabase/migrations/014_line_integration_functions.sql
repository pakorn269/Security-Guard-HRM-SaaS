-- ============================================================
-- Migration: Postgres Functions for LINE Account Integration
-- Version: 014
-- Purpose: Atomic operations for link approval, force unlink, session management
-- Security: ACID compliance, audit logging, session revocation
-- ============================================================

BEGIN;

-- ============================================================
-- HELPER FUNCTION: Create audit log entry
-- ============================================================

CREATE OR REPLACE FUNCTION create_line_audit_log(
    p_company_id UUID,
    p_actor_user_id UUID,
    p_target_user_id UUID,
    p_target_employee_id UUID,
    p_target_line_user_id VARCHAR(255),
    p_action line_audit_action,
    p_request_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
    v_actor_role VARCHAR(20);
    v_actor_name VARCHAR(255);
BEGIN
    -- Get actor details if provided
    IF p_actor_user_id IS NOT NULL THEN
        SELECT role, COALESCE(line_display_name, email)
        INTO v_actor_role, v_actor_name
        FROM users
        WHERE id = p_actor_user_id;
    END IF;

    -- Insert audit log
    INSERT INTO line_audit_log (
        company_id,
        actor_user_id,
        actor_role,
        actor_name,
        target_user_id,
        target_employee_id,
        target_line_user_id,
        action,
        request_id,
        metadata,
        ip_address,
        user_agent
    ) VALUES (
        p_company_id,
        p_actor_user_id,
        v_actor_role,
        v_actor_name,
        p_target_user_id,
        p_target_employee_id,
        p_target_line_user_id,
        p_action,
        p_request_id,
        p_metadata,
        p_ip_address,
        p_user_agent
    )
    RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_line_audit_log IS 'Helper function to create audit log entries for LINE operations';

-- ============================================================
-- FUNCTION: Approve LINE link request
-- Purpose: Atomically approve a link request and create/update user account
-- ============================================================

CREATE OR REPLACE FUNCTION approve_line_link_request(
    p_request_id UUID,
    p_admin_user_id UUID,
    p_review_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_request RECORD;
    v_user_id UUID;
    v_existing_user RECORD;
    v_audit_id UUID;
    v_result JSON;
BEGIN
    -- Lock the request row to prevent concurrent processing
    SELECT * INTO v_request
    FROM line_link_requests
    WHERE id = p_request_id
    FOR UPDATE;

    -- Validate request exists and is pending
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Link request not found';
    END IF;

    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Request already processed with status: %', v_request.status;
    END IF;

    -- Only allow link requests (not unlink)
    IF v_request.request_type != 'link' THEN
        RAISE EXCEPTION 'This function only handles link requests. Use approve_unlink_request for unlink requests.';
    END IF;

    -- Check if employee already has a user account
    SELECT user_id INTO v_user_id
    FROM employees
    WHERE id = v_request.employee_id;

    -- Check if another LINE account is already linked
    IF v_user_id IS NOT NULL THEN
        SELECT * INTO v_existing_user
        FROM users
        WHERE id = v_user_id;

        IF v_existing_user.line_user_id IS NOT NULL
           AND v_existing_user.line_user_id != v_request.line_user_id THEN
            RAISE EXCEPTION 'Employee is already linked to a different LINE account: %',
                v_existing_user.line_user_id;
        END IF;
    END IF;

    -- Create or update user account
    IF v_user_id IS NULL THEN
        -- Create new user account for the employee
        INSERT INTO users (
            company_id,
            employee_id,
            email,
            role,
            line_user_id,
            line_display_name,
            line_picture_url,
            line_link_status,
            line_linked_at,
            is_active,
            language
        )
        SELECT
            v_request.company_id,
            v_request.employee_id,
            COALESCE(e.email, v_request.line_user_id || '@line.local'),
            'guard',
            v_request.line_user_id,
            v_request.line_display_name,
            v_request.line_picture_url,
            'linked',
            NOW(),
            true,
            'th'
        FROM employees e
        WHERE e.id = v_request.employee_id
        RETURNING id INTO v_user_id;

        -- Update employee with user_id
        UPDATE employees
        SET user_id = v_user_id,
            updated_at = NOW()
        WHERE id = v_request.employee_id;
    ELSE
        -- Update existing user with LINE information
        UPDATE users
        SET
            line_user_id = v_request.line_user_id,
            line_display_name = v_request.line_display_name,
            line_picture_url = v_request.line_picture_url,
            line_link_status = 'linked',
            line_linked_at = NOW(),
            line_unlinked_at = NULL,
            line_unlinked_by = NULL,
            line_unlink_reason = NULL,
            is_active = true,
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    -- Update request status
    UPDATE line_link_requests
    SET
        status = 'approved',
        reviewed_by = p_admin_user_id,
        reviewed_at = NOW(),
        review_notes = p_review_notes,
        updated_at = NOW()
    WHERE id = p_request_id;

    -- Create audit log
    v_audit_id := create_line_audit_log(
        p_company_id := v_request.company_id,
        p_actor_user_id := p_admin_user_id,
        p_target_user_id := v_user_id,
        p_target_employee_id := v_request.employee_id,
        p_target_line_user_id := v_request.line_user_id,
        p_action := 'link_request_approved',
        p_request_id := p_request_id,
        p_metadata := jsonb_build_object(
            'review_notes', p_review_notes,
            'phone_matched', v_request.phone_matched,
            'code_matched', v_request.code_matched,
            'auto_approved', v_request.auto_approved
        )
    );

    -- Build result
    v_result := json_build_object(
        'success', true,
        'user_id', v_user_id,
        'request_id', p_request_id,
        'audit_id', v_audit_id
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_line_link_request IS 'Atomically approve a LINE link request and create/update user account with audit logging';

-- ============================================================
-- FUNCTION: Reject LINE link request
-- ============================================================

CREATE OR REPLACE FUNCTION reject_line_link_request(
    p_request_id UUID,
    p_admin_user_id UUID,
    p_review_notes TEXT
)
RETURNS JSON AS $$
DECLARE
    v_request RECORD;
    v_audit_id UUID;
BEGIN
    -- Lock the request row
    SELECT * INTO v_request
    FROM line_link_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Link request not found';
    END IF;

    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Request already processed with status: %', v_request.status;
    END IF;

    -- Update request status
    UPDATE line_link_requests
    SET
        status = 'rejected',
        reviewed_by = p_admin_user_id,
        reviewed_at = NOW(),
        review_notes = p_review_notes,
        updated_at = NOW()
    WHERE id = p_request_id;

    -- Create audit log
    v_audit_id := create_line_audit_log(
        p_company_id := v_request.company_id,
        p_actor_user_id := p_admin_user_id,
        p_target_user_id := NULL,
        p_target_employee_id := v_request.employee_id,
        p_target_line_user_id := v_request.line_user_id,
        p_action := 'link_request_rejected',
        p_request_id := p_request_id,
        p_metadata := jsonb_build_object('review_notes', p_review_notes)
    );

    RETURN json_build_object(
        'success', true,
        'request_id', p_request_id,
        'audit_id', v_audit_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reject_line_link_request IS 'Reject a LINE link request with audit logging';

-- ============================================================
-- FUNCTION: Force unlink LINE account (Admin only)
-- Purpose: Immediately unlink LINE account and revoke all active sessions
-- ============================================================

CREATE OR REPLACE FUNCTION force_unlink_line_account(
    p_target_user_id UUID,
    p_admin_user_id UUID,
    p_reason TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_revoked_sessions INTEGER;
    v_audit_id UUID;
BEGIN
    -- Lock user row to prevent concurrent modifications
    SELECT * INTO v_user
    FROM users
    WHERE id = p_target_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    IF v_user.line_link_status NOT IN ('linked', 'pending') THEN
        RAISE EXCEPTION 'User LINE account is already unlinked (status: %)', v_user.line_link_status;
    END IF;

    -- Update user - mark as force_unlinked
    UPDATE users
    SET
        line_link_status = 'force_unlinked',
        line_unlinked_at = NOW(),
        line_unlinked_by = p_admin_user_id,
        line_unlink_reason = p_reason,
        -- Deactivate guard accounts, keep admin accounts active
        is_active = CASE WHEN role = 'guard' THEN false ELSE is_active END,
        updated_at = NOW()
    WHERE id = p_target_user_id;

    -- Revoke all active sessions for this user
    UPDATE line_session_tokens
    SET
        is_active = false,
        revoked_at = NOW(),
        revoked_by = p_admin_user_id,
        revoke_reason = 'Force unlink by admin: ' || p_reason
    WHERE user_id = p_target_user_id
      AND is_active = true;

    GET DIAGNOSTICS v_revoked_sessions = ROW_COUNT;

    -- Create audit log
    v_audit_id := create_line_audit_log(
        p_company_id := v_user.company_id,
        p_actor_user_id := p_admin_user_id,
        p_target_user_id := p_target_user_id,
        p_target_employee_id := v_user.employee_id,
        p_target_line_user_id := v_user.line_user_id,
        p_action := 'force_unlink_executed',
        p_request_id := NULL,
        p_metadata := jsonb_build_object(
            'reason', p_reason,
            'revoked_sessions', v_revoked_sessions,
            'previous_status', v_user.line_link_status
        ),
        p_ip_address := p_ip_address,
        p_user_agent := p_user_agent
    );

    RETURN json_build_object(
        'success', true,
        'revoked_sessions', v_revoked_sessions,
        'audit_id', v_audit_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION force_unlink_line_account IS 'Admin force unlink LINE account with immediate session revocation and audit logging';

-- ============================================================
-- FUNCTION: Approve unlink request
-- Purpose: Process guard-initiated unlink request
-- ============================================================

CREATE OR REPLACE FUNCTION approve_unlink_request(
    p_request_id UUID,
    p_admin_user_id UUID,
    p_review_notes TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_request RECORD;
    v_user RECORD;
    v_revoked_sessions INTEGER;
    v_audit_id UUID;
BEGIN
    -- Lock the request row
    SELECT * INTO v_request
    FROM line_link_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unlink request not found';
    END IF;

    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Request already processed with status: %', v_request.status;
    END IF;

    IF v_request.request_type != 'unlink' THEN
        RAISE EXCEPTION 'This function only handles unlink requests';
    END IF;

    -- Get user details
    SELECT * INTO v_user
    FROM users
    WHERE employee_id = v_request.employee_id
      AND line_user_id = v_request.line_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found or LINE ID mismatch';
    END IF;

    -- Unlink the account (keep line_user_id for audit, but mark as unlinked)
    UPDATE users
    SET
        line_link_status = 'unlinked',
        line_unlinked_at = NOW(),
        line_unlinked_by = p_admin_user_id,
        line_unlink_reason = COALESCE(v_request.unlink_reason, 'User-requested unlink'),
        -- For guards, deactivate account; they need to re-link
        is_active = CASE WHEN role = 'guard' THEN false ELSE is_active END,
        updated_at = NOW()
    WHERE id = v_user.id;

    -- Revoke all active sessions
    UPDATE line_session_tokens
    SET
        is_active = false,
        revoked_at = NOW(),
        revoked_by = p_admin_user_id,
        revoke_reason = 'Unlink request approved: ' || COALESCE(v_request.unlink_reason, 'N/A')
    WHERE user_id = v_user.id
      AND is_active = true;

    GET DIAGNOSTICS v_revoked_sessions = ROW_COUNT;

    -- Update request status
    UPDATE line_link_requests
    SET
        status = 'approved',
        reviewed_by = p_admin_user_id,
        reviewed_at = NOW(),
        review_notes = p_review_notes,
        updated_at = NOW()
    WHERE id = p_request_id;

    -- Create audit log
    v_audit_id := create_line_audit_log(
        p_company_id := v_request.company_id,
        p_actor_user_id := p_admin_user_id,
        p_target_user_id := v_user.id,
        p_target_employee_id := v_request.employee_id,
        p_target_line_user_id := v_request.line_user_id,
        p_action := 'unlink_request_approved',
        p_request_id := p_request_id,
        p_metadata := jsonb_build_object(
            'review_notes', p_review_notes,
            'user_reason', v_request.unlink_reason,
            'revoked_sessions', v_revoked_sessions
        ),
        p_ip_address := p_ip_address,
        p_user_agent := p_user_agent
    );

    RETURN json_build_object(
        'success', true,
        'request_id', p_request_id,
        'revoked_sessions', v_revoked_sessions,
        'audit_id', v_audit_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_unlink_request IS 'Approve guard-initiated unlink request with session revocation and audit logging';

-- ============================================================
-- FUNCTION: Revoke specific session
-- Purpose: Manually revoke a single LINE session
-- ============================================================

CREATE OR REPLACE FUNCTION revoke_line_session(
    p_session_id UUID,
    p_admin_user_id UUID,
    p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
    v_session RECORD;
    v_audit_id UUID;
BEGIN
    -- Lock and get session
    SELECT * INTO v_session
    FROM line_session_tokens
    WHERE id = p_session_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    IF NOT v_session.is_active THEN
        RAISE EXCEPTION 'Session is already revoked';
    END IF;

    -- Revoke the session
    UPDATE line_session_tokens
    SET
        is_active = false,
        revoked_at = NOW(),
        revoked_by = p_admin_user_id,
        revoke_reason = p_reason
    WHERE id = p_session_id;

    -- Create audit log
    v_audit_id := create_line_audit_log(
        p_company_id := v_session.company_id,
        p_actor_user_id := p_admin_user_id,
        p_target_user_id := v_session.user_id,
        p_target_employee_id := NULL,
        p_target_line_user_id := v_session.line_user_id,
        p_action := 'session_revoked',
        p_request_id := NULL,
        p_metadata := jsonb_build_object(
            'session_id', p_session_id,
            'reason', p_reason,
            'issued_at', v_session.issued_at
        )
    );

    RETURN json_build_object(
        'success', true,
        'session_id', p_session_id,
        'audit_id', v_audit_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION revoke_line_session IS 'Revoke a specific LINE session with audit logging';

-- ============================================================
-- FUNCTION: Clean up expired sessions and requests
-- Purpose: Maintenance function to clean old data (call via cron)
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_expired_line_data()
RETURNS JSON AS $$
DECLARE
    v_expired_sessions INTEGER;
    v_expired_requests INTEGER;
BEGIN
    -- Mark expired sessions as inactive
    UPDATE line_session_tokens
    SET
        is_active = false,
        revoked_at = NOW(),
        revoke_reason = 'Session expired (automatic cleanup)'
    WHERE is_active = true
      AND expires_at < NOW();

    GET DIAGNOSTICS v_expired_sessions = ROW_COUNT;

    -- Mark expired link requests
    UPDATE line_link_requests
    SET
        status = 'expired',
        updated_at = NOW()
    WHERE status = 'pending'
      AND expires_at < NOW();

    GET DIAGNOSTICS v_expired_requests = ROW_COUNT;

    RETURN json_build_object(
        'expired_sessions', v_expired_sessions,
        'expired_requests', v_expired_requests,
        'cleaned_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_line_data IS 'Maintenance function to clean up expired sessions and link requests';

COMMIT;

-- ============================================================
-- Success message
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✅ Migration 014 completed successfully!';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Postgres Functions for LINE Integration:';
    RAISE NOTICE '  ✓ create_line_audit_log - Helper for audit logging';
    RAISE NOTICE '  ✓ approve_line_link_request - Approve link with ACID';
    RAISE NOTICE '  ✓ reject_line_link_request - Reject link request';
    RAISE NOTICE '  ✓ force_unlink_line_account - Admin force unlink';
    RAISE NOTICE '  ✓ approve_unlink_request - Approve guard unlink';
    RAISE NOTICE '  ✓ revoke_line_session - Revoke single session';
    RAISE NOTICE '  ✓ cleanup_expired_line_data - Maintenance function';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 All functions use SECURITY DEFINER for controlled access';
    RAISE NOTICE '⚛️  All operations are atomic with row-level locking';
    RAISE NOTICE '📝 Comprehensive audit logging for all actions';
    RAISE NOTICE '============================================================';
END $$;
