-- Migration: 020_email_preferences.sql
-- Description: Add email notification preferences to users table
-- Created: 2026-02-01

-- Add email_notifications column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_notifications JSONB NOT NULL DEFAULT '{
  "request": true,
  "approval": true,
  "reminder": true
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN users.email_notifications IS 'Email notification preferences: request (new leave request), approval (status change), reminder (upcoming leave)';

-- Create index for querying users with specific notification preferences enabled
CREATE INDEX IF NOT EXISTS idx_users_email_notifications
ON users USING gin (email_notifications);

-- Example query to find users with request notifications enabled:
-- SELECT * FROM users WHERE email_notifications->>'request' = 'true';
