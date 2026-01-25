# Site/Location Selector Implementation - Summary

## Overview

Successfully implemented **Site and Zone Selectors** for the shift creation/edit form to ensure clean, structured location data. This replaces the free-text location field with dropdown selectors tied to your existing Sites management system.

---

## ✅ Completed Features

### 1. **Database Schema Updates**
- ✅ Created migration file: `backend/supabase/migrations/015_add_site_zone_to_shifts.sql`
- ✅ Adds `site_id` column (UUID, references sites table)
- ✅ Adds `zone_id` column (UUID, references zones table)
- ✅ Adds indexes for performance (`idx_shifts_site_id`, `idx_shifts_zone_id`)
- ✅ Keeps `location` field as fallback for custom locations

### 2. **TypeScript Types Updated**
- ✅ Frontend types (`frontend/src/types/shift.types.ts`)
  - Added `siteId?: string | null` to `Shift` interface
  - Added `zoneId?: string | null` to `Shift` interface
  - Added `site?` and `zone?` details to `ShiftWithDetails` interface
  - Updated `CreateShiftRequest` and `UpdateShiftRequest` interfaces

- ✅ Backend validation (`backend/src/modules/shift/shift.validation.ts`)
  - Added `siteId` to createShiftSchema and updateShiftSchema
  - Added `zoneId` to createShiftSchema and updateShiftSchema
  - Both fields are optional with UUID validation

### 3. **Frontend UI Implementation**
Updated `frontend/src/pages/shifts/SchedulePage.tsx`:

- ✅ **Site Selector** - Dropdown showing all active sites with addresses
- ✅ **Zone Selector** - Conditionally displayed when site has zones
- ✅ **Custom Location** - Fallback text input when no site is selected
- ✅ **Notes Field** - Added textarea for shift-specific instructions (max 1000 chars)
- ✅ **Auto-population** - Site name auto-populates location field
- ✅ **Smart Reset** - Zone resets when site changes
- ✅ **Data Fetching** - Sites loaded alongside shifts/employees/templates/leave requests

---

## 🎯 How It Works (User Experience)

### Creating a Shift:

1. **Select Site** (Dropdown)
   - Shows: "Site Name - Address"
   - Option: "กำหนดเอง / Custom" for manual entry
   - When selected: Auto-fills location field

2. **Select Zone** (Conditional)
   - Only appears if selected site has zones
   - Shows: "Zone Name (Code)"
   - Optional - can leave blank

3. **Custom Location** (Text Input)
   - Only shows if "Custom" is selected in Site dropdown
   - Allows free-text entry for non-standard locations

4. **Notes** (Textarea)
   - Optional field for shift-specific instructions
   - Character counter (0/1000)
   - Example: "นำอุปกรณ์รักษาความปลอดภัย"

### Example Flow:

```
Admin clicks "+ Add Shift"
↓
Selects employee: "John Doe"
↓
Selects site: "Central Plaza - 123 Main St"
  → Location auto-fills: "Central Plaza"
↓
Zone dropdown appears:
  → Selects: "Main Entrance (A1)"
↓
Adds notes: "Bring security equipment"
↓
Saves shift ✅
```

---

## 📋 Required: Database Migration

**IMPORTANT**: You must run the database migration to add the new columns to the `shifts` table.

### Option 1: Supabase Dashboard (Recommended)

1. Go to: https://hermnyepqdzeytodcqev.supabase.co
2. Navigate to: **SQL Editor**
3. Copy and paste the SQL from: `backend/supabase/migrations/015_add_site_zone_to_shifts.sql`
4. Click **Run**

### Option 2: SQL Command

```sql
-- Add site_id and zone_id columns to shifts table
ALTER TABLE shifts
ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
ADD COLUMN zone_id UUID REFERENCES zones(id) ON DELETE SET NULL;

-- Add indexes for better query performance
CREATE INDEX idx_shifts_site_id ON shifts(site_id);
CREATE INDEX idx_shifts_zone_id ON shifts(zone_id);

-- Add comments for documentation
COMMENT ON COLUMN shifts.site_id IS 'Reference to the site where this shift takes place';
COMMENT ON COLUMN shifts.zone_id IS 'Reference to the specific zone/checkpoint within the site';
```

### Verify Migration:

