# Company-Specific URL Login - Implementation Tasks

## Overview

**Feature:** Company-specific login URL for guards (fallback when LINE unavailable)  
**URL Pattern:** `/liff/[company-slug]/login`  
**Auth Method:** Phone number + 6-digit PIN  
**Purpose:** Simpler login for guards with limited technical knowledge

---

## Flow Summary

```
HR shares link/QR → Guard opens /liff/abc-security/login → Phone + PIN → /liff/clock
```

---

## Pre-Implementation Checklist

```
Before starting:
- [ ] Review existing /liff/email-login implementation
- [ ] Review existing auth/login endpoints
- [ ] Review existing user/employee table structure
- [ ] Review existing JWT generation logic
- [ ] Review existing routing setup (React Router)
- [ ] Review existing form components and validation patterns
- [ ] Check if company "slug" field exists in companies table
```

---

## Phase 1: Database Changes

### 1.1 Analyze Existing Schema
```
Before implementation:
- [x] Check companies table for slug/code field
- [x] Check users table for password/PIN storage
- [x] Check if phone is unique per company (company_id + phone)
- [x] Review existing password hashing method
```

### 1.2 Database Migration (if needed)
```
Tasks:
- [x] Ensure companies table has slug field:
      • slug (unique, URL-safe string, e.g., "abc-security")
      • If using company_code, can reuse if URL-safe
      
- [x] Add PIN field to users table (if separate from password):
      Option A: Reuse password_hash field for guards (PIN hashed same way)
      Option B: Add separate pin_hash field
      
      Recommendation: Option A is simpler
      - Guards use PIN (6 digits, hashed)
      - Managers/Admins use password (hashed same way)
      - Same field, different complexity requirements
      
- [x] Add index for phone lookup:
      • Index on (company_id, phone) for fast login lookup
      
- [x] Add PIN-related fields (optional):
      • pin_attempts (track failed attempts)
      • pin_locked_until (lockout timestamp)
      • pin_set_at (when PIN was last set)
```

### 1.3 Company Slug Generation
```
Tasks:
- [x] Decide slug format:
      • Lowercase, alphanumeric, hyphens only
      • Example: "ABC Security Co., Ltd." → "abc-security"
      
- [x] Add slug generation on company creation (if not exists)
- [x] Create migration to generate slugs for existing companies
- [x] Ensure slug uniqueness validation
```

---

## Phase 2: Backend - Company Lookup API

### 2.1 Analyze Existing Patterns
```
Before implementation:
- [x] Review existing public endpoints (no auth required)
- [x] Review existing company controller/service
- [x] Review API response format
```

### 2.2 Public Company Info Endpoint
```
Endpoint: GET /api/v1/companies/by-slug/:slug/public

Purpose: Get basic company info for login page (no auth required)

Response (success):
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "ABC Security Co., Ltd.",
    "name_th": "บริษัท เอบีซี ซีเคียวริตี้ จำกัด",
    "slug": "abc-security",
    "logo_url": "https://..."
  }
}

Response (not found):
{
  "success": false,
  "error": {
    "code": "COMPANY_NOT_FOUND",
    "message": "Company not found",
    "message_th": "ไม่พบบริษัท"
  }
}

Tasks:
- [x] Create public endpoint (no auth middleware)
- [x] Return only safe/public fields (no sensitive data)
- [x] Handle case-insensitive slug lookup
- [x] Add rate limiting (prevent company enumeration)
```

---

## Phase 3: Backend - Phone + PIN Login API

### 3.1 Analyze Existing Auth Implementation
```
Before implementation:
- [x] Review existing login endpoint
- [x] Review password verification logic
- [x] Review JWT token generation
- [x] Review existing error handling patterns
```

