# Leave Management Module - Implementation Roadmap

## Executive Summary

**Current Implementation Status:**
- ✅ **Backend: 100% Complete** - Full service layer (1,339 lines), REST API, validation, types, and RLS policies
- ✅ **Frontend: 100% Complete** - 4 major pages with complete CRUD operations and interactive calendar
- ✅ **Database: 100% Complete** - All tables with proper constraints, indexes, and RLS policies
- ⚠️ **Testing: ~30% Complete** - Backend has basic tests, frontend has zero tests

**Key Findings:**
The leave management module is remarkably complete with production-ready features including:
- Multi-tenant isolation with RLS
- Full approval workflow with reviewer tracking
- Automatic balance management
- Shift conflict detection
- LINE notification integration
- Mobile-optimized LIFF interface
- Interactive calendar view

**Critical Gaps:**
1. ❌ Document upload UI not implemented (backend field exists but no file upload flow)
2. ❌ Frontend unit tests completely missing
3. ❌ Replacement guard workflow (when someone takes leave, who covers their shifts?)
4. ⚠️ Backend test coverage incomplete

---

## Phase 1: Quick Wins & Foundation (1-2 days)

### 🎯 Goal: Complete essential missing features with immediate business value

#### Task 1.1: Document Upload Implementation

**Problem:** The `document_url` field exists in `leave_requests` table and API, but no UI for file upload exists.

**Schema Setup Required:**
```sql
-- Create Supabase Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('leave-documents', 'leave-documents', false);

-- RLS policies for leave-documents bucket
CREATE POLICY "Users can upload own company documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'leave-documents' AND (storage.foldername(name))[1] = auth.jwt()->>'company_id');

CREATE POLICY "Users can view own company documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'leave-documents' AND (storage.foldername(name))[1] = auth.jwt()->>'company_id');
```

**Backend Files to Create:**

1. **`backend/src/services/storage.service.ts`** (~150 lines)
   - `uploadLeaveDocument(file: File, companyId: string, requestId: string): Promise<string>`
   - `getLeaveDocumentUrl(path: string): Promise<string>` - Generate signed URL
   - `deleteLeaveDocument(path: string): Promise<void>`
   - Naming pattern: `{companyId}/{leaveRequestId}/{timestamp}-{filename}`
   - Validation: PDF, JPG, PNG only, max 5MB

2. **`backend/src/middleware/upload.middleware.ts`** (~80 lines)
   - Multer configuration for file validation
   - File type and size validation
   - Error handling for invalid uploads

**Backend Files to Modify:**

1. **`backend/src/modules/leave/leave.routes.ts`**
   - Add: `POST /leave-requests/:id/document` - Upload document
   - Add: `DELETE /leave-requests/:id/document` - Remove document
   - Use upload middleware

2. **`backend/src/modules/leave/leave.controller.ts`**
   - Add `uploadDocument` handler
   - Add `deleteDocument` handler
   - Verify request ownership before upload

3. **`backend/src/modules/leave/leave.service.ts`**
   - Add `updateDocumentUrl(requestId: string, documentUrl: string): Promise<void>`
   - Add validation: Check if leave type requires document

**Frontend Files to Modify:**

1. **`frontend/src/pages/liff/LiffLeavePage.tsx`** (lines 200-250)
   - Add FileUpload component to leave request form
   - Show upload progress indicator
   - Display uploaded file preview
   - Add remove file button

2. **`frontend/src/pages/leave/LeavePage.tsx`** (lines 400-450)
   - Show document preview/link in approval modal
   - Add download button for uploaded documents
   - Display "Document Required" badge when missing

3. **`frontend/src/services/leave.service.ts`**
   - Add `uploadLeaveDocument(requestId: string, file: File): Promise<void>`
   - Add `deleteLeaveDocument(requestId: string): Promise<void>`
   - Add `getLeaveDocumentUrl(requestId: string): Promise<string>`

**Dependencies:**
- None - can start immediately
- Follows existing FileUpload.tsx component pattern (if exists, otherwise create simple upload component)

**Validation Rules:**
- If `leave_types.requires_document = true`, upload is mandatory
- File size limit: 5MB
- Allowed types: PDF, JPG, PNG
- One document per request (replace if re-uploaded)

---

#### Task 1.2: Frontend Test Suite Setup

**Problem:** Zero test coverage for leave pages and components - high risk of regressions.

**Test Files to Create:**

1. **`frontend/src/pages/leave/LeavePage.test.tsx`** (~300 lines)
   - Component rendering with mock data
   - Dashboard stats calculation
   - Filter interactions (status, date range, leave type)
   - Pagination navigation
   - Approval modal flow (approve with notes)
   - Rejection modal flow (reject with notes)
   - Error handling and loading states
   - Data table sorting

2. **`frontend/src/pages/leave/LeaveTypesPage.test.tsx`** (~250 lines)
   - List rendering with active/inactive filter
   - Create leave type modal
   - Edit leave type modal
   - Delete confirmation
   - Form validation errors
   - Success/error notifications

3. **`frontend/src/pages/leave/LeaveBalancesPage.test.tsx`** (~200 lines)
   - Balance list rendering
   - Year filter
   - Leave type filter
   - Initialize balances bulk action
   - Pagination
   - Visual indicators (color-coded remaining days)

4. **`frontend/src/pages/liff/LiffLeavePage.tsx.test.tsx`** (~350 lines)
   - LIFF initialization mocking
   - Balance display with progress bars
   - Leave request form submission
   - Date range selection
   - Auto-calculated days
   - Cancel pending request
   - Mobile layout rendering
   - Dark mode support

5. **`frontend/src/components/leave/LeaveCalendar.test.tsx`** (~250 lines)
   - Calendar grid rendering
   - Month navigation (previous/next/today)
   - Leave indicators display
   - Selected day details panel
   - Employee list for selected day
   - Color-coding by leave type
   - Weekend highlighting
   - Thai date formatting

6. **`frontend/src/test/setup/leave-mocks.ts`** (~150 lines)
   - Mock leave types data
   - Mock leave requests data
   - Mock leave balances data
   - Mock API service responses
   - Shared test utilities

**Testing Pattern to Follow:**
```typescript
// Based on LiffClockPage.test.tsx pattern
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock services
vi.mock('../../services/leave.service')

// Test structure:
describe('LeavePage', () => {
  beforeEach(() => {
    // Reset mocks
  })

  it('renders dashboard stats correctly', () => {})
  it('filters requests by status', () => {})
  it('approves request with notes', () => {})
  // ... more tests
})
```

**Coverage Goals:**
- Component rendering: 100%
- User interactions: 80%+
- Error scenarios: 80%+
- Loading states: 100%

**Estimated Total Lines:** ~1,500 lines across all test files

---

#### Task 1.3: Enhanced Backend Test Coverage

**Problem:** Backend test file exists (`leave.service.test.ts`) but appears incomplete at 926 lines for a 1,339-line service.

**File to Modify:**
- `backend/src/modules/leave/leave.service.test.ts`

**Missing Test Scenarios to Add:**

1. **Shift Conflict Detection** (~80 lines)
   - Test logging when leave overlaps with published shifts
   - Multiple shifts in date range
   - Partial day overlaps
   - No conflicts scenario

2. **Multi-Year Balance Tracking** (~100 lines)
   - Balance creation for new year
   - Year rollover scenarios
   - Querying balances across multiple years
   - Historical balance integrity

3. **Auto-Approval Workflow** (~60 lines)
   - Leave types with `requiresApproval: false`
   - Instant approval and balance update
   - Notification sent immediately

