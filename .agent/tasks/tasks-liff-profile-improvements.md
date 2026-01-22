# LIFF Profile Page Improvements - Implementation Tasks

## Overview

**Page:** `/liff/profile`  
**Purpose:** Enhance guard profile page with PIN management, LINE status, and better UX  
**Priority Focus:** Support for new company-specific login flow

---

## Pre-Implementation Checklist

```
Before starting:
- [ ] Review existing profile page component structure
- [ ] Review existing API endpoints for user/employee data
- [ ] Review existing certification display logic
- [ ] Review existing settings implementation
- [ ] Review i18n translation file structure
- [ ] Check what data is already available in user context/state
```

---

## Feature Priority Summary

| Priority | Feature | Reason |
|----------|---------|--------|
| 🔴 High | PIN Management | Required for company-specific login |
| 🔴 High | LINE Account Status | Guards need visibility of linked status |
| 🟡 Medium | Certification Urgency Colors | Better awareness of expiry dates |
| 🟡 Medium | Emergency Contact Display | Standard HR info, safety requirement |
| 🟡 Medium | Company Info in Header | Branding, multi-company future support |
| 🟢 Low | Monthly Stats Widget | Nice to have, motivational |

---

## Phase 1: PIN Management (High Priority)

### 1.1 Analyze Existing Settings Section
```
Before implementation:
- [ ] Review current settings section structure
- [ ] Review how language/notification settings are implemented
- [ ] Review navigation patterns (inline vs separate page)
- [ ] Check if PIN-related API endpoints exist (from company-login tasks)
```

### 1.2 Add "Change PIN" Menu Item
```
Location: Settings section on profile page

UI:
┌─────────────────────────────────────┐
│  ตั้งค่า                             │
├─────────────────────────────────────┤
│  🔐 เปลี่ยนรหัส PIN          →      │  ← NEW (top of list)
│  🔔 การแจ้งเตือน             →      │
│  🌐 ภาษา                   ไทย      │
└─────────────────────────────────────┘

Tasks:
- [ ] Add "Change PIN" row to settings section
- [ ] Add lock/key icon
- [ ] Navigate to PIN change page/modal on tap
- [ ] Show only if user has PIN set (hide if using password only)
```

### 1.3 Create Change PIN Page/Modal
```
Route: /liff/profile/change-pin (or modal)

UI Layout:
┌─────────────────────────────────────┐
│  ← กลับ                             │
├─────────────────────────────────────┤
│                                     │
│  🔐 เปลี่ยนรหัส PIN                  │
│     Change PIN                      │
│                                     │
│  รหัส PIN ปัจจุบัน / Current PIN     │
│  ┌─────────────────────────────┐   │
│  │ ○ ○ ○ ○ ○ ○                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  รหัส PIN ใหม่ / New PIN            │
│  ┌─────────────────────────────┐   │
│  │ ○ ○ ○ ○ ○ ○                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  ยืนยันรหัส PIN ใหม่ / Confirm PIN   │
│  ┌─────────────────────────────┐   │
│  │ ○ ○ ○ ○ ○ ○                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Numeric Keypad]                   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │    บันทึก / Save            │   │
│  └─────────────────────────────┘   │
│                                     │
│  ลืมรหัส PIN ปัจจุบัน?               │
│  Forgot current PIN?               │
│                                     │
└─────────────────────────────────────┘

Tasks:
- [ ] Create change PIN page/modal component
- [ ] Reuse PIN input component (from company-login tasks)
- [ ] Reuse numeric keypad component
- [ ] Three PIN fields: current, new, confirm
- [ ] Validate current PIN before allowing change
- [ ] Validate new PIN (not simple, matches confirm)
- [ ] Call change PIN API endpoint
- [ ] Show success message
- [ ] Navigate back to profile on success
- [ ] Handle errors (wrong current PIN, etc.)
- [ ] Add "Forgot current PIN?" link
```

