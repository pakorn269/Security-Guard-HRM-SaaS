-- ============================================================
-- Security Guard HRM SaaS - Row-Level Security Policies
-- Version: 1.0.1 (Fixed for Supabase managed auth schema)
-- Run this AFTER 001_initial_schema.sql
-- ============================================================

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS (in public schema)
-- ============================================================

-- Get current company_id from app settings (set by backend)
CREATE OR REPLACE FUNCTION public.get_current_company_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_company_id', true), '')::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get current user role from app settings (set by backend)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_role', true), '');
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get current user ID from app settings (set by backend)
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', true), '')::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.get_current_user_role() IN ('super_admin', 'company_admin', 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.get_current_user_role() = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- COMPANIES POLICIES
-- ============================================================

-- Super admins can view all companies
CREATE POLICY "Super admins can view all companies"
ON companies FOR SELECT
USING (public.is_super_admin());

-- Users can view their own company
CREATE POLICY "Users can view their company"
ON companies FOR SELECT
USING (id = public.get_current_company_id());

-- Super admins can create companies
CREATE POLICY "Super admins can create companies"
ON companies FOR INSERT
WITH CHECK (public.is_super_admin());

-- Company admins can update their company
CREATE POLICY "Company admins can update their company"
ON companies FOR UPDATE
USING (id = public.get_current_company_id() AND public.get_current_user_role() IN ('super_admin', 'company_admin'))
WITH CHECK (id = public.get_current_company_id());

-- ============================================================
-- USERS POLICIES
-- ============================================================

-- Users can view users in their company
CREATE POLICY "Users can view users in their company"
ON users FOR SELECT
USING (company_id = public.get_current_company_id() OR public.is_super_admin());

-- Admins can create users in their company
CREATE POLICY "Admins can create users"
ON users FOR INSERT
WITH CHECK (
    (company_id = public.get_current_company_id() AND public.is_admin_or_manager())
    OR public.is_super_admin()
);

-- Users can update in their company (admins can update others)
CREATE POLICY "Users can update in their company"
ON users FOR UPDATE
USING (
    id = public.get_current_user_id() 
    OR (company_id = public.get_current_company_id() AND public.is_admin_or_manager())
)
WITH CHECK (
    id = public.get_current_user_id() 
    OR (company_id = public.get_current_company_id() AND public.is_admin_or_manager())
);

-- ============================================================
-- EMPLOYEES POLICIES
-- ============================================================

-- Users can view employees in their company
CREATE POLICY "Users can view employees in their company"
ON employees FOR SELECT
USING (company_id = public.get_current_company_id() OR public.is_super_admin());

-- Admins and managers can create employees
CREATE POLICY "Admins can create employees"
ON employees FOR INSERT
WITH CHECK (
    company_id = public.get_current_company_id() 
    AND public.is_admin_or_manager()
);

-- Admins and managers can update employees
CREATE POLICY "Admins can update employees"
ON employees FOR UPDATE
USING (company_id = public.get_current_company_id() AND public.is_admin_or_manager())
WITH CHECK (company_id = public.get_current_company_id() AND public.is_admin_or_manager());

-- Admins can delete employees
CREATE POLICY "Admins can delete employees"
ON employees FOR DELETE
USING (company_id = public.get_current_company_id() AND public.get_current_user_role() IN ('super_admin', 'company_admin'));

-- ============================================================
-- CERTIFICATIONS POLICIES
-- ============================================================

-- Users can view certifications in their company
CREATE POLICY "Users can view certifications"
ON certifications FOR SELECT
USING (company_id = public.get_current_company_id() OR public.is_super_admin());

-- Admins can insert certifications
CREATE POLICY "Admins can insert certifications"
ON certifications FOR INSERT
WITH CHECK (company_id = public.get_current_company_id() AND public.is_admin_or_manager());

-- Admins can update certifications
CREATE POLICY "Admins can update certifications"
ON certifications FOR UPDATE
USING (company_id = public.get_current_company_id() AND public.is_admin_or_manager())
WITH CHECK (company_id = public.get_current_company_id() AND public.is_admin_or_manager());

-- Admins can delete certifications
CREATE POLICY "Admins can delete certifications"
ON certifications FOR DELETE
USING (company_id = public.get_current_company_id() AND public.is_admin_or_manager());

-- ============================================================
-- SHIFT_TEMPLATES POLICIES
-- ============================================================

-- Users can view shift templates in their company
CREATE POLICY "Users can view shift templates"
ON shift_templates FOR SELECT
USING (company_id = public.get_current_company_id() OR public.is_super_admin());

-- Admins can insert shift templates
CREATE POLICY "Admins can insert shift templates"
ON shift_templates FOR INSERT
WITH CHECK (company_id = public.get_current_company_id() AND public.is_admin_or_manager());

-- Admins can update shift templates
CREATE POLICY "Admins can update shift templates"
ON shift_templates FOR UPDATE
USING (company_id = public.get_current_company_id() AND public.is_admin_or_manager())
WITH CHECK (company_id = public.get_current_company_id() AND public.is_admin_or_manager());

