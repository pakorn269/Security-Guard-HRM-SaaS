# Security Guard HRM SaaS - Product Requirements Document (PRD)

## 1. Overview

### 1.1 Product Vision
A multi-tenant Human Resource Management (HRM) system designed specifically for physical security companies in Thailand. The system enables efficient management of security guards through shift scheduling, attendance tracking, leave management, and compliance monitoring—all accessible via LINE LIFF for frontline guards.

### 1.2 Target Users
- **Primary Customer**: Small to medium security companies (starting with ~20 employees)
- **End Users**:
  - Company Administrators
  - Operations Managers / Supervisors
  - Security Guards

### 1.3 Business Model
- SaaS subscription (monthly/yearly billing)
- Per-company tenant isolation
- Tiered pricing based on employee count (future consideration)

---

## 2. User Roles & Permissions

### 2.1 Role Definitions

| Role | Description | Access Level |
|------|-------------|--------------|
| **Super Admin** | System owner (you) | All tenants, system config |
| **Company Admin** | Company owner/HR lead | Full company access, billing |
| **Manager** | Operations/shift supervisor | Employee mgmt, scheduling, reports |
| **Guard** | Security personnel | Own data only (schedule, attendance, leave) |

### 2.2 Permission Matrix

| Feature | Super Admin | Company Admin | Manager | Guard |
|---------|-------------|---------------|---------|-------|
| Manage companies | ✅ | ❌ | ❌ | ❌ |
| Company settings | ✅ | ✅ | ❌ | ❌ |
| Manage users/employees | ✅ | ✅ | ✅ | ❌ |
| Create/edit shifts | ✅ | ✅ | ✅ | ❌ |
| View all schedules | ✅ | ✅ | ✅ | ❌ |
| View own schedule | ✅ | ✅ | ✅ | ✅ |
| Clock in/out | ❌ | ❌ | ❌ | ✅ |
| Approve leave | ✅ | ✅ | ✅ | ❌ |
| Request leave | ❌ | ❌ | ❌ | ✅ |
| View reports | ✅ | ✅ | ✅ | ❌ |
| View own records | ✅ | ✅ | ✅ | ✅ |

---

## 3. Functional Requirements

### 3.1 Multi-Tenant Architecture

#### FR-3.1.1 Company (Tenant) Management
- Each company is an isolated tenant
- Data segregation at database level (company_id foreign key)
- Company onboarding workflow
- Company profile: name, logo, address, contact info

#### FR-3.1.2 Tenant Isolation
- Users can only access data within their company
- API endpoints enforce tenant context
- Super Admin can switch between tenants

---

### 3.2 User & Authentication

#### FR-3.2.1 User Registration & Login
- Email/password authentication (web dashboard)
- LINE Login integration (LIFF apps)
- JWT-based session management
- Password reset via email

#### FR-3.2.2 User Management
- Create users with assigned roles
- Link users to employee records
- Activate/deactivate users
- Profile management (name, email, phone, avatar)

#### FR-3.2.3 LINE Account Linking
- Guards link their LINE account on first LIFF access
- One LINE account per user
- Fallback for users without LINE (web access)

---

### 3.3 Employee Management

#### FR-3.3.1 Employee Records
- **Required fields**: Employee ID, full name, phone, hire date, role
- **Optional fields**: Address, emergency contact, bank details, notes
- Employment status: Active, On Leave, Terminated

#### FR-3.3.2 Document Management
- Upload documents (ID card, contracts, photos)
- Document types configurable by company
- View/download documents
- Storage via Supabase Storage

#### FR-3.3.3 Certification & License Tracking
- Record certification type, issue date, expiry date
- Automated expiry alerts (30, 14, 7 days before)
- Certification status: Valid, Expiring Soon, Expired
- (Specific Thai compliance documents: deferred to Phase 2)

---

### 3.4 Shift Scheduling

