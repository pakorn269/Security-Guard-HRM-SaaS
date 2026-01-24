-- ============================================================
-- Migration: Enhanced RLS Policies for LINE Account Integration
-- Version: 013
-- Purpose: Strict security policies for link status, session management, audit logs
-- Security: Zero-trust, pending users have NO access, guards cannot self-unlink
-- ============================================================

BEGIN;

-- ============================================================
-- SECTION 1: Enable RLS on new tables
-- ============================================================

ALTER TABLE line_session_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_audit_log ENABLE ROW LEVEL SECURITY;

-- Ensure RLS is enabled on existing tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_link_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION 2: Enhanced USERS table policies
-- Critical: Pending users have ZERO access
-- ============================================================

-- Drop existing overly permissive policies if they exist
DROP POLICY IF EXISTS "Guards can view their own user" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Guards can update their own profile" ON users;

-- ============================================================
-- READ POLICIES for users table
-- ============================================================

-- Policy 1: Super admins can view all users
DROP POLICY IF EXISTS "super_admin_view_all_users" ON users;
CREATE POLICY "super_admin_view_all_users"
ON users FOR SELECT
TO authenticated
USING (public.is_super_admin());

-- Policy 2: Company admins can view users in their company
DROP POLICY IF EXISTS "company_admin_view_company_users" ON users;
CREATE POLICY "company_admin_view_company_users"
ON users FOR SELECT
TO authenticated
USING (
    company_id = public.get_current_company_id()
    AND public.get_current_user_role() IN ('company_admin', 'manager')
);

-- Policy 3: CRITICAL - Guards can ONLY view their OWN user IF linked
DROP POLICY IF EXISTS "guard_view_own_user_if_linked" ON users;
CREATE POLICY "guard_view_own_user_if_linked"
ON users FOR SELECT
TO authenticated
USING (
    id = public.get_current_user_id()
    AND public.get_current_user_role() = 'guard'
    AND line_link_status = 'linked'  -- MUST be linked
    AND is_active = true
);

-- Policy 4: Pending/unlinked users have NO access (implicit deny)
-- No policy needed - RLS denies by default

-- ============================================================
-- UPDATE POLICIES for users table
-- ============================================================

-- Policy 5: Company admins can update users in their company
DROP POLICY IF EXISTS "company_admin_update_users" ON users;
CREATE POLICY "company_admin_update_users"
ON users FOR UPDATE
TO authenticated
USING (
    company_id = public.get_current_company_id()
    AND public.get_current_user_role() IN ('super_admin', 'company_admin')
)
WITH CHECK (
    company_id = public.get_current_company_id()
);

-- Policy 6: Guards can update LIMITED fields (language, preferences)
-- CRITICAL: Cannot modify line_link_status to prevent self-unlink
DROP POLICY IF EXISTS "guard_update_own_profile_if_linked" ON users;
CREATE POLICY "guard_update_own_profile_if_linked"
ON users FOR UPDATE
TO authenticated
USING (
    id = public.get_current_user_id()
    AND public.get_current_user_role() = 'guard'
    AND line_link_status = 'linked'
)
WITH CHECK (
    id = public.get_current_user_id()
    AND line_link_status = 'linked'  -- Prevent changing status
    AND is_active = true
);

-- ============================================================
-- SECTION 3: Enhanced EMPLOYEES table policies
-- Critical: Guards can only view their own employee record if linked
-- ============================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Guards can view own employee" ON employees;

-- Policy 1: Admins can view all employees in their company
DROP POLICY IF EXISTS "admin_view_company_employees" ON employees;
CREATE POLICY "admin_view_company_employees"
ON employees FOR SELECT
TO authenticated
USING (
    company_id = public.get_current_company_id()
    AND public.is_admin_or_manager()
);

-- Policy 2: CRITICAL - Guards can ONLY view their OWN employee record IF linked
DROP POLICY IF EXISTS "guard_view_own_employee_if_linked" ON employees;
CREATE POLICY "guard_view_own_employee_if_linked"
ON employees FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT employee_id
        FROM users
        WHERE id = public.get_current_user_id()
        AND line_link_status = 'linked'
        AND is_active = true
    )
);

-- Policy 3: Pending users CANNOT view ANY employee data (implicit deny)

-- ============================================================
-- SECTION 4: LINE_LINK_REQUESTS table policies
-- ============================================================

-- Enable RLS (already done above but ensuring)
ALTER TABLE line_link_requests ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admins can view all requests in their company
DROP POLICY IF EXISTS "admin_view_link_requests" ON line_link_requests;
CREATE POLICY "admin_view_link_requests"
ON line_link_requests FOR SELECT
TO authenticated
USING (
    company_id = public.get_current_company_id()
    AND public.is_admin_or_manager()
);

-- Policy 2: Users can view their OWN requests (both link and unlink)
DROP POLICY IF EXISTS "user_view_own_requests" ON line_link_requests;
CREATE POLICY "user_view_own_requests"
ON line_link_requests FOR SELECT
TO authenticated
USING (
    employee_id IN (
        SELECT employee_id
        FROM users
        WHERE id = public.get_current_user_id()
    )
);

-- Policy 3: Admins can update (approve/reject) requests
DROP POLICY IF EXISTS "admin_update_requests" ON line_link_requests;
CREATE POLICY "admin_update_requests"
ON line_link_requests FOR UPDATE
TO authenticated
USING (
    company_id = public.get_current_company_id()
    AND public.get_current_user_role() IN ('company_admin', 'super_admin')
)
WITH CHECK (
    company_id = public.get_current_company_id()
);