4. **Notification Integration** (~120 lines)
   - Mock LINE notification service
   - Mock in-app notification service
   - Test notifications on: create, approve, reject, cancel
   - Notification failure handling (shouldn't block operations)

5. **Edge Cases** (~150 lines)
   - Cancelling leave that has already started
   - Multiple pending requests for same dates (should be allowed)
   - Balance adjustments when entitlement changes
   - Concurrent request handling (race conditions)
   - Approving leave with insufficient balance (should reject)
   - Deleting leave type with existing requests (should fail)

6. **Integration Test Scenarios** (~200 lines)
   - Full lifecycle: create → approve → balance update → notification sent
   - Full lifecycle: create → reject → balance unchanged
   - Full lifecycle: create → approve → cancel → balance restored
   - Calendar endpoint with overlapping leaves from multiple employees
   - Bulk balance initialization for new year with existing data

**Testing Best Practices:**
- Use transactions and rollback for each test
- Mock external services (Supabase, LINE API)
- Test both success and failure paths
- Verify database state after operations
- Check notification payloads

**Target Test Coverage:** ~1,400 total lines (add ~480 lines)

---

## Phase 2: Core Enhancements (3-5 days)

### 🎯 Goal: Essential features to complete the module for production readiness

#### Task 2.1: Replacement Guard Workflow

**Business Problem:**
When a guard takes approved leave, their assigned shifts need coverage. Currently, the system detects conflicts but doesn't provide a workflow to assign replacements.

**Database Schema Changes Required:**

**File to Create:** `backend/supabase/migrations/003_shift_replacement.sql`

```sql
-- Add replacement tracking to shifts table
ALTER TABLE shifts ADD COLUMN replaced_by_employee_id UUID REFERENCES employees(id);
ALTER TABLE shifts ADD COLUMN is_replacement BOOLEAN DEFAULT FALSE;
ALTER TABLE shifts ADD COLUMN original_employee_id UUID; -- Track who was originally assigned
ALTER TABLE shifts ADD COLUMN replacement_reason TEXT; -- Link to leave request or other reason

CREATE INDEX idx_shifts_replacement ON shifts(replaced_by_employee_id);
CREATE INDEX idx_shifts_is_replacement ON shifts(is_replacement) WHERE is_replacement = true;

-- Add shift tracking to leave requests
ALTER TABLE leave_requests ADD COLUMN affected_shift_ids UUID[] DEFAULT '{}';
ALTER TABLE leave_requests ADD COLUMN replacements_assigned BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_leave_requests_shift_ids ON leave_requests USING GIN(affected_shift_ids);
CREATE INDEX idx_leave_requests_needs_replacement ON leave_requests(replacements_assigned)
  WHERE status = 'approved' AND replacements_assigned = false;

-- Update RLS policies for replacement scenarios
-- (Replacement guards should see shifts assigned to them)
```

**Backend Files to Create:**

1. **`backend/src/modules/leave/replacement.service.ts`** (~400 lines)

   **Key Methods:**
   ```typescript
   // Find shifts that conflict with approved leave
   async findConflictingShifts(employeeId: string, startDate: Date, endDate: Date): Promise<Shift[]>

   // Get available guards for replacement (same role, not on leave, not already assigned)
   async getAvailableReplacements(shiftId: string, date: Date): Promise<Employee[]>

   // Assign replacement guard to shift
   async assignReplacement(shiftId: string, replacementEmployeeId: string, reason: string): Promise<void>

   // Bulk assign replacements for a leave request
   async assignReplacementsForLeave(leaveRequestId: string, replacements: Map<string, string>): Promise<void>

   // Notify both original guard and replacement
   async notifyReplacementAssignment(shiftId: string): Promise<void>
   ```

2. **`backend/src/modules/leave/leave.types.ts`** (add types)
   ```typescript
   export interface ShiftConflict {
     shiftId: string
     date: Date
     siteId: string
     siteName: string
     startTime: string
     endTime: string
     requiresReplacement: boolean
   }

   export interface ReplacementAssignment {
     shiftId: string
     replacementEmployeeId: string
   }

   export interface LeaveApprovalWithReplacements {
     leaveRequestId: string
     notes?: string
     replacements?: ReplacementAssignment[]
   }
   ```

**Backend Files to Modify:**

1. **`backend/src/modules/leave/leave.service.ts`**
   - Modify `approveLeaveRequest` to:
     - Call `replacementService.findConflictingShifts()`
     - Return conflicts in response
     - If replacements provided, assign them
     - Update `affected_shift_ids` and `replacements_assigned`

2. **`backend/src/modules/leave/leave.controller.ts`**
   - Modify `approveLeaveRequest` to accept `replacements` array
   - Add validation for replacement assignments

3. **`backend/src/modules/leave/leave.routes.ts`**
   - Add: `GET /leave-requests/:id/conflicts` - Get conflicting shifts
   - Add: `GET /shifts/:id/available-replacements` - Get available guards
   - Add: `POST /leave-requests/:id/assign-replacements` - Bulk assign

**Frontend Files to Create:**

1. **`frontend/src/components/leave/ShiftConflictAlert.tsx`** (~150 lines)
   - Warning component showing affected shifts
   - Table with shift details (date, site, time)
   - "Assign Replacement" button per shift
   - Summary: "X shifts require replacement"

2. **`frontend/src/components/leave/ReplacementModal.tsx`** (~300 lines)
   - Modal to assign replacement guards
   - List of conflicting shifts
   - Dropdown per shift with available replacements
   - Shows replacement guard details (name, role, availability)
   - "Assign All" and "Skip" options
   - Approval with/without replacements

**Frontend Files to Modify:**

1. **`frontend/src/pages/leave/LeavePage.tsx`** (lines 350-400, approval modal section)
   - Fetch conflicts when approval modal opens
   - Show ShiftConflictAlert if conflicts exist
   - Add "View & Assign Replacements" button
   - Open ReplacementModal
   - Submit approval with replacement assignments

2. **`frontend/src/services/leave.service.ts`**
   ```typescript
   async getLeaveRequestConflicts(requestId: string): Promise<ShiftConflict[]>
   async getAvailableReplacements(shiftId: string): Promise<Employee[]>
   async approveWithReplacements(requestId: string, data: ApprovalWithReplacements): Promise<void>
   ```

**Workflow:**
```
Manager clicks "Approve" →
  System checks for shift conflicts →
    If conflicts exist:
      Show ShiftConflictAlert in modal →
      Manager clicks "Assign Replacements" →
      ReplacementModal opens with conflict list →
      Manager selects replacement guard per shift →
      Manager clicks "Approve with Replacements" →
      System: approves leave + assigns replacements + sends notifications
    If no conflicts:
      Normal approval flow
```

**Notifications:**
- Original guard: "Your leave is approved. [Name] will cover your shifts."
- Replacement guard: "You've been assigned to cover shifts for [Name] on [dates]."
- Manager: "Leave approved with [X] replacements assigned."

---

#### Task 2.2: Advanced Calendar Features

**Current State:** LeaveCalendar.tsx shows basic monthly view with leave dots.

**Enhancements:**

**Files to Modify:**

1. **`frontend/src/components/leave/LeaveCalendar.tsx`** (add ~200 lines)

   **New Features:**

   a) **Multiple View Modes** (Month/Week/Day)
   ```typescript
   type CalendarView = 'month' | 'week' | 'day'
   const [view, setView] = useState<CalendarView>('month')
   ```
   - Month: Current grid view (default)
   - Week: 7-column layout with hourly rows (show shift times)
   - Day: Single day with timeline view

   b) **Enhanced Color-Coding**
   - Each leave type gets a unique color (from leave type config)
   - Visual legend at top of calendar
   - Color-coded dots/blocks in calendar cells

   c) **Team/Department Filter**
   ```typescript
   const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
   ```
   - Dropdown to filter by team
   - Show only leaves for selected team members

   d) **Interactive Tooltips**
   - Hover over leave indicator → Show tooltip with:
     - Employee name
     - Leave type
     - Date range
     - Status
   - Use Radix UI Tooltip component

   e) **Click to View Details**
   - Click on leave indicator → Open LeaveDetailsModal
   - Show full request details
   - Quick approve/reject from modal (if pending)

   f) **Export to iCal**
   - "Export Calendar" button
   - Downloads `.ics` file with all leave events
   - Can import into Google Calendar, Outlook, etc.

**Backend Files to Create:**

2. **`backend/src/modules/leave/leave.export.ts`** (~150 lines)
   ```typescript
   import ical from 'ical-generator'

   async function exportLeaveCalendar(
     companyId: string,
     startDate: Date,
     endDate: Date,
     filters?: LeaveCalendarFilters
   ): Promise<string> {
     // Fetch leave requests
     // Generate iCal format
     // Return .ics file content
   }
   ```

**Backend Files to Modify:**

3. **`backend/src/modules/leave/leave.routes.ts`**
   - Add: `GET /leave/export/ical` - Download calendar file
   - Query params: startDate, endDate, teamId, status

**Dependencies:**
- Install: `npm install ical-generator` (backend)
- Install: `npm install @radix-ui/react-tooltip` (frontend, if not already)

**UI Improvements:**
- Add view toggle buttons (Month/Week/Day) in header
- Add team filter dropdown
- Add "Export" button with download icon
- Improve mobile responsiveness for week/day views

---

#### Task 2.3: Leave Balance Adjustments & Audit Trail

**Business Need:**
HR needs to manually adjust leave balances (pro-rated for mid-year hires, corrections, special allowances) with full audit trail.

**Database Schema Changes:**

**File to Create:** `backend/supabase/migrations/004_leave_balance_audit.sql`

```sql
CREATE TABLE leave_balance_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    balance_id UUID NOT NULL REFERENCES leave_balances(id),
    employee_id UUID NOT NULL REFERENCES employees(id), -- Denormalized for easier queries
    leave_type_id UUID NOT NULL REFERENCES leave_types(id), -- Denormalized
    year INT NOT NULL,

    -- Who made the change
    adjusted_by UUID NOT NULL REFERENCES users(id),

    -- What changed
    field_name VARCHAR(50) NOT NULL, -- 'entitled_days', 'used_days', etc.
    previous_value DECIMAL(5,2) NOT NULL,
    new_value DECIMAL(5,2) NOT NULL,
    adjustment_amount DECIMAL(5,2) GENERATED ALWAYS AS (new_value - previous_value) STORED,

    -- Why
    reason TEXT NOT NULL,
    adjustment_type VARCHAR(50), -- 'pro_rated', 'correction', 'special_allowance', 'carry_forward'

    -- When
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_balance_adjustments_company ON leave_balance_adjustments(company_id);
CREATE INDEX idx_balance_adjustments_balance ON leave_balance_adjustments(balance_id);
CREATE INDEX idx_balance_adjustments_employee ON leave_balance_adjustments(employee_id);
CREATE INDEX idx_balance_adjustments_date ON leave_balance_adjustments(created_at DESC);

-- RLS policies
ALTER TABLE leave_balance_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view own company adjustments"
ON leave_balance_adjustments FOR SELECT
TO authenticated
USING (company_id = (auth.jwt() -> 'company_id')::uuid);

CREATE POLICY "Only managers can create adjustments"
ON leave_balance_adjustments FOR INSERT
TO authenticated
WITH CHECK (
    company_id = (auth.jwt() -> 'company_id')::uuid
    AND (auth.jwt() -> 'role')::text IN ('company_admin', 'manager')
);
```

