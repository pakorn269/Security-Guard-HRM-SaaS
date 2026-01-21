# LIFF Account Linking - Implementation Tasks

## Overview

**Feature:** First-time LIFF user account linking flow  
**Problem:** When a user opens LIFF, we get their LINE userId, but we don't know who they are in our system yet.  
**Solution:** Account linking flow that maps LINE userId to existing user/employee records.

---

## Pre-Implementation Checklist

Before starting each phase, analyze the existing codebase:

```bash
# Understand current structure
- [ ] Review existing database schema (users, employees tables)
- [ ] Review existing auth middleware and JWT implementation
- [ ] Review existing API response format and error handling patterns
- [ ] Review existing frontend auth context/store
- [ ] Check if LINE-related fields already exist in user table
```

---

## Phase 1: Backend - Database & Models ✅ COMPLETED

### 1.1 Analyze Existing Schema
```
Before implementation:
- [x] Check current `users` table structure
- [x] Check if `line_user_id`, `line_display_name`, `line_picture_url` columns exist
- [x] Check current `employees` table structure
- [x] Check if `employee_code` field exists and is unique per company
- [x] Review existing migration patterns in the project
```

**Analysis Results:**
- `users` table already has: `line_user_id`, `line_display_name`, `line_picture_url`
- `employees` table already has: `employee_code` (unique per company), `phone`
- Added missing `line_linked_at` column via migration 004

### 1.2 Database Migration (if needed)
```
Tasks:
- [x] Add LINE-related columns to users table (if not exist):
      • line_user_id (unique, nullable) ✅ Already exists
      • line_display_name (nullable) ✅ Already exists
      • line_picture_url (nullable) ✅ Already exists
      • line_linked_at (timestamp, nullable) ✅ Added in migration 004

- [x] Ensure employees table has linkable fields:
      • employee_code (should be unique per company) ✅ Already exists
      • phone (for verification) ✅ Already exists

- [x] Add index on users.line_user_id for fast lookup ✅ Already exists
```

**Files Modified/Created:**
- `backend/supabase/migrations/004_add_line_linked_at.sql` - New migration
- `backend/src/modules/user/user.types.ts` - Added `lineLinkedAt` field
- `backend/src/modules/user/user.service.ts` - Updated link/unlink methods

---

## Phase 2: Backend - LINE Authentication API ✅ COMPLETED

### 2.1 Analyze Existing Auth Implementation
```
Before implementation:
- [x] Review existing auth routes structure
- [x] Review existing auth service/controller pattern
- [x] Review JWT token generation logic
- [x] Review existing validation middleware usage
- [x] Check if LINE SDK/client is already configured
```

**Analysis Results:**
- Existing LINE login flow uses ID token verification via LINE API
- JWT tokens generated with access/refresh token pattern
- Zod validation schemas used for request validation
- LINE config already exists in `backend/src/config/line.ts`

### 2.2 LINE Token Verification Endpoint ✅
```
Endpoint: POST /api/v1/auth/line/verify

Purpose: Verify LINE access token and check if user is linked

Tasks:
- [x] Create LINE token verification service
      • Call LINE API to verify access token ✅
      • Get LINE user profile (userId, displayName, pictureUrl) ✅
      
- [x] Create endpoint logic
      • Verify LINE token ✅
      • Check if line_user_id exists in users table ✅
      • If linked: generate JWT and return user data ✅
      • If not linked: return LINE profile for linking flow ✅
      
- [x] Add validation for accessToken field
- [x] Add error handling for invalid/expired LINE tokens
```

