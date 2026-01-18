# Security Guard HRM SaaS - Task Breakdown & Sprint Plan

## Overview

**Total Estimated Duration**: 10-12 weeks (solo developer)
**Sprint Length**: 2 weeks
**Working Hours**: ~20-30 hours/week

---

## Sprint 0: Project Setup (Week 1)

### S0.1 Development Environment
- [x] **S0.1.1** Create GitHub repository with monorepo structure
- [x] **S0.1.2** Set up backend project (Node.js + Express + TypeScript)
- [x] **S0.1.3** Set up frontend project (Vite + React + TypeScript + Tailwind)
- [x] **S0.1.4** Configure ESLint, Prettier for both projects
- [x] **S0.1.5** Set up Vitest for both projects

### S0.2 Supabase Setup ✅
- [x] **S0.2.1** Create Supabase project ✓ (Project: hermnyepqdzeytodcqev)
- [x] **S0.2.2** Set up database schema ✓ (11 tables created)
- [x] **S0.2.3** Configure Row-Level Security policies ✓
- [x] **S0.2.4** Set up Storage buckets ✓ (profile-images, company-logos, documents)
- [x] **S0.2.5** Test database connection from backend ✓

### S0.3 LINE Developer Setup
- [x] **S0.3.1** Create LINE Official Account
- [x] **S0.3.2** Create LINE Login channel
- [x] **S0.3.3** Create Messaging API channel
- [x] **S0.3.4** Register LIFF apps (4 apps: schedule, clock, leave, profile)
- [x] **S0.3.5** Test LIFF initialization locally ✓ (ngrok tunnel + Vite config)

### S0.4 Project Configuration
- [x] **S0.4.1** Set up environment variables (.env files)
- [x] **S0.4.2** Configure Tailwind with custom theme
- [x] **S0.4.3** Set up i18n with Thai/English translations (basic keys)
- [x] **S0.4.4** Create API client (Axios instance with interceptors)
- [x] **S0.4.5** Set up basic folder structure per design doc

**Sprint 0 Deliverable**: Both projects scaffold complete, Supabase connected, LINE channels ready

---

## Sprint 1: Authentication & Company Setup (Weeks 2-3) ✅

### S1.1 Backend Auth Module ✅
- [x] **S1.1.1** Create auth routes (`/api/v1/auth/*`)
- [x] **S1.1.2** Implement email/password registration
- [x] **S1.1.3** Implement email/password login
- [x] **S1.1.4** Implement JWT token generation (access + refresh)
- [x] **S1.1.5** Implement token refresh endpoint
- [x] **S1.1.6** Implement logout (token invalidation)
- [x] **S1.1.7** Create auth middleware (JWT validation) *(existed from Sprint 0)*
- [x] **S1.1.8** Write unit tests for auth service

### S1.2 LINE Login Integration ✅
- [x] **S1.2.1** Implement LINE Login callback endpoint
- [x] **S1.2.2** Create/link user on LINE Login
- [x] **S1.2.3** Handle LINE ID token verification
- [x] **S1.2.4** Store LINE profile data (userId, displayName, pictureUrl)
- [ ] **S1.2.5** Test LINE Login flow end-to-end *(requires manual testing with LINE app)*

### S1.3 Tenant Middleware ✅
- [x] **S1.3.1** Create tenant context middleware *(existed from Sprint 0)*
- [x] **S1.3.2** Extract company_id from JWT
- [x] **S1.3.3** Set Supabase RLS context per request
- [x] **S1.3.4** Implement role-based access control helper
- [ ] **S1.3.5** Write tests for tenant isolation *(deferred)*

### S1.4 Company Module ✅
- [x] **S1.4.1** Create company routes (`/api/v1/companies/*`)
- [x] **S1.4.2** Implement company creation (with admin user)
- [x] **S1.4.3** Implement company settings CRUD
- [x] **S1.4.4** Implement company profile update
- [x] **S1.4.5** Create default leave types on company creation
- [x] **S1.4.6** Create default shift templates on company creation