**Backend Files to Create:**

1. **`backend/src/modules/leave/balance-adjustment.service.ts`** (~250 lines)

   ```typescript
   // Adjust balance with audit trail
   async adjustBalance(data: {
     balanceId: string
     fieldName: 'entitled_days' | 'used_days'
     newValue: number
     reason: string
     adjustmentType: string
     adjustedBy: string
   }): Promise<void>

   // Get adjustment history for a balance
   async getAdjustmentHistory(balanceId: string): Promise<BalanceAdjustment[]>

   // Get all adjustments for an employee
   async getEmployeeAdjustments(employeeId: string, year?: number): Promise<BalanceAdjustment[]>

   // Bulk adjustment (e.g., pro-rate for all mid-year hires)
   async bulkAdjust(adjustments: BulkAdjustment[]): Promise<void>
   ```

**Backend Files to Modify:**

2. **`backend/src/modules/leave/leave.service.ts`**
   - Modify `updateBalance` to call `adjustmentService.adjustBalance()`
   - Ensure all balance updates go through audit trail

3. **`backend/src/modules/leave/leave.routes.ts`**
   - Add: `GET /leave-balances/:id/adjustments` - View adjustment history
   - Add: `POST /leave-balances/:id/adjust` - Create adjustment
   - Add RBAC: `requireRole(['company_admin', 'manager'])`

**Frontend Files to Create:**

1. **`frontend/src/components/leave/BalanceAdjustmentModal.tsx`** (~200 lines)
   - Form with fields:
     - Field to adjust (entitled_days / used_days)
     - New value (number input with validation)
     - Adjustment type (dropdown: pro-rated, correction, special allowance, carry forward)
     - Reason (textarea, required, min 10 chars)
   - Show current value and calculated difference
   - Confirmation step: "You are changing [field] from [old] to [new] (-/+ X days)"
   - Submit button (requires manager role)

2. **`frontend/src/components/leave/AdjustmentHistoryModal.tsx`** (~150 lines)
   - Table showing all adjustments for a balance
   - Columns: Date, Adjusted By, Field, Old Value, New Value, Change, Type, Reason
   - Sorted by date (newest first)
   - Pagination for long history
   - Export to CSV button

**Frontend Files to Modify:**

3. **`frontend/src/pages/leave/LeaveBalancesPage.tsx`** (add buttons)
   - Add "Adjust" button per balance row (manager only)
   - Add "History" button to view adjustment log
   - Show indicator if balance has been adjusted (icon/badge)

4. **`frontend/src/services/leave.service.ts`**
   ```typescript
   async adjustLeaveBalance(balanceId: string, data: AdjustmentData): Promise<void>
   async getBalanceAdjustments(balanceId: string): Promise<BalanceAdjustment[]>
   ```

**Validation Rules:**
- Only managers and admins can adjust
- Reason must be at least 10 characters
- New value must be >= 0
- Cannot reduce entitled_days below used_days
- Audit record created before balance update (atomic transaction)

---

#### Task 2.4: Leave Request Templates

**Business Need:**
Speed up common leave requests (e.g., "Week Off", "Maternity Leave", "Training Day") with pre-configured templates.

**Database Schema:**

**File to Create:** `backend/supabase/migrations/005_leave_templates.sql`

```sql
CREATE TABLE leave_request_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),

    -- Template details
    name VARCHAR(255) NOT NULL, -- "Week Off", "Maternity Leave"
    name_th VARCHAR(255),
    description TEXT,

    -- Pre-fill values
    leave_type_id UUID NOT NULL REFERENCES leave_types(id),
    default_days_count INT, -- Optional: auto-calculate end date
    default_reason TEXT, -- Optional: pre-fill reason

    -- Configuration
    is_active BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT TRUE, -- Override leave type setting
    sort_order INT DEFAULT 0,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_company ON leave_request_templates(company_id);
CREATE INDEX idx_templates_active ON leave_request_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_templates_sort ON leave_request_templates(company_id, sort_order);

-- RLS policies
ALTER TABLE leave_request_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view templates"
ON leave_request_templates FOR SELECT
TO authenticated
USING (company_id = (auth.jwt() -> 'company_id')::uuid AND is_active = true);

CREATE POLICY "Only admins can manage templates"
ON leave_request_templates FOR ALL
TO authenticated
USING (
    company_id = (auth.jwt() -> 'company_id')::uuid
    AND (auth.jwt() -> 'role')::text IN ('company_admin', 'manager')
);
```

**Backend Files to Create:**

1. **`backend/src/modules/leave/template.service.ts`** (~200 lines)
   ```typescript
   async listTemplates(companyId: string, activeOnly: boolean = true): Promise<Template[]>
   async getTemplateById(id: string): Promise<Template>
   async createTemplate(data: CreateTemplateData): Promise<Template>
   async updateTemplate(id: string, data: UpdateTemplateData): Promise<Template>
   async deleteTemplate(id: string): Promise<void>
   async applyTemplate(templateId: string, startDate: Date): Promise<LeaveRequestDraft>
   ```

**Backend Files to Modify:**

2. **`backend/src/modules/leave/leave.routes.ts`**
   - Add routes under `/leave-templates`:
     - `GET /leave-templates` - List templates
     - `POST /leave-templates` - Create (admin only)
     - `PUT /leave-templates/:id` - Update (admin only)
     - `DELETE /leave-templates/:id` - Delete (admin only)
     - `POST /leave-templates/:id/apply` - Get pre-filled request data

**Frontend Files to Create:**

1. **`frontend/src/components/leave/TemplateSelector.tsx`** (~180 lines)
   - Grid or list of template cards
   - Each card shows:
     - Template name (bilingual)
     - Leave type badge
     - Default days (if set)
     - Description
   - Click template → Auto-fill form
   - "Create from Template" button in LiffLeavePage

2. **`frontend/src/pages/leave/LeaveTemplatesPage.tsx`** (~300 lines)
   - Admin page to manage templates
   - CRUD operations
   - Drag-and-drop reordering (sort_order)
   - Active/inactive toggle
   - Preview template (shows what guards see)

**Frontend Files to Modify:**

3. **`frontend/src/pages/liff/LiffLeavePage.tsx`** (add template selector)
   - Add "Use Template" button above form
   - Opens TemplateSelector modal
   - On template selection:
     - Auto-fill leave type
     - Auto-fill reason (if default exists)
     - Calculate end date from start date + days_count
   - Guard can still modify all fields

4. **`frontend/src/services/leave.service.ts`**
   ```typescript
   async listTemplates(): Promise<Template[]>
   async createTemplate(data: CreateTemplateData): Promise<Template>
   async updateTemplate(id: string, data: UpdateTemplateData): Promise<Template>
   async deleteTemplate(id: string): Promise<void>
   async applyTemplate(templateId: string, startDate: string): Promise<LeaveRequestDraft>
   ```

**UX Flow:**
```
LIFF Leave Page → "Use Template" button →
  Template selector modal (grid of templates) →
    Guard selects "Week Off" template →
      Form auto-fills:
        - Leave type: "Annual Leave"
        - Days: 5 (Mon-Fri)
        - Reason: "Personal time off"
      Guard selects start date →
        End date auto-calculated →
          Guard can edit any field →
            Submit request
```

**Benefits:**
- Faster leave requests for guards
- Consistent formatting (standard reasons)
- Reduces errors in date calculations
- Company-specific templates (e.g., "Songkran Holiday" for Thai companies)

---

## Phase 3: Advanced Features & Polish (1-2 weeks)

### 🎯 Goal: Enhanced user experience and operational efficiency

#### Task 3.1: Mobile LIFF Enhancements

**Current State:** LiffLeavePage.tsx has basic form and balance display.

**Enhancements:**

**Files to Modify:**

1. **`frontend/src/pages/liff/LiffLeavePage.tsx`** (add ~250 lines)

**New Features:**

a) **Camera Integration for Documents**
```typescript
// Use LIFF SDK camera permission
const takePhoto = async () => {
  if (liff.isApiAvailable('camera')) {
    const result = await liff.scanCode()
    // Or use HTML5 camera input with mobile optimization
  }
}
```
- "Take Photo" button for document upload
- Direct camera access (LIFF permission)
- Photo preview before upload
- Compress image before sending (reduce file size)

b) **Offline Mode with Queue**
```typescript
// Use IndexedDB to queue requests
const queueLeaveRequest = async (data: LeaveRequest) => {
  await db.pendingRequests.add({
    ...data,
    createdAt: new Date(),
    syncStatus: 'pending'
  })
}

// Sync when online
window.addEventListener('online', syncQueuedRequests)
```
- Detect offline state
- Allow form submission while offline
- Queue in IndexedDB
- Auto-sync when connection restored
- Show sync status indicator