#### FR-3.4.1 Shift Definition
- Shift name, start time, end time, break duration
- Shift templates (reusable patterns)
- Shift location/site (text field for MVP)

#### FR-3.4.2 Schedule Creation
- Assign shifts to guards by date
- Weekly and monthly calendar views
- Bulk assignment (same shift to multiple guards)
- Copy previous week's schedule

#### FR-3.4.3 Conflict Detection
- Prevent double-booking same guard
- Warn if guard has approved leave on scheduled date
- Warn if assigning consecutive shifts with insufficient rest

#### FR-3.4.4 Schedule Publishing
- Draft vs Published status
- Notify guards when schedule is published
- Lock published schedules (require confirmation to edit)

#### FR-3.4.5 Shift Swap (Post-MVP consideration)
- Guards can request shift swaps
- Manager approval workflow

---

### 3.5 Attendance (Clock In/Out)

#### FR-3.5.1 Clock In
- Guard initiates via LINE LIFF
- **Mandatory GPS capture** with accuracy threshold
- Timestamp recorded server-side
- Validation: Cannot clock in >30 min before shift start
- Photo capture (optional, future)

#### FR-3.5.2 Clock Out
- Same as clock in (GPS + timestamp)
- Validation: Cannot clock out before shift start time

#### FR-3.5.3 Attendance Rules
- Late threshold: configurable (default 15 min)
- Early leave threshold: configurable (default 15 min)
- Automatic flags: Late, Early Leave, No Show, Overtime

#### FR-3.5.4 Attendance Records
- View daily/weekly/monthly attendance
- Filter by employee, date range, status
- Manual adjustment by manager (with reason log)

#### FR-3.5.5 Timesheet Reports
- Summary: hours worked, overtime, late count
- Export to CSV/Excel

---

### 3.6 Leave Management

#### FR-3.6.1 Leave Types
- Configurable by company
- Defaults: Annual Leave, Sick Leave, Personal Leave, Unpaid Leave
- Each type: name, paid/unpaid, requires approval, max days/year

#### FR-3.6.2 Leave Requests
- Guard submits via LINE LIFF or web
- Select leave type, date(s), reason
- Attach supporting document (e.g., medical certificate)

#### FR-3.6.3 Leave Approval Workflow
- Pending → Approved / Rejected
- Manager adds notes on approval/rejection
- Notification to guard on status change

#### FR-3.6.4 Leave Balance
- Track used vs remaining days per type
- Reset rules: annual reset date (company configurable)
- Carry-over rules (post-MVP)

---

### 3.7 Notifications

#### FR-3.7.1 LINE Messaging Integration
- Send via LINE Messaging API
- Fallback: in-app notification center

#### FR-3.7.2 Notification Types
| Event | Recipients |
|-------|------------|
| Schedule published | Assigned guards |
| Shift assigned/changed | Affected guard |
| Shift reminder (X hours before) | Guard |
| Leave request submitted | Manager |
| Leave approved/rejected | Guard |
| Certification expiring | Guard, Manager |
| Late/No-show alert | Manager |

#### FR-3.7.3 Notification Preferences
- Per-user toggle for each notification type
- Quiet hours setting (post-MVP)

---

### 3.8 Reporting & Dashboard

#### FR-3.8.1 Manager Dashboard
- Today's shifts overview
- Attendance status (clocked in, pending, late)
- Pending leave requests count
- Expiring certifications count

#### FR-3.8.2 Reports
- Attendance summary (by employee, by period)
- Leave usage report
- Overtime report
- (Post-MVP: Cost analysis, site coverage)

---

### 3.9 Internationalization (i18n)

#### FR-3.9.1 Language Support
- Thai (ไทย) - default
- English
- Language selector in UI
- User preference saved

#### FR-3.9.2 Localization
- Date format: DD/MM/YYYY (Thai standard)
- Time format: 24-hour
- Currency: THB (฿) for future payroll features
- Buddhist Era (พ.ศ.) date display option