### S1.5 Frontend Auth ✅
- [x] **S1.5.1** Create Login page (email/password)
- [x] **S1.5.2** Create auth context/store
- [x] **S1.5.3** Implement token storage (secure)
- [x] **S1.5.4** Create ProtectedRoute component
- [x] **S1.5.5** Implement auto-logout on token expiry *(handled by API interceptor)*
- [x] **S1.5.6** Create language switcher component

**Sprint 1 Deliverable**: Users can register company, login via email or LINE, tenant isolation working ✅

---

## Sprint 2: Employee Management (Weeks 4-5) ✅

### S2.1 Backend User & Employee Modules ✅
- [x] **S2.1.1** Create user routes (`/api/v1/users/*`)
- [x] **S2.1.2** Implement user CRUD operations
- [x] **S2.1.3** Create employee routes (`/api/v1/employees/*`)
- [x] **S2.1.4** Implement employee CRUD operations
- [x] **S2.1.5** Implement employee search/filter
- [x] **S2.1.6** Implement employee status management (active/terminated)
- [x] **S2.1.7** Link user to employee record
- [ ] **S2.1.8** Write tests for employee service *(deferred)*

### S2.2 Document & Certification Management ✅
- [ ] **S2.2.1** Implement document upload endpoint *(deferred - using URL approach)*
- [ ] **S2.2.2** Configure Supabase Storage for documents *(already done in Sprint 0)*
- [x] **S2.2.3** Implement certification CRUD
- [x] **S2.2.4** Create certification expiry check function
- [ ] **S2.2.5** Implement bulk document download *(deferred)*

### S2.3 Frontend Dashboard Layout ✅
- [x] **S2.3.1** Create DashboardLayout component *(existed from Sprint 1)*
- [x] **S2.3.2** Create Sidebar navigation *(existed from Sprint 1)*
- [x] **S2.3.3** Create Header with user menu *(existed from Sprint 1)*
- [x] **S2.3.4** Implement responsive sidebar (mobile collapse) *(existed)*
- [ ] **S2.3.5** Create breadcrumb component *(not essential)*

### S2.4 Frontend Employee Pages ✅
- [x] **S2.4.1** Create EmployeesPage (list view)
- [x] **S2.4.2** Create EmployeeForm component (add/edit)
- [x] **S2.4.3** Create EmployeeDetailPage
- [x] **S2.4.4** Create employee search/filter UI
- [x] **S2.4.5** Create certification list component
- [ ] **S2.4.6** Create document upload component *(deferred)*
- [x] **S2.4.7** Implement employee status badge

### S2.5 Common UI Components ✅
- [x] **S2.5.1** Create Button component (variants)
- [x] **S2.5.2** Create Input component (with validation)
- [x] **S2.5.3** Create Select component
- [x] **S2.5.4** Create Modal component
- [x] **S2.5.5** Create Table component (sortable, paginated)
- [x] **S2.5.6** Create Card component
- [x] **S2.5.7** Create Toast/Alert component
- [x] **S2.5.8** Create LoadingSpinner component

**Sprint 2 Deliverable**: Admin can add/edit/view employees, manage certifications ✅

---

## Sprint 3: Shift Scheduling (Weeks 6-7)

### S3.1 Backend Shift Module
- [x] **S3.1.1** Create shift template routes
- [x] **S3.1.2** Implement shift template CRUD
- [x] **S3.1.3** Create shift routes (`/api/v1/shifts/*`)
- [x] **S3.1.4** Implement single shift CRUD
- [x] **S3.1.5** Implement bulk shift creation
- [x] **S3.1.6** Implement shift conflict detection
- [x] **S3.1.7** Implement schedule publishing
- [x] **S3.1.8** Create "my shifts" endpoint for guards
- [x] **S3.1.9** Implement shift calendar data endpoint
- [ ] **S3.1.10** Write tests for conflict detection