### 3.2 Phone + PIN Login Endpoint
```
Endpoint: POST /api/v1/auth/login-phone

Purpose: Authenticate guard using phone number + PIN

Request:
{
  "companySlug": "abc-security",
  "phone": "0812345678",
  "pin": "123456",
  "turnstileToken": "xxx"
}

Response (success):
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "role": "guard",
      "employee": {
        "id": "uuid",
        "full_name": "สมชาย ใจดี",
        "employee_code": "EMP-001"
      },
      "company": {
        "id": "uuid",
        "name": "ABC Security Co., Ltd."
      }
    },
    "accessToken": "jwt...",
    "refreshToken": "jwt..."
  }
}

Response (errors):
- COMPANY_NOT_FOUND: Company slug invalid
- INVALID_CREDENTIALS: Phone or PIN incorrect (generic for security)
- ACCOUNT_LOCKED: Too many failed attempts
- ACCOUNT_INACTIVE: User/employee deactivated
- PIN_NOT_SET: User hasn't set PIN yet
- TURNSTILE_FAILED: Bot protection failed

Tasks:
- [x] Create login endpoint
- [x] Verify Turnstile token first
- [x] Find company by slug
- [x] Find employee by company_id + phone
- [x] Find associated user account
- [x] Verify PIN (use existing password verification logic)
- [x] Check account status (active, not locked)
- [x] Generate JWT tokens (same as existing login)
- [x] Return user data
- [x] Implement rate limiting per phone number
```

### 3.3 Failed Attempt Tracking
```
Purpose: Lock account after too many failed attempts

Logic:
- Track failed PIN attempts per user
- After 5 failures: lock for 15 minutes
- After 10 failures: lock for 1 hour
- After 15 failures: lock until admin reset

Tasks:
- [x] Increment failed attempts on wrong PIN
- [x] Check lockout status before verifying PIN
- [x] Reset attempts on successful login
- [x] Return appropriate error when locked
- [x] Add admin endpoint to unlock account (optional)
```

### 3.4 Phone Number Normalization
```
Purpose: Handle different phone input formats

Examples:
- "081-234-5678" → "0812345678"
- "081 234 5678" → "0812345678"
- "+66812345678" → "0812345678"
- "66812345678" → "0812345678"

Tasks:
- [x] Create phone normalization utility
- [x] Apply on login (normalize input before lookup)
- [x] Apply on employee creation (store normalized)
- [x] Handle Thai phone formats specifically
```

---

## Phase 4: Backend - PIN Management

### 4.1 Set PIN Endpoint (First-time or Reset)
```
Endpoint: POST /api/v1/auth/set-pin

Purpose: Allow guard to set/change their PIN

Scenarios:
A) First-time setup (after LIFF linking, no PIN yet)
B) Change PIN (already logged in)
C) Reset PIN (via forgot PIN flow)

Request (when authenticated):
{
  "currentPin": "123456",  // Required if changing
  "newPin": "654321"
}

Request (when resetting via token):
{
  "resetToken": "xxx",
  "newPin": "654321"
}

Tasks:
- [x] Create set-pin endpoint (protected)
- [x] Validate PIN format (6 digits, not repeated/sequential)
- [x] Hash PIN before storage
- [x] Require old PIN if changing (unless resetting)
- [x] Update user record (password_hash, pin_set_at)nging: verify current PIN first
- [ ] If resetting: verify reset token
- [ ] Update user record
- [ ] Clear any lockout status
```

### 4.2 Forgot PIN Flow
```
Endpoint: POST /api/v1/auth/forgot-pin

Purpose: Send PIN reset link/code via SMS

Request:
{
  "companySlug": "abc-security",
  "phone": "0812345678",
  "turnstileToken": "xxx"
}

Response:
{
  "success": true,
  "message": "Reset code sent to phone",
  "message_th": "ส่งรหัสรีเซ็ตไปยังโทรศัพท์แล้ว"
}

Tasks:
- [x] Create forgot-pin endpoint
- [x] Verify Turnstile
- [x] Find user by company + phone
- [x] Generate 6-digit reset code (store hash + expiry)
- [ ] Send via SMS (integrate SMS provider) - **SKIPPED**
- [ ] (Optional) Send via LINE if linked
- [x] Create verify-reset-code endpoint
- [x] Return temporary token for set-pin endpointegration may be Phase 2. Alternative:
- [ ] Send reset link via LINE (if linked)
- [ ] Admin manual reset (MVP fallback)
```

### 4.3 Verify Reset Code Endpoint
```
Endpoint: POST /api/v1/auth/verify-reset-code

Request:
{
  "companySlug": "abc-security",
  "phone": "0812345678",
  "code": "123456"
}

Response (success):
{
  "success": true,
  "data": {
    "resetToken": "temporary-token-for-set-pin"
  }
}

Tasks:
- [ ] Verify code matches and not expired
- [ ] Return temporary token for set-pin endpoint
- [ ] Invalidate code after successful verification
```