After running the migration, verify with:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'shifts'
AND column_name IN ('site_id', 'zone_id');
```

Expected result:
```
column_name | data_type | is_nullable
------------|-----------|------------
site_id     | uuid      | YES
zone_id     | uuid      | YES
```

---

## 🔧 Technical Details

### Data Flow:

1. **Page Load**:
   ```typescript
   Promise.all([
     listShiftTemplates(),
     listShifts({ startDate, endDate }),
     employeeService.list({ status: 'active' }),
     listLeaveRequests({ status: 'approved', startDate, endDate }),
     sitesService.list(), // NEW
   ])
   ```

2. **Site Selection**:
   ```typescript
   onChange={(e) => {
     const selectedSite = sites.find(s => s.id === e.target.value);
     setFormData({
       ...formData,
       siteId: e.target.value,
       zoneId: '', // Reset zone
       location: selectedSite?.name || '' // Auto-populate
     });
   }}
   ```

3. **Shift Creation**:
   ```typescript
   await createShift({
     employeeId: 'uuid-1',
     date: '2026-01-25',
     startTime: '08:00',
     endTime: '16:00',
     siteId: 'uuid-site', // NEW
     zoneId: 'uuid-zone', // NEW (optional)
     location: 'Central Plaza', // Still stored for display
     notes: 'Bring equipment' // NEW
   });
   ```

### Validation:

**Frontend**:
- Site selector shows only `isActive === true` sites
- Zone selector shows only `isActive === true` zones for selected site
- Custom location appears only when `siteId` is empty

**Backend**:
- `siteId` and `zoneId` are optional UUID fields
- Validation via Zod schemas
- Database foreign keys ensure referential integrity

### Backward Compatibility:

- ✅ Existing shifts without `site_id` will continue to work
- ✅ `location` field remains for display and custom locations
- ✅ API accepts both old format (location only) and new format (siteId + zoneId)

---

## 📊 Data Benefits

### Before (Free Text):
```
❌ "Building A"
❌ "อาคาร A"
❌ "Bldg A"
❌ "BuildingA"
❌ "building a"
```

### After (Structured):
```
✅ siteId: "uuid-central-plaza"
✅ siteName: "Central Plaza"
✅ siteAddress: "123 Main St"
✅ zoneId: "uuid-main-entrance"
✅ zoneName: "Main Entrance"
✅ zoneCode: "A1"
```

### Enables:
1. **GPS Validation** - Attendance tracking can verify location
2. **Reporting** - "Show all shifts at Central Plaza this month"
3. **Filtering** - Filter calendar view by site
4. **Analytics** - "Which site has most shifts?"
5. **Consistency** - No more typos or variations
6. **Automation** - Future features like auto-assign guards to nearby sites

---

## 🧪 Testing Checklist

### Manual Tests:

- [ ] Create shift with site selected → Verify site name shows in shift card
- [ ] Create shift with site + zone → Verify zone name shows
- [ ] Create shift with custom location → Verify free text works
- [ ] Edit existing shift → Verify site/zone load correctly
- [ ] Change site in form → Verify zone resets
- [ ] Select site with no zones → Verify zone dropdown doesn't appear
- [ ] Add notes to shift → Verify character counter works (max 1000)
- [ ] Save shift with notes → Verify notes saved in database

### Database Tests:

```sql
-- Test 1: Create shift with site
INSERT INTO shifts (company_id, employee_id, date, start_time, end_time, site_id)
VALUES ('...', '...', '2026-01-25', '08:00', '16:00', '...');

-- Test 2: Verify foreign key constraint
INSERT INTO shifts (company_id, employee_id, date, start_time, end_time, site_id)
VALUES ('...', '...', '2026-01-25', '08:00', '16:00', '00000000-0000-0000-0000-000000000000');
-- Should fail: foreign key violation

-- Test 3: Query shifts with site details
SELECT s.*, si.name as site_name, z.name as zone_name
FROM shifts s
LEFT JOIN sites si ON s.site_id = si.id
LEFT JOIN zones z ON s.zone_id = z.id
WHERE s.date >= '2026-01-25';
```

---

## 🚀 Next Steps (Future Enhancements)

Based on the earlier feedback, here are recommended follow-ups:

### High Priority:
1. **Shift Duration Display** - Show "(8.0 hrs)" on shift cards
2. **Copy Shift Function** - Duplicate button in shift card menu
3. **Smart Date Navigation** - Date picker for quick jumps

### Medium Priority:
4. **Employee Quick Info** - Hover tooltip with employee details
5. **Employee Workload Indicator** - Visual bar showing weekly hours
6. **Shift Conflict Preview** - Real-time validation as user types

### Low Priority (Future):
7. **Bulk Edit Mode** - Select multiple shifts and update at once
8. **GPS Circle Visualization** - Show site radius on map
9. **Auto-Assign by Proximity** - Suggest nearest guards for site

---

## 📝 Files Modified

### Backend:
- ✅ `backend/supabase/migrations/015_add_site_zone_to_shifts.sql` (NEW)
- ✅ `backend/src/modules/shift/shift.validation.ts` (Updated)

### Frontend:
- ✅ `frontend/src/types/shift.types.ts` (Updated)
- ✅ `frontend/src/pages/shifts/SchedulePage.tsx` (Updated)

### Scripts:
- ✅ `backend/scripts/run-migration-015.js` (NEW - optional migration runner)

---

## 🎉 Summary

This implementation establishes **clean, structured location data** as the foundation for future features. By replacing free-text location with validated site/zone selectors:

- ✅ **Data Consistency** - No more typos or variations
- ✅ **GPS Integration** - Ready for attendance validation
- ✅ **Better Reporting** - Filter and analyze by site
- ✅ **User Experience** - Faster shift creation with dropdowns
- ✅ **Backward Compatible** - Existing shifts still work
- ✅ **Flexible** - Custom locations still available when needed

**Next**: Run the database migration and test the feature!
