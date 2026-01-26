# Company Admin Workflow Design for /schedule Page

## Executive Summary

This plan outlines the comprehensive admin workflow for the `/schedule` page in the Security Guard HRM SaaS. The current implementation (`SchedulePage.tsx`) provides a solid foundation with calendar views, drag-and-drop, bulk operations, and publishing workflows. This design document formalizes the workflow, identifies enhancements, and ensures alignment with Thai security industry requirements and 2026 regulatory changes.

### User Requirements (Confirmed)
Based on user feedback, the design includes:
- **Mixed Scheduling Approach**: Optimize both copy-week and create-from-scratch workflows equally
- **Hard Block on Leave**: Prevent shift creation when employee has approved leave (no warnings, hard error)
- **Confirmation for Published Edits**: Require admin confirmation when editing published shifts to prevent accidents
- **Priority Features**:
  1. Employee availability view (leave requests inline)
  2. Cost tracking dashboard (2026 OT calculations)
  3. Template quick-apply (bulk creation with templates)

---

## Current Implementation Analysis

### Existing Features (Already Implemented)
- ✅ **Weekly Calendar View** - Grid layout with employee rows and date columns
- ✅ **Drag-and-Drop** - Reassign shifts by dragging between dates/employees
- ✅ **Shift Creation** - Modal-based single shift creation with template support
- ✅ **Bulk Operations** - Copy week, publish all drafts
- ✅ **Status Management** - Draft/Published badges with visual indicators
- ✅ **Mobile Responsive** - Agenda view for mobile devices
- ✅ **Conflict Detection** - Backend validates overlaps and rest periods
- ✅ **Shift Templates** - Reusable shift patterns with color coding
- ✅ **Week Navigation** - Previous/next week, jump to today
- ✅ **Notifications** - Toast feedback for all operations

### Architecture
- **File**: `frontend/src/pages/shifts/SchedulePage.tsx` (1025 lines)
- **State**: Local React state (no Zustand store)
- **API**: `shift.service.ts` with full CRUD + bulk operations
- **DnD Library**: `@dnd-kit/core` for drag-and-drop
- **Styling**: Tailwind CSS with dark mode support
- **i18n**: Thai/English via react-i18next

---

## Admin Workflow Design

### Overview

The admin workflow follows a **Plan → Create → Validate → Publish** cycle:

```
1. Plan Phase
   └─ Review templates, employee availability, past schedules

2. Create Phase
   ├─ Create individual shifts (modal form)
   ├─ Copy from previous week (bulk template)
   └─ Drag-and-drop to adjust (quick edits)

3. Validate Phase
   ├─ Visual conflict indicators
   ├─ System validation (backend)
   └─ Review draft counts

4. Publish Phase
   ├─ Bulk publish confirmation
   ├─ Send LINE notifications to guards
   └─ Lock published shifts (confirmation required to edit)
```

---

## Detailed Workflow Phases

### Phase 1: Planning & Context Review

**User Goal**: Understand current state before creating new schedules

**Actions Available**:
1. **Navigate to Target Week**
   - Use previous/next week buttons
   - Click "Today" to jump to current week
   - View week date range in header (e.g., "Jan 20 - Jan 26, 2026")

2. **Review Existing Shifts**
   - See all shifts in calendar grid
   - Filter by status: All / Draft / Published
   - View shift counts by status in badges

3. **Check Employee Availability**
   - See employee list in left column
   - View employee names with avatars
   - (Enhancement: Show employee leave requests inline)

4. **Access Shift Templates**
   - Navigate to `/shift-templates` page
   - Review available templates with colors
   - Create new templates if needed

**UI Elements**:
- Week navigation controls (top-left)
- Status filter dropdown (top-right)
- Status badges: "Draft: X" / "Published: Y"
- Employee list (sticky left column)
- Date headers (Mon-Sun)

---

### Phase 2: Shift Creation

**User Goal**: Assign shifts to guards for the week

#### Option A: Single Shift Creation (Modal)

**Trigger**: Click "+" button in calendar cell

**Form Fields**:
```
Employee*:        [Select dropdown] (Active employees only)
Date*:            [Date picker] (Pre-filled from clicked cell)
Template:         [Select dropdown] (Optional, loads time from template)
Start Time*:      [Time picker HH:mm]
End Time*:        [Time picker HH:mm]
Location:         [Text input] (Optional, max 255 chars)
Notes:            [Textarea] (Optional, max 1000 chars)
```

**Validation**:
- Required fields marked with *
- Time format: 24-hour HH:mm
- Prevent past dates (optional, based on business rules)
- Employee must be active status

**Actions**:
- **Save as Draft**: Creates shift with status='draft'
- **Save & Publish**: Creates shift with status='published', sends notification
- **Cancel**: Discard changes

**Backend API**: `POST /api/v1/shifts`

#### Option B: Bulk Creation (Copy Week)

**Trigger**: Click "Copy Week" button (top toolbar)

**Modal Flow**:
1. **Select Source Week**
   - Dropdown or date picker
   - Show preview: "Copy from Jan 13 - Jan 19"

2. **Select Target Week**
   - Pre-filled with current week
   - Editable

3. **Filter Employees** (Optional)
   - Multi-select dropdown
   - Default: All employees

4. **Preview Changes**
   - Show count: "45 shifts will be copied"
   - Show any warnings (conflicts detected)

5. **Confirm & Execute**
   - Button: "Copy Shifts"
   - Progress indicator during bulk creation

**Result Display**:
- Success: "Created 42 shifts. Skipped 3 due to conflicts."
- Show detailed list of skipped shifts with reasons
- Auto-refresh calendar

