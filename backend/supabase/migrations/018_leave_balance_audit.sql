-- ============================================================================
-- Migration: Leave Balance Adjustments & Audit Trail
-- Version: 018
-- Description: Adds audit trail for all leave balance adjustments
-- ============================================================================

-- Create leave_balance_adjustments table
CREATE TABLE IF NOT EXISTS leave_balance_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    balance_id UUID NOT NULL REFERENCES leave_balances(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE, -- Denormalized for easier queries
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE, -- Denormalized
    year INT NOT NULL,

    -- Who made the change
    adjusted_by UUID NOT NULL REFERENCES users(id),

    -- What changed
    field_name VARCHAR(50) NOT NULL CHECK (field_name IN ('entitled_days', 'used_days', 'pending_days')),
    previous_value DECIMAL(5,2) NOT NULL CHECK (previous_value >= 0),
    new_value DECIMAL(5,2) NOT NULL CHECK (new_value >= 0),
    adjustment_amount DECIMAL(5,2) GENERATED ALWAYS AS (new_value - previous_value) STORED,

    -- Why
    reason TEXT NOT NULL CHECK (LENGTH(reason) >= 10),
    adjustment_type VARCHAR(50) CHECK (adjustment_type IN ('pro_rated', 'correction', 'special_allowance', 'carry_forward', 'manual')),

    -- When
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_company ON leave_balance_adjustments(company_id);
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_balance ON leave_balance_adjustments(balance_id);
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_employee ON leave_balance_adjustments(employee_id);
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_date ON leave_balance_adjustments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_adjusted_by ON leave_balance_adjustments(adjusted_by);
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_year ON leave_balance_adjustments(year);

-- Enable Row Level Security
ALTER TABLE leave_balance_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Company members can view own company adjustments
CREATE POLICY "Company members can view own company adjustments"
ON leave_balance_adjustments FOR SELECT
TO authenticated
USING (company_id = (auth.jwt() ->> 'company_id')::uuid);

-- RLS Policy: Only managers and admins can create adjustments
CREATE POLICY "Only managers can create adjustments"
ON leave_balance_adjustments FOR INSERT
TO authenticated
WITH CHECK (
    company_id = (auth.jwt() ->> 'company_id')::uuid
    AND (auth.jwt() ->> 'role')::text IN ('company_admin', 'manager', 'super_admin')
);

-- Add comment to table
COMMENT ON TABLE leave_balance_adjustments IS 'Audit trail for all leave balance adjustments with full history';
COMMENT ON COLUMN leave_balance_adjustments.field_name IS 'The balance field that was adjusted (entitled_days, used_days, pending_days)';
COMMENT ON COLUMN leave_balance_adjustments.adjustment_amount IS 'Computed field: new_value - previous_value';
COMMENT ON COLUMN leave_balance_adjustments.adjustment_type IS 'Category of adjustment: pro_rated, correction, special_allowance, carry_forward, manual';