### 2.3 Account Linking Endpoint (Guard - Employee Code + Phone) ✅
```
Endpoint: POST /api/v1/auth/line/link-employee

Purpose: Link LINE account to employee using employee code + phone

Tasks:
- [x] Create linking service logic
      • Verify LINE token first ✅
      • Find employee by company + employee_code ✅
      • Verify phone number matches ✅
      • Check if employee's user account already has LINE linked ✅
      • Check if this LINE userId is already linked to another account ✅
      
- [x] Create or update user account
      • If employee has no user: create user with role 'guard' ✅
      • Update user with LINE fields (line_user_id, line_display_name, etc.) ✅
      
- [x] Generate JWT tokens and return user data
- [x] Add validation for all required fields
- [x] Add error handling with Thai translations
```

### 2.4 Account Linking Endpoint (Manager/Admin - Email + Password) ✅
```
Endpoint: POST /api/v1/auth/line/link-credentials

Purpose: Link LINE account to existing user via email/password

Tasks:
- [x] Create linking service logic
      • Verify LINE token first ✅
      • Authenticate with email + password (use existing auth logic) ✅
      • Check if user account already has LINE linked ✅
      • Check if this LINE userId is already linked to another account ✅
      
- [x] Update user with LINE fields
- [x] Generate JWT tokens and return user data
- [x] Add validation and error handling
```

### 2.5 Unlink LINE Account Endpoint ✅
```
Endpoint: POST /api/v1/auth/line/unlink

Purpose: Allow user to unlink their LINE account

Tasks:
- [x] Remove LINE fields from user record
- [x] Require authentication (JWT)
- [ ] Add audit log entry (optional - not implemented)
```

**Files Modified:**
- `backend/src/modules/auth/auth.types.ts` - Added LIFF linking types
- `backend/src/modules/auth/auth.validation.ts` - Added validation schemas
- `backend/src/modules/auth/auth.service.ts` - Added lineVerify, linkEmployee, linkCredentials, unlinkLine methods
- `backend/src/modules/auth/auth.controller.ts` - Added controller methods
- `backend/src/modules/auth/auth.routes.ts` - Added new routes

**New API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/auth/line/verify` | Verify LINE token, check if linked |
| POST | `/api/v1/auth/line/link-employee` | Link LINE to employee (guards) |
| POST | `/api/v1/auth/line/link-credentials` | Link LINE to user (managers/admins) |
| POST | `/api/v1/auth/line/unlink` | Unlink LINE account (protected) |

---

## Phase 3: Backend - Middleware Updates ✅ COMPLETED

### 3.1 Analyze Existing Middleware
```
Before implementation:
- [x] Review current auth middleware implementation
- [x] Review how tenant context is extracted from JWT
- [x] Review error response format in middleware
```

**Analysis Results:**
- `auth.middleware.ts` - JWT-based auth with `authMiddleware`, `optionalAuthMiddleware`, `requireRoles()`
- `tenant.middleware.ts` - Sets RLS context from JWT companyId/role
- All middleware uses centralized error classes from `utils/errors.ts`

### 3.2 LIFF Auth Middleware ✅
```
Purpose: Handle authentication for LIFF-specific endpoints

Tasks:
- [x] Create middleware that can authenticate via:
      • JWT Bearer token (for linked users making subsequent requests) ✅
      • LINE access token (for initial verification) ✅
      
- [x] Ensure middleware sets user context correctly
- [x] Ensure middleware sets tenant/company context
```

**Files Created:**
- `backend/src/middleware/liff.middleware.ts`

**New Middleware Functions:**
| Function | Purpose |
|----------|---------|
| `liffAuthMiddleware` | Authenticates via JWT or LINE token |
| `optionalLiffAuthMiddleware` | Same but doesn't throw if no token |
| `requireLinkedUser` | Ensures user is linked (has JWT) |
| `requireLineProfile` | Ensures LINE profile is available |

**Authentication Flow:**
```
Authorization Header Format:
- JWT: "Bearer {jwt_token}"
- LINE: "LINE {idToken}:{liffId}"

