# LINE Account Link Management - Backend Implementation

## Overview

This module implements the secure LINE account integration system with strict access control, preventing unauthorized access while maintaining data integrity and audit trails.

## Architecture

### Module Structure

```
backend/src/modules/line/
├── line-link.types.ts       # TypeScript types for link management
├── line-link.service.ts     # Business logic layer
├── line-link.controller.ts  # HTTP request handlers
├── line-link.routes.ts      # Express routes
├── line-link.validation.ts  # Zod validation schemas
└── LINE_LINK_README.md      # This file
```

### Database Layer

The following Postgres functions are available (created by migrations):

- `approve_line_link_request(request_id, admin_user_id, review_notes)` - Approve link with ACID
- `reject_line_link_request(request_id, admin_user_id, review_notes)` - Reject link request
- `force_unlink_line_account(target_user_id, admin_user_id, reason, ip, user_agent)` - Admin force unlink
- `approve_unlink_request(request_id, admin_user_id, review_notes, ip, user_agent)` - Approve guard unlink
- `revoke_line_session(session_id, admin_user_id, reason)` - Revoke single session
- `cleanup_expired_line_data()` - Maintenance function

## API Endpoints

### 🔓 Public Endpoints (No Auth Required)

#### `POST /api/v1/line/login`
**Purpose:** Handle LINE login with auto-discovery and link request creation

**Request Body:**
```json
{
  "lineUserId": "U1234567890abcdef",
  "lineDisplayName": "John Doe",
  "linePictureUrl": "https://profile.line-scdn.net/...",
  "lineEmail": "john@example.com",
  "enteredPhone": "0812345678",
  "enteredEmployeeCode": "EMP001"
}
```

**Response Scenarios:**

**1. Already Linked:**
```json
{
  "success": true,
  "data": {
    "status": "linked",
    "userId": "uuid",
    "companyId": "uuid",
    "message": "Already linked"
  }
}
```

**2. Auto-Linked (Perfect Match):**
```json
{
  "success": true,
  "data": {
    "status": "auto_linked",
    "userId": "uuid",
    "companyId": "uuid",
    "message": "Account automatically linked"
  }
}
```

**3. Pending Approval:**
```json
{
  "success": true,
  "data": {
    "status": "pending",
    "requestId": "uuid",
    "companyName": "ABC Security Co., Ltd.",
    "message": "Link request submitted. Please wait for admin approval."
  }
}
```

**4. No Match:**
```json
{
  "success": true,
  "data": {
    "status": "no_match",
    "message": "Employee code and phone number do not match"
  }
}
```

**5. Already Linked to Another Account:**
```json
{
  "success": true,
  "data": {
    "status": "already_linked",
    "message": "This employee is already linked to another LINE account"
  }
}
```

---

### 🔒 Admin Endpoints

#### `GET /api/v1/line/link-requests`
**Auth:** Company Admin, Manager
**Purpose:** List link requests with pagination and filters

**Query Parameters:**
- `status` - Filter by status (pending, approved, rejected, expired, cancelled)
- `requestType` - Filter by type (link, unlink)
- `employeeId` - Filter by employee
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "requestType": "link",
      "lineUserId": "U1234567890abcdef",
      "lineDisplayName": "John Doe",
      "linePictureUrl": "https://...",
      "employeeId": "uuid",
      "employeeName": "John Doe",
      "employeeCode": "EMP001",
      "companyId": "uuid",
      "companyName": "ABC Security",
      "enteredPhone": "0812345678",
      "enteredEmployeeCode": "EMP001",
      "phoneMatched": true,
      "codeMatched": true,
      "autoApproved": false,
      "unlinkReason": null,
      "status": "pending",
      "reviewedBy": null,
      "reviewedByName": null,
      "reviewedAt": null,
      "reviewNotes": null,
      "expiresAt": "2026-01-31T12:00:00Z",
      "createdAt": "2026-01-24T12:00:00Z",
      "updatedAt": "2026-01-24T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

#### `POST /api/v1/line/link-requests/:id/approve`
**Auth:** Company Admin
**Purpose:** Approve a link request and create/update user account

**Request Body:**
```json
{
  "reviewNotes": "Verified employee identity via photo ID"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "userId": "uuid",
    "requestId": "uuid",
    "auditId": "uuid"
  },
  "message": "Link request approved successfully"
}
```

**What Happens:**
1. Creates or updates user account with LINE information
2. Sets `line_link_status = 'linked'`
3. Updates `line_linked_at` timestamp
4. Updates request status to 'approved'
5. Creates audit log entry
6. Guard can now access all features

---

#### `POST /api/v1/line/link-requests/:id/reject`
**Auth:** Company Admin
**Purpose:** Reject a link request

**Request Body:**
```json
{
  "reviewNotes": "Unable to verify identity"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "requestId": "uuid",
    "auditId": "uuid"
  },
  "message": "Link request rejected"
}
```

---

#### `POST /api/v1/line/force-unlink`
**Auth:** Company Admin
**Purpose:** Immediately unlink LINE account and revoke all sessions