---

## Phase 5: Frontend - Routing Setup

### 5.1 Analyze Existing Router
```
Before implementation:
- [x] Review existing React Router setup
- [x] Review existing LIFF route structure
- [x] Review how route parameters are extracted
- [x] Review existing auth redirect logic
```

### 5.2 Add Company-Specific Routes
```
New Routes:
/liff/:companySlug/login     → CompanyLoginPage
/liff/:companySlug/set-pin   → SetPinPage (first-time)
/liff/:companySlug/forgot-pin → ForgotPinPage

Existing Routes (unchanged):
/liff/clock
/liff/schedule
/liff/leave
/liff/link

Tasks:
- [x] Add new route definitions
- [x] Create route parameter extraction (handled in component)
- [x] Handle invalid company slug (redirect to error) (handled in component)
- [x] Ensure existing /liff/* routes still work
```

### 5.3 Auth Redirect Logic
```
After successful login:
1. Store JWT tokens (same as existing)
2. Redirect to /liff/clock

If user has no PIN set:
1. Login returns PIN_NOT_SET error
2. Redirect to /liff/:companySlug/set-pin

Tasks:
- [ ] Handle PIN_NOT_SET response
- [ ] Pass necessary data to set-pin page
- [ ] After PIN set, redirect to login or clock
```

---

## Phase 6: Frontend - Company Login Page

### 6.1 Analyze Existing Components
```
Before implementation:
- [ ] Review existing /liff/email-login page
- [ ] Review existing form components
- [ ] Review existing Turnstile integration
- [ ] Review existing loading/error states
```

### 6.2 Create Company Login Page
```
Route: /liff/:companySlug/login

UI Layout:
┌─────────────────────────────────────┐
│                                     │
│         [Company Logo]              │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   ABC Security Co., Ltd.    │   │  ← From API
│  │   บริษัท เอบีซี ซีเคียวริตี้    │   │
│  └─────────────────────────────┘   │
│                                     │
│  เบอร์โทรศัพท์ / Phone              │
│  ┌─────────────────────────────┐   │
│  │ 081-234-5678                │   │
│  └─────────────────────────────┘   │
│                                     │
│  รหัส PIN / PIN                     │
│  ┌─────────────────────────────┐   │
│  │ ○ ○ ○ ○ ○ ○                 │   │
│  └─────────────────────────────┘   │
│  ┌───┬───┬───┐                     │
│  │ 1 │ 2 │ 3 │                     │
│  ├───┼───┼───┤                     │
│  │ 4 │ 5 │ 6 │  ← Numeric keypad   │
│  ├───┼───┼───┤                     │
│  │ 7 │ 8 │ 9 │                     │
│  ├───┼───┼───┤                     │
│  │ ⌫ │ 0 │ ✓ │                     │
│  └───┴───┴───┘                     │
│                                     │
│  [Turnstile Widget]                 │
│                                     │
│  ┌─────────────────────────────┐   │
│  │     เข้าสู่ระบบ / Login      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ลืมรหัส PIN? / Forgot PIN?         │
│                                     │
│  ─────────────────────────────     │
│  📱 เข้าสู่ระบบด้วย LINE            │
│      Login with LINE               │
│                                     │
└─────────────────────────────────────┘

Tasks:
- [x] Create page component
- [x] Extract companySlug from URL params
- [x] Fetch company info on mount
- [x] Show loading state while fetching company
- [x] Show error if company not found
- [x] Display company name/logo
- [x] Create phone input with Thai formatting
- [x] Create PIN input with visual dots
- [x] Create numeric keypad component
- [ ] Integrate Turnstile widget (Skipped for MVP)
- [x] Handle form submission
- [x] Show loading state on submit
- [x] Handle error responses
- [x] Redirect to /liff/clock on success
- [x] Handle PIN_NOT_SET → redirect to set-pin
- [ ] Add "Login with LINE" link (opens LIFF)
```

