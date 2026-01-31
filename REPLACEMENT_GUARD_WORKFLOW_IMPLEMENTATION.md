# Replacement Guard Workflow - Implementation Complete ✅

## Overview

**Task 2.1: Replacement Guard Workflow - Part A (Database & Backend Logic)** has been successfully implemented.

This critical feature enables managers to assign replacement guards when employees take approved leave, ensuring shift coverage continuity.

## Implementation Summary

### ✅ Completed Components

1. **Database Schema** - Migration `017_shift_replacement_tracking.sql`
2. **TypeScript Types** - Replacement workflow types in `leave.types.ts`
3. **Backend Services** - `replacement.service.ts` with complete replacement logic
4. **Service Integration** - Enhanced `leave.service.ts` with replacement support
5. **API Controllers** - New endpoints in `leave.controller.ts`
6. **Validation Schemas** - Zod schemas in `leave.validation.ts`
7. **API Routes** - New routes in `leave.routes.ts` and `shift.routes.ts`

---

## 1. Database Schema Changes

### Migration File
**File:** `backend/supabase/migrations/017_shift_replacement_tracking.sql`

### Shifts Table Additions
```sql
ALTER TABLE shifts ADD COLUMN:
- replaced_by_employee_id UUID    -- Employee who replaces the original assignee
- is_replacement BOOLEAN           -- True if this is a replacement assignment
- original_employee_id UUID        -- Original employee (for tracking)
- replacement_reason TEXT          -- Reason for replacement (e.g., leave request ID)
```

### Leave Requests Table Additions
```sql
ALTER TABLE leave_requests ADD COLUMN:
- affected_shift_ids UUID[]        -- Array of shift IDs that conflict with leave
- replacements_assigned BOOLEAN    -- True if all shifts have replacements
```

### Indexes Created
- `idx_shifts_replacement` - For efficient replacement queries
- `idx_shifts_is_replacement` - For filtering replacement shifts
- `idx_shifts_original_employee` - For tracking original assignments
- `idx_leave_requests_affected_shifts` - GIN index for array queries
- `idx_leave_requests_needs_replacement` - Find unresolved conflicts
- `idx_leave_requests_company_replacement_status` - Composite index

### RLS Policies Updated
- Replacement guards can now see shifts assigned to them
- Managers can assign and manage replacements
- Employees can view their original shifts and replacement assignments

---

## 2. TypeScript Types

### File
**File:** `backend/src/modules/leave/leave.types.ts`

### New Types Added

#### ShiftConflict
```typescript
export interface ShiftConflict {
    shiftId: string;
    date: string;
    siteId: string;
    siteName: string;
    siteZone: string | null;
    startTime: string;
    endTime: string;
    requiresReplacement: boolean;
    originalEmployeeId: string;
    originalEmployeeName: string;
    status: string;
}
```

#### AvailableReplacement
```typescript
export interface AvailableReplacement {
    id: string;
    fullName: string;
    employeeCode: string;
    position: string | null;
    shiftCount: number; // Shifts in next 7 days (for workload balancing)
}
```

#### ReplacementAssignment
```typescript
export interface ReplacementAssignment {
    shiftId: string;
    replacementEmployeeId: string;
    reason?: string;
}
```

#### LeaveApprovalWithReplacements
```typescript
export interface LeaveApprovalWithReplacements extends ApproveLeaveRequest {
    replacements?: ReplacementAssignment[];
}
```

#### ConflictResolutionResult
```typescript
export interface ConflictResolutionResult {
    leaveRequestId: string;
    totalConflicts: number;
    resolvedConflicts: number;
    unresolvedConflicts: number;
    assignedReplacements: ReplacementAssignment[];
}
```

---

## 3. Replacement Service

### File
**File:** `backend/src/modules/leave/replacement.service.ts` (~450 lines)

### Core Methods

#### findConflictingShifts()
```typescript
async findConflictingShifts(
    companyId: string,
    employeeId: string,
    startDate: string,
    endDate: string
): Promise<ShiftConflict[]>
```
- Finds all shifts assigned to employee during leave dates
- Filters by status: `scheduled` or `published`
- Returns detailed conflict information including site details
- Orders by date and time

#### getAvailableReplacements()
```typescript
async getAvailableReplacements(
    shiftId: string,
    companyId: string
): Promise<AvailableReplacement[]>
```
- Finds active employees who can replace for a shift
- **Exclusion Logic:**
  - Original employee
  - Employees on approved leave on that date
  - Employees already assigned shifts on that date
- **Sorting:** By shift count (least busy first)
- Returns workload information (shift count for next 7 days)

#### assignReplacement()
```typescript
async assignReplacement(
    shiftId: string,
    replacementEmployeeId: string,
    companyId: string,
    reason: string
): Promise<ShiftWithReplacement>
```
- Validates replacement employee exists and is active
- Updates shift with replacement details
- Sets `replaced_by_employee_id`, `is_replacement`, `original_employee_id`
- Returns updated shift with full details