**Request Body:**
```json
{
  "targetUserId": "uuid",
  "reason": "Employee terminated - security breach"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "revokedSessions": 3,
    "auditId": "uuid"
  },
  "message": "LINE account unlinked successfully. 3 session(s) revoked."
}
```

**What Happens:**
1. Sets `line_link_status = 'force_unlinked'`
2. Records `line_unlinked_at`, `line_unlinked_by`, `line_unlink_reason`
3. Deactivates guard account (`is_active = false`)
4. Revokes ALL active sessions immediately
5. Creates audit log entry
6. Guard loses access immediately (RLS denies)

---

### 🛡️ Guard Endpoints

#### `POST /api/v1/line/unlink-request`
**Auth:** Guard (self-service)
**Purpose:** Submit unlink request (guards cannot self-unlink)

**Request Body:**
```json
{
  "reason": "I want to change my LINE account to a new phone number"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "requestType": "unlink",
    "status": "pending",
    "unlinkReason": "I want to change my LINE account...",
    ...
  },
  "message": "Unlink request submitted. Please wait for admin approval."
}
```

**Important:**
- Guard account REMAINS active until admin approves
- Guard can still access all features normally
- Admin receives notification to review

---

#### `POST /api/v1/line/link-requests/:id/approve-unlink`
**Auth:** Company Admin
**Purpose:** Approve guard-initiated unlink request

**Request Body:**
```json
{
  "reviewNotes": "Approved - guard switching to new LINE account"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "requestId": "uuid",
    "revokedSessions": 2,
    "auditId": "uuid"
  },
  "message": "Unlink request approved. Account unlinked and sessions revoked."
}
```

---

### 🔐 Session Management

#### `GET /api/v1/line/sessions`
**Auth:** Admin (all sessions) or Guard (own sessions)
**Purpose:** List LINE sessions

**Query Parameters:**
- `userId` - Filter by user (admin only)
- `isActive` - Filter by active status (boolean)
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "companyId": "uuid",
      "lineUserId": "U1234567890abcdef",
      "liffSessionId": "liff-session-123",
      "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0...)",
      "ipAddress": "203.0.113.42",
      "issuedAt": "2026-01-24T08:00:00Z",
      "expiresAt": "2026-01-31T08:00:00Z",
      "revokedAt": null,
      "revokedBy": null,
      "revokedByName": null,
      "revokeReason": null,
      "isActive": true,
      "createdAt": "2026-01-24T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 3,
    "totalPages": 1
  }
}
```

---

#### `POST /api/v1/line/sessions/:sessionId/revoke`
**Auth:** Company Admin
**Purpose:** Revoke a specific LINE session

**Request Body:**
```json
{
  "reason": "Suspicious activity detected"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "sessionId": "uuid",
    "auditId": "uuid"
  },
  "message": "Session revoked successfully"
}
```

---

### 📋 Audit Logs

#### `GET /api/v1/line/audit-logs`
**Auth:** Company Admin, Manager
**Purpose:** List LINE audit logs for compliance and forensics

**Query Parameters:**
- `userId` - Filter by target user
- `employeeId` - Filter by target employee
- `action` - Filter by action type
- `startDate` - Filter by date range (ISO 8601)
- `endDate` - Filter by date range (ISO 8601)
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 50, max: 100)

**Action Types:**
- `link_request_created`
- `link_request_approved`
- `link_request_rejected`
- `link_request_expired`
- `unlink_request_created`
- `unlink_request_approved`
- `unlink_request_rejected`
- `force_unlink_executed`
- `session_revoked`
- `auto_link_matched`
- `manual_relink`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "companyId": "uuid",
      "actorUserId": "admin-uuid",
      "actorRole": "company_admin",
      "actorName": "admin@company.com",
      "targetUserId": "guard-uuid",
      "targetUserName": "guard@example.com",
      "targetEmployeeId": "emp-uuid",
      "targetEmployeeName": "John Doe",
      "targetLineUserId": "U1234567890abcdef",
      "action": "force_unlink_executed",
      "requestId": null,
      "metadata": {
        "reason": "Employee terminated - security breach",
        "revoked_sessions": 3,
        "previous_status": "linked"
      },
      "ipAddress": "203.0.113.10",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-01-24T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 42,
    "totalPages": 1
  }
}
```

---

## Security Features

### 🔒 Row-Level Security (RLS)

**Critical Policies:**
1. **Pending users have ZERO access** - No SELECT policy grants access
2. **Guards can only SELECT if `line_link_status = 'linked'`**
3. **Guards cannot UPDATE their `line_link_status`** - Trigger prevents self-unlink
4. **Audit logs are immutable** - No UPDATE/DELETE policies

### 🛡️ Anti-Circumvention

**Database Trigger:**
```sql
CREATE TRIGGER trigger_prevent_guard_self_unlink
    BEFORE UPDATE OF line_link_status ON users
    FOR EACH ROW
    EXECUTE FUNCTION prevent_guard_self_unlink();
```

**Function Logic:**
- Blocks guards from changing their own `line_link_status`
- Only admins can set status to 'linked' or 'force_unlinked'
- Raises exception on violation

