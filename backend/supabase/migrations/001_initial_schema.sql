-- ============================================================
-- Security Guard HRM SaaS - Initial Database Schema
-- Version: 1.0.0
-- Run this in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CUSTOM TYPES (ENUMS)
-- ============================================================

-- User roles
CREATE TYPE user_role AS ENUM ('super_admin', 'company_admin', 'manager', 'guard');

-- Employment status
CREATE TYPE employment_status AS ENUM ('active', 'on_leave', 'terminated');

-- Certification status
CREATE TYPE certification_status AS ENUM ('valid', 'expiring_soon', 'expired');

-- Shift status
CREATE TYPE shift_status AS ENUM ('draft', 'published', 'cancelled');

-- Attendance status
CREATE TYPE attendance_status AS ENUM ('pending', 'on_time', 'late', 'early_leave', 'no_show', 'completed');

-- Leave request status
CREATE TYPE leave_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- Notification types
CREATE TYPE notification_type AS ENUM (
    'shift_published', 'shift_changed', 'shift_reminder',
    'leave_submitted', 'leave_approved', 'leave_rejected',
    'cert_expiring', 'attendance_late', 'attendance_no_show',
    'system'
);

-- Notification channels
CREATE TYPE notification_channel AS ENUM ('line', 'in_app', 'email');

-- ============================================================
-- TABLE: companies
-- ============================================================
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    settings JSONB DEFAULT '{
        "timezone": "Asia/Bangkok",
        "late_threshold_minutes": 15,
        "early_leave_threshold_minutes": 15,
        "clock_in_before_shift_minutes": 30,
        "leave_reset_month": 1,
        "default_language": "th"
    }'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_active ON companies(is_active);

-- ============================================================
-- TABLE: employees (created before users due to FK)
-- ============================================================
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID, -- Will be linked later after users table is created
    employee_code VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    full_name_th VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    hire_date DATE NOT NULL,
    termination_date DATE,
    status employment_status DEFAULT 'active',
    profile_image_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, employee_code)
);

CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_employees_status ON employees(company_id, status);
CREATE INDEX idx_employees_user ON employees(user_id);

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    role user_role NOT NULL DEFAULT 'guard',
    line_user_id VARCHAR(255) UNIQUE,
    line_display_name VARCHAR(255),
    line_picture_url TEXT,
    is_active BOOLEAN DEFAULT true,
    language VARCHAR(5) DEFAULT 'th',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, email)
);

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_line_user_id ON users(line_user_id);
CREATE INDEX idx_users_active ON users(is_active);

-- Add FK from employees to users (circular reference)
ALTER TABLE employees 
ADD CONSTRAINT fk_employees_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- TABLE: certifications
-- ============================================================
CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    type_th VARCHAR(100),
    license_number VARCHAR(100),
    issue_date DATE NOT NULL,
    expiry_date DATE,
    document_url TEXT,
    status certification_status DEFAULT 'valid',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_certifications_employee ON certifications(employee_id);
CREATE INDEX idx_certifications_company ON certifications(company_id);
CREATE INDEX idx_certifications_expiry ON certifications(company_id, expiry_date);
CREATE INDEX idx_certifications_status ON certifications(status);

-- ============================================================
-- TABLE: shift_templates
-- ============================================================
CREATE TABLE shift_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    name_th VARCHAR(100),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_minutes INTEGER DEFAULT 0,
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_overnight BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shift_templates_company ON shift_templates(company_id);
CREATE INDEX idx_shift_templates_active ON shift_templates(company_id, is_active);

-- ============================================================
-- TABLE: shifts
-- ============================================================
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    template_id UUID REFERENCES shift_templates(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(255),
    status shift_status DEFAULT 'draft',
    notes TEXT,
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(employee_id, date, start_time)
);

CREATE INDEX idx_shifts_company_date ON shifts(company_id, date);
CREATE INDEX idx_shifts_employee_date ON shifts(employee_id, date);
CREATE INDEX idx_shifts_status ON shifts(company_id, status);
CREATE INDEX idx_shifts_published ON shifts(company_id, published_at);

-- ============================================================
-- TABLE: attendance_logs
-- ============================================================
CREATE TABLE attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    
    clock_in_time TIMESTAMPTZ,
    clock_in_latitude DECIMAL(10, 8),
    clock_in_longitude DECIMAL(11, 8),
    clock_in_accuracy DECIMAL(10, 2),
    
    clock_out_time TIMESTAMPTZ,
    clock_out_latitude DECIMAL(10, 8),
    clock_out_longitude DECIMAL(11, 8),
    clock_out_accuracy DECIMAL(10, 2),
    
    status attendance_status DEFAULT 'pending',
    total_hours DECIMAL(5, 2),
    overtime_hours DECIMAL(5, 2) DEFAULT 0,
    
    notes TEXT,
    adjusted_by UUID REFERENCES users(id),
    adjustment_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attendance_company_date ON attendance_logs(company_id, clock_in_time);
CREATE INDEX idx_attendance_employee ON attendance_logs(employee_id, clock_in_time);
CREATE INDEX idx_attendance_shift ON attendance_logs(shift_id);
CREATE INDEX idx_attendance_status ON attendance_logs(company_id, status);

-- ============================================================
-- TABLE: leave_types
-- ============================================================
CREATE TABLE leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    name_th VARCHAR(100),
    description TEXT,
    is_paid BOOLEAN DEFAULT true,
    max_days_per_year INTEGER,
    requires_approval BOOLEAN DEFAULT true,
    requires_document BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leave_types_company ON leave_types(company_id);
CREATE INDEX idx_leave_types_active ON leave_types(company_id, is_active);

-- ============================================================
-- TABLE: leave_requests
-- ============================================================
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(3, 1) NOT NULL,
    reason TEXT,
    document_url TEXT,
    status leave_request_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leave_requests_company ON leave_requests(company_id);
CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(company_id, status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(company_id, start_date, end_date);

-- ============================================================
-- TABLE: leave_balances
-- ============================================================
CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id),
    year INTEGER NOT NULL,
    entitled_days DECIMAL(4, 1) NOT NULL DEFAULT 0,
    used_days DECIMAL(4, 1) NOT NULL DEFAULT 0,
    pending_days DECIMAL(4, 1) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(employee_id, leave_type_id, year)
);

CREATE INDEX idx_leave_balances_employee ON leave_balances(employee_id, year);
CREATE INDEX idx_leave_balances_type ON leave_balances(leave_type_id);

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    title_th VARCHAR(255),
    message TEXT NOT NULL,
    message_th TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    sent_via notification_channel[] DEFAULT '{}',
    line_message_id VARCHAR(255),
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_company ON notifications(company_id, created_at);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = false;

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_certifications_updated_at BEFORE UPDATE ON certifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shift_templates_updated_at BEFORE UPDATE ON shift_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_logs_updated_at BEFORE UPDATE ON attendance_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_types_updated_at BEFORE UPDATE ON leave_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON leave_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Schema created successfully!';
    RAISE NOTICE 'Tables created: companies, users, employees, certifications, shift_templates, shifts, attendance_logs, leave_types, leave_requests, leave_balances, notifications';
END $$;