---

## 4. Non-Functional Requirements

### 4.1 Performance
- Page load: < 2 seconds
- API response: < 500ms for standard operations
- Support 50 concurrent users per tenant (MVP)

### 4.2 Security
- HTTPS everywhere
- JWT tokens with refresh mechanism
- Password hashing (bcrypt)
- SQL injection prevention (parameterized queries via Supabase)
- Row-level security (RLS) for tenant isolation
- CORS configuration

### 4.3 Availability
- 99% uptime target
- Graceful error handling
- Offline indication in LIFF

### 4.4 Scalability
- Stateless API servers (Vercel-ready)
- Database indexing on tenant_id, date fields
- Pagination on all list endpoints

### 4.5 Data Privacy
- Compliance with Thailand PDPA (Personal Data Protection Act)
- Data retention policy documentation
- User consent for location tracking
- Data export capability

### 4.6 Mobile Responsiveness
- Web dashboard: Desktop-first, responsive
- LIFF apps: Mobile-first (primarily used on phones)

---

## 5. LINE LIFF Requirements

### 5.1 LIFF App Structure
| LIFF App | Purpose | Size |
|----------|---------|------|
| Schedule Viewer | View upcoming shifts | Tall |
| Clock In/Out | Attendance with GPS | Full |
| Leave Request | Submit leave requests | Tall |
| Profile | View/edit basic profile | Tall |

### 5.2 LIFF-Specific Requirements
- Handle LIFF initialization errors gracefully
- Detect LIFF vs external browser context
- Implement LINE Login for authentication
- Access LINE user profile (userId, displayName, pictureUrl)

### 5.3 GPS Requirements
- Request location permission on clock in/out
- Minimum accuracy: 100 meters
- Store: latitude, longitude, accuracy, timestamp
- Display location on map (admin view)

---

## 6. Integration Requirements

### 6.1 LINE Platform
- LINE Login (LIFF)
- LINE Messaging API (notifications)
- LINE Official Account for the SaaS platform

### 6.2 Supabase
- PostgreSQL database
- Authentication (email/password)
- Storage (documents, images)
- Row-Level Security policies

### 6.3 Future Integrations (Post-MVP)
- Payment gateway (Omise, PromptPay)
- Accounting software
- Government API for license verification

---

## 7. Out of Scope (MVP)

The following are explicitly excluded from MVP:
- Payroll calculation and processing
- Multiple job sites/locations management
- Incident reporting
- Training management
- Performance reviews
- Advanced analytics and BI
- Mobile native apps (iOS/Android)
- Biometric attendance
- Shift bidding/marketplace
- Client (end-customer) portal

---

## 8. Acceptance Criteria Summary

### MVP Launch Criteria
- [ ] Company can register and set up tenant
- [ ] Admin can add employees and assign roles
- [ ] Manager can create and publish shift schedules
- [ ] Guards receive schedule notifications via LINE
- [ ] Guards can clock in/out via LIFF with GPS
- [ ] Guards can request leave via LIFF
- [ ] Managers can approve/reject leave
- [ ] Basic attendance and leave reports available
- [ ] System supports Thai and English languages
- [ ] All data properly isolated by tenant

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| Tenant | A company using the SaaS platform |
| Guard | Security personnel (frontline employee) |
| LIFF | LINE Front-end Framework |
| RLS | Row-Level Security (Supabase feature) |
| Shift | A scheduled work period |
| Attendance | Record of clock in/out |

---

## Appendix B: Assumptions

1. Guards have smartphones with LINE installed
2. Guards have basic smartphone literacy
3. Internet connectivity available at work sites
4. GPS accuracy is sufficient at work sites
5. Company has LINE Official Account or will create one
6. Thai security companies follow standard shift patterns (8-12 hour shifts)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2025-01-17 | Claude | Initial draft |