Priority: JWT > LINE Token
```

---

## Phase 4: Frontend - LIFF Initialization & Auth ✅ COMPLETED

### 4.1 Analyze Existing Frontend Structure
```
Before implementation:
- [x] Review existing LIFF pages location and structure
- [x] Review existing auth context/store implementation
- [x] Review existing API service patterns
- [x] Review existing form components and validation
- [x] Review i18n setup and translation file structure
- [x] Check existing environment variables setup
```

**Analysis Results:**
- LIFF pages in `src/pages/liff/` - Clock, Leave, Profile, Schedule
- Existing `AuthContext.tsx` with `lineLogin` method
- API service pattern uses axios with interceptors in `api.ts`
- LIFF SDK `@line/liff` already installed
- `LiffLayout.tsx` handles LIFF initialization

### 4.2 LIFF Auth Service ✅
```
File: src/services/liff-auth.service.ts

Tasks:
- [x] Create LIFF auth service with methods:
      • verifyLineToken(idToken, liffId) → calls POST /auth/line/verify ✅
      • linkEmployee(data) → calls POST /auth/line/link-employee ✅
      • linkCredentials(data) → calls POST /auth/line/link-credentials ✅
      • unlinkLine() → calls POST /auth/line/unlink ✅
      
- [x] Handle token storage (same pattern as existing auth)
- [x] Handle error responses with Thai messages
```

### 4.3 LIFF Auth Context/Hook ✅
```
File: src/context/LiffAuthContext.tsx

Purpose: Manage LIFF authentication state

Tasks:
- [x] Create useLiffAuth hook
      
- [x] Implement initialization flow:
      1. Initialize LIFF SDK ✅
      2. Check if LIFF is logged in ✅
      3. Get LIFF ID token ✅
      4. Call verify endpoint ✅
      5. Set state: { status, user, lineProfile, error } ✅
      
- [x] Provide methods:
      • linkWithEmployeeCode(employeeCode, phone, companySlug) ✅
      • linkWithCredentials(email, password) ✅
      • logout() ✅
      
- [x] Handle loading and error states ✅
```

### 4.4 LIFF Entry Point / Router Guard
```
Purpose: Handle routing based on auth state

Status: LiffAuthContext provides status for routing decisions.
The existing LiffLayout can be updated to use LiffAuthContext
and redirect based on `needsLinking` state.

Tasks:
- [x] Context provides status for routing decisions
- [ ] Update LiffLayout to use LiffAuthContext (Phase 5)
- [ ] Create linking pages (Phase 5)
```

**Files Created:**
- `frontend/src/services/liff-auth.service.ts` - LIFF auth API calls
- `frontend/src/context/LiffAuthContext.tsx` - LIFF auth state management

**LiffAuthContext States:**
| Status | Description |
|--------|-------------|
| `initializing` | LIFF SDK is initializing |
| `not_logged_in` | User not logged into LINE |
| `verifying` | Verifying LINE token with backend |
| `not_linked` | LINE verified but not linked to user |
| `linked` | LINE verified and linked to user |
| `error` | An error occurred |

---

## Phase 5: Frontend - Account Linking Pages ✅ COMPLETED

### 5.1 Linking Method Selection Page ✅
```
Route: /liff/link
File: src/pages/liff/LiffLinkPage.tsx

Tasks:
- [x] Create page component
- [x] Display LINE profile (name, picture)
- [x] Two linking method options
- [x] Navigate to appropriate linking form
- [x] Add Thai/English translations
```

### 5.2 Employee Code Linking Page ✅
```
Route: /liff/link/employee
File: src/pages/liff/LiffLinkEmployeePage.tsx

Tasks:
- [x] Create page component
- [x] Company slug input (with hint text)
- [x] Employee code input
- [x] Phone number input (with Thai format validation)
- [x] Form validation
- [x] Submit and handle response
- [x] Show success → redirect to LIFF clock page
- [x] Show error messages (styled, with Thai translation)
- [x] Loading state on submit button
```

### 5.3 Email/Password Linking Page ✅
```
Route: /liff/link/credentials
File: src/pages/liff/LiffLinkCredentialsPage.tsx

