# Master Implementation Plan: Thai Security Guard HRM SaaS

This document outlines the comprehensive technical implementation plan for upgrading the Security Guard HRM SaaS to meet Thai regulatory standards and specific industry operational requirements.

---

## **Phase 1: Regulatory Compliance & Data Architecture**
*Status: Partially Completed (Schema & Types updated)*
*Focus: Aligning with Security Business Act (Tor Phor 2 & 7)*

### 1.1 Database Schema Updates (Completed)
- **Migration:** `005_add_compliance_fields.sql`
- **Companies Table:** Added `license_number`, `license_issued_at`, `license_expires_at` (Tor Phor 2).
- **Employees Table:** Added `license_number`, `license_issued_at`, `license_expires_at` (Tor Phor 7).
- **Status Enum:** Added `'suspended'` status for expired licenses.

### 1.2 Backend License Lifecycle Engine
- **File:** `backend/src/jobs/licenseChecker.ts` (New)
    - **Task:** Create a cron job (Daily at 00:00).
    - **Logic:** 
        - Query employees where `license_expires_at` < Today AND status != 'suspended'.
        - Update their status to 'suspended'.
        - Log the action and create a "System" notification for Admins.
    - **Warning System:**
        - Query employees where `license_expires_at` is between 60 and 30 days from now.
        - Create a notification: "Guard [Name] license expires in [N] days."

### 1.3 Compliance Dashboard API
- **File:** `backend/src/modules/reports/compliance.controller.ts` (New)
- **Endpoint:** `GET /api/reports/compliance/summary`
    - Return counts: { total_active_guards, expiring_licenses_30d, expired_licenses, company_license_days_remaining }.

---

## **Phase 2: Advanced Rostering & Substitution Logic**
*Focus: Managing workforce allocation, fatigue, and rapid substitution.*

### 2.1 Constraint-Based Scheduling
- **File:** `backend/src/modules/shift/shift.service.ts`
- **Method:** `validateAssignment(employeeId, date, shiftHours)`
    - **Hard Constraint:** Check if `WeeklyHours + shiftHours > 48` (2026 Regulation).
    - **Hard Constraint:** Check `RestPeriod < 12 hours` between shifts.
    - **Hard Constraint:** Check `Employee.status == 'active'` (Not suspended).
    - **Constraint:** Check Employee `primary_site_id` vs Shift `site_id` (or if transfer is allowed).

### 2.2 Relief Pool Recommendation Engine
- **File:** `backend/src/modules/employee/employee.service.ts`
- **Method:** `findReplacements(siteId, shiftDate, shiftTime)`
    - **Query:** 
        - Status = 'active'
        - NOT assigned to any shift overlapping with `shiftTime`
        - `primary_site_id` = `siteId` (Preferred) OR `distance(site, employee)` < 20km
        - Sort by: `ot_hours_accrued` ASC (To distribute OT fairly).

### 2.3 Substitution Workflow
- **File:** `backend/src/modules/shift/shift.controller.ts`
- **Endpoint:** `POST /api/shifts/{id}/offer-replacement`
    - Sends notifications to candidate guards.
- **Endpoint:** `POST /api/shifts/{id}/claim`
    - First-come-first-serve (or approval based) assignment for the replacement guard.

---

## **Phase 3: Operational Guard App (Mobile/PWA)**
*Focus: Proof of presence, digital patrolling, and financial wellness.*

### 3.1 Offline-First Patrol Engine
- **Frontend (PWA):** `frontend/src/pages/guard/PatrolPage.tsx`
    - Use `localStorage` or `IndexedDB` to store patrol route data.
    - **Logic:**
        - Load `CheckpointList` when online.
        - On `ScanQR`: Save timestamp + location locally.
        - Background Sync: Attempt to POST `/api/patrol/sync` every 5 mins or when back online.

### 3.2 Geofencing Strict Mode
- **File:** `backend/src/modules/attendance/attendance.service.ts`
- **Method:** `clockIn(employeeId, lat, long)`
    - **Validation:** 
        - Get `Site.location` and `Site.radius`.
        - Calculate `Distance(lat/long, Site.location)`.
        - Verify `Distance <= Radius`.
        - Reject if `> Radius` with error "Out of designated area".

### 3.3 Salary Advance (Earned Wage Access)
- **File:** `backend/src/modules/payroll/advance.service.ts` (New)
- **Endpoint:** `GET /api/payroll/available-advance`
    - Calculation: `(DaysWorked * DailyRate * 50%) - ExistingDeductions`.
- **Endpoint:** `POST /api/payroll/request-advance`
    - Create a deduction record with type `'advance'`.

---

## **Phase 4: Payroll Engine Overhaul (The 2026 Transition)**
*Focus: Handling complex Thai overtime calculations and the upcoming regulatory shift.*

### 4.1 Temporal OT Calculation Engine
- **File:** `backend/src/modules/payroll/payroll.utils.ts`
- **Function:** `getOvertimeMultiplier(date, isHoliday)`
    - **Logic:**
        ```typescript
        const REGULATION_CHANGE_DATE = '2026-04-01';
        if (date < REGULATION_CHANGE_DATE) {
            return isHoliday ? 3.0 : 1.5;
        } else {
            return isHoliday ? 2.5 : 1.25;
        }
        ```

### 4.2 Deduction compliance
- **File:** `backend/src/modules/payroll/payroll.service.ts`
- **Validation:** Ensure `TotalDeductions <= (BaseSalary * 10%)` (or applicable legal limit per category).

---

## **Phase 5: Reporting & Government Documentation**
*Focus: Automating the paperwork required by the Metropolitan Police Bureau.*

### 5.1 Government Form Generators
- **File:** `backend/src/modules/reports/formGenerator.ts`
    - **Method:** `generateTorPhor1(employeeIds[])` (PDF Generation)
    - **Method:** `generateTorPhor6(employeeId)` (Application Form)
    - Use a library like `pdfkit` or `puppeteer` to map data to official templates.

### 5.2 Registrar Reporting
- **Endpoint:** `GET /api/reports/registrar/movement`
    - Query: Employees hired or resigned in the last 15 days.
    - Output: CSV/Excel format matching the Registrar's upload requirement.