### 1.4 Backend Endpoint (if not exists)
```
Endpoint: PUT /api/v1/auth/change-pin

Request:
{
  "currentPin": "123456",
  "newPin": "654321"
}

Response (success):
{
  "success": true,
  "message": "PIN changed successfully",
  "message_th": "เปลี่ยนรหัส PIN สำเร็จ"
}

Response (error):
{
  "success": false,
  "error": {
    "code": "INVALID_CURRENT_PIN",
    "message": "Current PIN is incorrect",
    "message_th": "รหัส PIN ปัจจุบันไม่ถูกต้อง"
  }
}

Tasks:
- [ ] Check if endpoint exists (from company-login implementation)
- [ ] If not, create endpoint
- [ ] Require authentication (JWT)
- [ ] Verify current PIN
- [ ] Validate new PIN format and complexity
- [ ] Update PIN hash in database
- [ ] Return success/error response
```

---

## Phase 2: LINE Account Status (High Priority)

### 2.1 Analyze Existing Data
```
Before implementation:
- [ ] Check if LINE linked status is in user context
- [ ] Check if LINE profile (name, picture) is stored
- [ ] Review existing user API response fields
- [ ] Check if unlink endpoint exists
```

### 2.2 Add Connected Accounts Section
```
Location: New section between certifications and settings

UI Layout:
┌─────────────────────────────────────┐
│  🔗 บัญชีที่เชื่อมต่อ                 │
│     Connected Accounts              │
├─────────────────────────────────────┤
│                                     │
│  [LINE Logo] LINE                   │
│  ┌─────────────────────────────┐   │
│  │ ✅ เชื่อมต่อแล้ว              │   │  ← If linked
│  │    สมชาย (LINE display name) │   │
│  │                    [ยกเลิก]  │   │
│  └─────────────────────────────┘   │
│                                     │
│  OR                                 │
│                                     │
│  [LINE Logo] LINE                   │
│  ┌─────────────────────────────┐   │
│  │ ⚪ ยังไม่ได้เชื่อมต่อ          │   │  ← If not linked
│  │                 [เชื่อมต่อ]   │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘

Tasks:
- [ ] Create Connected Accounts section component
- [ ] Display LINE connection status
- [ ] If linked: show LINE display name and unlink button
- [ ] If not linked: show connect button
- [ ] Add LINE logo/icon
- [ ] Style status badges (green for connected, gray for not)
```

### 2.3 LINE Unlink Functionality
```
Purpose: Allow user to disconnect LINE account

Flow:
1. User taps "ยกเลิก" (Unlink)
2. Show confirmation dialog
3. Call unlink API
4. Update UI to show unlinked state

Confirmation Dialog:
┌─────────────────────────────────────┐
│                                     │
│  ⚠️ ยกเลิกการเชื่อมต่อ LINE?         │
│     Unlink LINE account?            │
│                                     │
│  คุณจะไม่สามารถเข้าสู่ระบบด้วย LINE   │
│  ได้อีกต่อไป                         │
│  You will no longer be able to      │
│  login with LINE                    │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │  ยกเลิก   │  │  ยืนยัน   │        │
│  │  Cancel  │  │  Confirm │        │
│  └──────────┘  └──────────┘        │
│                                     │
└─────────────────────────────────────┘

Tasks:
- [ ] Create unlink confirmation dialog
- [ ] Call unlink API on confirm
- [ ] Update local state/context
- [ ] Show success message
- [ ] Handle errors
```

### 2.4 LINE Connect Functionality (if not linked)
```
Purpose: Allow user to connect LINE account from profile

Flow:
1. User taps "เชื่อมต่อ" (Connect)
2. Redirect to LINE login/LIFF
3. On success, return to profile with linked status

Tasks:
- [ ] Add connect button for unlinked state
- [ ] Implement LINE connect flow
- [ ] Handle LIFF context (if already in LINE)
- [ ] Handle web context (redirect to LINE login)
- [ ] Update UI on successful link
```