c) **Push Notifications**
```typescript
// LINE Messaging API integration
const sendPushNotification = async (userId: string, message: string) => {
  // Send via backend LINE messaging endpoint
  await lineApi.pushMessage(userId, {
    type: 'text',
    text: message
  })
}
```
- Real-time notifications when:
  - Leave approved/rejected
  - Reminder: Leave starts tomorrow
  - Balance updated
- Use LINE Messaging API (not just in-app)

d) **Quick Actions with Swipe Gestures**
```typescript
// Swipe left on pending request → Cancel
<SwipeableRow onSwipeLeft={() => cancelRequest(request.id)}>
  {/* Request card */}
</SwipeableRow>
```
- Swipe left to cancel pending request
- Swipe right to view details
- Haptic feedback on actions (mobile devices)

e) **Balance Predictions**
```typescript
// Show projected balance after request
const projectedBalance = currentBalance - requestDays
// Display: "After this request, you'll have X days remaining"
```
- Real-time balance calculation
- Warning if balance goes negative
- "What-if" calculator (test different dates)

f) **Recent/Favorite Templates**
- Show last 3 used leave types at top
- "Request Again" button on past requests
- One-tap to copy previous request dates

**Dependencies:**
- `npm install idb` - IndexedDB wrapper for offline storage
- `npm install @radix-ui/react-swipe` - Swipe gesture support (or implement custom)

**Technical Considerations:**
- Test offline functionality thoroughly
- Handle network errors gracefully
- Sync conflicts resolution (if request was rejected while offline)
- Storage quota management for IndexedDB

---

#### Task 3.2: Reporting & Analytics Dashboard

**Business Need:**
HR and management need insights into leave patterns, utilization, and team coverage.

**Files to Create:**

1. **`backend/src/modules/leave/analytics.service.ts`** (~400 lines)

   **Key Reports:**
   ```typescript
   // Leave utilization by employee (% of entitlement used)
   async getUtilizationReport(companyId: string, year: number): Promise<UtilizationReport[]>

   // Trending patterns (which months are busiest)
   async getTrendingReport(companyId: string, startDate: Date, endDate: Date): Promise<TrendData[]>

   // Team coverage analysis (concurrent leaves)
   async getCoverageReport(companyId: string, teamId?: string): Promise<CoverageGap[]>

   // Leave type distribution
   async getTypeDistribution(companyId: string, year: number): Promise<TypeDistribution[]>

   // Approval turnaround time
   async getApprovalMetrics(companyId: string, startDate: Date, endDate: Date): Promise<ApprovalMetrics>

   // Predicted leave (based on historical patterns)
   async getPredictedLeave(companyId: string, nextMonths: number): Promise<Prediction[]>
   ```

2. **`frontend/src/pages/leave/LeaveReportsPage.tsx`** (~500 lines)

   **Dashboard Sections:**

   a) **Overview Stats** (top cards)
   - Total leave days taken (YTD)
   - Average utilization rate
   - Pending approval count
   - Upcoming leave (next 7 days)

   b) **Utilization Chart** (bar chart)
   - X-axis: Employees
   - Y-axis: % of entitlement used
   - Color-coded: <50% (green), 50-80% (yellow), >80% (red)
   - Filter by department/team

   c) **Trending Heatmap** (calendar heatmap)
   - Visual heatmap of leave density by month
   - Darker color = more leaves
   - Click month → See details

   d) **Leave Type Pie Chart**
   - Distribution of leave types taken
   - Show percentage and days count
   - Legend with colors

   e) **Approval Metrics** (KPI cards)
   - Average approval time (hours/days)
   - Approval rate (% approved vs rejected)
   - Pending > 48 hours count

   f) **Team Coverage Table**
   - List of dates with coverage gaps
   - Shows: Date, Team, On Leave Count, Coverage %
   - Highlight critical gaps (>30% on leave)

   g) **Export Options**
   - Export to PDF report
   - Export to Excel (raw data)
   - Schedule email reports (future enhancement)

**Charting Library:**
- Install: `npm install recharts` (React-friendly charting)
- Or use existing charting library if already in project

**Backend Files to Modify:**

3. **`backend/src/modules/leave/leave.routes.ts`**
   - Add routes under `/leave/reports`:
     - `GET /leave/reports/utilization`
     - `GET /leave/reports/trending`
     - `GET /leave/reports/coverage`
     - `GET /leave/reports/distribution`
     - `GET /leave/reports/approval-metrics`

**RBAC:**
- Reports accessible only to managers and admins
- Team managers see only their team data
- Company admins see all data

**Caching:**
- Cache report data for 1 hour (Redis or in-memory)
- Reports are expensive queries
- Background job to pre-generate daily reports

---

#### Task 3.3: Email Notifications

**Current State:** Only LINE and in-app notifications implemented.

**Business Need:**
Some users prefer email, and email serves as a permanent record.

**Files to Create:**

1. **`backend/src/services/email.service.ts`** (~300 lines)

   **Email Provider Integration:**
   ```typescript
   // Choose one: SendGrid, AWS SES, Resend, or Nodemailer
   import { Resend } from 'resend' // Example with Resend

   class EmailService {
     private resend: Resend

     async sendLeaveRequestNotification(to: string, data: LeaveRequestEmailData): Promise<void>
     async sendLeaveApprovedNotification(to: string, data: ApprovedEmailData): Promise<void>
     async sendLeaveRejectedNotification(to: string, data: RejectedEmailData): Promise<void>
     async sendLeaveReminderNotification(to: string, data: ReminderEmailData): Promise<void>
     async sendBalanceExpiryWarning(to: string, data: ExpiryEmailData): Promise<void>
   }
   ```

2. **Email Templates** (HTML with inline CSS)

   Create template files:
   - `backend/src/templates/emails/leave-request.html` - New request submitted
   - `backend/src/templates/emails/leave-approved.html` - Request approved
   - `backend/src/templates/emails/leave-rejected.html` - Request rejected
   - `backend/src/templates/emails/leave-reminder.html` - Leave starts tomorrow
   - `backend/src/templates/emails/balance-expiry.html` - Unused balance warning

   **Template Variables:**
   ```html
   <p>Dear {{employeeName}},</p>
   <p>Your leave request from {{startDate}} to {{endDate}} has been {{status}}.</p>
   <p><strong>Leave Type:</strong> {{leaveType}}</p>
   <p><strong>Total Days:</strong> {{totalDays}}</p>
   {{#if reviewerNotes}}
   <p><strong>Notes:</strong> {{reviewerNotes}}</p>
   {{/if}}
   ```

**Files to Modify:**

