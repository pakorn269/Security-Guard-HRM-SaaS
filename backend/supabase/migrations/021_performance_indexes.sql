-- Migration: 021_performance_indexes.sql
-- Description: Add composite indexes for common query patterns to improve performance
-- Created: 2026-02-01

-- ============================================================================
-- LEAVE REQUESTS INDEXES
-- ============================================================================

-- Composite index for listing leave requests by company and status with date ordering
-- Optimizes: GET /leave/requests?status=pending&orderBy=start_date
-- Query pattern: WHERE company_id = ? AND status = ? ORDER BY start_date DESC
CREATE INDEX IF NOT EXISTS idx_leave_requests_company_status_date
ON leave_requests(company_id, status, start_date DESC)
WHERE status IS NOT NULL;

-- Composite index for employee's leave requests ordered by date
-- Optimizes: GET /leave/my-requests (employee view)
-- Query pattern: WHERE employee_id = ? ORDER BY start_date DESC
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_date
ON leave_requests(employee_id, start_date DESC);

-- Index for date range queries (calendar view, analytics)
-- Optimizes: Calendar queries, overlapping leave detection
-- Query pattern: WHERE company_id = ? AND start_date >= ? AND end_date <= ?
CREATE INDEX IF NOT EXISTS idx_leave_requests_company_date_range
ON leave_requests(company_id, start_date, end_date)
WHERE status IN ('approved', 'pending');