### 6.3 Phone Input Component
```
Features:
- Auto-format as user types: 081-234-5678
- Accept various input formats
- Show Thai phone hint
- Validate Thai phone format (0X-XXX-XXXX)

Tasks:
- [x] Create phone input component (or enhance existing)
- [x] Implement auto-formatting
- [x] Implement validation
- [x] Handle paste (normalize pasted value) (basic implementation)
- [x] Show validation error if invalid
```

### 6.4 PIN Input Component
```
Features:
- 6 dots/circles showing entered digits
- Numeric keypad (mobile-friendly)
- Backspace/delete support
- Auto-submit when 6 digits entered (optional)
- Hide actual digits (security)

Tasks:
- [x] Create PIN input component
- [x] Create numeric keypad component
- [x] Track entered digits in state
- [x] Show filled vs empty dots
- [x] Handle keypad taps
- [x] Handle physical keyboard input (fallback via keypad only or custom hidden input - keeping keypad for now)
- [x] Handle backspace
- [x] Clear PIN on error
- [x] Disable input while submitting
```

### 6.5 Error Handling UI
```
Error States:
- Company not found → Full page error with "contact HR" message
- Invalid credentials → Inline error, clear PIN
- Account locked → Show lockout duration
- Network error → Retry option

Tasks:
- [x] Create error message component (Used Alert)
- [x] Style inline errors
- [x] Create full-page error state
- [ ] Add retry functionality (Page refresh for now)
- [x] Clear sensitive data on error
```

---

## Phase 7: Frontend - Set PIN Page

### 7.1 Create Set PIN Page
```
Route: /liff/:companySlug/set-pin

When shown:
- First-time login (no PIN set)
- After successful password reset
- User chose to change PIN

UI Layout:
┌─────────────────────────────────────┐
│                                     │
│  🔐 ตั้งรหัส PIN                    │
│     Set Your PIN                    │
│                                     │
│  กรุณาตั้งรหัส PIN 6 หลัก            │
│  Please set a 6-digit PIN           │
│                                     │
│  รหัส PIN ใหม่ / New PIN            │
│  ┌─────────────────────────────┐   │
│  │ ○ ○ ○ ○ ○ ○                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  ยืนยันรหัส PIN / Confirm PIN       │
│  ┌─────────────────────────────┐   │
│  │ ○ ○ ○ ○ ○ ○                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Numeric Keypad]                   │
│                                     │
│  ⚠️ หลีกเลี่ยงรหัสง่ายๆ เช่น        │
│     123456, 000000                  │
│     Avoid simple PINs like          │
│     123456, 000000                  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │     ยืนยัน / Confirm        │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘

Tasks:
- [x] Create page component (SetPinPage)
- [x] Two PIN inputs (new + confirm)
- [x] Validate PINs match
- [x] Validate PIN not too simple (backend does this, frontend basic check)
- [x] Show validation errors inline
- [x] Submit to set-pin API
- [x] Redirect to login or clock on success
```

### 7.2 PIN Validation Rules
```
Invalid PINs (reject these):
- Less than 6 digits
- Sequential: 123456, 654321
- Repeated: 000000, 111111, etc.
- Common: 123123, 112233

Tasks:
- [ ] Create PIN validation utility
- [ ] Check for sequential numbers
- [ ] Check for repeated digits
- [ ] Check against common PINs list
- [ ] Show specific error message
```

---

## Phase 8: Frontend - Forgot PIN Page

### 8.1 Create Forgot PIN Page
```
Route: /liff/:companySlug/forgot-pin

UI Layout (Step 1 - Enter Phone):
┌─────────────────────────────────────┐
│                                     │
│  ← กลับ                             │
│                                     │
│  🔑 ลืมรหัส PIN                     │
│     Forgot PIN                      │
│                                     │
│  กรุณากรอกเบอร์โทรศัพท์              │
│  Please enter your phone number     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 081-234-5678                │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Turnstile Widget]                 │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   ส่งรหัสยืนยัน / Send Code  │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘

UI Layout (Step 2 - Enter Code):
┌─────────────────────────────────────┐
│                                     │
│  ← กลับ                             │
│                                     │
│  📱 กรอกรหัสยืนยัน                   │
│     Enter Verification Code         │
│                                     │
│  ส่งรหัสไปที่ 081-XXX-5678          │
│  Code sent to 081-XXX-5678          │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ○ ○ ○ ○ ○ ○                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  รหัสจะหมดอายุใน 09:45              │
│  Code expires in 09:45              │
│                                     │
│  ไม่ได้รับรหัส? ส่งใหม่             │
│  Didn't receive? Resend             │
│                                     │
└─────────────────────────────────────┘

UI Layout (Step 3 - Set New PIN):
→ Redirect to /liff/:companySlug/set-pin?reset=token

Tasks:
- [x] Create multi-step forgot PIN page (ForgotPinPage)
- [x] Step 1: Phone input + Turnstile (Turnstile skipped for MVP)
- [x] Call forgot-pin API
- [x] Step 2: Code input with expiry countdown (expiry static text for now)
- [x] Call verify-reset-code API
- [x] Redirect to set-pin with reset token
- [x] Handle resend code (implemented simple back button)
- [ ] Handle code expiry (frontend text only)
```