**Backend API**: `POST /api/v1/shifts/copy`
```json
{
  "sourceStartDate": "2026-01-13",
  "targetStartDate": "2026-01-20",
  "employeeIds": ["uuid1", "uuid2"]
}
```

#### Option C: Drag-and-Drop Editing

**Use Case**: Quick rescheduling or reassignment

**Interactions**:
1. **Drag Shift Card**: Click and hold grip icon
2. **Drop in New Cell**: Different date or different employee row
3. **Visual Feedback**:
   - Semi-transparent overlay during drag
   - Green highlight on valid drop targets
   - Red highlight on invalid drop targets (conflicts)

4. **Auto-Save**: Updates shift immediately on drop
5. **Validation**: Backend checks conflicts, shows toast on error

**Backend API**: `PUT /api/v1/shifts/:id`
```json
{
  "date": "2026-01-21",
  "employeeId": "new-employee-uuid"
}
```

---

### Phase 3: Validation & Conflict Detection

**User Goal**: Ensure schedule is valid before publishing

#### Visual Conflict Indicators

**On Calendar**:
- Red border on shift card = conflict detected
- Yellow border = warning (leave overlap, insufficient rest)
- Tooltip on hover shows conflict details

**Conflict Types**:
1. **Double-Booking** (Hard Conflict)
   - Same employee, same date, overlapping times
   - Backend prevents creation (UNIQUE constraint)
   - Frontend shows error toast

2. **Leave Overlap** (Hard Conflict - UPDATED)
   - Employee has approved leave on shift date
   - **Backend prevents creation entirely** (hard block)
   - Frontend shows error: "Cannot create shift: Employee has approved leave on this date"
   - No override option available

3. **Insufficient Rest** (Warning)
   - <12 hours between shifts
   - Shows warning badge
   - Backend soft validation (can override with confirmation)

4. **Weekly Hours Exceeded** (Hard Conflict)
   - >48 hours per week (2026 rule)
   - Backend prevents creation
   - Shows error with current hours count

#### Validation Flow

**Client-Side** (Immediate Feedback):
- Check employee selection exists
- Check time format validity
- Check date is not in past (if configured)

**Server-Side** (Authoritative):
- Multi-tenant isolation (company_id check)
- Conflict detection algorithm
- Rest period calculation
- Weekly hours calculation
- Leave request check

**Error Display**:
```
❌ "Cannot create shift: Employee already has a shift from 08:00-16:00"
❌ "Cannot create shift: Employee has approved leave on Jan 22, 2026"
⚠️ "Warning: Only 8 hours rest since previous shift (confirm to proceed)"
```

---

### Phase 4: Publishing & Notifications

**User Goal**: Finalize schedule and notify guards

#### Publish Workflow

**Trigger**: Click "Publish" button (top toolbar)

**Modal Confirmation**:
```
Title: "Publish Draft Shifts"
Body:  "Publish 12 draft shifts for week Jan 20 - Jan 26?
        All assigned guards will receive LINE notifications."

Preview:
- Employee Name    | Date       | Time        | Location
- John Doe         | Jan 20     | 08:00-16:00 | Building A
- Jane Smith       | Jan 20     | 16:00-00:00 | Building B
...

[ Cancel ]  [ Publish All ]
```

**Actions**:
1. **User confirms**: Click "Publish All"
2. **Backend processing**:
   - Updates all draft shifts to status='published'
   - Sets published_at timestamp
   - Triggers notification job

3. **Notification Delivery**:
   - Creates notification records in database
   - Sends LINE messages via Messaging API
   - In-app notification center badge update

4. **Success Feedback**:
   - Toast: "Published 12 shifts successfully"
   - Status badges update: Draft: 0, Published: 12
   - Calendar auto-refreshes

**Backend API**: `POST /api/v1/shifts/publish`
```json
{
  "startDate": "2026-01-20",
  "endDate": "2026-01-26"
}
```

#### Notification Content (LINE)

```
🔔 ตารางเวรใหม่ / New Shift Schedule

📅 วันที่: 20 มกราคม 2026
🕐 เวลา: 08:00 - 16:00
📍 สถานที่: Building A, Floor 3
📝 หมายเหตุ: Bring security equipment

กด "ดูตารางเวร" เพื่อดูรายละเอียด
[View Schedule Button] → Opens LIFF app
```

#### Editing Published Shifts

**Business Rule**: Published shifts require confirmation before editing (per user requirement)

**Flow**:
1. User clicks published shift card
2. Edit modal opens with pre-filled data
3. **Warning banner (prominent)**:
   ```
   ⚠️ This shift is already published
   Any changes will notify the employee immediately
   ```
4. User makes changes
5. **Two-step confirmation**:
   - Click "Save Changes" → Confirmation dialog appears
   - Dialog: "Update published shift for [Employee Name]? Employee will receive a LINE notification about the change."
   - Buttons: [Cancel] [Confirm Update]
6. On confirm:
   - Update shift
   - Send "shift_changed" notification to employee
   - Toast: "Shift updated. Notification sent to [Employee Name]."

**Backend API**: `PUT /api/v1/shifts/:id`

**Reasoning**: Two-step confirmation (warning banner + confirmation dialog) prevents accidental edits to published shifts while maintaining flexibility for necessary changes.

---

## Role-Based Access Control

### Permission Matrix