### 2.5 Backend Endpoints (if not exist)
```
GET /api/v1/users/me
- Should include: line_linked (boolean), line_display_name (string)

POST /api/v1/auth/line/unlink
- Requires authentication
- Removes LINE fields from user record

Tasks:
- [ ] Verify user endpoint includes LINE status
- [ ] Add LINE fields to response if missing
- [ ] Create unlink endpoint if not exists
```

---

## Phase 3: Certification Urgency Colors (Medium Priority)

### 3.1 Analyze Existing Certification Display
```
Before implementation:
- [ ] Review current certification component
- [ ] Review how expiry date is displayed
- [ ] Check date calculation utilities
- [ ] Review existing badge/status component
```

### 3.2 Create Urgency Badge Component
```
Logic:
| Days Until Expiry | Thai Text | English Text | Color |
|-------------------|-----------|--------------|-------|
| Expired (< 0) | หมดอายุแล้ว | Expired | Red |
| 0-30 days | หมดอายุเร็วๆ นี้ | Expiring soon | Orange |
| 31-90 days | ใกล้หมดอายุ | Expiring | Yellow |
| > 90 days | ใช้งานได้ | Valid | Green |

UI Examples:
┌────────────────────┐
│ 🔴 หมดอายุแล้ว      │  ← Red background
└────────────────────┘

┌────────────────────┐
│ 🟠 เหลือ 15 วัน     │  ← Orange background
└────────────────────┘

┌────────────────────┐
│ 🟡 เหลือ 2 เดือน    │  ← Yellow background
└────────────────────┘

┌────────────────────┐
│ 🟢 เหลือ 11 เดือน   │  ← Green background
└────────────────────┘

Tasks:
- [ ] Create certification status badge component
- [ ] Calculate days remaining from expiry date
- [ ] Determine status level based on days
- [ ] Display appropriate color and text
- [ ] Show "เหลือ X วัน/เดือน" format for non-expired
- [ ] Handle null expiry date (no expiration)
```

### 3.3 Update Certification Card
```
Current:
┌─────────────────────────────────────┐
│  ✅ ใบอนุญาต รปภ.                    │
│     หมดอายุ: 31 ธ.ค. 2025           │
│                        [ใช้งานได้]   │
└─────────────────────────────────────┘

Updated:
┌─────────────────────────────────────┐
│  ใบอนุญาต รปภ.                       │
│  หมดอายุ: 31 ธ.ค. 2025              │
│  ┌──────────────────┐               │
│  │ 🟢 เหลือ 11 เดือน │               │
│  └──────────────────┘               │
└─────────────────────────────────────┘

Tasks:
- [ ] Replace current badge with urgency badge
- [ ] Keep expiry date display
- [ ] Add icon based on status (checkmark, warning, X)
- [ ] Make card tappable to view details (optional)
```

### 3.4 Date Calculation Utility
```
Tasks:
- [ ] Create or update date utility function
- [ ] Calculate days between today and expiry
- [ ] Handle timezone (Bangkok)
- [ ] Handle edge cases (today = expiry date)
- [ ] Format "X days" vs "X months" appropriately
- [ ] Localize numbers for Thai
```

---

## Phase 4: Emergency Contact Display (Medium Priority)

### 4.1 Analyze Existing Data
```
Before implementation:
- [ ] Check if emergency contact fields exist in employee table
- [ ] Check if data is returned in user/employee API
- [ ] Review existing personal info section structure
```