-- Index for reviewer queries (manager's pending approvals)
-- Optimizes: GET /leave/requests?status=pending (for managers)
-- Query pattern: WHERE company_id = ? AND status = 'pending'
CREATE INDEX IF NOT EXISTS idx_leave_requests_company_pending
ON leave_requests(company_id, created_at DESC)
WHERE status = 'pending';

-- ============================================================================
-- LEAVE BALANCES INDEXES
-- ============================================================================

-- Composite index for balance queries by company and year
-- Optimizes: GET /leave/balances?year=2024
-- Query pattern: WHERE company_id = ? AND year = ?
CREATE INDEX IF NOT EXISTS idx_leave_balances_company_year
ON leave_balances(company_id, year, employee_id);

-- Index for employee balance lookups
-- Optimizes: Employee dashboard balance display
-- Query pattern: WHERE employee_id = ? AND year = ? AND leave_type_id = ?
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_year_type
ON leave_balances(employee_id, year, leave_type_id);

-- Index for analytics queries (utilization reports)
-- Optimizes: Analytics aggregations by year
-- Query pattern: WHERE company_id = ? AND year = ? (for aggregations)
CREATE INDEX IF NOT EXISTS idx_leave_balances_analytics
ON leave_balances(company_id, year, leave_type_id)
INCLUDE (entitled_days, used_days, pending_days);

-- ============================================================================
-- LEAVE BALANCE ADJUSTMENTS INDEXES
-- ============================================================================

-- Index for balance adjustment history
-- Optimizes: GET /leave/balances/:id/adjustments
-- Query pattern: WHERE balance_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_balance_created
ON leave_balance_adjustments(balance_id, created_at DESC);

-- Index for audit trail queries
-- Optimizes: Audit reports, adjustment tracking
-- Query pattern: WHERE company_id = ? AND created_at >= ?
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_company_date
ON leave_balance_adjustments(company_id, created_at DESC);

-- ============================================================================
-- LEAVE TYPES INDEXES
-- ============================================================================

-- Index for active leave types by company
-- Optimizes: Leave type dropdowns, form options
-- Query pattern: WHERE company_id = ? AND is_active = true ORDER BY sort_order
CREATE INDEX IF NOT EXISTS idx_leave_types_company_active
ON leave_types(company_id, sort_order)
WHERE is_active = true;

-- ============================================================================
-- LEAVE REQUEST TEMPLATES INDEXES
-- ============================================================================

-- Index for active templates by company
-- Optimizes: Template selector in leave request forms
-- Query pattern: WHERE company_id = ? AND is_active = true ORDER BY sort_order
CREATE INDEX IF NOT EXISTS idx_leave_templates_company_active
ON leave_request_templates(company_id, sort_order)
WHERE is_active = true;

-- ============================================================================
-- SHIFT REPLACEMENTS INDEXES
-- ============================================================================
-- Note: Commented out until shift_replacements table is created
-- These indexes will be added when the replacement feature is implemented

-- -- Index for replacement assignments by leave request
-- -- Optimizes: Loading replacements when viewing/approving leave
-- -- Query pattern: WHERE leave_request_id = ?
-- CREATE INDEX IF NOT EXISTS idx_shift_replacements_leave_request
-- ON shift_replacements(leave_request_id);

-- -- Index for replacement assignments by shift
-- -- Optimizes: Shift view showing replacement info
-- -- Query pattern: WHERE original_shift_id = ?
-- CREATE INDEX IF NOT EXISTS idx_shift_replacements_shift
-- ON shift_replacements(original_shift_id);

-- -- Index for replacement employee workload
-- -- Optimizes: Finding all replacements assigned to an employee
-- -- Query pattern: WHERE replacement_employee_id = ? AND date >= ?
-- CREATE INDEX IF NOT EXISTS idx_shift_replacements_replacement_date
-- ON shift_replacements(replacement_employee_id, date DESC);

-- ============================================================================
-- COVERING INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Covering index for leave request list (avoids table lookups)
-- Includes frequently accessed columns
CREATE INDEX IF NOT EXISTS idx_leave_requests_list_covering
ON leave_requests(company_id, status, start_date DESC)
INCLUDE (employee_id, leave_type_id, total_days, created_at);

-- Covering index for balance calculations
-- Includes all balance-related columns
CREATE INDEX IF NOT EXISTS idx_leave_balances_calculation_covering
ON leave_balances(employee_id, year, leave_type_id)
INCLUDE (entitled_days, used_days, pending_days);

-- ============================================================================
-- PARTIAL INDEXES FOR SPECIFIC USE CASES
-- ============================================================================

-- Partial index for upcoming approved leaves (reminders, calendar)
-- Only indexes approved leaves (use application logic to filter by date)
CREATE INDEX IF NOT EXISTS idx_leave_requests_upcoming
ON leave_requests(company_id, start_date)
WHERE status = 'approved';

-- Partial index for pending requests requiring action
-- Only indexes pending requests for quick manager view
CREATE INDEX IF NOT EXISTS idx_leave_requests_action_required
ON leave_requests(company_id, employee_id, created_at DESC)
WHERE status = 'pending';

-- ============================================================================
-- ANALYTICS-SPECIFIC INDEXES
-- ============================================================================

-- Index for trending analysis by date
-- Optimizes: Monthly/yearly leave trend reports
-- Note: DATE_TRUNC is not immutable, so we index the raw date and do grouping in queries
CREATE INDEX IF NOT EXISTS idx_leave_requests_analytics_date
ON leave_requests(company_id, start_date, leave_type_id)
WHERE status = 'approved';

-- Index for type distribution analysis
-- Optimizes: Leave type distribution pie charts and analytics
CREATE INDEX IF NOT EXISTS idx_leave_requests_type_analytics
ON leave_requests(company_id, leave_type_id, start_date)
WHERE status = 'approved';

-- ============================================================================
-- CLEANUP: Remove redundant single-column indexes if they exist
-- ============================================================================

-- Note: Only drop if they're truly redundant with new composite indexes
-- PostgreSQL can use composite indexes for queries on leading columns

-- Comment explaining index usage:
-- - Composite indexes are used left-to-right
-- - idx_leave_requests_company_status_date can be used for:
--   * (company_id)
--   * (company_id, status)
--   * (company_id, status, start_date)
-- - But NOT for (status) or (start_date) alone

-- ============================================================================
-- INDEX MAINTENANCE RECOMMENDATIONS
-- ============================================================================

-- Run these commands periodically (weekly/monthly) in production:

-- ANALYZE leave_requests;
-- ANALYZE leave_balances;
-- ANALYZE leave_balance_adjustments;
-- ANALYZE leave_types;
-- ANALYZE leave_request_templates;
-- ANALYZE shift_replacements;

-- Monitor index usage with:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan ASC;

-- Check for unused indexes:
-- SELECT schemaname, tablename, indexname
-- FROM pg_stat_user_indexes
-- WHERE idx_scan = 0 AND schemaname = 'public'
-- ORDER BY pg_relation_size(indexrelid) DESC;

COMMENT ON INDEX idx_leave_requests_company_status_date IS 'Composite index for filtering leave requests by company, status, and ordering by date';
COMMENT ON INDEX idx_leave_requests_employee_date IS 'Optimizes employee leave request history queries';
COMMENT ON INDEX idx_leave_balances_company_year IS 'Optimizes balance queries by company and year';
COMMENT ON INDEX idx_balance_adjustments_balance_created IS 'Optimizes balance adjustment history retrieval';