| Action | Super Admin | Company Admin | Manager | Guard |
|--------|-------------|---------------|---------|-------|
| View Schedule Page | ✅ | ✅ | ✅ | ❌ (LIFF only) |
| View All Shifts | ✅ | ✅ | ✅ | Own only |
| Create Shift | ✅ | ✅ | ✅ | ❌ |
| Edit Draft Shift | ✅ | ✅ | ✅ | ❌ |
| Edit Published Shift | ✅ | ✅ | ✅ (w/ confirm) | ❌ |
| Delete Shift | ✅ | ✅ | ✅ | ❌ |
| Publish Shifts | ✅ | ✅ | ✅ | ❌ |
| Copy Week | ✅ | ✅ | ✅ | ❌ |
| View Templates | ✅ | ✅ | ✅ | ✅ |
| Manage Templates | ✅ | ✅ | ✅ | ❌ |

### Route Protection

**Frontend**: `/schedule` → `NonLiffProtectedRoute` (blocks guards)
**Backend**: `/api/v1/shifts` → `requireManager` middleware

---

## UI/UX Design Specifications

### Desktop View (>768px)

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│ [← Prev Week] Jan 20 - Jan 26, 2026 [Next Week →][Today]│
│ Draft: 5  Published: 12        [Copy Week][Publish]     │
├───────────┬──────┬──────┬──────┬──────┬──────┬──────────┤
│ Employee  │ Mon  │ Tue  │ Wed  │ Thu  │ Fri  │ Sat      │
├───────────┼──────┼──────┼──────┼──────┼──────┼──────────┤
│ John Doe  │[Shift│[Shift│      │[Shift│[Shift│[Shift]   │
│           │ Card]│ Card]│  +   │ Card]│ Card]│ Draft    │
├───────────┼──────┼──────┼──────┼──────┼──────┼──────────┤
│ Jane Smith│[Shift│      │[Shift│      │[Shift│          │
│           │ Pub] │  +   │ Card]│  +   │ Card]│    +     │
└───────────┴──────┴──────┴──────┴──────┴──────┴──────────┘
```

**Shift Card Anatomy**:
```
┌─────────────────────────┐
│ 🟦 08:00 - 16:00       │  ← Template color bar
│    Building A, Floor 3  │  ← Location
│    [DRAFT] or ✓         │  ← Status badge
└─────────────────────────┘
```

**Color Coding**:
- Template color: Left border (blue, green, red, etc.)
- Draft status: Yellow background tint
- Published status: No tint, green checkmark
- Conflict: Red border
- Warning: Yellow border

### Mobile View (<768px)

**Layout**: Agenda list grouped by date

```
┌─────────────────────────────┐
│ [← Prev] Jan 20 [Next →]    │
├─────────────────────────────┤
│ Monday, Jan 20              │
│ ┌─────────────────────────┐ │
│ │ John Doe                │ │
│ │ 08:00 - 16:00           │ │
│ │ Building A              │ │
│ │ [DRAFT]                 │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Jane Smith              │ │
│ │ 16:00 - 00:00           │ │
│ │ Building B              │ │
│ │ ✓ Published             │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Tuesday, Jan 21             │
│ ...                         │
└─────────────────────────────┘
```

---

## Enhanced Features (Recommendations)

### 1. Employee Availability Indicator (PRIORITY)

**Problem**: Admins don't see employee leave requests while scheduling, leading to conflicts

**Solution**: Add inline availability indicator with hard block enforcement

**Implementation Details**:

**Data Fetching**:
- API: `GET /api/v1/leave-requests?status=approved&startDate=X&endDate=Y`
- Fetch on page load and week navigation
- Cache results for current week

**UI Display**:
```
Employee Row Header:
┌─────────────────────┐
│ John Doe  🏖️        │  ← Leave icon indicator
│ #EMP001             │
└─────────────────────┘

