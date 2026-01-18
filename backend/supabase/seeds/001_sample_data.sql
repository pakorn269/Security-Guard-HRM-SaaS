-- ============================================================
-- Security Guard HRM SaaS - Seed Data (Development Only)
-- Version: 1.0.0
-- Run this AFTER all migration files for testing
-- ============================================================

-- ============================================================
-- SAMPLE COMPANY
-- ============================================================
INSERT INTO companies (id, name, slug, email, phone, address, settings)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'รักษาความปลอดภัย ซีเคียวริตี้ กรุ๊ป',
    'security-group',
    'admin@security-group.com',
    '02-123-4567',
    '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
    '{
        "timezone": "Asia/Bangkok",
        "late_threshold_minutes": 15,
        "early_leave_threshold_minutes": 15,
        "clock_in_before_shift_minutes": 30,
        "leave_reset_month": 1,
        "default_language": "th"
    }'::jsonb
);

-- ============================================================
-- SAMPLE USERS
-- ============================================================

-- Admin user (password: admin123)
INSERT INTO users (id, company_id, email, password_hash, role, is_active, language)
VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@security-group.com',
    '$2b$12$uL5M/KzMfAbjxoIZXpC.suneVG/voMqF2hyQWbexKsBu6XFdfvYCC', -- admin123 (bcrypt 12 rounds)
    'company_admin',
    true,
    'th'
);

-- Manager user (password: manager123)
INSERT INTO users (id, company_id, email, password_hash, role, is_active, language)
VALUES (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'manager@security-group.com',
    '$2b$12$2nBcjjXKVkbEeexdpT677ubuvcHIrknmZxrLc1vNdnYgDjCTMcaM6', -- manager123 (bcrypt 12 rounds)
    'manager',
    true,
    'th'
);

-- ============================================================
-- SAMPLE EMPLOYEES
-- ============================================================

INSERT INTO employees (id, company_id, employee_code, full_name, full_name_th, phone, email, hire_date, status)
VALUES 
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'EMP-001', 'Somchai Rakngarn', 'สมชาย รักงาน', '081-234-5678', 'somchai@email.com', '2024-01-15', 'active'),
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'EMP-002', 'Kamol Jaidee', 'กมล ใจดี', '082-345-6789', 'kamol@email.com', '2024-02-01', 'active'),
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'EMP-003', 'Prasit Manee', 'ประสิทธิ์ มานี', '083-456-7890', 'prasit@email.com', '2024-03-10', 'active');

-- ============================================================
-- SAMPLE SHIFT TEMPLATES
-- ============================================================

INSERT INTO shift_templates (id, company_id, name, name_th, start_time, end_time, break_minutes, color, is_overnight)
VALUES 
    ('10eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Morning Shift', 'กะเช้า', '08:00', '17:00', 60, '#22C55E', false),
    ('20eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Evening Shift', 'กะบ่าย', '14:00', '23:00', 60, '#3B82F6', false),
    ('30eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Night Shift', 'กะดึก', '22:00', '07:00', 60, '#8B5CF6', true);

-- ============================================================
-- SAMPLE LEAVE TYPES
-- ============================================================

INSERT INTO leave_types (id, company_id, name, name_th, description, is_paid, max_days_per_year, requires_approval, requires_document, sort_order)
VALUES 
    ('40eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Annual Leave', 'ลาพักร้อน', 'วันหยุดพักผ่อนประจำปี', true, 10, true, false, 1),
    ('50eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sick Leave', 'ลาป่วย', 'ลาเนื่องจากเจ็บป่วย', true, 30, true, true, 2),
    ('60eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Personal Leave', 'ลากิจ', 'ลาเพื่อติดต่อธุระส่วนตัว', false, 5, true, false, 3);

-- ============================================================
-- SAMPLE LEAVE BALANCES (Year 2026)
-- ============================================================

INSERT INTO leave_balances (company_id, employee_id, leave_type_id, year, entitled_days, used_days, pending_days)
VALUES 
    -- Somchai
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '40eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 2026, 10, 3, 0),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '50eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 2026, 30, 1, 0),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '60eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 2026, 5, 0, 0),
    -- Kamol
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '40eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 2026, 10, 0, 0),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '50eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 2026, 30, 2, 0),
    -- Prasit
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '40eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 2026, 10, 1, 0);

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Seed data inserted successfully!';
    RAISE NOTICE 'Created: 1 company, 2 users, 3 employees, 3 shift templates, 3 leave types';
    RAISE NOTICE 'Test login: admin@security-group.com / admin123';
END $$;