Tasks:
- [x] Create page component
- [x] Email input
- [x] Password input (with show/hide toggle)
- [x] Form validation
- [x] Submit and handle response
- [x] Show success → redirect to LIFF clock page
- [x] Show error messages
- [x] Loading state
```

### 5.4 Linking Success Page
```
Status: Integrated into linking pages as inline success state
- Success animation with checkmark
- Auto-redirect after 1.5 seconds
```

**Files Created:**
- `frontend/src/pages/liff/LiffLinkPage.tsx` - Method selection page
- `frontend/src/pages/liff/LiffLinkEmployeePage.tsx` - Employee code linking
- `frontend/src/pages/liff/LiffLinkCredentialsPage.tsx` - Email/password linking

**Routes Added:**
| Route | Component | Purpose |
|-------|-----------|---------|
| `/liff/link` | LiffLinkPage | Method selection |
| `/liff/link/employee` | LiffLinkEmployeePage | Guard linking |
| `/liff/link/credentials` | LiffLinkCredentialsPage | Manager/Admin linking |

---

## Phase 6: Frontend - LIFF Home & Navigation ✅ COMPLETED

### 6.1 Analyze Existing LIFF Pages
```
Before implementation:
- [x] Review existing LIFF page components
- [x] Review existing LIFF layout/navigation
- [x] Check what features are already implemented
```

**Analysis Results:**
- Existing LIFF pages: Clock, Leave, Profile, Schedule
- LiffLayout handles LIFF SDK initialization
- LiffPage component for consistent page structure
- Bottom navigation not needed for current scope (linking flow)

### 6.2 LiffLayout Updated ✅
```
File: src/components/layout/LiffLayout.tsx

Changes:
- [x] Integrated LiffAuthContext for auth state management
- [x] Handles all auth states: initializing, not_logged_in, verifying, not_linked, linked, error
- [x] Auto-redirects unlinked users to /liff/link
- [x] Auto-redirects linked users away from linking pages
- [x] Error state with retry button
- [x] Loading states with Thai messages
```

### 6.3 LIFF Home Page (Role-based)
```
Status: Existing LIFF pages already implement role-specific features
- Guards: Clock page as default entry point
- The linking flow redirects to /liff/clock after successful linking

Note: Role-based home pages can be added as a future enhancement
```

### 6.4 LIFF Bottom Navigation
```
Status: Not implemented in this phase
- Current scope focuses on account linking flow
- Existing pages work without bottom navigation
- Can be added as a future enhancement
```

**Key Changes:**
1. LiffLayout now uses `LiffAuthProvider` wrapper
2. `LiffLayoutContent` uses `useLiffAuth()` hook
3. Automatic routing based on auth state:
   - Not linked → `/liff/link`
   - Linked but on link page → `/liff/clock`
   - Otherwise → show content

**Auth State Flow:**
```
LIFF Open
    ↓
Initialize LIFF SDK
    ↓
Not logged in? → LINE Login redirect
    ↓
Get ID Token
    ↓
Verify with Backend
    ↓
┌─────────────────────────────────┐
│ Not Linked?                     │
│     → Navigate to /liff/link    │
│     → User selects method       │
│     → Links account             │
│     → Redirect to /liff/clock   │
└─────────────────────────────────┘
    ↓
Linked → Show normal LIFF content
```

---

## Phase 7: Testing

### 7.1 Backend Tests
```
Tasks:
- [ ] Unit tests for LINE token verification service
- [ ] Unit tests for account linking service
- [ ] Integration tests for linking endpoints
- [ ] Test cases:
      • Valid LINE token, user not linked
      • Valid LINE token, user already linked
      • Invalid LINE token
      • Valid employee code + phone
      • Invalid employee code
      • Phone mismatch
      • Employee already linked to different LINE
      • LINE already linked to different employee
      • Valid email + password linking
      • Invalid credentials