### S3.2 Frontend Shift Templates
- [x] **S3.2.1** Create ShiftTemplatesPage
- [x] **S3.2.2** Create ShiftTemplateForm component
- [x] **S3.2.3** Create color picker for shift templates
- [x] **S3.2.4** Implement template list with quick actions

### S3.3 Frontend Schedule Calendar
- [x] **S3.3.1** Create SchedulePage with calendar view
- [x] **S3.3.2** Implement weekly calendar view
- [ ] **S3.3.3** Implement monthly calendar view (stretch)
- [x] **S3.3.4** Create shift assignment modal
- [ ] **S3.3.5** Implement drag-and-drop shift assignment (stretch)
- [x] **S3.3.6** Create conflict warning display
- [x] **S3.3.7** Implement "copy previous week" feature
- [x] **S3.3.8** Create publish confirmation modal
- [x] **S3.3.9** Show published vs draft status

### S3.4 LIFF Schedule View
- [x] **S3.4.1** Create LiffLayout component (already existed)
- [x] **S3.4.2** Set up LIFF initialization hook (already existed)
- [x] **S3.4.3** Create LiffSchedulePage
- [x] **S3.4.4** Display upcoming shifts list
- [x] **S3.4.5** Show shift details (time, location)
- [x] **S3.4.6** Handle no shifts state

**Sprint 3 Deliverable**: Manager can create/publish schedules, guards can view their shifts in LINE ✅


---

## Sprint 4: Attendance (Clock In/Out) (Weeks 8-9)

### S4.1 Backend Attendance Module ✅
- [x] **S4.1.1** Create attendance routes (`/api/v1/attendance/*`)
- [x] **S4.1.2** Implement clock-in endpoint with GPS validation
- [x] **S4.1.3** Implement clock-out endpoint with GPS validation
- [x] **S4.1.4** Auto-detect current shift on clock-in
- [x] **S4.1.5** Implement late/on-time status calculation
- [x] **S4.1.6** Implement attendance adjustment endpoint
- [x] **S4.1.7** Create attendance list endpoint (with filters)
- [x] **S4.1.8** Create "my attendance" endpoint for guards
- [x] **S4.1.9** Calculate total hours and overtime
- [ ] **S4.1.10** Write tests for clock-in validation *(deferred)*

### S4.2 LIFF Clock In/Out ✅
- [x] **S4.2.1** Create LiffClockPage
- [x] **S4.2.2** Implement geolocation hook
- [x] **S4.2.3** Create GPS permission request flow
- [x] **S4.2.4** Handle GPS errors gracefully
- [x] **S4.2.5** Create clock-in button with loading state
- [x] **S4.2.6** Create clock-out button with loading state
- [x] **S4.2.7** Display current shift info
- [x] **S4.2.8** Display clock-in/out success confirmation
- [x] **S4.2.9** Show location accuracy indicator
- [x] **S4.2.10** Handle "no shift today" state

### S4.3 Frontend Attendance Dashboard ✅
- [x] **S4.3.1** Create AttendancePage
- [x] **S4.3.2** Create daily attendance overview
- [x] **S4.3.3** Create attendance list with filters
- [x] **S4.3.4** Show attendance status badges (on-time, late, no-show)
- [x] **S4.3.5** Create attendance detail modal
- [ ] **S4.3.6** Display GPS location on map (Google Maps embed) *(stretch)*
- [x] **S4.3.7** Create attendance adjustment form
- [ ] **S4.3.8** Implement attendance export (CSV) *(deferred)*

### S4.4 Manager Dashboard Widget
- [x] **S4.4.1** Create DashboardPage structure *(existed from Sprint 1)*
- [ ] **S4.4.2** Create "Today's Attendance" widget *(deferred to Sprint 6)*
- [ ] **S4.4.3** Show clocked-in vs expected count *(deferred to Sprint 6)*
- [ ] **S4.4.4** List late arrivals *(deferred to Sprint 6)*
- [ ] **S4.4.5** List no-shows *(deferred to Sprint 6)*