#### assignReplacementsForLeave()
```typescript
async assignReplacementsForLeave(
    replacements: ReplacementAssignment[],
    companyId: string,
    leaveRequestId?: string
): Promise<ConflictResolutionResult>
```
- Bulk assigns replacements for multiple shifts
- Tracks success/failure for each assignment
- Updates leave request with `affected_shift_ids` and `replacements_assigned`
- Returns detailed result with counts

#### removeReplacement()
```typescript
async removeReplacement(
    shiftId: string,
    companyId: string
): Promise<void>
```
- Removes replacement assignment
- Restores shift to original state
- Clears all replacement-related fields

---

## 4. Leave Service Integration

### File
**File:** `backend/src/modules/leave/leave.service.ts`

### New Methods Added

#### approveLeaveRequestWithReplacements()
```typescript
async approveLeaveRequestWithReplacements(
    requestId: string,
    companyId: string,
    reviewerId: string,
    data: LeaveApprovalWithReplacements
): Promise<{
    leaveRequest: LeaveRequestWithDetails;
    replacementResult?: ConflictResolutionResult;
}>
```
- Approves leave using standard approval flow
- If replacements provided, assigns them via `replacementService`
- Returns both approved leave and replacement result
- Logs replacement assignment outcome

#### getLeaveRequestConflicts()
```typescript
async getLeaveRequestConflicts(
    requestId: string,
    companyId: string
): Promise<ShiftConflict[]>
```
- Gets conflicting shifts for a specific leave request
- Delegates to `replacementService.getConflictsForLeaveRequest()`
- Used by frontend to display conflicts before approval

---

## 5. API Endpoints

### Leave Request Endpoints
**File:** `backend/src/modules/leave/leave.controller.ts`