```

### 7.2 Frontend Tests
```
Tasks:
- [ ] Test LIFF initialization flow
- [ ] Test linking form validation
- [ ] Test error message display
- [ ] Test successful linking redirect
```

### 7.3 End-to-End Testing
```
Tasks:
- [ ] Test complete flow: LIFF open → verify → link → home
- [ ] Test with actual LINE LIFF environment
- [ ] Test on mobile device in LINE app
```

---

## Phase 8: Translations ✅ COMPLETED

### 8.1 Add Translation Keys ✅
```
Tasks:
- [x] Add keys to Thai translation file
- [x] Add keys to English translation file
```

**Files Modified:**
- `frontend/public/locales/th/common.json`
- `frontend/public/locales/en/common.json`

**Translation Keys Added:**

```
liff:
  loading, pleaseWait, error, retry
  redirectingToLine, redirectingToLineDesc, contactHR
  
  linking:
    title, welcome, selectMethod
    employeeCodeOption, employeeCodeDesc
    credentialsOption, credentialsDesc
    
  employeeLink:
    title, companyCode, companyCodeHint, companyCodePlaceholder
    employeeCode, employeeCodePlaceholder
    phone, phoneHint, verify, verifying, helpText
    
  credentialsLink:
    title, email, emailPlaceholder
    password, verify, verifying, helpText
    
  success:
    linked, redirecting
    
  errors:
    companyRequired, employeeCodeRequired, phoneRequired
    emailRequired, passwordRequired
    invalidPhoneFormat, invalidEmailFormat
    companyNotFound, employeeNotFound, phoneMismatch
    alreadyLinked, lineAlreadyUsed, invalidCredentials
    accountDeactivated, noPassword, linkFailed
    tokenMissing, initFailed
```

**Note:** Current implementation uses hardcoded Thai/English text in components.
To use i18n translations, components should be updated to use `useTranslation()` hook.

---

## Implementation Order (Recommended)

```
Week 1:
├── Phase 1: Database (if migration needed)
├── Phase 2.1-2.2: Analyze + LINE verify endpoint
└── Phase 2.3: Employee linking endpoint

Week 2:
├── Phase 2.4: Credentials linking endpoint
├── Phase 3: Middleware updates
└── Phase 4: Frontend auth service & context

Week 3:
├── Phase 5: Linking pages (all three)
├── Phase 6: LIFF home updates
└── Phase 8: Translations

Week 4:
├── Phase 7: Testing
└── Bug fixes and polish
```

---

## Error Codes Reference

| Code | HTTP | Description |
|------|------|-------------|
| `LINE_TOKEN_INVALID` | 401 | LINE access token is invalid or expired |
| `LINE_TOKEN_VERIFICATION_FAILED` | 401 | Failed to verify with LINE API |
| `EMPLOYEE_NOT_FOUND` | 404 | Employee code not found in company |
| `PHONE_MISMATCH` | 400 | Phone number doesn't match employee record |
| `ACCOUNT_ALREADY_LINKED` | 409 | User account already linked to a LINE ID |
| `LINE_ALREADY_LINKED` | 409 | LINE ID already linked to another account |
| `INVALID_CREDENTIALS` | 401 | Email or password incorrect |
| `COMPANY_NOT_FOUND` | 404 | Company slug/id not found |

---

## Security Considerations

- [ ] LINE access tokens should be verified server-side with LINE API
- [ ] Rate limit linking attempts (prevent brute force on employee codes)
- [ ] Log all linking/unlinking activities for audit
- [ ] Ensure LINE userId cannot be spoofed (always verify token)
- [ ] Employee code + phone combination should be unique enough
- [ ] **Implement Cloudflare Turnstile** for bot protection
      → See: `tasks-cloudflare-turnstile.md` for detailed implementation

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2025-01-20 | Claude | Initial draft |