**Sprint 4 Deliverable**: Guards can clock in/out via LINE with GPS, managers see real-time attendance ✅

---

## Sprint 5: Leave Management (Weeks 10-11)

### S5.1 Backend Leave Module
- [x] **S5.1.1** Create leave type routes
- [x] **S5.1.2** Implement leave type CRUD
- [x] **S5.1.3** Create leave request routes (`/api/v1/leave-requests/*`)
- [x] **S5.1.4** Implement leave request submission
- [x] **S5.1.5** Implement leave request approval/rejection
- [x] **S5.1.6** Implement leave balance calculation
- [x] **S5.1.7** Validate leave against balance
- [x] **S5.1.8** Check for shift conflicts on leave request
- [x] **S5.1.9** Create "my leave requests" endpoint
- [x] **S5.1.10** Create "my leave balance" endpoint
- [x] **S5.1.11** Write tests for balance calculation

### S5.2 LIFF Leave Request
- [x] **S5.2.1** Create LiffLeavePage
- [x] **S5.2.2** Display current leave balances
- [x] **S5.2.3** Create leave request form
- [x] **S5.2.4** Implement date range picker
- [x] **S5.2.5** Show leave type selection
- [x] **S5.2.6** Calculate and display requested days
- [x] **S5.2.7** Handle form submission
- [x] **S5.2.8** Display request history
- [x] **S5.2.9** Show request status (pending/approved/rejected)