#### GET `/api/v1/leave-requests/:id/conflicts`
**Permission:** Managers and above
**Returns:** Array of `ShiftConflict` objects

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "shiftId": "uuid",
      "date": "2026-02-15",
      "siteName": "Shopping Mall A",
      "siteZone": "Main Entrance",
      "startTime": "08:00",
      "endTime": "16:00",
      "originalEmployeeName": "John Doe",
      "requiresReplacement": true
    }
  ]
}
```

#### POST `/api/v1/leave-requests/:id/approve-with-replacements`
**Permission:** Managers and above
**Request Body:**
```json
{
  "reviewNotes": "Approved with coverage arranged",
  "replacements": [
    {
      "shiftId": "shift-uuid-1",
      "replacementEmployeeId": "employee-uuid-2",
      "reason": "Leave replacement"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leaveRequest": { /* LeaveRequestWithDetails */ },
    "replacementResult": {
      "leaveRequestId": "uuid",
      "totalConflicts": 3,
      "resolvedConflicts": 3,
      "unresolvedConflicts": 0,
      "assignedReplacements": [ /* ... */ ]
    }
  }
}
```

#### POST `/api/v1/leave-requests/:id/assign-replacements`
**Permission:** Managers and above
**Request Body:**
```json
{
  "replacements": [
    {
      "shiftId": "uuid",
      "replacementEmployeeId": "uuid"
    }
  ]
}
```

### Shift Endpoints
**File:** `backend/src/modules/shift/shift.routes.ts`

#### GET `/api/v1/shifts/:id/available-replacements`
**Permission:** Managers and above
**Returns:** Array of `AvailableReplacement` objects

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "id": "employee-uuid",
      "fullName": "Jane Smith",
      "employeeCode": "EMP002",
      "position": "Security Guard",
      "shiftCount": 2
    },
    {
      "id": "employee-uuid-2",
      "fullName": "Mike Johnson",
      "employeeCode": "EMP003",
      "position": "Security Guard",
      "shiftCount": 5
    }
  ]
}
```

---

## 6. Validation Schemas

### File
**File:** `backend/src/modules/leave/leave.validation.ts`

### Schemas Added

#### replacementAssignmentSchema
```typescript
z.object({
    shiftId: z.string().uuid(),
    replacementEmployeeId: z.string().uuid(),
    reason: z.string().max(500).optional(),
})
```

#### approveLeaveWithReplacementsSchema
```typescript
z.object({
    reviewNotes: z.string().max(1000).optional(),
    replacements: z.array(replacementAssignmentSchema).optional(),
})
```

#### assignReplacementsSchema
```typescript
z.object({
    replacements: z.array(replacementAssignmentSchema).min(1),
})
```

---

## 7. Workflow Logic

### Standard Approval Flow (No Conflicts)
```
Manager clicks "Approve" →
  No shifts conflict with leave dates →
  Approve leave →
  Update balances →
  Send notification
```

### Replacement Workflow (With Conflicts)
```
Manager clicks "Approve" →
  Frontend calls GET /leave-requests/:id/conflicts →
  Display conflicting shifts to manager →
  For each conflict:
    Manager calls GET /shifts/:id/available-replacements →
    Manager selects replacement guard →
  Manager calls POST /leave-requests/:id/approve-with-replacements →
  Backend:
    1. Approve leave request
    2. Assign replacements to shifts
    3. Update leave_requests.affected_shift_ids
    4. Update leave_requests.replacements_assigned = true
    5. Send notifications (original guard + replacements)
```

### Data Flow
1. **Conflict Detection** - Check shifts table for employee during leave dates
2. **Availability Check** - Filter employees by:
   - Active status
   - Not the original employee
   - Not on leave during that date
   - Not already assigned a shift on that date
3. **Assignment** - Update shift with replacement details
4. **Tracking** - Link shifts to leave request via `affected_shift_ids`

---

## 8. Testing Recommendations

### Unit Tests (To Be Created)
- `replacement.service.test.ts` - Test all service methods
- Test conflict detection logic
- Test availability filtering (exclusion rules)
- Test bulk assignment with partial failures
- Test removal of replacements

### Integration Tests
- End-to-end approval with replacements
- Concurrent replacement assignments
- Invalid replacement employee scenarios
- Leave cancellation with assigned replacements

### Test Cases
1. **Conflict Detection**
   - Employee with 3 shifts during 5-day leave
   - No shifts during leave period
   - Shifts with different statuses (draft vs published)

2. **Availability**
   - Employee on leave not shown as available
   - Employee with existing shift not shown
   - Sort by workload (shift count)

3. **Assignment**
   - Valid replacement assignment
   - Invalid employee ID
   - Inactive employee
   - Same employee as original

4. **Bulk Operations**
   - All replacements succeed
   - Partial failure (some succeed, some fail)
   - All replacements fail

---

## 9. Frontend Integration (Part B - Not Yet Implemented)

### Required Components (To Be Created)
1. **ShiftConflictAlert.tsx** - Warning component showing affected shifts
2. **ReplacementModal.tsx** - Modal to assign replacement guards
3. **Updates to LeavePage.tsx** - Integrate conflict detection and assignment

### API Integration (To Be Added to Frontend)
```typescript
// frontend/src/services/leave.service.ts
async getLeaveRequestConflicts(requestId: string): Promise<ShiftConflict[]>
async getAvailableReplacements(shiftId: string): Promise<AvailableReplacement[]>
async approveWithReplacements(requestId: string, data: ApprovalWithReplacements): Promise<any>
```

---

## 10. Database Migration Instructions

### Running the Migration

```bash
# Navigate to backend directory
cd backend

# Run migration via Supabase CLI
npx supabase db push

# OR manually execute SQL file
psql -h <host> -U <user> -d <database> -f supabase/migrations/017_shift_replacement_tracking.sql
```

### Verification Queries

```sql
-- Check new columns exist in shifts table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'shifts'
AND column_name IN ('replaced_by_employee_id', 'is_replacement', 'original_employee_id', 'replacement_reason');

-- Check new columns exist in leave_requests table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'leave_requests'
AND column_name IN ('affected_shift_ids', 'replacements_assigned');

-- Check indexes created
SELECT indexname FROM pg_indexes
WHERE tablename IN ('shifts', 'leave_requests')
AND indexname LIKE '%replacement%';
```

---

## 11. Summary

### ✅ Completed (Part A - Backend)
- [x] Database schema migration
- [x] TypeScript type definitions
- [x] Replacement service with complete logic
- [x] Leave service integration
- [x] API controllers and validation
- [x] API routes (leave + shift endpoints)
- [x] RLS policies for security
- [x] Comprehensive documentation

### 📋 Next Steps (Part B - Frontend)
- [ ] Create `ShiftConflictAlert.tsx` component
- [ ] Create `ReplacementModal.tsx` component
- [ ] Update `LeavePage.tsx` for conflict detection
- [ ] Add frontend service methods
- [ ] Implement notification UI for replacements
- [ ] End-to-end testing

### 🎯 Key Features Delivered
1. **Automatic Conflict Detection** - Identifies shifts that need coverage
2. **Smart Availability Filtering** - Excludes unavailable employees
3. **Workload Balancing** - Shows shift count to distribute work fairly
4. **Bulk Assignment** - Handle multiple shifts at once
5. **Partial Success Handling** - Tracks resolved vs unresolved conflicts
6. **Complete Audit Trail** - Tracks original employee and replacement reason

---

## 12. API Usage Examples

### Example 1: Check for Conflicts Before Approval
```bash
curl -X GET http://localhost:3001/api/v1/leave-requests/{id}/conflicts \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

### Example 2: Get Available Replacements for a Shift
```bash
curl -X GET http://localhost:3001/api/v1/shifts/{shiftId}/available-replacements \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

### Example 3: Approve with Replacements
```bash
curl -X POST http://localhost:3001/api/v1/leave-requests/{id}/approve-with-replacements \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "reviewNotes": "Approved with coverage",
    "replacements": [
      {
        "shiftId": "shift-uuid-1",
        "replacementEmployeeId": "employee-uuid-2"
      },
      {
        "shiftId": "shift-uuid-2",
        "replacementEmployeeId": "employee-uuid-3"
      }
    ]
  }'
```

---

**Implementation Status:** ✅ **COMPLETE - Part A (Database & Backend)**
**Ready For:** Frontend Implementation (Part B)
**Estimated LOC:** ~1,100 lines (Migration: 100, Service: 450, Types: 100, Controller: 150, Routes: 20, Validation: 80, Integration: 200)