### 4.2 Update Personal Info Section
```
Current:
┌─────────────────────────────────────┐
│  ข้อมูลส่วนตัว                        │
├─────────────────────────────────────┤
│  📞 เบอร์โทร          081-234-5678  │
│  ✉️ อีเมล      somchai@company.com  │
│  📅 วันเริ่มงาน         1 ม.ค. 2024  │
└─────────────────────────────────────┘

Updated:
┌─────────────────────────────────────┐
│  ข้อมูลส่วนตัว                        │
├─────────────────────────────────────┤
│  📞 เบอร์โทร          081-234-5678  │
│  ✉️ อีเมล      somchai@company.com  │
│  📅 วันเริ่มงาน         1 ม.ค. 2024  │
│─────────────────────────────────────│
│  ผู้ติดต่อฉุกเฉิน                     │
│  Emergency Contact                  │
│  👤 สมหญิง รักงาน (ภรรยา)            │
│  📞 082-345-6789                    │
└─────────────────────────────────────┘

Alternative (if no emergency contact set):
┌─────────────────────────────────────┐
│  ผู้ติดต่อฉุกเฉิน                     │
│  ⚠️ ยังไม่ได้ระบุ                    │
│     กรุณาติดต่อ HR เพื่อเพิ่มข้อมูล    │
└─────────────────────────────────────┘

Tasks:
- [ ] Add emergency contact subsection
- [ ] Display name and relationship
- [ ] Display phone number (tappable to call)
- [ ] Handle missing emergency contact gracefully
- [ ] Show prompt to contact HR if not set
```

### 4.3 Make Phone Numbers Tappable
```
Purpose: Allow quick call to emergency contact

Tasks:
- [ ] Wrap phone numbers in tel: links
- [ ] Style as tappable (underline or button)
- [ ] Works on mobile to initiate call
```

---

## Phase 5: Company Info in Header (Medium Priority)

### 5.1 Analyze Existing Header
```
Before implementation:
- [ ] Review current header component structure
- [ ] Check if company data is in user context
- [ ] Review company logo storage/URL
```

### 5.2 Update Profile Header
```
Current:
┌─────────────────────────────────────┐
│         [Profile Icon]              │
│           สมชาย รักงาน              │
│             EMP-001                 │
│     เจ้าหน้าที่รักษาความปลอดภัย        │
└─────────────────────────────────────┘

Updated:
┌─────────────────────────────────────┐
│         [Profile Photo/Icon]        │
│           สมชาย รักงาน              │
│             EMP-001                 │
│     เจ้าหน้าที่รักษาความปลอดภัย        │
│                                     │
│     ─────────────────────          │
│                                     │
│     [Company Logo] ABC Security     │
│     บริษัท เอบีซี ซีเคียวริตี้ จำกัด   │
└─────────────────────────────────────┘

Tasks:
- [ ] Add company info to header
- [ ] Display company logo (if available)
- [ ] Display company name (Thai and English)
- [ ] Style appropriately (smaller than user name)
- [ ] Handle missing logo gracefully
```

### 5.3 Backend Data (if not available)
```
Ensure user/employee API returns:
{
  "employee": {
    "full_name": "...",
    "employee_code": "...",
    ...
  },
  "company": {
    "name": "ABC Security Co., Ltd.",
    "name_th": "บริษัท เอบีซี ซีเคียวริตี้ จำกัด",
    "logo_url": "https://..."
  }
}

Tasks:
- [ ] Verify company data in API response
- [ ] Add company fields if missing
```

---

## Phase 6: Monthly Stats Widget (Low Priority)

### 6.1 Analyze Data Requirements
```
Before implementation:
- [ ] Determine what stats to show
- [ ] Check if attendance summary API exists
- [ ] Check if data can be calculated from existing endpoints
```

### 6.2 Create Stats Widget
```
Location: New section, could be at top or middle of page

UI Layout:
┌─────────────────────────────────────┐
│  📊 สถิติเดือนนี้ (ม.ค. 2025)        │
│     This Month (Jan 2025)           │
├───────────┬───────────┬─────────────┤
│   เวร     │  ตรงเวลา   │   วันลา    │
│  Shifts   │  On-time  │   Leave    │
│           │           │            │
│    22     │    20     │     2      │
│           │    91%    │            │
├───────────┴───────────┴─────────────┤
│  ชั่วโมงทำงาน: 176 ชม.               │
│  Work hours: 176 hrs                │
└─────────────────────────────────────┘

Stats to display:
- Total shifts assigned this month
- Shifts completed on time (count + percentage)
- Leave days taken
- Total work hours (optional)
- Overtime hours (optional)

Tasks:
- [ ] Create stats widget component
- [ ] Design responsive grid layout
- [ ] Fetch monthly summary from API
- [ ] Display loading state
- [ ] Handle no data state (new employee)
- [ ] Format numbers appropriately
- [ ] Add month/year label
```