### S5.3 Frontend Leave Management
- [x] **S5.3.1** Create LeavePage
- [x] **S5.3.2** Create pending requests list
- [x] **S5.3.3** Create request detail modal
- [x] **S5.3.4** Implement approve/reject actions
- [x] **S5.3.5** Add rejection reason input
- [x] **S5.3.6** Create leave calendar view (who's off when)
- [x] **S5.3.7** Create employee leave balance view

### S5.4 Leave Type Configuration
- [x] **S5.4.1** Create leave type settings page
- [x] **S5.4.2** Create leave type form
- [x] **S5.4.3** Configure max days, paid/unpaid, etc.
- [x] **S5.4.4** Set leave reset date

### S5.5 Dashboard Widgets
- [x] **S5.5.1** Create "Pending Leave Requests" widget
- [x] **S5.5.2** Create "Who's Off Today" widget

**Sprint 5 Deliverable**: Full leave request workflow functional via LINE and web ✅

---

## Sprint 6: Notifications & Polish (Week 12) ✅

### S6.1 LINE Messaging Integration ✅
- [x] **S6.1.1** Create notification service
- [x] **S6.1.2** Set up LINE Messaging API client
- [x] **S6.1.3** Implement push message function
- [x] **S6.1.4** Create message templates (Flex Messages)
- [x] **S6.1.5** Implement notification queue (simple - direct for now)
- [x] **S6.1.6** Handle LINE API errors gracefully

### S6.2 Notification Triggers ✅
- [x] **S6.2.1** Send notification on schedule publish
- [x] **S6.2.2** Send notification on shift change
- [x] **S6.2.3** Send notification on leave status change
- [x] **S6.2.4** Send shift reminder (configurable hours before)
- [ ] **S6.2.5** Send certification expiry warning *(deferred - requires certification tracking)*

### S6.3 In-App Notifications ✅
- [x] **S6.3.1** Create notifications table endpoints
- [x] **S6.3.2** Create notification bell icon with badge
- [x] **S6.3.3** Create notification dropdown/panel
- [x] **S6.3.4** Implement mark as read
- [x] **S6.3.5** Implement mark all as read

### S6.4 Reports ✅
- [x] **S6.4.1** Create attendance summary report endpoint
- [x] **S6.4.2** Create leave usage report endpoint
- [x] **S6.4.3** Create ReportsPage
- [x] **S6.4.4** Implement date range filter
- [x] **S6.4.5** Create simple charts (attendance trend)
- [x] **S6.4.6** Implement CSV export

### S6.5 Settings Page ✅
- [x] **S6.5.1** Create SettingsPage layout
- [x] **S6.5.2** Company profile settings
- [x] **S6.5.3** Attendance thresholds configuration
- [x] **S6.5.4** Notification preferences

### S6.6 Final Polish ✅
- [x] **S6.6.1** Complete Thai translations
- [x] **S6.6.2** Complete English translations
- [x] **S6.6.3** Add loading states everywhere
- [x] **S6.6.4** Add error states everywhere
- [x] **S6.6.5** Add empty states everywhere
- [x] **S6.6.6** Mobile responsiveness fixes ✅
- [ ] **S6.6.7** LIFF UI polish *(ongoing)*
- [ ] **S6.6.8** Performance audit *(deferred)*

**Sprint 6 Deliverable**: Notifications working, reports available, UI polished for launch ✅

---

## Post-MVP Backlog

### Phase 2 Features (prioritized)
1. **Site/Location Management** - Define work sites with geofencing
2. **Photo on Clock-In** - Verify identity with photo
3. **Shift Swap Requests** - Guards can request to swap shifts
4. **Advanced Reports** - More detailed analytics
5. **Payroll Export** - Generate data for payroll systems
6. **Thai Compliance** - Specific license types for Thai security

### Technical Debt
- [ ] Increase test coverage to 80%
- [ ] Performance optimization
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Error monitoring (Sentry)
- [ ] Analytics tracking

---

## Task Estimation Key

| Symbol | Estimate |
|--------|----------|
| 🟢 | Small (1-2 hours) |
| 🟡 | Medium (2-4 hours) |
| 🔴 | Large (4-8 hours) |
| ⚫ | Extra Large (8+ hours) |

---

## Definition of Done

A task is complete when:
1. ✅ Code is written and working
2. ✅ Code follows project conventions
3. ✅ Unit tests pass (where applicable)
4. ✅ Code is committed with clear message
5. ✅ Feature works in Thai and English
6. ✅ UI is responsive (if frontend)
7. ✅ Error states are handled

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| LINE API changes | Keep up with LINE developer news, use official SDK |
| GPS accuracy issues | Show accuracy to user, allow manual adjustment |
| Supabase limitations | Plan for migration path if needed |
| Scope creep | Strict MVP scope, defer features to backlog |
| Solo developer burnout | Realistic sprint goals, regular breaks |

---

## Progress Tracking

Use GitHub Issues/Projects or a simple Notion board to track:
- Sprint backlog
- In progress
- In review
- Done

### Weekly Sync (with your friend)
- Demo completed features
- Gather feedback
- Adjust priorities
- Plan next week

---

## Quick Reference: API Endpoints by Sprint

### Sprint 1 (Auth)
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/line
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/companies
```

### Sprint 2 (Employees)
```
GET/POST /api/v1/employees
GET/PUT/DELETE /api/v1/employees/:id
POST /api/v1/employees/:id/documents
GET/POST /api/v1/employees/:id/certifications
```

### Sprint 3 (Shifts)
```
GET/POST /api/v1/shift-templates
GET/POST /api/v1/shifts
POST /api/v1/shifts/bulk
POST /api/v1/shifts/publish
GET /api/v1/shifts/calendar
GET /api/v1/shifts/my
```

### Sprint 4 (Attendance)
```
POST /api/v1/attendance/clock-in
POST /api/v1/attendance/clock-out
GET /api/v1/attendance
GET /api/v1/attendance/my
PUT /api/v1/attendance/:id
```

### Sprint 5 (Leave)
```
GET/POST /api/v1/leave-types
GET/POST /api/v1/leave-requests
POST /api/v1/leave-requests/:id/approve
POST /api/v1/leave-requests/:id/reject
GET /api/v1/leave-requests/my
GET /api/v1/leave-balances/my
```

### Sprint 6 (Notifications & Reports)
```
GET /api/v1/notifications
PUT /api/v1/notifications/:id/read
GET /api/v1/reports/attendance
GET /api/v1/reports/leave
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2025-01-17 | Claude | Initial draft |