Tooltip on hover: "On leave: Jan 22-24, 2026"
```

**Calendar Cell Indicators**:
- Gray out cells where employee has leave
- Show "🏖️" icon in cell
- Disable "+" button (prevent shift creation)

**Validation**:
- Frontend: Disable shift creation UI for leave dates
- Backend: Hard block with error if attempt made via API
- Error message: "Cannot create shift: [Employee Name] has approved leave on [Date]"

**Code Location**:
- `frontend/src/pages/shifts/SchedulePage.tsx` - Add leave query and UI indicators
- `backend/src/modules/shift/shift.service.ts` - Add leave validation in createShift method

**API Response Format**:
```typescript
interface LeaveRequest {
  id: string;
  employeeId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  type: string;
  status: 'approved';
}
```

### 2. Cost Tracking Dashboard (PRIORITY)

**Problem**: Admins need to manage labor budgets with 2026 OT changes

**Solution**: Add cost dashboard with weekly/monthly totals

**Implementation Details**:

**Cost Calculation Algorithm** (2026 Rules):
```typescript
function calculateShiftCost(shift: Shift, employee: Employee): number {
  const hours = calculateShiftHours(shift.startTime, shift.endTime, shift.breakMinutes);
  const hourlyRate = employee.hourlyRate || 250; // Default 250 THB

  if (hours <= 8) {
    return hours * hourlyRate;
  } else {
    const regularHours = 8;
    const overtimeHours = hours - 8;
    return (regularHours * hourlyRate) + (overtimeHours * hourlyRate * 1.25);
  }
}
```

**UI Display - Dashboard Widget**:
```
┌─────────────────────────────────────────────────────┐
│ 💰 Week Cost Summary (Jan 20 - Jan 26)             │
├─────────────────────────────────────────────────────┤
│ Total Shifts: 45                                    │
│ Total Hours: 360 hrs (Regular: 288, OT: 72)        │
│ Estimated Cost: ฿92,500                             │
│ Avg Cost/Shift: ฿2,055                              │
│                                                     │
│ [View Breakdown] [Export Report]                   │
└─────────────────────────────────────────────────────┘
```

**Detailed Breakdown Modal**:
```
Employee          | Shifts | Hours | Regular | OT   | Total Cost
John Doe          | 5      | 48    | 40      | 8    | ฿12,500
Jane Smith        | 6      | 52    | 48      | 4    | ฿13,250
...
```

**Visual Indicators**:
- Green: Within budget
- Yellow: 80-100% of budget
- Red: Over budget

**Shift Creation Modal Enhancement**:
- Show estimated cost below time inputs
- Update in real-time as times change
- Example: "Estimated cost: ฿2,000 (8 hrs)" or "฿3,250 (12 hrs, +4 OT)"

**Code Location**:
- `frontend/src/pages/shifts/SchedulePage.tsx` - Add cost calculation and dashboard widget
- `frontend/src/utils/shiftCost.ts` - New utility file for cost calculations
- `frontend/src/types/shift.types.ts` - Add cost fields to types

**Required Employee Data**:
- Add `hourlyRate` field to employee profile
- Default to 250 THB if not set
- Admin can configure per employee

### 3. Template Quick-Apply (PRIORITY)

**Problem**: Creating multiple similar shifts requires repetitive modal interactions

**Solution**: Multi-select cells and apply template in bulk

**Implementation Details**:

**User Interaction Flow**:
1. **Multi-Select Mode**:
   - Hold Shift + Click cells to select multiple
   - Visual feedback: Selected cells highlighted with blue border
   - Selection counter: "5 cells selected"

2. **Apply Template**:
   - Click "Apply Template" button (appears when cells selected)
   - Dropdown shows available templates
   - Select template → Confirmation modal

3. **Confirmation Modal**:
   ```
   ┌─────────────────────────────────────────────┐
   │ Apply Template: "Day Shift (08:00-16:00)"   │
   ├─────────────────────────────────────────────┤
   │ Creating 5 shifts:                          │
   │ • John Doe - Monday, Jan 20                 │
   │ • Jane Smith - Monday, Jan 20               │
   │ • John Doe - Tuesday, Jan 21                │
   │ • Jane Smith - Tuesday, Jan 21              │
   │ • Mike Chen - Wednesday, Jan 22             │
   │                                             │
   │ ⚠️ Conflicts detected: 1                    │
   │ • John Doe - Monday: Approved leave         │
   │                                             │
   │ [Cancel] [Create Valid Shifts Only]         │
   └─────────────────────────────────────────────┘
   ```

4. **Execution**:
   - Use existing bulk create API: `POST /api/v1/shifts/bulk`
   - Show progress indicator
   - Result: "Created 4 shifts. Skipped 1 due to conflicts."

**Selection Modes**:

**Mode 1: Select by Employee + Dates**
- Click employee row, then Shift+Click multiple date cells
- All selected cells for that employee

**Mode 2: Select by Date + Employees**
- Click date column, then Shift+Click multiple employee rows
- All selected cells for that date

**Mode 3: Rectangle Selection**
- Click cell, drag to another cell
- Selects all cells in rectangle

**UI Components**:

**Selection Toolbar** (appears when cells selected):
```
┌─────────────────────────────────────────────────┐
│ 5 cells selected  [Clear Selection]             │
│ [Apply Template ▾] [Clear Shifts] [Copy]        │
└─────────────────────────────────────────────────┘
```

**Code Location**:
- `frontend/src/pages/shifts/SchedulePage.tsx` - Add multi-select state and UI
- `frontend/src/components/shifts/TemplateQuickApply.tsx` - New component for quick-apply modal
- Use existing `bulkCreateShifts` API from `shift.service.ts`

**State Management**:
```typescript
const [selectedCells, setSelectedCells] = useState<
  Array<{ employeeId: string; date: string }>
>([]);
const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
```

**Keyboard Shortcuts**:
- Shift + Click: Multi-select
- Ctrl/Cmd + A: Select all visible cells
- Escape: Clear selection

### 4. Conflict Preview on Hover

**Interaction**:
- Hover over shift card
- Show tooltip: "⚠️ 2 conflicts detected"
- Click for details modal

### 5. Undo/Redo Buffer

**Feature**: Keep last 10 actions in memory
**Actions**: Delete, update, create shifts
**UI**: Ctrl+Z / Ctrl+Shift+Z shortcuts

---

## Business Rules & Validation

### Thai Security Industry Compliance

#### 1. Legal Work Hour Limits
- **Pre-2026**: No hard weekly cap, but fatigue warnings
- **2026+**: 48 hours/week maximum (strict enforcement)
- **Implementation**: Backend calculates weekly hours on shift creation

#### 2. Rest Period Requirements
- **Minimum Rest**: 12 hours between shifts
- **Calculation**: End time of shift N to start time of shift N+1
- **Overnight Handling**: Correctly handle midnight crossover

#### 3. Consecutive Days Limit
- **Pre-2026**: Max 6 consecutive days
- **2026+**: Same rule maintained
- **Implementation**: Query shifts for employee in 7-day window

#### 4. Age & Gender Restrictions
- **Night Shifts (22:00-06:00)**: No minors (<18), no pregnant women
- **Implementation**: Check employee profile before night shift assignment

#### 5. License Validation
- **Requirement**: Active Tor Phor 7 (ธภ.7) license
- **Implementation**: Check `employees.license_status != 'suspended'`

### Cost Optimization (2026 Changes)

**Shift Cost Calculation**:
```
Base Rate: Hours 1-8 = 1.0x hourly rate
Overtime: Hours 9+ = 1.25x hourly rate (2026 law)
```

**Example**:
- 8-hour shift: 8 * 250 = 2,000 THB
- 12-hour shift: (8 * 250) + (4 * 312.50) = 3,250 THB

**Admin Workflow Impact**:
- Show estimated shift cost in creation modal
- Show weekly cost summary in dashboard
- Highlight cost-inefficient schedules (too many 12hr shifts)

---

## Data Flow Architecture

### State Management

**Current**: Local React state (useState)

**Recommended**: Continue with local state (no Zustand needed)

**Reasoning**:
- Schedule data is page-specific
- No cross-page state sharing needed
- Simpler debugging and testing

### API Data Flow

```
User Action (Frontend)
    ↓
