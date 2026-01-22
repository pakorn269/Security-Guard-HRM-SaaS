-- ============================================================
-- LINE Features Migration
-- Adds: Message Templates, Notification Preferences, Message History
-- ============================================================

-- ============================================================
-- ENUM: LINE message template category
-- ============================================================
CREATE TYPE line_template_category AS ENUM (
    'shift_reminder',
    'shift_change',
    'leave_approved',
    'leave_rejected',
    'attendance_late',
    'attendance_missing',
    'announcement',
    'custom'
);

-- ============================================================
-- TABLE: line_message_templates
-- Predefined message templates for common notifications
-- ============================================================
CREATE TABLE line_message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    name_th VARCHAR(100),
    category line_template_category NOT NULL DEFAULT 'custom',
    message TEXT NOT NULL,
    message_th TEXT,
    variables JSONB DEFAULT '[]', -- List of available variables e.g. ["employeeName", "shiftDate"]
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false, -- System templates cannot be deleted
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_line_templates_company ON line_message_templates(company_id);
CREATE INDEX idx_line_templates_category ON line_message_templates(company_id, category);
CREATE INDEX idx_line_templates_active ON line_message_templates(company_id, is_active);

-- ============================================================
-- TABLE: line_notification_preferences
-- User preferences for LINE notifications
-- ============================================================
CREATE TABLE line_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Notification type preferences (true = receive via LINE)
    shift_published BOOLEAN DEFAULT true,
    shift_changed BOOLEAN DEFAULT true,
    shift_reminder BOOLEAN DEFAULT true,
    leave_approved BOOLEAN DEFAULT true,
    leave_rejected BOOLEAN DEFAULT true,
    attendance_late BOOLEAN DEFAULT false,
    attendance_missing BOOLEAN DEFAULT true,
    announcements BOOLEAN DEFAULT true,

    -- Reminder settings
    shift_reminder_hours_before INTEGER DEFAULT 24, -- Hours before shift to send reminder

    -- Quiet hours (don't send notifications during these hours)
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '07:00',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

CREATE INDEX idx_line_prefs_user ON line_notification_preferences(user_id);
CREATE INDEX idx_line_prefs_company ON line_notification_preferences(company_id);

-- ============================================================
-- TABLE: line_message_history
-- Log of all sent LINE messages for audit
-- ============================================================
CREATE TABLE line_message_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    recipient_line_user_id VARCHAR(255), -- Store LINE user ID for reference even if user is deleted
    recipient_name VARCHAR(255), -- Store name for reference

    -- Message content
    message TEXT NOT NULL,
    message_th TEXT,
    template_id UUID REFERENCES line_message_templates(id) ON DELETE SET NULL,
    template_name VARCHAR(100), -- Store template name for reference

    -- Sender info
    sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
    sent_by_name VARCHAR(255), -- Store name for reference

    -- Status
    status VARCHAR(20) DEFAULT 'sent', -- sent, failed, delivered, read
    line_message_id VARCHAR(255), -- LINE API message ID
    error_message TEXT,

    -- Metadata
    context VARCHAR(50), -- e.g., 'bulk_message', 'shift_reminder', 'manual'
    context_data JSONB DEFAULT '{}', -- Additional context like shift_id, etc.

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_line_history_company ON line_message_history(company_id, created_at DESC);
CREATE INDEX idx_line_history_recipient ON line_message_history(recipient_user_id, created_at DESC);
CREATE INDEX idx_line_history_employee ON line_message_history(recipient_employee_id, created_at DESC);
CREATE INDEX idx_line_history_sent_by ON line_message_history(sent_by, created_at DESC);
CREATE INDEX idx_line_history_status ON line_message_history(company_id, status);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER update_line_templates_updated_at
    BEFORE UPDATE ON line_message_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_line_prefs_updated_at
    BEFORE UPDATE ON line_notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- INSERT DEFAULT SYSTEM TEMPLATES
-- ============================================================
-- Note: These will be inserted per-company when a company is created
-- or can be inserted manually for existing companies

-- Function to create default templates for a company
CREATE OR REPLACE FUNCTION create_default_line_templates(p_company_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO line_message_templates (company_id, name, name_th, category, message, message_th, variables, is_system)
    VALUES
    (p_company_id, 'Shift Reminder', 'แจ้งเตือนกะงาน', 'shift_reminder',
     'Reminder: You have a shift tomorrow at {{location}} from {{startTime}} to {{endTime}}.',
     'แจ้งเตือน: คุณมีกะงานพรุ่งนี้ที่ {{location}} เวลา {{startTime}} - {{endTime}}',
     '["location", "startTime", "endTime", "date"]'::jsonb, true),

    (p_company_id, 'Shift Change Notification', 'แจ้งเปลี่ยนกะงาน', 'shift_change',
     'Your shift on {{date}} has been changed. New time: {{startTime}} - {{endTime}} at {{location}}.',
     'กะงานของคุณวันที่ {{date}} ถูกเปลี่ยน เวลาใหม่: {{startTime}} - {{endTime}} ที่ {{location}}',
     '["date", "startTime", "endTime", "location"]'::jsonb, true),

    (p_company_id, 'Leave Approved', 'อนุมัติการลา', 'leave_approved',
     'Your leave request from {{startDate}} to {{endDate}} has been approved.',
     'คำขอลาของคุณวันที่ {{startDate}} ถึง {{endDate}} ได้รับการอนุมัติแล้ว',
     '["startDate", "endDate", "leaveType"]'::jsonb, true),

    (p_company_id, 'Leave Rejected', 'ปฏิเสธการลา', 'leave_rejected',
     'Your leave request from {{startDate}} to {{endDate}} has been rejected. Reason: {{reason}}',
     'คำขอลาของคุณวันที่ {{startDate}} ถึง {{endDate}} ถูกปฏิเสธ เหตุผล: {{reason}}',
     '["startDate", "endDate", "leaveType", "reason"]'::jsonb, true),

    (p_company_id, 'Late Arrival Warning', 'แจ้งเตือนมาสาย', 'attendance_late',
     'You clocked in late today at {{clockInTime}}. Your shift started at {{shiftStartTime}}.',
     'คุณลงเวลาเข้างานสายวันนี้เวลา {{clockInTime}} กะงานเริ่ม {{shiftStartTime}}',
     '["clockInTime", "shiftStartTime", "minutesLate"]'::jsonb, true),

    (p_company_id, 'Missing Clock-in Alert', 'แจ้งเตือนไม่ลงเวลา', 'attendance_missing',
     'Alert: You have not clocked in for your shift at {{location}} that started at {{shiftStartTime}}.',
     'แจ้งเตือน: คุณยังไม่ได้ลงเวลาเข้างานที่ {{location}} ซึ่งเริ่มเวลา {{shiftStartTime}}',
     '["location", "shiftStartTime", "date"]'::jsonb, true),

    (p_company_id, 'General Announcement', 'ประกาศทั่วไป', 'announcement',
     '{{message}}',
     '{{message}}',
     '["message"]'::jsonb, true);
END;
$$ LANGUAGE plpgsql;