-- Policy 4: Insert handled by Edge Functions with service role
-- No INSERT policy needed for regular users

-- ============================================================
-- SECTION 5: LINE_SESSION_TOKENS table policies
-- ============================================================

-- Policy 1: Admins can view all sessions in their company
DROP POLICY IF EXISTS "admin_view_sessions" ON line_session_tokens;
CREATE POLICY "admin_view_sessions"
ON line_session_tokens FOR SELECT
TO authenticated
USING (
    company_id = public.get_current_company_id()
    AND public.is_admin_or_manager()
);

-- Policy 2: Users can view their own active sessions
DROP POLICY IF EXISTS "user_view_own_sessions" ON line_session_tokens;
CREATE POLICY "user_view_own_sessions"
ON line_session_tokens FOR SELECT
TO authenticated
USING (
    user_id = public.get_current_user_id()
    AND is_active = true
);

-- Policy 3: Admins can revoke sessions (UPDATE policy)
DROP POLICY IF EXISTS "admin_revoke_sessions" ON line_session_tokens;
CREATE POLICY "admin_revoke_sessions"
ON line_session_tokens FOR UPDATE
TO authenticated
USING (
    company_id = public.get_current_company_id()
    AND public.get_current_user_role() IN ('company_admin', 'super_admin')
);

-- Policy 4: System can insert sessions (via Edge Functions)
-- Handled by service role key, no policy for authenticated users

-- ============================================================
-- SECTION 6: LINE_AUDIT_LOG table policies
-- IMMUTABLE: Read-only audit trail
-- ============================================================

-- Policy 1: Admins can view audit logs for their company
DROP POLICY IF EXISTS "admin_view_audit_log" ON line_audit_log;
CREATE POLICY "admin_view_audit_log"
ON line_audit_log FOR SELECT
TO authenticated
USING (
    company_id = public.get_current_company_id()
    AND public.is_admin_or_manager()
);

-- Policy 2: Users can view audit logs about themselves
DROP POLICY IF EXISTS "user_view_own_audit_log" ON line_audit_log;
CREATE POLICY "user_view_own_audit_log"
ON line_audit_log FOR SELECT
TO authenticated
USING (
    target_user_id = public.get_current_user_id()
);

-- Policy 3: System can insert audit logs (via Edge Functions)
-- INSERT handled by service role key
-- No INSERT policy for authenticated users

-- Policy 4: NO UPDATE OR DELETE - Audit logs are immutable
-- No policies defined = implicit deny

-- ============================================================
-- SECTION 7: Additional security constraints
-- ============================================================

-- Prevent guards from updating their line_link_status via trigger
CREATE OR REPLACE FUNCTION prevent_guard_self_unlink()
RETURNS TRIGGER AS $$
BEGIN
    -- If user is a guard and trying to change line_link_status
    IF NEW.role = 'guard' AND OLD.line_link_status != NEW.line_link_status THEN
        -- Check if current user is the guard themselves
        IF public.get_current_user_id() = NEW.id THEN
            RAISE EXCEPTION 'Guards cannot modify their own LINE link status. Please contact admin.';
        END IF;
    END IF;

    -- If trying to set line_link_status to 'linked' or 'force_unlinked'
    -- without proper admin role
    IF OLD.line_link_status != NEW.line_link_status AND
       NEW.line_link_status IN ('linked', 'force_unlinked') THEN
        IF public.get_current_user_role() NOT IN ('company_admin', 'super_admin') THEN
            RAISE EXCEPTION 'Only admins can approve links or force unlink accounts';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_prevent_guard_self_unlink ON users;

-- Create trigger
CREATE TRIGGER trigger_prevent_guard_self_unlink
    BEFORE UPDATE OF line_link_status ON users
    FOR EACH ROW
    EXECUTE FUNCTION prevent_guard_self_unlink();

-- ============================================================
-- SECTION 8: Validate existing data
-- ============================================================

-- Ensure all users with line_user_id have proper line_link_status
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Count users with LINE but status is unlinked
    SELECT COUNT(*) INTO v_count
    FROM users
    WHERE line_user_id IS NOT NULL
      AND line_link_status = 'unlinked';

    IF v_count > 0 THEN
        RAISE WARNING 'Found % users with LINE ID but unlinked status. Run data migration first.', v_count;
    END IF;
END $$;

COMMIT;

-- ============================================================
-- Success message
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE '✅ Migration 013 completed successfully!';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Enhanced RLS Policies for LINE Integration:';
    RAISE NOTICE '  ✓ Users table: 6 policies (strict link status checks)';
    RAISE NOTICE '  ✓ Employees table: 2 policies (guards only if linked)';
    RAISE NOTICE '  ✓ Line requests: 4 policies (admin approval workflow)';
    RAISE NOTICE '  ✓ Session tokens: 3 policies (revocation support)';
    RAISE NOTICE '  ✓ Audit log: 2 policies (immutable, read-only)';
    RAISE NOTICE '  ✓ Trigger: prevent_guard_self_unlink (anti-circumvention)';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Security Features:';
    RAISE NOTICE '  • Pending users have ZERO access to company data';
    RAISE NOTICE '  • Guards cannot modify line_link_status (self-unlink blocked)';
    RAISE NOTICE '  • Only admins can approve/reject link requests';
    RAISE NOTICE '  • Audit logs are immutable (no UPDATE/DELETE)';
    RAISE NOTICE '  • Session revocation enforced at database level';
    RAISE NOTICE '============================================================';
END $$;