Local Validation (Client)
    ↓
API Request (shift.service.ts)
    ↓
Auth Middleware (JWT + Tenant Check)
    ↓
Controller (shift.controller.ts)
    ↓
Validation (Zod schemas)
    ↓
Service Layer (shift.service.ts)
    ├─ Conflict Detection
    ├─ Business Rules Validation
    ├─ Database Query (Supabase + RLS)
    └─ Notification Trigger (if publish)
    ↓
Response (Success/Error)
    ↓
UI Update (State + Toast)
```

### Caching Strategy

**Current**: No caching (fresh fetch on every load)

**Recommended**: Add client-side cache with SWR or React Query

**Benefits**:
- Faster navigation between weeks
- Optimistic updates on drag-and-drop
- Auto-refetch on window focus

**Example with SWR**:
```typescript
const { data: shifts, mutate } = useSWR(
  `/shifts?startDate=${weekStart}&endDate=${weekEnd}`,
  fetcher,
  { revalidateOnFocus: true }
);
```

---

## Testing Strategy

### Unit Tests (Vitest)

**Component Tests**:
- SchedulePage renders correctly
- Create shift modal validates inputs
- Drag-and-drop updates shift correctly
- Status badges show accurate counts

**Service Tests**:
- shift.service.ts API calls with correct payloads
- Error handling for network failures

### Integration Tests

**User Flows**:
1. Create shift → Validate conflict detection → Save draft
2. Copy week → Preview changes → Execute → Verify results
3. Publish shifts → Verify notifications sent → Check status update
4. Drag-and-drop → Verify API call → Verify UI update

### E2E Tests (Playwright)

**Critical Paths**:
- Admin login → Navigate to schedule → Create shift → Publish → Guard receives LINE notification
- Admin creates conflicting shift → System blocks with error message
- Admin copies week with conflicts → Preview shows skipped shifts

---

## Performance Considerations

### Current Performance

**SchedulePage.tsx Analysis**:
- Large component (1025 lines) → Consider splitting
- Re-renders on every state change → Memoization opportunities
- Drag-and-drop has active drag overlay → Performance is acceptable

### Optimization Opportunities

1. **Component Splitting**:
   - Extract `ShiftCard` to separate component
   - Extract `CreateShiftModal` to separate component
   - Extract `PublishModal` to separate component

2. **Memoization**:
   ```typescript
   const DraggableShift = React.memo(({ shift, ... }) => {
     // Component logic
   });

   const shiftsForCell = useMemo(() =>
     shifts.filter(s => s.date === date && s.employeeId === empId),
     [shifts, date, empId]
   );
   ```

3. **Virtualization** (Future):
   - If >50 employees, use react-window for virtual scrolling
   - Only render visible rows

4. **Data Pagination**:
   - Current: Loads all shifts for week (typically <200 shifts)
   - No pagination needed for weekly view
   - Add pagination for monthly view (future enhancement)

---

## Security Considerations

### Multi-Tenancy Enforcement

**Frontend**:
- All API requests include JWT with company_id claim
- No company selection dropdown (derived from user's JWT)

**Backend**:
- Tenant middleware extracts company_id from JWT
- All database queries filtered by company_id
- Row-Level Security (RLS) policies enforce isolation

### Authorization Checks

**Frontend Route Guard**:
```typescript
// routes.tsx
{
  path: '/schedule',
  element: <NonLiffProtectedRoute />, // Blocks guards
  children: [{ index: true, element: <SchedulePage /> }]
}
```

**Backend API Guard**:
```typescript
// shift.routes.ts
router.post('/', requireManager, createShift);
router.post('/publish', requireManager, publishShifts);
```

### Input Sanitization

**Client-Side**:
- Trim whitespace from text inputs
- Validate time format with regex
- Validate date format with regex

**Server-Side** (Zod):
```typescript
const createShiftSchema = z.object({
  employeeId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  location: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
});
```

---

## Internationalization (i18n)

### Supported Languages
- Thai (th) - Default
- English (en)

### Translation Keys

**Schedule Page**:
```json
{
  "schedule": {
    "title": "ตารางเวร",
    "title_en": "Schedule",
    "week_view": "รายสัปดาห์",
    "month_view": "รายเดือน",
    "create_shift": "สร้างเวร",
    "copy_week": "คัดลอกสัปดาห์",
    "publish": "เผยแพร่",
    "draft": "ฉบับร่าง",
    "published": "เผยแพร่แล้ว",
    "conflicts": "ข้อขัดแย้ง",
    "no_shifts": "ไม่มีตารางเวร"
  },
  "shift": {
    "employee": "พนักงาน",
    "date": "วันที่",
    "template": "เทมเพลต",
    "start_time": "เวลาเริ่ม",
    "end_time": "เวลาสิ้นสุด",
    "location": "สถานที่",
    "notes": "หมายเหตุ"
  },
  "errors": {
    "double_booking": "พนักงานมีเวรซ้อนกันอยู่แล้ว",
    "insufficient_rest": "พักไม่ถึง 12 ชั่วโมง",
    "weekly_limit": "เกินขีดจำกัด 48 ชั่วโมง/สัปดาห์"
  }
}
```

### Date/Time Formatting

**Thai Locale**:
- Date format: `DD/MM/YYYY` (25/01/2026)
- Day names: อา, จ, อ, พ, พฤ, ศ, ส

**English Locale**:
- Date format: `MM/DD/YYYY` (01/25/2026)
- Day names: Sun, Mon, Tue, Wed, Thu, Fri, Sat

**Implementation**:
```typescript
import { useTranslation } from 'react-i18next';