### ⚛️ ACID Compliance

All operations use atomic Postgres functions with:
- `FOR UPDATE` row-level locking
- Transaction isolation
- Rollback on error
- Consistent state guarantees

### 📝 Audit Trail

Every action creates an immutable audit log entry with:
- Actor (who performed the action)
- Target (who was affected)
- Action type
- Metadata (context-specific data)
- IP address and User-Agent
- Timestamp

---

## Error Handling

### Common Errors

**400 Bad Request:**
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [
      {
        "field": "reason",
        "message": "Reason must be at least 10 characters"
      }
    ]
  }
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": {
    "message": "Only guards can request unlink"
  }
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": {
    "message": "Link request not found"
  }
}
```

**409 Conflict:**
```json
{
  "success": false,
  "error": {
    "message": "Request already processed with status: approved"
  }
}
```

---

## Integration Guide

### Frontend Integration

```typescript
import { lineLinkService } from '@/services/line-link.service';

// Handle LINE login
const result = await lineLinkService.handleLineLogin({
  lineUserId: liff.getProfile().userId,
  lineDisplayName: liff.getProfile().displayName,
  linePictureUrl: liff.getProfile().pictureUrl,
  enteredPhone: phoneInput,
  enteredEmployeeCode: codeInput,
});

if (result.status === 'linked') {
  // Redirect to dashboard
} else if (result.status === 'pending') {
  // Show waiting screen
} else if (result.status === 'no_match') {
  // Show error message
}
```

### Admin Dashboard Integration

```typescript
// List pending requests
const { data, total } = await lineLinkService.listLinkRequests({
  status: 'pending',
  page: 1,
  pageSize: 20,
});

// Approve request
await lineLinkService.approveLinkRequest(requestId, {
  reviewNotes: 'Verified identity',
});

// Force unlink
await lineLinkService.forceUnlink({
  targetUserId: userId,
  reason: 'Employee terminated',
});
```

---

## Maintenance

### Cron Jobs

**Clean up expired sessions and requests:**
```typescript
// Run daily at 3 AM
import { supabase } from '@/config/database';

async function cleanupExpiredData() {
  const { data } = await supabase.rpc('cleanup_expired_line_data');
  console.log('Cleanup completed:', data);
}
```

### Monitoring

**Key Metrics to Monitor:**
- Pending link requests count
- Auto-approval rate
- Force unlink frequency
- Active sessions per user
- Audit log volume

**Alerts:**
- Multiple failed link attempts (potential brute force)
- High force unlink rate (review admin actions)
- Expired requests not cleaned up
- Session count per user exceeds threshold

---

## Testing

### Unit Tests

```typescript
import { lineLinkService } from './line-link.service';

describe('LineLinkService', () => {
  it('should auto-approve when phone and code match', async () => {
    const result = await lineLinkService.handleLineLogin({
      lineUserId: 'U123',
      lineDisplayName: 'Test User',
      enteredPhone: '0812345678',
      enteredEmployeeCode: 'EMP001',
    });

    expect(result.status).toBe('auto_linked');
  });

  it('should create pending request when only phone matches', async () => {
    const result = await lineLinkService.handleLineLogin({
      lineUserId: 'U123',
      lineDisplayName: 'Test User',
      enteredPhone: '0812345678',
      enteredEmployeeCode: 'WRONG',
    });

    expect(result.status).toBe('pending');
  });
});
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration -- line-link
```

---

## Performance Considerations

### Database Indices

All critical queries are indexed:
- `line_link_requests(company_id, status)`
- `line_link_requests(line_user_id)`
- `line_session_tokens(user_id, is_active)`
- `line_audit_log(company_id, created_at DESC)`

### Pagination

Always use pagination for list endpoints:
- Default page size: 20
- Max page size: 100 (requests/sessions), 50 (audit logs)

### Caching

Consider caching:
- Link request counts (TTL: 5 minutes)
- User link status (invalidate on status change)
- Audit log statistics (TTL: 1 hour)

---

## Troubleshooting

### Issue: User stuck in "pending" status

**Diagnosis:**
```sql
SELECT * FROM line_link_requests
WHERE line_user_id = 'U123' AND status = 'pending';
```

**Solution:**
Admin must approve or reject the request via dashboard.

---

### Issue: Force unlink not revoking sessions

**Diagnosis:**
```sql
SELECT * FROM line_session_tokens
WHERE user_id = 'user-uuid' AND is_active = true;
```

**Solution:**
Check if `force_unlink_line_account` function executed successfully. Verify audit log for errors.

---

## Security Checklist

- [ ] RLS policies enabled on all tables
- [ ] Trigger `prevent_guard_self_unlink` is active
- [ ] Audit logs are immutable (no UPDATE/DELETE policies)
- [ ] Admin endpoints require `company_admin` role
- [ ] Guard endpoints validate user is actually a guard
- [ ] IP address and User-Agent captured for all admin actions
- [ ] Session tokens are hashed before storage
- [ ] Expired sessions cleaned up daily

---

## Support

For issues or questions, contact the development team or open an issue on GitHub.
