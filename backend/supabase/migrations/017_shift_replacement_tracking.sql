-- ============================================================================
-- Migration: 017_shift_replacement_tracking.sql
-- Description: Add shift replacement tracking for leave management workflow
-- Created: 2026-01-30
-- ============================================================================

-- Add replacement tracking columns to shifts table
ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS replaced_by_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_replacement BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS original_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS replacement_reason TEXT;

-- Add indexes for efficient querying of replacement shifts
CREATE INDEX IF NOT EXISTS idx_shifts_replacement
  ON shifts(replaced_by_employee_id)
  WHERE replaced_by_employee_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shifts_is_replacement
  ON shifts(is_replacement)
  WHERE is_replacement = true;

CREATE INDEX IF NOT EXISTS idx_shifts_original_employee
  ON shifts(original_employee_id)
  WHERE original_employee_id IS NOT NULL;

-- Add shift tracking columns to leave_requests table
ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS affected_shift_ids UUID[] DEFAULT '{}' NOT NULL,
  ADD COLUMN IF NOT EXISTS replacements_assigned BOOLEAN DEFAULT FALSE NOT NULL;

-- Add GIN index for efficient array containment queries on affected_shift_ids
CREATE INDEX IF NOT EXISTS idx_leave_requests_affected_shifts
  ON leave_requests USING GIN(affected_shift_ids);

-- Add index for finding leave requests that need replacement assignment
CREATE INDEX IF NOT EXISTS idx_leave_requests_needs_replacement
  ON leave_requests(replacements_assigned, status)
  WHERE status = 'approved' AND replacements_assigned = false;

-- Add composite index for common query pattern (company + status + replacements)
CREATE INDEX IF NOT EXISTS idx_leave_requests_company_replacement_status
  ON leave_requests(company_id, status, replacements_assigned);

-- Add comments for documentation
COMMENT ON COLUMN shifts.replaced_by_employee_id IS 'ID of employee who replaces the original assignee (when original is on leave)';
COMMENT ON COLUMN shifts.is_replacement IS 'True if this shift assignment is a replacement for another employee';
COMMENT ON COLUMN shifts.original_employee_id IS 'Original employee who was assigned before replacement (for tracking purposes)';
COMMENT ON COLUMN shifts.replacement_reason IS 'Reason for replacement (e.g., "Leave Request ID: xxx")';
COMMENT ON COLUMN leave_requests.affected_shift_ids IS 'Array of shift IDs that conflict with this leave request';
COMMENT ON COLUMN leave_requests.replacements_assigned IS 'True if all affected shifts have been assigned replacement guards';

-- Update RLS policies to handle replacement scenarios
-- Replacement guards should be able to see shifts assigned to them

-- Drop existing policy if it exists and recreate with replacement logic
DROP POLICY IF EXISTS "Employees can view their own shifts and company shifts" ON shifts;

CREATE POLICY "Employees can view their own shifts and replacements"
  ON shifts
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE user_id = auth.uid()
    )
    AND (
      employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
      OR replaced_by_employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    )
  );

-- Managers and admins can view all company shifts (keep existing logic)
DROP POLICY IF EXISTS "Managers can manage company shifts" ON shifts;

CREATE POLICY "Managers can manage company shifts"
  ON shifts
  FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND role IN ('company_admin', 'manager')
    )
  );

-- Add policy for updating shift replacements
CREATE POLICY "Managers can assign shift replacements"
  ON shifts
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND role IN ('company_admin', 'manager')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users
      WHERE id = auth.uid()
      AND role IN ('company_admin', 'manager')
    )
  );