-- Admins can delete shift templates
CREATE POLICY "Admins can delete shift templates"
ON shift_templates FOR DELETE
USING (company_id = public.get_current_company_id() AND public.is_admin_or_manager());

-- ============================================================
-- SHIFTS POLICIES
-- ============================================================

-- Users can view shifts in their company (published or if admin)
CREATE POLICY "Users can view shifts"
ON shifts FOR SELECT
USING (
    company_id = public.get_current_company_id()
    AND (status = 'published' OR public.is_admin_or_manager())
);

-- Admins can insert shifts
CREATE POLICY "Admins can insert shifts"
ON shifts FOR INSERT
WITH CHECK (company_id = public.get_current_company_id() AND public.is_admin_or_manager());

-- Admins can update shifts
CREATE POLICY "Admins can update shifts"
ON shifts FOR UPDATE
USING (company_id = public.get_current_company_id() AND public.is_admin_or_manager())
WITH CHECK (company_id = public.get_current_company_id() AND public.is_admin_or_manager());

-- Admins can delete shifts
CREATE POLICY "Admins can delete shifts"
ON shifts FOR DELETE
USING (company_id = public.get_current_company_id() AND public.is_admin_or_manager());

-- ============================================================
-- ATTENDANCE_LOGS POLICIES
-- ============================================================

-- Users can view attendance in their company
CREATE POLICY "Users can view attendance"
ON attendance_logs FOR SELECT
USING (company_id = public.get_current_company_id());

-- Users can create attendance (clock in/out)
CREATE POLICY "Users can create attendance"
ON attendance_logs FOR INSERT
WITH CHECK (company_id = public.get_current_company_id());

-- Users can update attendance
CREATE POLICY "Users can update attendance"
ON attendance_logs FOR UPDATE
USING (company_id = public.get_current_company_id())
WITH CHECK (company_id = public.get_current_company_id());

-- ============================================================
-- LEAVE_TYPES POLICIES
-- ============================================================

-- Users can view leave types in their company
CREATE POLICY "Users can view leave types"
ON leave_types FOR SELECT
USING (company_id = public.get_current_company_id() OR public.is_super_admin());

-- Admins can manage leave types
CREATE POLICY "Admins can insert leave types"
ON leave_types FOR INSERT
WITH CHECK (company_id = public.get_current_company_id() AND public.get_current_user_role() IN ('super_admin', 'company_admin'));

CREATE POLICY "Admins can update leave types"
ON leave_types FOR UPDATE
USING (company_id = public.get_current_company_id() AND public.get_current_user_role() IN ('super_admin', 'company_admin'))
WITH CHECK (company_id = public.get_current_company_id());

CREATE POLICY "Admins can delete leave types"
ON leave_types FOR DELETE
USING (company_id = public.get_current_company_id() AND public.get_current_user_role() IN ('super_admin', 'company_admin'));

-- ============================================================
-- LEAVE_REQUESTS POLICIES
-- ============================================================

-- Users can view leave requests in their company
CREATE POLICY "Users can view leave requests"
ON leave_requests FOR SELECT
USING (company_id = public.get_current_company_id());

-- Users can create leave requests
CREATE POLICY "Users can create leave requests"
ON leave_requests FOR INSERT
WITH CHECK (company_id = public.get_current_company_id());

-- Users can update leave requests
CREATE POLICY "Users can update leave requests"
ON leave_requests FOR UPDATE
USING (company_id = public.get_current_company_id())
WITH CHECK (company_id = public.get_current_company_id());

-- ============================================================
-- LEAVE_BALANCES POLICIES
-- ============================================================

-- Users can view leave balances in their company
CREATE POLICY "Users can view leave balances"
ON leave_balances FOR SELECT
USING (company_id = public.get_current_company_id());

-- Admins can manage balances
CREATE POLICY "Admins can insert balances"
ON leave_balances FOR INSERT
WITH CHECK (company_id = public.get_current_company_id() AND public.is_admin_or_manager());

CREATE POLICY "Admins can update balances"
ON leave_balances FOR UPDATE
USING (company_id = public.get_current_company_id() AND public.is_admin_or_manager())
WITH CHECK (company_id = public.get_current_company_id() AND public.is_admin_or_manager());

-- ============================================================
-- NOTIFICATIONS POLICIES
-- ============================================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (user_id = public.get_current_user_id() OR (company_id = public.get_current_company_id() AND public.is_admin_or_manager()));

-- System/admins can create notifications
CREATE POLICY "Admins can create notifications"
ON notifications FOR INSERT
WITH CHECK (company_id = public.get_current_company_id());

-- Users can update their notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (user_id = public.get_current_user_id())
WITH CHECK (user_id = public.get_current_user_id());

-- ============================================================
-- GRANT EXECUTE ON HELPER FUNCTIONS
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_current_company_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_manager() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies created successfully!';
    RAISE NOTICE 'All tables now have row-level security enabled.';
    RAISE NOTICE 'Helper functions created in public schema.';
END $$;