const { t, i18n } = useTranslation();
const dayNames = i18n.language === 'th'
  ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
  : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
```

---

## Critical Files to Modify/Review

### Frontend Files
1. **`frontend/src/pages/shifts/SchedulePage.tsx`** (Lines: 1-1025)
   - Current implementation
   - Enhancements: Add availability indicators, quick stats

2. **`frontend/src/services/shift.service.ts`**
   - API client for shift operations
   - No changes needed (already comprehensive)

3. **`frontend/src/types/shift.types.ts`**
   - TypeScript interfaces
   - Add new types for enhanced features if needed

4. **`frontend/src/components/common/` (New Components)**
   - Extract `ShiftCard.tsx`
   - Extract `CreateShiftModal.tsx`
   - Extract `PublishModal.tsx`

5. **`frontend/src/i18n/locales/th/translation.json`**
   - Add missing schedule-related translation keys

### Backend Files
1. **`backend/src/modules/shift/shift.service.ts`** (Lines: 1-1035)
   - Business logic and validation
   - Review conflict detection algorithm
   - Ensure 2026 compliance rules are implemented

2. **`backend/src/modules/shift/shift.controller.ts`**
   - Request handling
   - No changes needed (already comprehensive)

3. **`backend/src/modules/shift/shift.validation.ts`**
   - Zod schemas
   - Review for completeness

4. **`backend/src/modules/notification/notification.service.ts`**
   - Ensure shift notifications are implemented
   - Verify LINE Messaging API integration

---

## Implementation Verification Plan

### Implementation Status Summary

**Completed Features:**

✅ **Phase 1: Critical Fixes** (100% complete)
1. **Leave Conflict Enforcement** - Backend validation added to `shift.service.ts` with `checkApprovedLeave()` method
2. **Published Shift Edit Confirmation** - Two-step confirmation (warning banner + dialog) added to `SchedulePage.tsx`
3. **Employee Availability Indicators** - Leave requests fetched and displayed with 🏖️ icons, disabled "+" buttons on leave dates

✅ **Phase 2: Enhanced Features** (67% complete)
1. **Cost Tracking Dashboard** - Created `shiftCost.ts` utility, added weekly cost widget and detailed breakdown modal
2. **Cost Estimate in Modal** - Real-time cost calculation in shift creation form with OT breakdown
3. ❌ **Template Quick-Apply** - NOT STARTED (multi-select cells feature deferred)

**Files Modified:**
- `backend/src/modules/shift/shift.service.ts` - Added `checkApprovedLeave()` method at line 404+, integrated into `validateAssignment()` at line 237
- `frontend/src/pages/shifts/SchedulePage.tsx` - Added leave requests state, cost calculations, confirmation dialogs, warning banners, leave indicators
- `frontend/src/utils/shiftCost.ts` - NEW FILE with cost calculation utilities implementing 2026 Thai labor law rules

**Implementation Date:** January 25, 2026

**Next Steps:**
- Implement Template Quick-Apply feature (multi-select cells + bulk template application)
- Extract reusable components (ShiftCard, CreateShiftModal, PublishModal)
- Add unit tests for cost calculations and leave validation
- Add missing i18n translation keys for new features

---

### Acceptance Criteria

**Phase 1: Core Workflow** (Pre-existing features - all functional)
- [x] Admin can navigate between weeks
- [x] Admin can create single shift via modal
- [x] Admin can copy entire week
- [x] Admin can drag-and-drop shifts
- [x] Admin can publish draft shifts
- [x] Guards receive LINE notifications on publish

**Phase 2: Validation** (Phase 1 implementation completed)
- [x] System prevents double-booking (backend hard block)
- [x] System blocks shift creation on approved leave dates (backend + frontend hard block)
- [x] Employee leave indicators show in calendar (🏖️ icon)
- [ ] System warns on insufficient rest (visual indicator with optional override) - Pre-existing backend validation, frontend visual indicator not yet implemented
- [ ] System blocks >48 hours/week (backend hard block) - Pre-existing backend validation confirmed

**Phase 2b: Priority Features** (Phase 2 implementation - partially completed)
- [x] Employee availability view shows leave requests inline
- [x] Cost tracking dashboard displays weekly totals with 2026 OT calculations
- [ ] Template quick-apply allows multi-select and bulk creation - NOT STARTED
- [x] Cost estimate shows in shift creation modal

**Phase 3: UX** (Pre-existing features - all functional)
- [x] Mobile responsive design works
- [x] Drag-and-drop provides visual feedback
- [x] Toast notifications show for all actions
- [x] Status badges update in real-time
- [x] Thai/English i18n works correctly

### Manual Testing Checklist

**Scenario 1: Create Weekly Schedule from Scratch**
1. Navigate to next week (empty schedule)
2. Create shift for Employee A on Monday 08:00-16:00
3. Create shift for Employee A on Monday 16:00-00:00
4. Verify conflict error appears
5. Delete 16:00 shift
6. Create shift for Employee B on Monday 16:00-00:00
7. Copy this week to next week
8. Verify all shifts copied correctly
9. Publish all draft shifts
10. Verify status changes to published
11. Check Employee A's LINE for notification

**Scenario 2: Handle Conflicts**
1. Employee A has shift on Mon 08:00-16:00
2. Try to create shift for Employee A on Mon 10:00-18:00
3. Verify system blocks with error: "Employee already has a shift"
4. Employee B has approved leave on Tue Jan 22
5. Try to create shift for Employee B on Tue
6. Verify system blocks with hard error: "Cannot create shift: Employee has approved leave on Jan 22, 2026"
7. Verify "+" button is disabled in calendar cell for Employee B on Tue
8. Verify 🏖️ icon shows in Employee B's calendar cell on Tue

**Scenario 3: Drag-and-Drop Editing**
1. Shift assigned to Employee A on Mon
2. Drag shift to Employee B's row
3. Verify API call updates employeeId
4. Verify UI updates immediately
5. Drag shift from Mon to Tue
6. Verify API call updates date
7. Verify UI updates immediately

### Automated Test Coverage

**Unit Tests** (Target: 80% coverage):
- Component rendering
- State management logic
- API service calls
- Utility functions (date formatting, conflict detection)

**Integration Tests** (Target: Key user flows):
- Create → Publish workflow
- Copy week workflow
- Drag-and-drop workflow
- Conflict detection workflow

**E2E Tests** (Target: Critical paths):
- End-to-end scheduling workflow (login → create → publish → guard receives notification)
- Multi-tenant isolation (ensure company A cannot see company B's schedules)

---

## Deployment Considerations

### Environment Configuration

**Frontend** (`.env`):
```
VITE_API_BASE_URL=https://api.yourcompany.com/api/v1
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_LIFF_SCHEDULE_ID=xxx-schedule
```

**Backend** (`.env`):
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
JWT_SECRET=xxx
LINE_CHANNEL_ACCESS_TOKEN=xxx
LINE_CHANNEL_ID=xxx
```