### 6.3 Backend Endpoint
```
Endpoint: GET /api/v1/attendance/my-summary?month=2025-01

Response:
{
  "success": true,
  "data": {
    "period": {
      "month": 1,
      "year": 2025,
      "label": "มกราคม 2025",
      "label_en": "January 2025"
    },
    "shifts": {
      "total": 22,
      "completed": 20,
      "upcoming": 2
    },
    "attendance": {
      "on_time": 18,
      "late": 2,
      "on_time_percentage": 90
    },
    "leave": {
      "days_taken": 2,
      "days_remaining": 8
    },
    "hours": {
      "regular": 160,
      "overtime": 16,
      "total": 176
    }
  }
}

Tasks:
- [ ] Create summary endpoint (if not exists)
- [ ] Calculate stats for current month
- [ ] Include relevant metrics
- [ ] Optimize query performance
```

---

## Phase 7: UI/UX Polish

### 7.1 Section Ordering
```
Recommended order:
1. Profile Header (name, code, role, company)
2. Monthly Stats (if implemented)
3. Personal Info + Emergency Contact
4. Certifications
5. Connected Accounts (LINE)
6. Settings
7. Logout Button
8. Version Number

Tasks:
- [ ] Reorder sections as needed
- [ ] Ensure logical flow
- [ ] Add section dividers/spacing
```

### 7.2 Loading States
```
Tasks:
- [ ] Add skeleton loading for each section
- [ ] Show loading state while fetching data
- [ ] Prevent layout shift on load
```

### 7.3 Pull-to-Refresh
```
Tasks:
- [ ] Implement pull-to-refresh (if not exists)
- [ ] Refresh all profile data
- [ ] Show refresh indicator
```

### 7.4 Error States
```
Tasks:
- [ ] Handle API errors gracefully
- [ ] Show retry option
- [ ] Don't break entire page if one section fails
```

---

## Phase 8: Translations

### 8.1 Add Translation Keys
```
Tasks:
- [ ] Add to Thai translation file
- [ ] Add to English translation file

Keys needed:

profile:
  title: "โปรไฟล์" / "Profile"
  
  personalInfo:
    title: "ข้อมูลส่วนตัว" / "Personal Information"
    phone: "เบอร์โทร" / "Phone"
    email: "อีเมล" / "Email"
    hireDate: "วันเริ่มงาน" / "Start Date"
    
  emergencyContact:
    title: "ผู้ติดต่อฉุกเฉิน" / "Emergency Contact"
    notSet: "ยังไม่ได้ระบุ" / "Not set"
    contactHr: "กรุณาติดต่อ HR เพื่อเพิ่มข้อมูล" / "Please contact HR to add"
    
  certifications:
    title: "ใบอนุญาต/ใบรับรอง" / "Licenses/Certifications"
    expiresOn: "หมดอายุ" / "Expires"
    status:
      valid: "ใช้งานได้" / "Valid"
      expiring: "ใกล้หมดอายุ" / "Expiring"
      expiringSoon: "หมดอายุเร็วๆ นี้" / "Expiring soon"
      expired: "หมดอายุแล้ว" / "Expired"
    remaining:
      days: "เหลือ {count} วัน" / "{count} days remaining"
      months: "เหลือ {count} เดือน" / "{count} months remaining"
      
  connectedAccounts:
    title: "บัญชีที่เชื่อมต่อ" / "Connected Accounts"
    connected: "เชื่อมต่อแล้ว" / "Connected"
    notConnected: "ยังไม่ได้เชื่อมต่อ" / "Not connected"
    connect: "เชื่อมต่อ" / "Connect"
    unlink: "ยกเลิก" / "Unlink"
    unlinkConfirm:
      title: "ยกเลิกการเชื่อมต่อ LINE?" / "Unlink LINE account?"
      message: "คุณจะไม่สามารถเข้าสู่ระบบด้วย LINE ได้อีกต่อไป" / "You will no longer be able to login with LINE"
      
  settings:
    title: "ตั้งค่า" / "Settings"
    changePin: "เปลี่ยนรหัส PIN" / "Change PIN"
    notifications: "การแจ้งเตือน" / "Notifications"
    language: "ภาษา" / "Language"
    
  changePin:
    title: "เปลี่ยนรหัส PIN" / "Change PIN"
    currentPin: "รหัส PIN ปัจจุบัน" / "Current PIN"
    newPin: "รหัส PIN ใหม่" / "New PIN"
    confirmPin: "ยืนยันรหัส PIN ใหม่" / "Confirm New PIN"
    save: "บันทึก" / "Save"
    forgotCurrent: "ลืมรหัส PIN ปัจจุบัน?" / "Forgot current PIN?"
    success: "เปลี่ยนรหัส PIN สำเร็จ" / "PIN changed successfully"
    errors:
      incorrectCurrent: "รหัส PIN ปัจจุบันไม่ถูกต้อง" / "Current PIN is incorrect"
      mismatch: "รหัส PIN ใหม่ไม่ตรงกัน" / "New PINs do not match"
      tooSimple: "รหัส PIN ง่ายเกินไป" / "PIN is too simple"
      
  stats:
    title: "สถิติเดือนนี้" / "This Month"
    shifts: "เวร" / "Shifts"
    onTime: "ตรงเวลา" / "On-time"
    leave: "วันลา" / "Leave"
    workHours: "ชั่วโมงทำงาน" / "Work hours"
    
  logout: "ออกจากระบบ" / "Logout"
```

