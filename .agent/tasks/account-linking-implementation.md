# Account Linking Implementation Plan

## Overview
Implement "Option B: Employee Code + Phone" matching for LINE account linking.

## Flow
1. User logs in with LINE
2. User enters Employee Code + Phone Number
3. System matches against `employees` table
4. If Employee Code + Phone match → **Auto-link** (instant)
5. If partial match → **Admin approval required**

---

## Tasks

### Phase 1: Database Schema

- [ ] Create `line_link_request_status` enum
- [ ] Create `line_link_requests` table for tracking requests
- [ ] Add indices for performance

### Phase 2: Backend API

- [ ] `POST /auth/line/auto-link` - Try auto-link with employee code + phone
  - Input: `{ idToken, liffId, employeeCode, phone }`
  - Logic:
    - Verify LINE token
    - Find employee by code + phone
    - If perfect match → Create user, link LINE, return tokens
    - If not found → Return error
    
- [ ] `GET /link-requests` - Admin: Get pending link requests for company
- [ ] `POST /link-requests/:id/approve` - Admin: Approve a link request
- [ ] `POST /link-requests/:id/reject` - Admin: Reject a link request

### Phase 3: Frontend

- [ ] Update `LiffLinkEmployeePage` to call new auto-link endpoint
- [ ] Remove company slug field (detect from employee match)
- [ ] Show appropriate error messages
- [ ] Add admin UI for pending requests (optional)

---

## Database Schema

```sql
-- Migration: 011_add_line_link_requests.sql

-- Link request status
CREATE TYPE line_link_request_status AS ENUM (
    'pending',
    'approved', 
    'rejected',
    'expired',
    'cancelled'
);

-- LINE Account Link Requests
CREATE TABLE line_link_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- LINE user info
    line_user_id VARCHAR(255) NOT NULL,
    line_display_name VARCHAR(255),
    line_picture_url TEXT,
    
    -- Employee match
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Verification data
    entered_phone VARCHAR(20) NOT NULL,
    entered_employee_code VARCHAR(50) NOT NULL,
    phone_matched BOOLEAN DEFAULT false,
    
    -- Status
    status line_link_request_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    -- Timestamps
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_line_link_requests_company ON line_link_requests(company_id, status);
CREATE INDEX idx_line_link_requests_employee ON line_link_requests(employee_id);
CREATE INDEX idx_line_link_requests_line_user ON line_link_requests(line_user_id);
CREATE INDEX idx_line_link_requests_pending ON line_link_requests(company_id) 
    WHERE status = 'pending';
```

---

## API Specifications

### POST /auth/line/auto-link

**Request:**
```json
{
  "idToken": "line-id-token",
  "liffId": "liff-id",
  "employeeCode": "EMP001",
  "phone": "0891234567"
}
```

**Response (Success - Auto-linked):**
```json
{
  "success": true,
  "data": {
    "linked": true,
    "user": { ... },
    "tokens": { "accessToken": "...", "refreshToken": "..." }
  }
}
```

**Response (Pending Approval):**
```json
{
  "success": true,
  "data": {
    "linked": false,
    "pendingApproval": true,
    "requestId": "uuid",
    "message": "Phone number doesn't match. Request sent for admin approval."
  }
}
```

**Response (Not Found):**
```json
{
  "success": false,
  "error": {
    "code": "EMPLOYEE_NOT_FOUND",
    "message": "Employee code not found"
  }
}
```

---

## Security Considerations

1. **Rate Limiting**: Max 5 link attempts per LINE user per hour
2. **Phone Normalization**: Strip spaces, dashes, leading 0/+66
3. **Already Linked**: Reject if LINE user is already linked
4. **Employee Already Linked**: Reject if employee already has a user
5. **Audit Logging**: Log all link attempts

---

## Files to Create/Modify

### Create:
- `backend/supabase/migrations/011_add_line_link_requests.sql`
- `backend/src/services/line-linking.service.ts`
- `backend/src/routes/link-requests.routes.ts`

### Modify:
- `backend/src/routes/auth.routes.ts` - Add auto-link endpoint
- `frontend/src/pages/liff/LiffLinkEmployeePage.tsx` - Update form
- `frontend/src/components/layout/LiffLinkLayout.tsx` - Add auto-link method
- `frontend/src/services/liff-auth.service.ts` - Add autoLinkEmployee method
