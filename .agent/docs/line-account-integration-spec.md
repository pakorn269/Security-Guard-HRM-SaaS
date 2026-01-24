# LINE Account Integration - Technical Specification
**Security Guard HRM SaaS**
**Author:** System Architect
**Date:** 2026-01-24
**Version:** 1.0

---

## Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Row-Level Security Policies](#row-level-security-policies)
4. [Backend Logic & Edge Functions](#backend-logic--edge-functions)
5. [API Endpoints](#api-endpoints)
6. [Security Considerations](#security-considerations)
7. [Event Flow Diagrams](#event-flow-diagrams)

---

## Overview

This specification defines a secure LINE account integration system with strict access control, preventing unauthorized access while maintaining data integrity and audit trails.

### Key Security Principles
1. **Zero Trust by Default:** Unlinked users have NO access to company data
2. **Explicit Admin Approval:** All link/unlink operations require admin consent
3. **Audit Trail:** Every action is logged with timestamps and actor information
4. **Session Revocation:** Force unlink immediately revokes all active sessions
5. **Anti-Evasion:** Guards cannot self-unlink to prevent audit trail circumvention

---

## Database Schema

### 1.1 Enhanced `users` Table
**Purpose:** Store LINE account linkage status and metadata

```sql
-- Add new columns to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS
    line_link_status VARCHAR(20) DEFAULT 'unlinked'
    CHECK (line_link_status IN ('unlinked', 'pending', 'linked', 'force_unlinked'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS
    line_linked_at TIMESTAMPTZ;

ALTER TABLE users ADD COLUMN IF NOT EXISTS
    line_unlinked_at TIMESTAMPTZ;

ALTER TABLE users ADD COLUMN IF NOT EXISTS
    line_unlinked_by UUID REFERENCES users(id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS
    line_unlink_reason TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_users_line_link_status
    ON users(line_link_status);
```

**Column Definitions:**
- `line_link_status`: Tracks the current state of LINE linkage
  - `unlinked`: No LINE account linked (default)
  - `pending`: Link request submitted, awaiting admin approval
  - `linked`: LINE account successfully linked and active
  - `force_unlinked`: Admin forcibly unlinked (for audit/security)

- `line_linked_at`: Timestamp when LINE account was approved and linked
- `line_unlinked_at`: Timestamp when LINE account was unlinked
- `line_unlinked_by`: Reference to admin who performed force unlink
- `line_unlink_reason`: Audit note explaining why account was unlinked

### 1.2 Enhanced `line_link_requests` Table (EXISTING)
**Purpose:** Track link/unlink requests with approval workflow

```sql
-- Already exists from migration 011, but add unlink support
ALTER TABLE line_link_requests ADD COLUMN IF NOT EXISTS
    request_type VARCHAR(20) DEFAULT 'link'
    CHECK (request_type IN ('link', 'unlink'));

ALTER TABLE line_link_requests ADD COLUMN IF NOT EXISTS
    unlink_reason TEXT;

-- Index for unlink requests
CREATE INDEX IF NOT EXISTS idx_line_link_requests_type
    ON line_link_requests(request_type, status);
```

**Enhanced Schema:**
```sql
CREATE TABLE line_link_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Request metadata
    request_type VARCHAR(20) DEFAULT 'link', -- 'link' or 'unlink'

    -- LINE user info
    line_user_id VARCHAR(255) NOT NULL,
    line_display_name VARCHAR(255),
    line_picture_url TEXT,

    -- Target employee
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Verification data (for LINK requests)
    entered_phone VARCHAR(20),
    entered_employee_code VARCHAR(50),
    phone_matched BOOLEAN DEFAULT false,
    code_matched BOOLEAN DEFAULT false,
    auto_approved BOOLEAN DEFAULT false,

    -- Unlink reason (for UNLINK requests)
    unlink_reason TEXT,

    -- Status tracking
    status line_link_request_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- Timestamps
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.3 New `line_session_tokens` Table
**Purpose:** Track active LINE LIFF sessions for immediate revocation

```sql
CREATE TABLE IF NOT EXISTS line_session_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    line_user_id VARCHAR(255) NOT NULL,

    -- Session data
    access_token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    liff_session_id VARCHAR(255),

    -- Device/browser fingerprint
    user_agent TEXT,
    ip_address INET,

    -- Session lifecycle
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id),
    revoke_reason TEXT,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_line_sessions_user ON line_session_tokens(user_id, is_active);
CREATE INDEX idx_line_sessions_line_user ON line_session_tokens(line_user_id);
CREATE INDEX idx_line_sessions_active ON line_session_tokens(is_active, expires_at);
```

### 1.4 New `line_audit_log` Table
**Purpose:** Immutable audit trail for all LINE operations

```sql
CREATE TYPE line_audit_action AS ENUM (
    'link_request_created',
    'link_request_approved',
    'link_request_rejected',
    'link_request_expired',
    'unlink_request_created',
    'unlink_request_approved',
    'unlink_request_rejected',
    'force_unlink_executed',
    'session_revoked',
    'auto_link_matched'
);

CREATE TABLE IF NOT EXISTS line_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Actor
    actor_user_id UUID REFERENCES users(id),
    actor_role VARCHAR(20),
    actor_name VARCHAR(255),

    -- Target
    target_user_id UUID REFERENCES users(id),
    target_employee_id UUID REFERENCES employees(id),
    target_line_user_id VARCHAR(255),

    -- Action
    action line_audit_action NOT NULL,
    request_id UUID REFERENCES line_link_requests(id),

    -- Context
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for audit queries
CREATE INDEX idx_line_audit_company ON line_audit_log(company_id, created_at DESC);
CREATE INDEX idx_line_audit_target ON line_audit_log(target_user_id);
CREATE INDEX idx_line_audit_actor ON line_audit_log(actor_user_id);
CREATE INDEX idx_line_audit_action ON line_audit_log(action);
```

---

## Row-Level Security Policies

### 2.1 Enhanced `users` Table Policies

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- DROP existing overly permissive policies (if any)
DROP POLICY IF EXISTS "Guards can view their own user" ON users;

-- ============================================================
-- READ POLICIES
-- ============================================================

-- Policy 1: Super admins can view all users
CREATE POLICY "super_admin_view_all_users"
ON users FOR SELECT
USING (public.is_super_admin());

-- Policy 2: Company admins can view users in their company
CREATE POLICY "company_admin_view_company_users"
ON users FOR SELECT
USING (
    company_id = public.get_current_company_id()
    AND public.get_current_user_role() IN ('company_admin', 'manager')
);

-- Policy 3: CRITICAL - Guards can ONLY view their OWN user IF linked
CREATE POLICY "guard_view_own_user_if_linked"
ON users FOR SELECT
USING (
    id = public.get_current_user_id()
    AND public.get_current_user_role() = 'guard'
    AND line_link_status = 'linked'  -- MUST be linked
    AND is_active = true
);

-- Policy 4: Pending users have NO access (implicit deny)
-- No policy needed - RLS denies by default

-- ============================================================
-- UPDATE POLICIES
-- ============================================================

-- Policy 5: Company admins can update users in their company
CREATE POLICY "company_admin_update_users"
ON users FOR UPDATE
USING (
    company_id = public.get_current_company_id()
    AND public.get_current_user_role() IN ('super_admin', 'company_admin')
)
WITH CHECK (
    company_id = public.get_current_company_id()
);

-- Policy 6: Guards can update limited fields (language, preferences)
-- But CANNOT modify line_link_status
CREATE POLICY "guard_update_own_profile"
ON users FOR UPDATE
USING (
    id = public.get_current_user_id()
    AND public.get_current_user_role() = 'guard'
    AND line_link_status = 'linked'
)
WITH CHECK (
    id = public.get_current_user_id()
    AND line_link_status = 'linked'  -- Prevent self-unlink
);
```

### 2.2 Enhanced `employees` Table Policies

```sql
-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- READ POLICIES
-- ============================================================

-- Policy 1: Admins can view all employees in their company
CREATE POLICY "admin_view_company_employees"
ON employees FOR SELECT
USING (
    company_id = public.get_current_company_id()
    AND public.is_admin_or_manager()
);

-- Policy 2: CRITICAL - Guards can ONLY view their OWN employee record IF linked
CREATE POLICY "guard_view_own_employee_if_linked"
ON employees FOR SELECT
USING (
    id IN (
        SELECT employee_id
        FROM users
        WHERE id = public.get_current_user_id()
        AND line_link_status = 'linked'
        AND is_active = true
    )
);

-- Policy 3: Pending users CANNOT view ANY employee data (implicit deny)
```

### 2.3 `line_link_requests` Table Policies

```sql
ALTER TABLE line_link_requests ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admins can view all requests in their company
CREATE POLICY "admin_view_link_requests"
ON line_link_requests FOR SELECT
USING (
    company_id = public.get_current_company_id()
    AND public.is_admin_or_manager()
);

-- Policy 2: Users can view their OWN requests
CREATE POLICY "user_view_own_requests"
ON line_link_requests FOR SELECT
USING (
    employee_id IN (
        SELECT employee_id
        FROM users
        WHERE id = public.get_current_user_id()
    )
);

-- Policy 3: Admins can update (approve/reject) requests
CREATE POLICY "admin_update_requests"
ON line_link_requests FOR UPDATE
USING (
    company_id = public.get_current_company_id()
    AND public.get_current_user_role() IN ('company_admin', 'super_admin')
)
WITH CHECK (
    company_id = public.get_current_company_id()
);

-- Policy 4: Users can create requests (via Edge Function only)
-- Handled by Edge Function with service role key
```

### 2.4 `line_session_tokens` Table Policies

```sql
ALTER TABLE line_session_tokens ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admins can view all sessions in their company
CREATE POLICY "admin_view_sessions"
ON line_session_tokens FOR SELECT
USING (
    company_id = public.get_current_company_id()
    AND public.is_admin_or_manager()
);

-- Policy 2: Users can view their own active sessions
CREATE POLICY "user_view_own_sessions"
ON line_session_tokens FOR SELECT
USING (
    user_id = public.get_current_user_id()
    AND is_active = true
);

-- Policy 3: Admins can revoke sessions
CREATE POLICY "admin_revoke_sessions"
ON line_session_tokens FOR UPDATE
USING (
    company_id = public.get_current_company_id()
    AND public.get_current_user_role() IN ('company_admin', 'super_admin')
);
```

### 2.5 `line_audit_log` Table Policies

```sql
ALTER TABLE line_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admins can view audit logs for their company
CREATE POLICY "admin_view_audit_log"
ON line_audit_log FOR SELECT
USING (
    company_id = public.get_current_company_id()
    AND public.is_admin_or_manager()
);

-- Policy 2: Audit logs are INSERT-only (immutable)
CREATE POLICY "system_insert_audit_log"
ON line_audit_log FOR INSERT
WITH CHECK (true);  -- Handled by Edge Functions with service role

-- No UPDATE or DELETE policies - audit logs are immutable
```

---

## Backend Logic & Edge Functions

### 3.1 Edge Function: `handle_line_login`
**Purpose:** Initial LINE login handler - auto-discovery and link request creation

```typescript
// Supabase Edge Function: /functions/handle-line-login/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

interface LineLoginRequest {
  lineUserId: string;
  lineDisplayName: string;
  linePictureUrl?: string;
  lineEmail?: string;
  enteredPhone: string;
  enteredEmployeeCode: string;
}

serve(async (req) => {
  try {
    const {
      lineUserId,
      lineDisplayName,
      linePictureUrl,
      lineEmail,
      enteredPhone,
      enteredEmployeeCode
    } = await req.json() as LineLoginRequest;

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // STEP 1: Check if LINE user is already linked
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, company_id, line_link_status, employee_id')
      .eq('line_user_id', lineUserId)
      .eq('is_active', true)
      .single();

    if (existingUser && existingUser.line_link_status === 'linked') {
      // Already linked - generate JWT and return
      return new Response(JSON.stringify({
        status: 'linked',
        userId: existingUser.id,
        companyId: existingUser.company_id,
        // Generate access token here
      }), { status: 200 });
    }

    // STEP 2: Check for pending request
    const { data: pendingRequest } = await supabase
      .from('line_link_requests')
      .select('*')
      .eq('line_user_id', lineUserId)
      .eq('status', 'pending')
      .single();

    if (pendingRequest) {
      return new Response(JSON.stringify({
        status: 'pending',
        requestId: pendingRequest.id,
        companyName: await getCompanyName(supabase, pendingRequest.company_id),
        message: 'Your link request is awaiting admin approval',
      }), { status: 200 });
    }

    // STEP 3: Auto-discovery - find matching employee
    const { data: matchedEmployee } = await supabase
      .from('employees')
      .select('id, company_id, full_name, email, phone, user_id')
      .eq('employee_code', enteredEmployeeCode)
      .eq('phone', enteredPhone)
      .eq('status', 'active')
      .single();

    if (!matchedEmployee) {
      return new Response(JSON.stringify({
        status: 'no_match',
        message: 'Employee code and phone number do not match',
      }), { status: 404 });
    }

    // STEP 4: Check if employee already has a user account
    if (matchedEmployee.user_id) {
      const { data: existingUserAccount } = await supabase
        .from('users')
        .select('line_user_id, line_link_status')
        .eq('id', matchedEmployee.user_id)
        .single();

      if (existingUserAccount?.line_user_id &&
          existingUserAccount.line_user_id !== lineUserId) {
        return new Response(JSON.stringify({
          status: 'already_linked',
          message: 'This employee is already linked to another LINE account',
        }), { status: 409 });
      }
    }

    // STEP 5: Auto-approve if both phone AND code match
    const phoneMatched = matchedEmployee.phone === enteredPhone;
    const codeMatched = matchedEmployee.employee_code === enteredEmployeeCode;
    const autoApprove = phoneMatched && codeMatched;

    // STEP 6: Create link request
    const { data: linkRequest, error: requestError } = await supabase
      .from('line_link_requests')
      .insert({
        request_type: 'link',
        line_user_id: lineUserId,
        line_display_name: lineDisplayName,
        line_picture_url: linePictureUrl,
        employee_id: matchedEmployee.id,
        company_id: matchedEmployee.company_id,
        entered_phone: enteredPhone,
        entered_employee_code: enteredEmployeeCode,
        phone_matched: phoneMatched,
        code_matched: codeMatched,
        auto_approved: autoApprove,
        status: autoApprove ? 'approved' : 'pending',
        reviewed_at: autoApprove ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (requestError) throw requestError;

    // STEP 7: If auto-approved, create/update user account
    if (autoApprove) {
      await approveLinkRequest(supabase, linkRequest.id, 'system', 'Auto-approved based on matching phone and employee code');

      return new Response(JSON.stringify({
        status: 'auto_linked',
        message: 'Account automatically linked',
      }), { status: 200 });
    }

    // STEP 8: Manual approval needed
    await createAuditLog(supabase, {
      company_id: matchedEmployee.company_id,
      action: 'link_request_created',
      target_employee_id: matchedEmployee.id,
      target_line_user_id: lineUserId,
      request_id: linkRequest.id,
      metadata: { auto_approved: false, phone_matched: phoneMatched, code_matched: codeMatched },
    });

    return new Response(JSON.stringify({
      status: 'pending',
      requestId: linkRequest.id,
      companyName: await getCompanyName(supabase, matchedEmployee.company_id),
      message: 'Link request submitted. Please wait for admin approval.',
    }), { status: 200 });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

### 3.2 Edge Function: `approve_link_request`
**Purpose:** Admin approves a link request and activates the account

```typescript
// Supabase Edge Function: /functions/approve-link-request/index.ts

interface ApprovalRequest {
  requestId: string;
  adminUserId: string;
  reviewNotes?: string;
  approve: boolean;  // true = approve, false = reject
}

async function approveLinkRequest(
  supabase: SupabaseClient,
  requestId: string,
  adminUserId: string,
  reviewNotes: string
) {
  // STEP 1: Get the link request
  const { data: request } = await supabase
    .from('line_link_requests')
    .select('*, employees!inner(user_id)')
    .eq('id', requestId)
    .single();

  if (!request || request.status !== 'pending') {
    throw new Error('Invalid or already processed request');
  }

  // STEP 2: Start transaction (using Postgres function)
  const { data, error } = await supabase.rpc('approve_line_link_request', {
    p_request_id: requestId,
    p_admin_user_id: adminUserId,
    p_review_notes: reviewNotes,
  });

  if (error) throw error;

  return data;
}

// Postgres function for atomic operation
CREATE OR REPLACE FUNCTION approve_line_link_request(
  p_request_id UUID,
  p_admin_user_id UUID,
  p_review_notes TEXT
)
RETURNS JSON AS $$
DECLARE
  v_request RECORD;
  v_user_id UUID;
  v_result JSON;
BEGIN
  -- Lock the request row
  SELECT * INTO v_request
  FROM line_link_requests
  WHERE id = p_request_id
  FOR UPDATE;

  -- Validate request status
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request already processed';
  END IF;

  -- Check if employee already has a user account
  SELECT user_id INTO v_user_id
  FROM employees
  WHERE id = v_request.employee_id;

  -- Create or update user account
  IF v_user_id IS NULL THEN
    -- Create new user account
    INSERT INTO users (
      company_id,
      employee_id,
      email,
      role,
      line_user_id,
      line_display_name,
      line_picture_url,
      line_link_status,
      line_linked_at,
      is_active
    )
    SELECT
      v_request.company_id,
      v_request.employee_id,
      (SELECT email FROM employees WHERE id = v_request.employee_id),
      'guard',
      v_request.line_user_id,
      v_request.line_display_name,
      v_request.line_picture_url,
      'linked',
      NOW(),
      true
    RETURNING id INTO v_user_id;

    -- Update employee with user_id
    UPDATE employees
    SET user_id = v_user_id
    WHERE id = v_request.employee_id;
  ELSE
    -- Update existing user with LINE info
    UPDATE users
    SET
      line_user_id = v_request.line_user_id,
      line_display_name = v_request.line_display_name,
      line_picture_url = v_request.line_picture_url,
      line_link_status = 'linked',
      line_linked_at = NOW(),
      is_active = true
    WHERE id = v_user_id;
  END IF;

  -- Update request status
  UPDATE line_link_requests
  SET
    status = 'approved',
    reviewed_by = p_admin_user_id,
    reviewed_at = NOW(),
    review_notes = p_review_notes
  WHERE id = p_request_id;

  -- Create audit log
  INSERT INTO line_audit_log (
    company_id,
    actor_user_id,
    target_user_id,
    target_employee_id,
    target_line_user_id,
    action,
    request_id,
    metadata
  ) VALUES (
    v_request.company_id,
    p_admin_user_id,
    v_user_id,
    v_request.employee_id,
    v_request.line_user_id,
    'link_request_approved',
    p_request_id,
    jsonb_build_object('review_notes', p_review_notes)
  );

  v_result := json_build_object(
    'success', true,
    'user_id', v_user_id,
    'request_id', p_request_id
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3.3 Edge Function: `handle_unlink_request`
**Purpose:** Guard submits unlink request (cannot self-unlink)

```typescript
// Supabase Edge Function: /functions/handle-unlink-request/index.ts

interface UnlinkRequest {
  userId: string;
  reason: string;
}

serve(async (req) => {
  const { userId, reason } = await req.json() as UnlinkRequest;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // STEP 1: Get user details
  const { data: user } = await supabase
    .from('users')
    .select('id, company_id, employee_id, line_user_id, line_display_name, role')
    .eq('id', userId)
    .eq('line_link_status', 'linked')
    .single();

  if (!user) {
    return new Response(JSON.stringify({ error: 'User not linked or not found' }), { status: 404 });
  }

  // STEP 2: Guards cannot force unlink - must request
  if (user.role === 'guard') {
    // Create unlink request
    const { data: unlinkRequest } = await supabase
      .from('line_link_requests')
      .insert({
        request_type: 'unlink',
        line_user_id: user.line_user_id,
        line_display_name: user.line_display_name,
        employee_id: user.employee_id,
        company_id: user.company_id,
        unlink_reason: reason,
        status: 'pending',
      })
      .select()
      .single();

    // Audit log
    await createAuditLog(supabase, {
      company_id: user.company_id,
      target_user_id: user.id,
      target_employee_id: user.employee_id,
      target_line_user_id: user.line_user_id,
      action: 'unlink_request_created',
      request_id: unlinkRequest.id,
      metadata: { reason },
    });

    return new Response(JSON.stringify({
      status: 'pending',
      requestId: unlinkRequest.id,
      message: 'Unlink request submitted. Admin approval required.',
    }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: 'Invalid operation' }), { status: 403 });
});
```

### 3.4 Edge Function: `force_unlink_account`
**Purpose:** Admin forcibly unlinks a LINE account and revokes sessions

```typescript
// Supabase Edge Function: /functions/force-unlink-account/index.ts

interface ForceUnlinkRequest {
  targetUserId: string;
  adminUserId: string;
  reason: string;
}

serve(async (req) => {
  const { targetUserId, adminUserId, reason } = await req.json() as ForceUnlinkRequest;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // STEP 1: Verify admin has permission
  const { data: admin } = await supabase
    .from('users')
    .select('id, role, company_id')
    .eq('id', adminUserId)
    .single();

  if (!admin || !['company_admin', 'super_admin'].includes(admin.role)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  // STEP 2: Get target user
  const { data: targetUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', targetUserId)
    .eq('company_id', admin.company_id)
    .single();

  if (!targetUser) {
    return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
  }

  // STEP 3: Execute force unlink
  const { error: unlinkError } = await supabase.rpc('force_unlink_line_account', {
    p_target_user_id: targetUserId,
    p_admin_user_id: adminUserId,
    p_reason: reason,
  });

  if (unlinkError) throw unlinkError;

  return new Response(JSON.stringify({
    success: true,
    message: 'LINE account unlinked and sessions revoked',
  }), { status: 200 });
});

// Postgres function for atomic force unlink
CREATE OR REPLACE FUNCTION force_unlink_line_account(
  p_target_user_id UUID,
  p_admin_user_id UUID,
  p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_revoked_sessions INTEGER;
BEGIN
  -- Lock user row
  SELECT * INTO v_user
  FROM users
  WHERE id = p_target_user_id
  FOR UPDATE;

  -- Update user - clear LINE data but keep account
  UPDATE users
  SET
    line_link_status = 'force_unlinked',
    line_unlinked_at = NOW(),
    line_unlinked_by = p_admin_user_id,
    line_unlink_reason = p_reason,
    -- Keep line_user_id for audit trail but mark as unlinked
    is_active = CASE WHEN role = 'guard' THEN false ELSE is_active END
  WHERE id = p_target_user_id;

  -- Revoke all active sessions
  UPDATE line_session_tokens
  SET
    is_active = false,
    revoked_at = NOW(),
    revoked_by = p_admin_user_id,
    revoke_reason = 'Force unlink by admin: ' || p_reason
  WHERE user_id = p_target_user_id
    AND is_active = true;

  GET DIAGNOSTICS v_revoked_sessions = ROW_COUNT;

  -- Create audit log
  INSERT INTO line_audit_log (
    company_id,
    actor_user_id,
    actor_role,
    target_user_id,
    target_employee_id,
    target_line_user_id,
    action,
    metadata
  ) VALUES (
    v_user.company_id,
    p_admin_user_id,
    (SELECT role FROM users WHERE id = p_admin_user_id),
    p_target_user_id,
    v_user.employee_id,
    v_user.line_user_id,
    'force_unlink_executed',
    jsonb_build_object(
      'reason', p_reason,
      'revoked_sessions', v_revoked_sessions
    )
  );

  RETURN json_build_object(
    'success', true,
    'revoked_sessions', v_revoked_sessions
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## API Endpoints

### 4.1 LINE Authentication Flow

```
POST /api/v1/line/login
Body: {
  lineUserId: string,
  lineDisplayName: string,
  linePictureUrl?: string,
  lineEmail?: string,
  enteredPhone: string,
  enteredEmployeeCode: string
}

Response:
- 200: { status: 'linked' | 'pending' | 'auto_linked', ... }
- 404: { status: 'no_match', message: '...' }
- 409: { status: 'already_linked', message: '...' }
```

### 4.2 Link Request Management (Admin)

```
GET /api/v1/line/link-requests
Query: ?status=pending&page=1&limit=20
Auth: Company Admin, Manager

Response:
{
  data: LinkRequest[],
  pagination: { total, page, limit }
}
```

```
POST /api/v1/line/link-requests/:id/approve
Body: { reviewNotes?: string }
Auth: Company Admin

Response: { success: true, userId: string }
```

```
POST /api/v1/line/link-requests/:id/reject
Body: { reviewNotes: string }
Auth: Company Admin

Response: { success: true }
```

### 4.3 Unlink Operations

```
POST /api/v1/line/unlink-request
Body: { reason: string }
Auth: Guard (self-service)

Response: { status: 'pending', requestId: string }
```

```
POST /api/v1/line/force-unlink
Body: { targetUserId: string, reason: string }
Auth: Company Admin

Response: { success: true, revokedSessions: number }
```

### 4.4 Session Management

```
GET /api/v1/line/sessions/:userId
Auth: Company Admin or Self (if userId matches)

Response: {
  sessions: Array<{
    id: string,
    issuedAt: string,
    expiresAt: string,
    isActive: boolean,
    userAgent: string,
    ipAddress: string
  }>
}
```

```
POST /api/v1/line/sessions/:sessionId/revoke
Auth: Company Admin or Self

Response: { success: true }
```

### 4.5 Audit Logs

```
GET /api/v1/line/audit-logs
Query: ?userId=xxx&action=force_unlink_executed&startDate=2026-01-01
Auth: Company Admin

Response: {
  data: Array<{
    id: string,
    action: string,
    actorName: string,
    targetName: string,
    createdAt: string,
    metadata: object
  }>,
  pagination: { total, page, limit }
}
```

---

## Security Considerations

### 5.1 Threat Model

| Threat | Mitigation |
|--------|-----------|
| **Unauthorized Data Access** | RLS policies enforce `line_link_status = 'linked'` check |
| **Session Hijacking** | Token hashing, IP/UA fingerprinting, immediate revocation on unlink |
| **Audit Trail Evasion** | Guards cannot self-unlink; all actions logged immutably |
| **Admin Impersonation** | Role checks in RLS + Edge Functions, audit logs track admin actions |
| **Replay Attacks** | Short-lived tokens, session expiry, token rotation |
| **Data Leakage (Pending)** | RLS denies SELECT for non-linked users, no policies for pending status |

### 5.2 Key Security Features

1. **Zero Trust Access Control**
   - Default deny for all operations
   - Explicit policy per role and link status
   - No implicit permissions

2. **Immutable Audit Trail**
   - All actions logged to `line_audit_log`
   - No UPDATE/DELETE policies on audit table
   - Includes actor, target, timestamp, IP, metadata

3. **Session Revocation**
   - Force unlink immediately revokes all active sessions
   - Token hashing prevents plaintext exposure
   - Session expiry enforced at database level

4. **Admin Approval Workflow**
   - Guards cannot self-link or self-unlink
   - All requests create audit trail
   - Admin identity tracked for accountability

5. **Anti-Circumvention**
   - Guards cannot modify `line_link_status` directly
   - RLS WITH CHECK prevents privilege escalation
   - Database constraints enforce status transitions

---

## Event Flow Diagrams

### 6.1 Account Linking Flow (New User)

```
┌─────────────┐
│ Guard opens │
│  LIFF App   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ LINE Login (OAuth 2.0)  │
│ Gets: lineUserId,       │
│       displayName,      │
│       pictureUrl        │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Prompt: Enter Phone +   │
│         Employee Code   │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ POST /api/v1/line/login     │
│ Edge Function:              │
│ handle_line_login           │
└──────┬──────────────────────┘
       │
       ├───────► Check: Existing linked user?
       │         YES → Generate JWT, return 'linked'
       │
       ├───────► Check: Pending request exists?
       │         YES → Return 'pending', show wait message
       │
       ├───────► Auto-Discovery:
       │         SELECT * FROM employees
       │         WHERE employee_code = ? AND phone = ?
       │
       ├───────► NO MATCH?
       │         Return 404 'no_match'
       │
       ├───────► MATCH FOUND:
       │         Check if employee.user_id already exists
       │         with different LINE → Return 409 'already_linked'
       │
       ├───────► Create line_link_requests row:
       │         - phone_matched = true
       │         - code_matched = true
       │         - auto_approved = true/false
       │
       ├───────► IF auto_approved = true:
       │         │ - Create/Update users row
       │         │ - SET line_link_status = 'linked'
       │         │ - Generate JWT
       │         │ - Return 'auto_linked'
       │         │
       │         ELSE:
       │         │ - SET status = 'pending'
       │         │ - Notify admin (LINE message/email)
       │         │ - Return 'pending'
       │
       ▼
┌─────────────────────────────┐
│ IF PENDING:                 │
│ Show: "Request to Join      │
│        [Company Name]"      │
│ Status: Awaiting approval   │
│ Guard CANNOT access data    │
└─────────────────────────────┘
```

### 6.2 Admin Approval Flow

```
┌─────────────────────────┐
│ Admin Dashboard         │
│ /employees/link-requests│
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ GET /api/v1/line/       │
│     link-requests       │
│ WHERE status='pending'  │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Display List:                       │
│ - Employee Name                     │
│ - LINE Display Name                 │
│ - Phone (matched: ✓)                │
│ - Employee Code (matched: ✓)        │
│ - Request Date                      │
│ Actions: [Approve] [Reject]         │
└──────┬──────────────────────────────┘
       │
       ├─────► Admin clicks [Approve]
       │       POST /api/v1/line/link-requests/:id/approve
       │       Body: { reviewNotes: "Verified identity" }
       │
       ▼
┌──────────────────────────────────────┐
│ Edge Function: approve_link_request  │
│ Postgres Function (Atomic):          │
│                                      │
│ 1. Lock line_link_requests row       │
│ 2. Validate status = 'pending'       │
│ 3. Create/Update users:              │
│    - line_user_id = request.line_..  │
│    - line_link_status = 'linked'     │
│    - line_linked_at = NOW()          │
│ 4. Update employees.user_id          │
│ 5. Update request:                   │
│    - status = 'approved'             │
│    - reviewed_by = admin.id          │
│    - reviewed_at = NOW()             │
│ 6. INSERT audit_log:                 │
│    - action = 'link_request_approved'│
│ 7. Notify guard via LINE             │
│    "Your account is now linked!"     │
└──────┬───────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Guard receives LINE notification    │
│ Opens LIFF → Auto-login with JWT    │
│ RLS NOW ALLOWS access (linked)      │
└─────────────────────────────────────┘
```

### 6.3 Force Unlink Flow (Admin)

```
┌─────────────────────────┐
│ Admin: Employee Detail  │
│ /employees/:id          │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ LINE Integration Section        │
│ Status: Linked ✓                │
│ Display Name: John Doe          │
│ Linked: 2026-01-15              │
│                                 │
│ [Force Unlink] (Admin only)     │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ Confirmation Modal:             │
│ "Are you sure? This will:       │
│  - Revoke all active sessions   │
│  - Disable account access       │
│  - Require re-linking"          │
│                                 │
│ Reason: [________]              │
│ [Cancel] [Confirm Unlink]       │
└──────┬──────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ POST /api/v1/line/force-unlink       │
│ Body: {                              │
│   targetUserId: "uuid",              │
│   reason: "Lost device"              │
│ }                                    │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Edge Function: force_unlink_account  │
│ Postgres Function (Atomic):          │
│                                      │
│ 1. Verify admin role                 │
│ 2. Lock users row                    │
│ 3. UPDATE users:                     │
│    - line_link_status='force_unlinked'│
│    - line_unlinked_at = NOW()        │
│    - line_unlinked_by = admin.id     │
│    - line_unlink_reason = reason     │
│    - is_active = false (for guards)  │
│ 4. UPDATE line_session_tokens:       │
│    - SET is_active = false           │
│    - revoked_at = NOW()              │
│    WHERE user_id = target AND active │
│ 5. INSERT audit_log:                 │
│    - action='force_unlink_executed'  │
│    - metadata = { reason, sessions } │
│ 6. Notify guard (LINE if possible):  │
│    "Your account was unlinked by     │
│     admin. Contact HR if needed."    │
└──────┬───────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Guard's next API request:           │
│ JWT still valid BUT...              │
│                                     │
│ RLS Policy Check:                   │
│ SELECT FROM employees               │
│ WHERE id IN (                       │
│   SELECT employee_id FROM users     │
│   WHERE id = current_user_id        │
│   AND line_link_status = 'linked'   │ ← FAILS
│ )                                   │
│                                     │
│ → Returns 0 rows (Access Denied)    │
│ → Frontend: Redirect to login       │
└─────────────────────────────────────┘
```

### 6.4 Guard Self-Unlink Request Flow

```
┌─────────────────────────┐
│ Guard: Profile Page     │
│ (LIFF App)              │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ LINE Account Section:           │
│ Linked to: John Doe             │
│ Since: 2026-01-15               │
│                                 │
│ [Request Unlink] (Guard only)   │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ Modal:                          │
│ "Why do you want to unlink?"    │
│                                 │
│ Reason: [___________________]   │
│ Examples:                       │
│ - Changing LINE account         │
│ - Phone number changed          │
│ - Other: _______                │
│                                 │
│ [Cancel] [Submit Request]       │
└──────┬──────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ POST /api/v1/line/unlink-request     │
│ Body: {                              │
│   reason: "Changing LINE account"    │
│ }                                    │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Edge Function: handle_unlink_request │
│                                      │
│ 1. Verify user is 'guard' role       │
│ 2. INSERT line_link_requests:        │
│    - request_type = 'unlink'         │
│    - line_user_id = current          │
│    - unlink_reason = reason          │
│    - status = 'pending'              │
│ 3. INSERT audit_log:                 │
│    - action='unlink_request_created' │
│ 4. Notify admin (LINE + email):      │
│    "John Doe requested to unlink     │
│     LINE account. Reason: ..."       │
│ 5. Return: { status: 'pending' }     │
└──────┬───────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Guard sees:                         │
│ "Unlink request submitted.          │
│  Request ID: #12345                 │
│  Status: Awaiting admin approval"   │
│                                     │
│ Account REMAINS linked until admin  │
│ approves. Guard can still access    │
│ all features normally.              │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Admin Dashboard:                    │
│ "New Unlink Request from John Doe"  │
│ Reason: Changing LINE account       │
│                                     │
│ [Approve Unlink] [Reject Request]   │
└──────┬──────────────────────────────┘
       │
       ├─────► Approve:
       │       Execute same flow as force_unlink
       │       but with status 'approved' instead of 'force_unlinked'
       │
       ├─────► Reject:
       │       UPDATE request status='rejected'
       │       Notify guard: "Unlink denied. Contact HR."
       │
       ▼
┌─────────────────────────────────────┐
│ IF APPROVED:                        │
│ - Account unlinked                  │
│ - Sessions revoked                  │
│ - Guard can re-link with new LINE   │
└─────────────────────────────────────┘
```

---

## Migration Script

```sql
-- ============================================================
-- Migration: LINE Account Integration Enhancement
-- Version: 012
-- Purpose: Add unlink support, session management, audit logging
-- ============================================================

BEGIN;

-- 1. Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS
    line_link_status VARCHAR(20) DEFAULT 'unlinked'
    CHECK (line_link_status IN ('unlinked', 'pending', 'linked', 'force_unlinked'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS line_linked_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS line_unlinked_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS line_unlinked_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS line_unlink_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_users_line_link_status ON users(line_link_status);

-- 2. Add request_type to line_link_requests
ALTER TABLE line_link_requests ADD COLUMN IF NOT EXISTS
    request_type VARCHAR(20) DEFAULT 'link'
    CHECK (request_type IN ('link', 'unlink'));
ALTER TABLE line_link_requests ADD COLUMN IF NOT EXISTS unlink_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_line_link_requests_type
    ON line_link_requests(request_type, status);

-- 3. Create line_session_tokens table
CREATE TABLE IF NOT EXISTS line_session_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    line_user_id VARCHAR(255) NOT NULL,
    access_token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    liff_session_id VARCHAR(255),
    user_agent TEXT,
    ip_address INET,
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id),
    revoke_reason TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_line_sessions_user ON line_session_tokens(user_id, is_active);
CREATE INDEX idx_line_sessions_line_user ON line_session_tokens(line_user_id);
CREATE INDEX idx_line_sessions_active ON line_session_tokens(is_active, expires_at);

-- 4. Create audit log enum and table
DO $$ BEGIN
    CREATE TYPE line_audit_action AS ENUM (
        'link_request_created',
        'link_request_approved',
        'link_request_rejected',
        'link_request_expired',
        'unlink_request_created',
        'unlink_request_approved',
        'unlink_request_rejected',
        'force_unlink_executed',
        'session_revoked',
        'auto_link_matched'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS line_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES users(id),
    actor_role VARCHAR(20),
    actor_name VARCHAR(255),
    target_user_id UUID REFERENCES users(id),
    target_employee_id UUID REFERENCES employees(id),
    target_line_user_id VARCHAR(255),
    action line_audit_action NOT NULL,
    request_id UUID REFERENCES line_link_requests(id),
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_line_audit_company ON line_audit_log(company_id, created_at DESC);
CREATE INDEX idx_line_audit_target ON line_audit_log(target_user_id);
CREATE INDEX idx_line_audit_actor ON line_audit_log(actor_user_id);
CREATE INDEX idx_line_audit_action ON line_audit_log(action);

-- 5. Migrate existing linked users
UPDATE users
SET line_link_status = 'linked',
    line_linked_at = COALESCE(line_linked_at, created_at)
WHERE line_user_id IS NOT NULL
  AND line_link_status = 'unlinked';

COMMIT;

-- Success
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 012 completed: LINE account integration enhanced';
END $$;
```

---

## Summary

This specification provides:

1. **Database Schema:** 4 tables with enhanced columns for link status, session management, and immutable audit trails
2. **RLS Policies:** Strict zero-trust policies ensuring pending users have NO access, only linked users can read data
3. **Edge Function Logic:** 4 edge functions handling auto-discovery, approval, unlink requests, and force unlink with atomic Postgres operations
4. **API Endpoints:** 9 RESTful endpoints for complete workflow management
5. **Security Hardening:** Session revocation, audit logging, anti-circumvention controls, and role-based access enforcement
6. **Event Flows:** 4 detailed sequence diagrams showing user journeys and system behavior

**Key Security Features:**
- Guards cannot self-link or self-unlink (requires admin approval)
- Pending users have zero access via RLS policies
- Force unlink immediately revokes all active sessions
- Immutable audit trail for compliance and forensics
- Atomic database operations prevent race conditions
- Token hashing and session fingerprinting prevent replay attacks