---

## Implementation Order

```
Week 1:
├── Phase 1: PIN Management (High Priority)
│   ├── Add menu item
│   ├── Create change PIN page
│   └── Connect to API
└── Phase 2: LINE Account Status (High Priority)
    ├── Create connected accounts section
    └── Implement unlink functionality

Week 2:
├── Phase 3: Certification Urgency Colors
│   ├── Create urgency badge component
│   └── Update certification cards
├── Phase 4: Emergency Contact Display
│   └── Update personal info section
└── Phase 5: Company Info in Header
    └── Update profile header

Week 3:
├── Phase 6: Monthly Stats Widget (if time permits)
├── Phase 7: UI/UX Polish
└── Phase 8: Translations
```

---

## Testing Checklist

### Functional Testing
```
PIN Management:
- [ ] Change PIN with correct current PIN
- [ ] Change PIN with wrong current PIN (should fail)
- [ ] Change PIN with mismatched new PINs
- [ ] Change PIN with simple PIN (should warn/fail)

LINE Account:
- [ ] Display linked status correctly
- [ ] Unlink LINE account
- [ ] Unlink confirmation dialog
- [ ] Connect LINE (if applicable)

Certifications:
- [ ] Show correct color for valid (>90 days)
- [ ] Show correct color for expiring (30-90 days)
- [ ] Show correct color for expiring soon (<30 days)
- [ ] Show correct color for expired
- [ ] Calculate days/months remaining correctly

Emergency Contact:
- [ ] Display when set
- [ ] Show placeholder when not set
- [ ] Phone number is tappable
```

### Visual Testing
```
- [ ] Test on iOS LINE browser
- [ ] Test on Android LINE browser
- [ ] Test on mobile Chrome
- [ ] Test on mobile Safari
- [ ] Test in Thai language
- [ ] Test in English language
- [ ] Test with long text (names, etc.)
- [ ] Test loading states
- [ ] Test error states
```

---

## Dependencies

| Dependency | Required By | Status |
|------------|-------------|--------|
| PIN APIs | Phase 1 | From company-login tasks |
| LINE unlink API | Phase 2 | May need to create |
| User API with LINE status | Phase 2 | Check existing |
| Attendance summary API | Phase 6 | May need to create |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2025-01-22 | Claude | Initial draft |