---

## Phase 9: Admin Features

### 9.1 View Guard PIN Status
```
Location: Employee detail page (web dashboard)

Display:
- PIN set: Yes/No
- PIN last changed: date
- Failed attempts: count
- Locked: Yes/No (until time)

Tasks:
- [x] Add PIN status to employee API response
- [x] Display PIN status in employee detail
- [x] Do NOT show actual PIN (never stored in plain text)
```

### 9.2 Reset Guard PIN (Admin)
```
Purpose: Admin can reset guard's PIN if locked out or forgotten

UI: Button on employee detail page
Action: Clears PIN, guard must set new one on next login

Endpoint: POST /api/v1/employees/:id/reset-pin

Tasks:
- [x] Create admin reset-pin endpoint
- [x] Clear PIN hash from user record
- [x] Clear lockout status
- [x] Log action for audit
- [ ] Send notification to guard (optional)
- [x] Add button to employee detail UI
- [x] Confirm dialog before reset
```

### 9.3 Generate Company Login QR Code
```
Purpose: Easy way for HR to share login link

UI: Company settings page

Display:
- Company login URL
- QR code image (downloadable)
- Copy link button

Tasks:
- [x] Add Login URL section to Company Settings
- [x] Generate QR Code for Login URL
- [x] Add Copy to Clipboard button
```
Tasks:
- [ ] Generate QR code for company login URL
- [ ] Add download QR button
- [ ] Add copy link button
- [ ] Show preview of login page
```

---

## Phase 10: Testing

### 10.1 Backend Tests
```
Tasks:
- [ ] Test company lookup by slug
      • Valid slug
      • Invalid slug
      • Case insensitivity
      
- [ ] Test phone + PIN login
      • Valid credentials
      • Invalid phone
      • Invalid PIN
      • Account locked
      • Account inactive
      • PIN not set
      • Turnstile failure
      
- [ ] Test PIN management
      • Set initial PIN
      • Change PIN
      • Simple PIN rejection
      • Reset PIN flow
      
- [ ] Test rate limiting
      • Login attempts
      • Forgot PIN requests
```

### 10.2 Frontend Tests
```
Tasks:
- [ ] Test company login page
      • Company loads correctly
      • Company not found handling
      • Form validation
      • Successful login redirect
      • Error display
      
- [ ] Test PIN input component
      • Keypad interaction
      • Backspace
      • Max length
      
- [ ] Test set PIN page
      • Validation rules
      • PIN mismatch
      • Success redirect
```

### 10.3 Manual Testing Checklist
```
- [ ] Test complete flow: QR scan → login → clock
- [ ] Test on iOS LINE browser
- [ ] Test on Android LINE browser
- [ ] Test on mobile Chrome
- [ ] Test on mobile Safari
- [ ] Test PIN lockout and unlock
- [ ] Test forgot PIN with SMS (if implemented)
- [ ] Test admin PIN reset
```

---

## Phase 11: Translations

### 11.1 Add Translation Keys
```
Tasks:
- [ ] Add to Thai translation file
- [ ] Add to English translation file

Keys needed:

companyLogin:
  title: "เข้าสู่ระบบ" / "Login"
  phone: "เบอร์โทรศัพท์" / "Phone Number"
  phonePlaceholder: "081-234-5678"
  pin: "รหัส PIN" / "PIN"
  pinPlaceholder: "กรอกรหัส PIN 6 หลัก" / "Enter 6-digit PIN"
  login: "เข้าสู่ระบบ" / "Login"
  forgotPin: "ลืมรหัส PIN?" / "Forgot PIN?"
  loginWithLine: "เข้าสู่ระบบด้วย LINE" / "Login with LINE"
  companyNotFound: "ไม่พบบริษัท" / "Company not found"
  contactHr: "กรุณาติดต่อฝ่ายบุคคล" / "Please contact HR"
  
errors:
  invalidCredentials: "เบอร์โทรศัพท์หรือรหัส PIN ไม่ถูกต้อง" / "Invalid phone or PIN"
  accountLocked: "บัญชีถูกล็อค กรุณารอ {minutes} นาที" / "Account locked. Please wait {minutes} minutes"
  accountInactive: "บัญชีถูกระงับ กรุณาติดต่อฝ่ายบุคคล" / "Account suspended. Please contact HR"
  pinNotSet: "ยังไม่ได้ตั้งรหัส PIN" / "PIN not set"
  
setPin:
  title: "ตั้งรหัส PIN" / "Set Your PIN"
  subtitle: "กรุณาตั้งรหัส PIN 6 หลัก" / "Please set a 6-digit PIN"
  newPin: "รหัส PIN ใหม่" / "New PIN"
  confirmPin: "ยืนยันรหัส PIN" / "Confirm PIN"
  confirm: "ยืนยัน" / "Confirm"
  pinMismatch: "รหัส PIN ไม่ตรงกัน" / "PINs do not match"
  pinTooSimple: "รหัส PIN ง่ายเกินไป" / "PIN is too simple"
  avoidSimple: "หลีกเลี่ยงรหัสง่ายๆ เช่น 123456" / "Avoid simple PINs like 123456"
  
forgotPin:
  title: "ลืมรหัส PIN" / "Forgot PIN"
  enterPhone: "กรุณากรอกเบอร์โทรศัพท์" / "Please enter your phone number"
  sendCode: "ส่งรหัสยืนยัน" / "Send Code"
  enterCode: "กรอกรหัสยืนยัน" / "Enter Verification Code"
  codeSentTo: "ส่งรหัสไปที่ {phone}" / "Code sent to {phone}"
  codeExpires: "รหัสจะหมดอายุใน {time}" / "Code expires in {time}"
  resend: "ส่งใหม่" / "Resend"
  didntReceive: "ไม่ได้รับรหัส?" / "Didn't receive code?"
```

---

## Implementation Order

```
Week 1:
├── Phase 1: Database changes (if needed)
├── Phase 2: Company lookup API
├── Phase 3.2-3.3: Phone + PIN login API
└── Phase 4: PIN management APIs

Week 2:
├── Phase 5: Frontend routing
├── Phase 6.1-6.2: Company login page (basic)
├── Phase 6.3-6.4: Phone input + PIN input components
└── Phase 6.5: Error handling

Week 3:
├── Phase 7: Set PIN page
├── Phase 8: Forgot PIN page
└── Phase 9: Admin features

Week 4:
├── Phase 10: Testing
├── Phase 11: Translations
└── Bug fixes and polish
```

---

## Security Checklist

- [ ] PIN stored hashed (same as passwords)
- [ ] Turnstile on all login/reset forms
- [ ] Rate limiting on login endpoint
- [ ] Account lockout after failed attempts
- [ ] Generic error messages (don't reveal if phone exists)
- [ ] Reset codes expire quickly (10 min)
- [ ] Reset codes are single-use
- [ ] Log all auth events for audit
- [ ] No PIN in logs or error messages
- [ ] HTTPS only

---

## Dependencies

| Dependency | Purpose | Status |
|------------|---------|--------|
| Turnstile | Already planned in separate doc | Required |
| SMS Provider | For forgot PIN codes | Optional (can defer) |
| QR Code Library | For admin QR generation | Nice to have |

---

## Migration from Existing Email Login

```
If replacing /liff/email-login:

Tasks:
- [ ] Keep old route working during transition (redirect to new)
- [ ] Migrate any existing users to new flow
- [ ] Update any documentation/help text
- [ ] Remove old route after full migration
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2025-01-20 | Claude | Initial draft |