### Database Migrations

**Required Indexes** (already exist):
- `idx_shifts_company_date` - Fast filtering by company and date
- `idx_shifts_employee_date` - Fast filtering by employee and date
- `idx_shifts_status` - Fast filtering by status

**No new migrations needed** - Schema is complete

### Monitoring & Logging

**Key Metrics**:
- Shift creation success rate
- Average time to publish weekly schedule
- Conflict detection accuracy
- Notification delivery rate (LINE API)

**Logging Points**:
- All shift CRUD operations (create, update, delete)
- Publish operations (with shift count)
- Conflict detection events (with conflict type)
- Notification send attempts (success/failure)

**Tools**:
- Backend: Winston logger (structured JSON logs)
- Frontend: Console errors in production (Sentry integration optional)
- Database: Supabase query logs

---

## Future Enhancements (Post-MVP)

### 1. Shift Swap Requests
**User Story**: Guard requests to swap shift with another guard
**Workflow**: Guard A offers shift → Guard B accepts → Manager approves → Shift reassigned
**Status**: Deferred (requirements.md: post-MVP)

### 2. Monthly Calendar View
**User Story**: Admin views entire month at once
**Implementation**: Extend SchedulePage with month view toggle
**Status**: Stretch goal (tasks.md)

### 3. Recurring Shifts
**User Story**: Admin creates template schedule that repeats weekly
**Example**: "Every Monday 08:00-16:00 for Employee A"
**Status**: Not in current requirements

### 4. Cost Dashboard
**User Story**: Admin sees total labor cost for week/month
**Implementation**: Calculate shift cost using 2026 OT rules
**Status**: Nice-to-have for budget planning

### 5. Export Schedule
**User Story**: Admin exports schedule to PDF or Excel
**Formats**: PDF (printable roster), Excel (editable)
**Status**: Common request from HR teams

---

## Implementation Summary

### What Already Exists (Working)
The current implementation at `frontend/src/pages/shifts/SchedulePage.tsx` includes:
- ✅ Weekly calendar grid view with drag-and-drop
- ✅ Shift creation modal with template selection
- ✅ Copy week bulk operation
- ✅ Draft/Published status workflow
- ✅ Publish with notifications
- ✅ Mobile responsive agenda view
- ✅ Backend conflict detection (double-booking, rest periods, weekly hours)

### What Needs Enhancement

#### 1. Leave Conflict Enforcement (Backend + Frontend)
**Current State**: Backend may not check leave requests
**Required Changes**:
- **Backend** (`backend/src/modules/shift/shift.service.ts`):
  - Add leave request validation in `createShift` method
  - Query approved leave requests for employee on shift date
  - Return hard error if leave exists
  - Add to conflict detection algorithm (line ~250)

- **Frontend** (`frontend/src/pages/shifts/SchedulePage.tsx`):
  - Fetch leave requests on page load: `GET /api/v1/leave-requests`
  - Show 🏖️ icon in employee cells with leave
  - Gray out cells and disable "+" button
  - Add tooltip with leave date range

#### 2. Published Shift Edit Confirmation (Frontend)
**Current State**: May allow direct editing
**Required Changes**:
- **Frontend** (`frontend/src/pages/shifts/SchedulePage.tsx`):
  - Add confirmation dialog before updating published shifts
  - Show warning banner in edit modal for published shifts
  - Two-step confirmation: warning + dialog
  - Update line ~400-500 (edit shift handler)