3. **`backend/src/modules/leave/leave.service.ts`**
   - Import `emailService`
   - Call `emailService.send*()` after:
     - Leave request created
     - Leave approved
     - Leave rejected
     - Leave cancelled
   - Make email sending async (don't block main flow)
   - Handle email failures gracefully (log but don't throw)

4. **`backend/src/config/email.config.ts`** (create)
   ```typescript
   export const emailConfig = {
     provider: process.env.EMAIL_PROVIDER || 'resend',
     apiKey: process.env.EMAIL_API_KEY,
     fromAddress: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
     fromName: process.env.EMAIL_FROM_NAME || 'Security Guard HRM',
     enabled: process.env.EMAIL_ENABLED === 'true'
   }
   ```

**Environment Variables:**
```env
EMAIL_PROVIDER=resend
EMAIL_API_KEY=your_api_key
EMAIL_FROM=noreply@yourcompany.com
EMAIL_FROM_NAME=Security Guard HRM
EMAIL_ENABLED=true
```

**User Preferences:**

5. **`backend/supabase/migrations/006_email_preferences.sql`**
   ```sql
   ALTER TABLE users ADD COLUMN email_notifications JSONB DEFAULT '{
     "leave_request": true,
     "leave_approved": true,
     "leave_rejected": true,
     "leave_reminder": true,
     "balance_expiry": true
   }'::jsonb;
   ```

6. **`frontend/src/pages/settings/NotificationPreferencesPage.tsx`** (create or modify existing)
   - Checkboxes for each notification type
   - Separate toggles for: Email, LINE, In-App
   - Save preferences to user profile

**Scheduled Email Jobs:**

7. **`backend/src/jobs/leave-reminders.job.ts`**
   ```typescript
   // Run daily at 8 AM
   cron.schedule('0 8 * * *', async () => {
     // Find leaves starting tomorrow
     const upcomingLeaves = await getLeaveStartingTomorrow()
     // Send reminder emails
     for (const leave of upcomingLeaves) {
       await emailService.sendLeaveReminderNotification(leave.employeeEmail, leave)
     }
   })
   ```

**Dependencies:**
- `npm install resend` (or `nodemailer`, `@sendgrid/mail`, `@aws-sdk/client-ses`)
- `npm install handlebars` - Template engine for HTML emails

---

#### Task 3.4: Performance Optimizations

**Goal:** Ensure system handles 100+ employees, 1000+ leave requests efficiently.

**Backend Optimizations:**

1. **Database Query Optimization**

   **File to Create:** `backend/src/modules/leave/leave.queries.ts`
   - Extract complex queries into optimized SQL
   - Add `EXPLAIN ANALYZE` logging in development
   - Identify N+1 query problems

   **Files to Modify:**
   - `backend/src/modules/leave/leave.service.ts`
     - Replace multiple individual queries with batch queries
     - Use `Promise.all()` for parallel fetches
     - Add database connection pooling config

   **Example Optimization:**
   ```typescript
   // BEFORE (N+1 query)
   for (const request of requests) {
     request.employee = await getEmployee(request.employeeId)
     request.leaveType = await getLeaveType(request.leaveTypeId)
   }

   // AFTER (batch query with JOIN)
   const requests = await supabase
     .from('leave_requests')
     .select(`
       *,
       employee:employees(*),
       leave_type:leave_types(*)
     `)
   ```

2. **Response Caching**

   **File to Create:** `backend/src/services/cache.service.ts`
   ```typescript
   // In-memory cache or Redis
   class CacheService {
     async get<T>(key: string): Promise<T | null>
     async set(key: string, value: any, ttlSeconds: number): Promise<void>
     async invalidate(key: string): Promise<void>
     async invalidatePattern(pattern: string): Promise<void>
   }
   ```

   **Cache Strategy:**
   - Leave summaries: 5 minutes TTL
   - Leave types: 1 hour TTL (rarely change)
   - Employee balances: 10 minutes TTL
   - Calendar data: 15 minutes TTL

   **Invalidation:**
   - On leave approval/rejection → Invalidate related caches
   - On balance update → Invalidate employee balance cache
   - On leave type change → Invalidate leave types cache

3. **Pagination Improvements**

   **Files to Modify:**
   - All list endpoints in `leave.controller.ts`
     - Enforce max page size (100 items)
     - Add cursor-based pagination for large datasets
     - Return total count only when requested (expensive query)

   ```typescript
   // Add `includeTotalCount` query param (default false)
   const response = {
     data: items,
     pagination: {
       page, pageSize, hasNextPage
       ...(includeTotalCount && { totalCount })
     }
   }
   ```

4. **Background Job Processing**

   **File to Create:** `backend/src/jobs/leave-balance-sync.job.ts`
   - Move expensive operations to background jobs:
     - Balance initialization for new year
     - Bulk notifications
     - Report generation
     - Data export

   **Use Bull Queue (Redis-based job queue):**
   ```typescript
   import Bull from 'bull'

   const balanceQueue = new Bull('balance-operations', redisConfig)

   balanceQueue.process('initialize-year', async (job) => {
     await leaveService.initializeBalancesForYear(job.data.companyId, job.data.year)
   })
   ```

**Frontend Optimizations:**

5. **React Query for Client-Side Caching**

   **Files to Modify:**
   - `frontend/src/services/leave.service.ts`
     - Wrap API calls with React Query hooks

   **Example:**
   ```typescript
   // Before
   const [leaveTypes, setLeaveTypes] = useState([])
   useEffect(() => {
     fetchLeaveTypes().then(setLeaveTypes)
   }, [])

   // After (with React Query)
   const { data: leaveTypes, isLoading } = useQuery({
     queryKey: ['leaveTypes'],
     queryFn: fetchLeaveTypes,
     staleTime: 60000 // 1 minute
   })
   ```

   **Benefits:**
   - Automatic caching
   - Background refetching
   - Optimistic updates
   - Request deduplication

6. **Virtual Scrolling for Long Lists**

   **Files to Modify:**
   - `frontend/src/components/common/DataTable.tsx`
     - Add virtualization for >100 rows

   **Library:** `@tanstack/react-virtual`
   ```typescript
   import { useVirtualizer } from '@tanstack/react-virtual'

   const rowVirtualizer = useVirtualizer({
     count: rows.length,
     getScrollElement: () => parentRef.current,
     estimateSize: () => 50,
   })
   ```

7. **Code Splitting & Lazy Loading**

   **Files to Modify:**
   - `frontend/src/App.tsx` or router config
     - Lazy load leave pages

   ```typescript
   const LeavePage = lazy(() => import('./pages/leave/LeavePage'))
   const LeaveTypesPage = lazy(() => import('./pages/leave/LeaveTypesPage'))
   ```

**Database Indexes Review:**

8. **Verify and Add Indexes**

   **File to Create:** `backend/supabase/migrations/007_performance_indexes.sql`
   ```sql
   -- Composite indexes for common queries
   CREATE INDEX IF NOT EXISTS idx_leave_requests_company_status_date
   ON leave_requests(company_id, status, start_date DESC);

   CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_year
   ON leave_requests(employee_id, EXTRACT(YEAR FROM start_date));

   CREATE INDEX IF NOT EXISTS idx_leave_balances_company_year
   ON leave_balances(company_id, year);

   -- Partial indexes for pending requests (most queried)
   CREATE INDEX IF NOT EXISTS idx_leave_requests_pending
   ON leave_requests(company_id, created_at DESC)
   WHERE status = 'pending';
   ```

**Performance Monitoring:**

9. **Add Logging and Metrics**

   **File to Create:** `backend/src/middleware/performance.middleware.ts`
   ```typescript
   // Log slow API requests
   app.use((req, res, next) => {
     const start = Date.now()
     res.on('finish', () => {
       const duration = Date.now() - start
       if (duration > 1000) { // Log if > 1 second
         logger.warn('Slow request', { path: req.path, duration })
       }
     })
     next()
   })
   ```

**Performance Targets:**
- API response time: <200ms (p95)
- Page load time: <2 seconds (p95)
- Database queries: <100ms (p95)
- List endpoints: Handle 10,000+ records with pagination
- Concurrent users: 100+ without degradation

---

#### Task 3.5: Localization Enhancements

**Current State:** Basic Thai and English translations exist.

**Improvements:**

**Files to Modify:**

1. **`frontend/src/i18n/locales/th.json`** (expand)
   - Add missing translations for:
     - Error messages
     - Validation messages
     - Success notifications
     - Calendar month/day names
     - Relative date phrases

   **New Translations:**
   ```json
   {
     "leave": {
       "calendar": {
         "today": "วันนี้",
         "tomorrow": "พรุ่งนี้",
         "yesterday": "เมื่อวาน",
         "nextWeek": "สัปดาห์หน้า",
         "lastWeek": "สัปดาห์ที่แล้ว",
         "daysAgo": "{{count}} วันที่แล้ว",
         "daysFromNow": "อีก {{count}} วัน"
       },
       "validation": {
         "dateRequired": "กรุณาเลือกวันที่",
         "endBeforeStart": "วันที่สิ้นสุดต้องมาหลังวันที่เริ่มต้น",
         "insufficientBalance": "วันลาคงเหลือไม่เพียงพอ (คงเหลือ {{balance}} วัน)",
         "documentRequired": "ต้องแนบเอกสารสำหรับการลาประเภทนี้"
       }
     }
   }
   ```

2. **`frontend/src/i18n/locales/en.json`** (expand)
   - Ensure parity with Thai translations
   - Professional English (not machine-translated)

3. **Date Formatting Utilities**

   **File to Create:** `frontend/src/utils/date.utils.ts`
   ```typescript
   import { format } from 'date-fns'
   import { th, enUS } from 'date-fns/locale'

   // Thai Buddhist calendar support
   export function formatThaiDate(date: Date, formatStr: string): string {
     const buddhistYear = date.getFullYear() + 543
     let formatted = format(date, formatStr, { locale: th })
     formatted = formatted.replace(date.getFullYear().toString(), buddhistYear.toString())
     return formatted
   }

   // Relative dates in Thai
   export function formatRelative(date: Date, locale: 'th' | 'en'): string {
     const now = new Date()
     const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

     if (locale === 'th') {
       if (diffDays === 0) return 'วันนี้'
       if (diffDays === 1) return 'พรุ่งนี้'
       if (diffDays === -1) return 'เมื่อวาน'
       if (diffDays > 0) return `อีก ${diffDays} วัน`
       return `${Math.abs(diffDays)} วันที่แล้ว`
     } else {
       // English relative dates
       if (diffDays === 0) return 'Today'
       if (diffDays === 1) return 'Tomorrow'
       if (diffDays === -1) return 'Yesterday'
       if (diffDays > 0) return `In ${diffDays} days`
       return `${Math.abs(diffDays)} days ago`
     }
   }
   ```

4. **Number Formatting (Optional Thai Numerals)**

   **File to Modify:** `frontend/src/utils/number.utils.ts`
   ```typescript
   // Convert Arabic numerals to Thai numerals
   const thaiNumerals = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙']

   export function formatThaiNumber(num: number): string {
     return num.toString().split('').map(d => {
       const digit = parseInt(d)
       return isNaN(digit) ? d : thaiNumerals[digit]
     }).join('')
   }
   ```

5. **Language Toggle Persistence**

   **Files to Modify:**
   - `frontend/src/i18n/i18n.config.ts`
     - Save language preference to localStorage
     - Restore on app load

   ```typescript
   const savedLanguage = localStorage.getItem('language') || 'th'
   i18n.changeLanguage(savedLanguage)

   // On language change
   i18n.on('languageChanged', (lng) => {
     localStorage.setItem('language', lng)
     document.documentElement.lang = lng
   })
   ```

6. **Translation Completeness Audit**

   **Script to Create:** `frontend/scripts/check-translations.js`
   ```javascript
   // Compare th.json and en.json keys
   // Report missing translations
   // Ensure all keys exist in both files

   const thKeys = getAllKeys(require('../src/i18n/locales/th.json'))
   const enKeys = getAllKeys(require('../src/i18n/locales/en.json'))

   const missingInEn = thKeys.filter(k => !enKeys.includes(k))
   const missingInTh = enKeys.filter(k => !thKeys.includes(k))

   console.log('Missing in English:', missingInEn)
   console.log('Missing in Thai:', missingInTh)
   ```

   **Add to package.json:**
   ```json
   {
     "scripts": {
       "check:i18n": "node frontend/scripts/check-translations.js"
     }
   }
   ```

**User-Facing Changes:**
- All dates show in Buddhist calendar for Thai users (2568 instead of 2025)
- Relative dates ("วันนี้", "พรุ่งนี้") instead of absolute dates
- Option to use Thai numerals (user preference)
- Language toggle in header (persists across sessions)
- All validation errors fully translated

---

## Phase 4: Testing & Documentation (Ongoing)

### 🎯 Goal: Comprehensive testing and knowledge transfer

#### Task 4.1: Integration & E2E Testing

**Backend Integration Tests:**

**File to Create:** `backend/src/tests/integration/leave-lifecycle.test.ts` (~500 lines)

**Test Scenarios:**

1. **Full Leave Request Lifecycle**
   ```typescript
   describe('Leave Request Lifecycle', () => {
     it('should complete full approval flow', async () => {
       // 1. Guard creates leave request
       const request = await createLeaveRequest(guardUser, leaveData)
       expect(request.status).toBe('pending')

       // 2. Manager approves
       const approved = await approveLeaveRequest(managerUser, request.id)
       expect(approved.status).toBe('approved')

       // 3. Balance updated correctly
       const balance = await getBalance(guardUser.id, leaveType.id, year)
       expect(balance.usedDays).toBe(previousUsed + request.totalDays)
       expect(balance.pendingDays).toBe(0)

       // 4. Notifications sent
       expect(notificationService.send).toHaveBeenCalledWith(
         expect.objectContaining({ type: 'leave_approved' })
       )
     })

     it('should handle cancellation with balance reversal', async () => {
       // Approve → Cancel → Verify balance restored
     })

     it('should reject request with insufficient balance', async () => {
       // Request more days than available → Should fail
     })
   })
   ```

2. **Document Upload Flow**
   ```typescript
   describe('Document Upload', () => {
     it('should upload, store, and retrieve document', async () => {
       // Upload file → Verify storage → Get signed URL → Download
     })

     it('should reject invalid file types', async () => {
       // Upload .exe file → Should fail with validation error
     })

     it('should enforce file size limit', async () => {
       // Upload 10MB file → Should fail (max 5MB)
     })
   })
   ```

3. **Replacement Workflow**
   ```typescript
   describe('Replacement Guard Workflow', () => {
     it('should detect shift conflicts on approval', async () => {
       // Create leave overlapping with shifts → Approve → Get conflicts
     })

     it('should assign replacement and notify both guards', async () => {
       // Assign replacement → Verify shift updated → Check notifications
     })
   })
   ```

4. **Concurrent Request Handling**
   ```typescript
   describe('Concurrency', () => {
     it('should handle simultaneous balance updates', async () => {
       // Approve two requests at same time → Both succeed, balance correct
     })
   })
   ```

**Frontend E2E Tests:**

**Tool:** Playwright

**File to Create:** `frontend/e2e/leave-workflow.spec.ts` (~400 lines)

**Test Scenarios:**

1. **Manager Approval Flow**
   ```typescript
   test('manager can approve leave request', async ({ page }) => {
     await page.goto('/login')
     await login(page, managerCredentials)

     await page.goto('/leave')
     await page.click('[data-testid="request-row-1"]') // First pending request
     await page.click('[data-testid="approve-button"]')

     // Fill notes
     await page.fill('[data-testid="review-notes"]', 'Approved')
     await page.click('[data-testid="confirm-approve"]')

     // Verify success notification
     await expect(page.locator('.notification')).toContainText('approved successfully')

     // Verify status updated in table
     await expect(page.locator('[data-testid="request-row-1"] .status-badge')).toContainText('Approved')
   })
   ```

2. **Guard Leave Request (LIFF)**
   ```typescript
   test('guard can submit leave request via LIFF', async ({ page }) => {
     await page.goto('/liff/leave')

     // Select leave type
     await page.selectOption('[data-testid="leave-type"]', 'annual-leave')

     // Select dates
     await page.fill('[data-testid="start-date"]', '2026-02-15')
     await page.fill('[data-testid="end-date"]', '2026-02-17')

     // Enter reason
     await page.fill('[data-testid="reason"]', 'Family vacation')

     // Upload document
     await page.setInputFiles('[data-testid="document-upload"]', 'test-files/medical-cert.pdf')

     // Submit
     await page.click('[data-testid="submit-request"]')

     // Verify success
     await expect(page.locator('.notification')).toContainText('submitted successfully')

     // Verify appears in pending list
     await expect(page.locator('[data-testid="pending-requests"]')).toContainText('Family vacation')
   })
   ```

3. **Calendar Interaction**
   ```typescript
   test('calendar shows leave entries and allows filtering', async ({ page }) => {
     await page.goto('/leave?view=calendar')

     // Verify calendar loads
     await expect(page.locator('.calendar-grid')).toBeVisible()

     // Click on a day with leaves
     await page.click('[data-date="2026-02-15"]')

     // Verify details panel shows
     await expect(page.locator('.day-details')).toBeVisible()
     await expect(page.locator('.employee-list')).toContainText('John Doe')
   })
   ```

**Test Setup:**
```typescript
// frontend/e2e/fixtures/setup.ts
export async function seedTestData() {
  // Create test company
  // Create test users (guard, manager, admin)
  // Create leave types
  // Create sample leave requests
  // Create balances
}

export async function cleanupTestData() {
  // Delete all test data
}
```

**Run Commands:**
```json
{
  "scripts": {
    "test:integration": "vitest run src/tests/integration",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test && npm run test:integration && npm run test:e2e"
  }
}
```

---

#### Task 4.2: API Documentation

**Goal:** Generate comprehensive API documentation for developers.

**Files to Create:**

1. **`backend/src/docs/openapi.ts`** (~300 lines)

   **Using Zod to OpenAPI:**
   ```typescript
   import { OpenAPIGenerator } from '@asteasolutions/zod-to-openapi'
   import { z } from 'zod'

   // Convert existing Zod schemas to OpenAPI specs
   const generator = new OpenAPIGenerator([
     {
       path: '/api/v1/leave-types',
       method: 'get',
       summary: 'List leave types',
       request: {
         query: listLeaveTypesQuerySchema
       },
       responses: {
         200: {
           description: 'List of leave types',
           content: {
             'application/json': {
               schema: z.array(leaveTypeSchema)
             }
           }
         }
       }
     },
     // ... all other endpoints
   ])

   export const openApiSpec = generator.generateDocument({
     info: {
       title: 'Security Guard HRM - Leave Management API',
       version: '1.0.0',
       description: 'Complete API documentation for leave management module'
     },
     servers: [
       { url: 'http://localhost:3001', description: 'Development' },
       { url: 'https://api.yourapp.com', description: 'Production' }
     ]
   })
   ```

2. **`backend/src/docs/leave-api.yaml`** (generated from openapi.ts)
   - Auto-generated OpenAPI 3.0 spec
   - Includes all endpoints, schemas, examples
   - Can be imported into Postman, Insomnia, etc.

3. **Swagger UI Integration**

   **File to Modify:** `backend/src/app.ts`
   ```typescript
   import swaggerUi from 'swagger-ui-express'
   import { openApiSpec } from './docs/openapi'

   // Serve API docs at /api-docs
   app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
     customSiteTitle: 'Leave Management API Docs',
     customCss: '.swagger-ui .topbar { display: none }'
   }))
   ```

4. **JSDoc Comments for All Endpoints**

   **File to Modify:** `backend/src/modules/leave/leave.controller.ts`
   ```typescript
   /**
    * List all leave requests with pagination and filters
    *
    * @route GET /api/v1/leave-requests
    * @access Manager, Admin
    * @param {ListLeaveRequestsQuery} query - Filter and pagination params
    * @returns {PaginatedResponse<LeaveRequest>} List of leave requests
    * @throws {400} Invalid query parameters
    * @throws {401} Unauthorized
    * @throws {403} Insufficient permissions
    *
    * @example
    * GET /api/v1/leave-requests?status=pending&page=1&pageSize=20
    */
   async listLeaveRequests(req: Request, res: Response, next: NextFunction) {
     // ...
   }
   ```

5. **Error Code Documentation**

   **File to Create:** `backend/src/docs/error-codes.md`
   ```markdown
   # Leave Management API Error Codes

   ## 400 Bad Request
   - `INVALID_DATE_RANGE`: End date must be after start date
   - `INSUFFICIENT_BALANCE`: Not enough leave days remaining
   - `INVALID_FILE_TYPE`: Only PDF, JPG, PNG allowed

   ## 403 Forbidden
   - `CANNOT_APPROVE_OWN_REQUEST`: Managers cannot approve their own leave
   - `LEAVE_ALREADY_REVIEWED`: Request has already been approved/rejected

   ## 404 Not Found
   - `LEAVE_REQUEST_NOT_FOUND`: Leave request ID not found
   - `LEAVE_TYPE_NOT_FOUND`: Leave type ID not found

   ## 409 Conflict
   - `CONCURRENT_MODIFICATION`: Request was modified by another user
   ```

6. **Postman Collection**

   **File to Create:** `backend/docs/Leave-Management-API.postman_collection.json`
   - Export from Swagger/OpenAPI spec
   - Include example requests for all endpoints
   - Pre-configured environment variables
   - Sample authentication tokens

**Dependencies:**
```bash
npm install --save-dev @asteasolutions/zod-to-openapi swagger-ui-express
```

**Access Documentation:**
- Local: `http://localhost:3001/api-docs`
- Production: `https://api.yourapp.com/api-docs`

---

#### Task 4.3: User Documentation

**Goal:** Create comprehensive guides for end users.

**Files to Create:**

1. **`.agent/docs/user-guide-guard.md`** (~1000 lines, Thai primary)

   **Sections:**
   - Getting Started (LIFF app access)
   - Viewing Leave Balance
   - Submitting Leave Request
     - Step-by-step with screenshots
     - Using templates
     - Uploading documents
   - Checking Request Status
   - Cancelling Requests
   - Leave History
   - FAQs
   - Troubleshooting

2. **`.agent/docs/user-guide-manager.md`** (~1500 lines, Thai + English)

   **Sections:**
   - Dashboard Overview
   - Approving Leave Requests
     - Reviewing details
     - Checking shift conflicts
     - Assigning replacements
     - Adding notes
   - Rejecting Leave Requests
   - Viewing Leave Calendar
     - Filtering by team
     - Exporting calendar
   - Managing Leave Balances
     - Viewing balances
     - Manual adjustments
     - Initializing for new year
   - Reports & Analytics
   - Leave Type Configuration
   - Templates Management
   - Best Practices

3. **`.agent/docs/user-guide-admin.md`** (~1200 lines)

   **Sections:**
   - System Configuration
   - Leave Type Setup
     - Creating leave types
     - Paid vs unpaid
     - Approval requirements
   - Balance Management
     - Year-end rollover
     - Bulk operations
     - Audit trail
   - Notification Settings
   - Email Configuration
   - Data Export
   - User Management (leave context)
   - Troubleshooting & Support

4. **Video Tutorials** (Scripts)

   **File to Create:** ``.agent/docs/video-scripts.md`
   - Script 1: "How to Request Leave (Guard)" (2 min)
   - Script 2: "Approving Leave Requests (Manager)" (3 min)
   - Script 3: "Managing Leave Balances (Admin)" (4 min)
   - Script 4: "Using Leave Calendar" (2 min)

5. **Quick Reference Cards**

   **File to Create:** `.agent/docs/quick-reference.pdf`
   - One-page cheat sheets
   - Key actions and shortcuts
   - Common questions
   - Support contact info

**Screenshot Requirements:**
- Annotate screenshots with numbered steps
- Highlight clickable elements with red boxes
- Use Thai language in screenshots (primary audience)
- Store in `.agent/docs/screenshots/`

**Documentation Format:**
- Markdown for easy updates
- Table of contents with links
- Search-friendly (keywords)
- Mobile-friendly (responsive images)

**Distribution:**
- Host on internal wiki or docs site
- PDF export for offline access
- In-app help links (? icons)
- Onboarding checklist for new users

---

#### Task 4.4: Code Quality & Refactoring

**Goal:** Ensure codebase maintainability and best practices.

**Linting & Type Safety:**

1. **ESLint Strict Mode**

   **File to Modify:** `frontend/.eslintrc.json` and `backend/.eslintrc.json`
   ```json
   {
     "rules": {
       "no-console": "warn",
       "@typescript-eslint/no-explicit-any": "error",
       "@typescript-eslint/explicit-function-return-type": "warn",
       "no-unused-vars": "off",
       "@typescript-eslint/no-unused-vars": [
         "error",
         { "argsIgnorePattern": "^_" }
       ]
     }
   }
   ```

   **Run:** `npm run lint -- --max-warnings 0`

2. **TypeScript Strict Mode**

   **File to Modify:** `frontend/tsconfig.json` and `backend/tsconfig.json`
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "strictNullChecks": true,
       "strictFunctionTypes": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "noImplicitReturns": true
     }
   }
   ```

   **Fix all TypeScript errors:** `tsc --noEmit`

**Code Refactoring:**

3. **Extract Repeated Patterns**

   **Example: Form Validation**
   ```typescript
   // Before (repeated in multiple components)
   const validateLeaveRequest = (data) => {
     if (!data.startDate) throw new Error('Start date required')
     if (!data.endDate) throw new Error('End date required')
     // ... more validation
   }

   // After (shared utility)
   // frontend/src/utils/validation.utils.ts
   export const leaveRequestSchema = z.object({
     startDate: z.string().min(1),
     endDate: z.string().min(1),
     // ...
   })
   ```

4. **Remove Code Duplication**

   **Tool:** `jscpd` (Copy-Paste Detector)
   ```bash
   npx jscpd frontend/src backend/src --min-lines 10
   ```

   **Refactor duplicated code into:**
   - Shared utilities (`utils/`)
   - Custom hooks (`hooks/`)
   - Common components (`components/common/`)

5. **Improve Error Handling**

   **Backend Pattern:**
   ```typescript
   // Consistent error responses
   class LeaveError extends Error {
     constructor(
       message: string,
       public code: string,
       public statusCode: number = 400
     ) {
       super(message)
     }
   }

   throw new LeaveError('Insufficient balance', 'INSUFFICIENT_BALANCE', 400)
   ```

   **Frontend Pattern:**
   ```typescript
   // Error boundary for leave pages
   <ErrorBoundary fallback={<LeaveErrorFallback />}>
     <LeavePage />
   </ErrorBoundary>
   ```

6. **Add Code Comments for Complex Logic**

   **Files to Modify:**
   - `backend/src/modules/leave/leave.service.ts`
     - Add JSDoc comments for public methods
     - Add inline comments for complex calculations
     - Explain business rules (e.g., "Thai labor law requires X")

   **Example:**
   ```typescript
   /**
    * Calculates total leave days excluding weekends
    *
    * Thai calendar: Weekend = Saturday & Sunday
    * Half-day leaves count as 0.5 days
    *
    * @param startDate - First day of leave
    * @param endDate - Last day of leave (inclusive)
    * @returns Total working days in range
    */
   function calculateLeaveDays(startDate: Date, endDate: Date): number {
     // Implementation with comments
   }
   ```

**Accessibility (A11y):**

7. **ARIA Labels & Keyboard Navigation**

   **Files to Modify:** All leave page components

   **Checklist:**
   - [ ] All buttons have aria-labels
   - [ ] Form inputs have associated labels
   - [ ] Modals have aria-modal and role="dialog"
   - [ ] Focus management (modal open/close)
   - [ ] Keyboard navigation (Tab, Enter, Esc)
   - [ ] Screen reader announcements for status changes

   **Example:**
   ```tsx
   <button
     onClick={handleApprove}
     aria-label="Approve leave request"
     aria-describedby="approve-description"
   >
     Approve
   </button>
   <span id="approve-description" className="sr-only">
     Approves the leave request and updates the employee's balance
   </span>
   ```

8. **Semantic HTML**

   **Replace divs with semantic elements:**
   - `<nav>` for navigation
   - `<main>` for main content
   - `<article>` for leave request cards
   - `<section>` for dashboard sections
   - `<time>` for dates

**Performance Audits:**

9. **Lighthouse CI**

   **File to Create:** `.github/workflows/lighthouse.yml`
   ```yaml
   name: Lighthouse CI
   on: [pull_request]
   jobs:
     lighthouse:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - name: Run Lighthouse
           uses: treosh/lighthouse-ci-action@v9
           with:
             urls: |
               http://localhost:5173/leave
               http://localhost:5173/liff/leave
             uploadArtifacts: true
   ```

   **Target Scores:**
   - Performance: 90+
   - Accessibility: 95+
   - Best Practices: 95+
   - SEO: 90+

10. **Code Coverage Reports**

    **File to Modify:** `package.json`
    ```json
    {
      "scripts": {
        "test:coverage": "vitest run --coverage",
        "test:coverage:threshold": "vitest run --coverage --coverage.lines=80"
      }
    }
    ```

    **Target:** 80%+ coverage for all leave modules

**Code Review Checklist:**

11. **`.agent/docs/code-review-checklist.md`**
    ```markdown
    # Leave Module Code Review Checklist

    ## General
    - [ ] No console.log statements in production code
    - [ ] No commented-out code
    - [ ] No hardcoded strings (use i18n)
    - [ ] No magic numbers (use named constants)

    ## TypeScript
    - [ ] No `any` types
    - [ ] All functions have return types
    - [ ] All parameters have types
    - [ ] Interfaces preferred over type aliases

    ## Security
    - [ ] User input validated (Zod schemas)
    - [ ] SQL injection prevention (parameterized queries)
    - [ ] XSS prevention (React auto-escaping, no dangerouslySetInnerHTML)
    - [ ] Authorization checks (RBAC middleware)
    - [ ] File upload validation (type, size, content)

    ## Performance
    - [ ] No N+1 queries
    - [ ] Appropriate indexes on database queries
    - [ ] Large lists use pagination
    - [ ] Heavy operations moved to background jobs
    - [ ] API responses cached where appropriate

    ## Testing
    - [ ] Unit tests for business logic
    - [ ] Integration tests for API endpoints
    - [ ] E2E tests for critical flows
    - [ ] Edge cases covered
    - [ ] Error scenarios tested

    ## Accessibility
    - [ ] ARIA labels on interactive elements
    - [ ] Keyboard navigation works
    - [ ] Color contrast meets WCAG AA
    - [ ] Form errors announced to screen readers

    ## Documentation
    - [ ] JSDoc comments on public functions
    - [ ] Complex logic explained with comments
    - [ ] README updated if API changes
    - [ ] User guide updated for new features
    ```

---

## Critical Files Summary

### Highest Priority Files to Create/Modify:

**Backend (Must Create):**
1. `backend/src/services/storage.service.ts` - File upload/download (150 lines)
2. `backend/src/modules/leave/replacement.service.ts` - Shift replacement logic (400 lines)
3. `backend/supabase/migrations/003_shift_replacement.sql` - Replacement schema (50 lines)
4. `backend/src/modules/leave/balance-adjustment.service.ts` - Audit trail (250 lines)
5. `backend/supabase/migrations/004_leave_balance_audit.sql` - Audit schema (60 lines)

**Frontend (Must Create):**
1. `frontend/src/pages/leave/LeavePage.test.tsx` - Critical page test (300 lines)
2. `frontend/src/components/leave/ReplacementModal.tsx` - Assign replacements (300 lines)
3. `frontend/src/components/leave/ShiftConflictAlert.tsx` - Conflict warnings (150 lines)
4. `frontend/src/components/leave/BalanceAdjustmentModal.tsx` - Manual adjustments (200 lines)

**Backend (Must Modify):**
1. `backend/src/modules/leave/leave.service.test.ts` - Add missing tests (+480 lines)
2. `backend/src/modules/leave/leave.service.ts` - Integrate replacement logic (+100 lines)
3. `backend/src/modules/leave/leave.routes.ts` - Add new endpoints (+50 lines)

**Frontend (Must Modify):**
1. `frontend/src/pages/liff/LiffLeavePage.tsx` - Add document upload (+80 lines)
2. `frontend/src/pages/leave/LeavePage.tsx` - Add replacement workflow (+150 lines)
3. `frontend/src/services/leave.service.ts` - Add new API calls (+100 lines)

---

## Verification & Testing Plan

### End-to-End Verification Steps:

**Test Scenario 1: Guard Leave Request with Document**
1. Open LIFF app as guard user
2. View leave balance (should show current balance)
3. Click "Request Leave"
4. Select leave type requiring document
5. Choose date range
6. Upload PDF document
7. Submit request
8. Verify appears in "Pending Requests"
9. Verify manager receives notification

**Test Scenario 2: Manager Approval with Replacement**
1. Login as manager
2. Navigate to Leave Management page
3. View pending requests
4. Click "Approve" on request overlapping shifts
5. System shows shift conflict alert
6. Click "Assign Replacements"
7. Select replacement guard for each shift
8. Add approval notes
9. Confirm approval
10. Verify:
    - Request status = approved
    - Balance updated correctly
    - Shifts show replacement guard
    - Both guards notified

**Test Scenario 3: Balance Adjustment with Audit**
1. Login as admin
2. Navigate to Leave Balances page
3. Click "Adjust" on an employee balance
4. Change entitled days (e.g., 10 → 12)
5. Select reason: "Pro-rated for mid-year hire"
6. Submit adjustment
7. Verify:
    - Balance updated
    - Adjustment appears in history
    - Audit log created

**Test Scenario 4: Template Usage**
1. Admin creates template: "Week Off" (5 days, Annual Leave)
2. Guard opens LIFF app
3. Clicks "Use Template"
4. Selects "Week Off"
5. Chooses start date (Monday)
6. System auto-calculates end date (Friday)
7. Pre-fills reason
8. Guard submits
9. Verify request created correctly

**Test Scenario 5: Calendar View & Export**
1. Manager opens calendar view
2. Navigates to next month
3. Clicks on a day with multiple leaves
4. Views employee list
5. Clicks "Export Calendar"
6. Downloads .ics file
7. Imports into Google Calendar
8. Verify all leave events appear

### Automated Test Commands:

```bash
# Unit tests
npm run test

# Backend integration tests
npm run test:integration

# Frontend E2E tests
npm run test:e2e

# Full test suite
npm run test:all

# Coverage report
npm run test:coverage

# Verify coverage threshold (80%)
npm run test:coverage:threshold

# Lint check
npm run lint

# Type check
npm run type-check

# Build check
npm run build
```

### Success Criteria:

**Code Quality:**
- ✅ All tests pass
- ✅ Test coverage ≥80%
- ✅ ESLint: 0 errors, 0 warnings
- ✅ TypeScript: 0 errors (strict mode)
- ✅ Lighthouse: All scores ≥90

**Functionality:**
- ✅ Document upload works end-to-end
- ✅ Replacement workflow functional
- ✅ Balance adjustments with audit trail
- ✅ Templates working in LIFF
- ✅ Calendar export to iCal
- ✅ All notifications sent correctly

**Performance:**
- ✅ API response time <200ms (p95)
- ✅ Page load time <2s
- ✅ Handles 100+ concurrent users
- ✅ 10,000+ leave requests without degradation

**User Acceptance:**
- ✅ Guards can submit leave in <2 minutes
- ✅ Managers can approve in <1 minute
- ✅ Mobile experience smooth (LIFF)
- ✅ No reported bugs in 2 weeks post-launch

---

## Implementation Timeline

**Week 1: Foundation (Phase 1)**
- Day 1-2: Document upload (storage service + UI)
- Day 3-4: Frontend test suite setup (all 5 test files)
- Day 5: Backend test coverage expansion

**Week 2: Core Features (Phase 2 - Part 1)**
- Day 1-2: Replacement workflow (schema + service + UI)
- Day 3: Calendar enhancements (views + export)
- Day 4-5: Balance adjustments & audit

**Week 3: Templates & Polish (Phase 2 - Part 2)**
- Day 1-2: Leave request templates
- Day 3: Integration testing
- Day 4-5: Bug fixes and refinements

**Week 4: Advanced Features (Phase 3 - Part 1)**
- Day 1-2: Mobile LIFF enhancements
- Day 3-4: Reporting & analytics
- Day 5: Email notifications

**Week 5: Performance & Localization (Phase 3 - Part 2)**
- Day 1-2: Performance optimizations
- Day 3: Localization improvements
- Day 4-5: E2E testing

**Week 6: Documentation & Launch (Phase 4)**
- Day 1-2: API documentation
- Day 3: User guides and videos
- Day 4: Code quality review
- Day 5: Final QA and launch prep

---

## Risk Mitigation

### Technical Risks:

**Risk 1: File Storage Performance**
- **Mitigation:** Implement chunked uploads, compression, CDN caching
- **Fallback:** Increase upload timeout, add retry logic

**Risk 2: Shift Replacement Complexity**
- **Mitigation:** Feature flag for gradual rollout, comprehensive testing
- **Fallback:** Manual replacement as interim solution

**Risk 3: Performance Degradation**
- **Mitigation:** Caching layer, database optimization, load testing
- **Fallback:** Aggressive pagination, reduce real-time updates

**Risk 4: Data Migration Issues**
- **Mitigation:** Test migrations on staging, backup before deploy
- **Fallback:** Rollback scripts ready

### Business Risks:

**Risk 1: User Adoption**
- **Mitigation:** User training, video tutorials, in-app guidance
- **Fallback:** Dedicated support during rollout

**Risk 2: Unexpected Edge Cases**
- **Mitigation:** Comprehensive testing, phased rollout
- **Fallback:** Quick patch process, feature flags

---

## Conclusion

The leave management module is **remarkably complete** with production-ready functionality. This roadmap focuses on:

1. **Quick Wins (Phase 1):** Complete essential missing features (document upload, tests)
2. **Core Enhancements (Phase 2):** Add critical business logic (replacements, adjustments, templates)
3. **Advanced Features (Phase 3):** Enhance UX and operational efficiency (mobile, reports, emails)
4. **Quality Assurance (Phase 4):** Comprehensive testing and documentation

**Total Estimated Effort:** 4-6 weeks for full implementation

**Immediate Next Steps:**
1. Review and approve this roadmap
2. Set up file storage infrastructure (Supabase Storage bucket)
3. Begin Phase 1 with document upload implementation
4. Establish CI/CD pipeline for automated testing

This phased approach allows for incremental delivery, early feedback, and risk mitigation while ensuring a robust, production-ready leave management system.
