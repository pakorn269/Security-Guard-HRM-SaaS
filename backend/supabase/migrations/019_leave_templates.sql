-- ============================================================================
-- Migration: Leave Request Templates
-- Version: 019
-- Description: Adds template system for quick leave request creation
-- ============================================================================

-- Create leave_request_templates table
CREATE TABLE IF NOT EXISTS leave_request_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Template info
    name VARCHAR(100) NOT NULL,
    name_th VARCHAR(100),
    description TEXT,

    -- Default values
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    default_days_count DECIMAL(3,1) CHECK (default_days_count > 0 AND default_days_count <= 365),
    default_reason TEXT,

    -- Settings
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,

    -- Audit
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_template_name_per_company UNIQUE (company_id, name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_company ON leave_request_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_templates_leave_type ON leave_request_templates(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_templates_active ON leave_request_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_templates_sort ON leave_request_templates(company_id, sort_order);

-- Enable Row Level Security
ALTER TABLE leave_request_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Company members can view active templates
CREATE POLICY "Company members can view own company templates"
ON leave_request_templates FOR SELECT
TO authenticated
USING (
    company_id = (auth.jwt() ->> 'company_id')::uuid
    AND is_active = true
);

-- RLS Policy: Managers and admins can view all templates (including inactive)
CREATE POLICY "Managers can view all templates"
ON leave_request_templates FOR SELECT
TO authenticated
USING (
    company_id = (auth.jwt() ->> 'company_id')::uuid
    AND (auth.jwt() ->> 'role')::text IN ('company_admin', 'manager', 'super_admin')
);

-- RLS Policy: Only managers and admins can create templates
CREATE POLICY "Managers can create templates"
ON leave_request_templates FOR INSERT
TO authenticated
WITH CHECK (
    company_id = (auth.jwt() ->> 'company_id')::uuid
    AND (auth.jwt() ->> 'role')::text IN ('company_admin', 'manager', 'super_admin')
);

-- RLS Policy: Only managers and admins can update templates
CREATE POLICY "Managers can update templates"
ON leave_request_templates FOR UPDATE
TO authenticated
USING (
    company_id = (auth.jwt() ->> 'company_id')::uuid
    AND (auth.jwt() ->> 'role')::text IN ('company_admin', 'manager', 'super_admin')
)
WITH CHECK (
    company_id = (auth.jwt() ->> 'company_id')::uuid
    AND (auth.jwt() ->> 'role')::text IN ('company_admin', 'manager', 'super_admin')
);

-- RLS Policy: Only managers and admins can delete templates
CREATE POLICY "Managers can delete templates"
ON leave_request_templates FOR DELETE
TO authenticated
USING (
    company_id = (auth.jwt() ->> 'company_id')::uuid
    AND (auth.jwt() ->> 'role')::text IN ('company_admin', 'manager', 'super_admin')
);

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_leave_request_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leave_request_templates_updated_at
BEFORE UPDATE ON leave_request_templates
FOR EACH ROW
EXECUTE FUNCTION update_leave_request_templates_updated_at();

-- Add comments
COMMENT ON TABLE leave_request_templates IS 'Template system for quick leave request creation with predefined defaults';
COMMENT ON COLUMN leave_request_templates.name IS 'Template name in English';
COMMENT ON COLUMN leave_request_templates.name_th IS 'Template name in Thai';
COMMENT ON COLUMN leave_request_templates.default_days_count IS 'Suggested number of days for this template';
COMMENT ON COLUMN leave_request_templates.default_reason IS 'Pre-filled reason text';
COMMENT ON COLUMN leave_request_templates.is_active IS 'Whether template is visible to regular employees';
COMMENT ON COLUMN leave_request_templates.sort_order IS 'Display order in UI (lower = higher priority)';