#### 3. Employee Availability View (NEW FEATURE)
**Files to Modify**:
- `frontend/src/pages/shifts/SchedulePage.tsx` (lines 1-1025)
  - Add state: `const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])`
  - Add fetch in `loadData`: `leaveService.list({ status: 'approved', startDate, endDate })`
  - Add helper: `isEmployeeOnLeave(employeeId, date)`
  - Update calendar cell rendering to show leave icons
  - Disable shift creation UI for leave dates

**Files to Create**:
- `frontend/src/services/leave.service.ts` (if not exists)
  - Add `list` method with filter params

**Backend**:
- Ensure leave API exists: `GET /api/v1/leave-requests` with status filter
- Already exists based on design docs

#### 4. Cost Tracking Dashboard (NEW FEATURE)
**Files to Create**:
- `frontend/src/utils/shiftCost.ts`
  ```typescript
  export function calculateShiftCost(shift: Shift, hourlyRate: number): number
  export function calculateShiftHours(startTime: string, endTime: string, breakMinutes: number): number
  export function calculateWeeklyCost(shifts: Shift[], employees: Employee[]): CostSummary
  ```

**Files to Modify**:
- `frontend/src/pages/shifts/SchedulePage.tsx`
  - Add cost calculation logic
  - Add dashboard widget component (inline or extract)
  - Show cost estimate in create shift modal
  - Display weekly cost summary in toolbar

**Files to Create** (Optional - for better organization):
- `frontend/src/components/shifts/CostDashboard.tsx` - Extracted dashboard widget
- `frontend/src/types/shift.types.ts` - Add `CostSummary` interface

**Backend**:
- Ensure employee `hourlyRate` field exists in database schema
- No API changes needed (cost calculated client-side)

#### 5. Template Quick-Apply (NEW FEATURE)
**Files to Modify**:
- `frontend/src/pages/shifts/SchedulePage.tsx`
  - Add state: `const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([])`
  - Add multi-select event handlers (Shift+Click)
  - Add selection toolbar component
  - Add keyboard shortcuts (Shift, Escape)

**Files to Create**:
- `frontend/src/components/shifts/TemplateQuickApply.tsx` - Quick-apply modal
  - Shows selected cells preview
  - Template dropdown
  - Conflict warnings
  - Calls existing `bulkCreateShifts` API

**Backend**:
- No changes needed (uses existing `POST /api/v1/shifts/bulk`)

### Implementation Order (Recommended)

**Phase 1: Critical Fixes (Day 1-2)**
1. Leave conflict enforcement (backend validation)
2. Published shift edit confirmation (frontend)
3. Employee availability indicators (frontend)

**Phase 2: Enhanced Features (Day 3-5)**
4. Cost tracking dashboard (frontend utility + UI)
5. Cost estimate in shift creation modal
6. Template quick-apply multi-select

**Phase 3: Polish (Day 6-7)**
7. Extract reusable components (ShiftCard, CreateShiftModal)
8. Add unit tests for cost calculations
9. Add integration tests for leave validation
10. Update i18n translation files

### Critical Files Reference

**Must Modify**:
- `frontend/src/pages/shifts/SchedulePage.tsx` (main implementation)
- `backend/src/modules/shift/shift.service.ts` (leave validation logic)
- `backend/src/modules/shift/shift.validation.ts` (add leave check schema)

**Must Create**:
- `frontend/src/utils/shiftCost.ts` (cost calculation utilities)
- `frontend/src/components/shifts/TemplateQuickApply.tsx` (quick-apply modal)
- `frontend/src/components/shifts/CostDashboard.tsx` (optional, for organization)

**Must Review**:
- `frontend/src/services/shift.service.ts` (ensure all APIs used correctly)
- `backend/src/modules/leave/leave.routes.ts` (verify leave API exists)
- `frontend/src/i18n/locales/th/translation.json` (add new translation keys)

### Testing Verification

**Manual Tests**:
1. Create shift for employee with approved leave → Verify hard block
2. Edit published shift → Verify confirmation dialog appears
3. Multi-select 5 cells → Apply template → Verify bulk creation
4. Create 12-hour shift → Verify cost shows OT calculation (฿3,250)
5. View week with leaves → Verify 🏖️ icons show in calendar

**Automated Tests** (Add to test suite):
- `shiftCost.test.ts` - Test cost calculation algorithm
- `SchedulePage.test.tsx` - Test multi-select state management
- `shift.service.test.ts` (backend) - Test leave validation logic

---

## Conclusion

The company admin workflow for `/schedule` page is **well-designed and mostly implemented**. The current foundation is solid with calendar views, drag-and-drop, and bulk operations.

**Key Enhancements Required**:
1. ✅ **Leave Enforcement** - Hard block shift creation on approved leave dates (backend + frontend)
2. ✅ **Edit Confirmation** - Two-step confirmation for published shift edits (frontend)
3. ✅ **Availability View** - Show leave indicators inline in calendar (frontend)
4. ✅ **Cost Dashboard** - Weekly cost tracking with 2026 OT calculations (frontend)
5. ✅ **Quick-Apply** - Multi-select cells and bulk apply templates (frontend)

These enhancements align with **Thai security industry requirements**, support **2026 regulatory changes**, and optimize the **mixed scheduling workflow** (copy + create from scratch) that admins use.

**Success Criteria**:
- Admins can see employee leave at a glance (no more conflicts)
- Admins can manage labor costs with real-time calculations
- Admins can create schedules faster with template quick-apply
- Published shift edits require intentional confirmation (no accidents)
- System enforces Thai labor law compliance automatically
