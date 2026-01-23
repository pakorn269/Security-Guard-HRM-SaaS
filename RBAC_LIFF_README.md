# RBAC LIFF-Only Access Control

## Overview

This implementation provides role-based access control (RBAC) that restricts users with the `guard` role to LINE LIFF pages only, while explicitly blocking them from all non-LIFF web routes and APIs.

## Key Features

✅ **Backend Enforcement**: Middleware-based LIFF + role validation
✅ **Frontend Protection**: Route guards prevent unauthorized access
✅ **Token Binding**: JWT tokens include LIFF context to prevent replay attacks
✅ **Security Logging**: All access violations are logged
✅ **Edge Case Handling**: Comprehensive coverage of security scenarios

## Quick Start

### Backend Setup

1. **Apply LIFF detection globally** (in `server.ts`):
```typescript
import { detectLiffContext } from './middleware/index.js';
app.use(detectLiffContext);
```

2. **Protect guard endpoints** (LIFF only):
```typescript
import { authMiddleware, requireLiffOnly } from './middleware/index.js';

router.get('/shifts/my', authMiddleware, requireLiffOnly, getMyShifts);
```

3. **Protect admin endpoints** (web only, block guards):
```typescript
import { authMiddleware, requireNonLiff, requireManager } from './middleware/index.js';

router.get('/employees', authMiddleware, requireNonLiff, requireManager, getEmployees);
```

### Frontend Setup

1. **Update routes** (in `routes.tsx`):
```typescript
import { LiffProtectedRoute } from './components/auth/LiffProtectedRoute';
import { NonLiffProtectedRoute } from './components/auth/NonLiffProtectedRoute';

// LIFF routes (guards only)
{
  path: '/liff',
  element: <LiffProtectedRoute><LiffLayout /></LiffProtectedRoute>,
  children: [...]
}

// Web routes (admin/manager only)
{
  path: '/',
  element: <NonLiffProtectedRoute><DashboardLayout /></NonLiffProtectedRoute>,
  children: [...]
}
```

2. **Use LIFF hook**:
```typescript
import { useLiff } from './hooks/useLiff';

function MyLiffComponent() {
  const { isInClient, isReady, liffId } = useLiff();
  // Component logic...
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend                             │
│                                                           │
│  LIFF Routes (Guards) ←→ NonLiffProtectedRoute          │
│  Web Routes (Admins)  ←→ LiffProtectedRoute             │
│                                                           │
└────────────────────┬────────────────────────────────────┘
                     │ JWT with liffContext
                     │
┌────────────────────┼────────────────────────────────────┐
│                Backend                                   │
│                                                           │
│  detectLiffContext → requireLiffOnly → Guard APIs       │
│                   → requireNonLiff → Admin APIs         │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Access Matrix

| User Role | LIFF Context | Web Routes | LIFF Routes | Guard APIs | Admin APIs |
|-----------|--------------|------------|-------------|------------|------------|
| Guard     | ✅ LIFF      | ❌ Blocked | ✅ Allowed  | ✅ Allowed | ❌ Blocked |
| Guard     | ❌ Web       | ❌ Blocked | ❌ Blocked  | ❌ Blocked | ❌ Blocked |
| Admin     | ✅ LIFF      | ✅ Allowed | ❌ Redirect | ✅ Allowed | ✅ Allowed |
| Admin     | ❌ Web       | ✅ Allowed | N/A         | ✅ Allowed | ✅ Allowed |

## JWT Token Structure

```json
{
  "userId": "user-123",
  "companyId": "company-456",
  "role": "guard",
  "email": "guard@example.com",
  "employeeId": "emp-789",
  "lineUserId": "U123abc456def",
  "liffContext": {
    "isLiff": true,
    "liffId": "2008914377-NDoaNvUa",
    "issuedAt": 1704067200000,
    "userAgent": "Mozilla/5.0 (LINE/...)"
  }
}
```

## Security Features

### 1. Token Replay Prevention
- Backend validates `liffContext.isLiff` for all guard API calls
- Guards cannot copy token from LIFF and use in web browser
- Violations are logged with IP, user ID, and endpoint

### 2. Role-Based Enforcement
- Guards are hard-blocked from web routes (frontend + backend)
- Admins can access both LIFF and web (for flexibility)
- Middleware stack ensures defense in depth

### 3. LIFF Context Tracking
- Frontend automatically includes LIFF headers in all requests
- Backend detects LIFF context via headers
- JWT tokens bind to LIFF context on issuance

### 4. Audit Trail
- All access violations logged
- Token refresh preserves LIFF context
- Security events tracked for compliance

## Edge Cases Handled

✅ Direct URL access (guard types `/employees` in browser)
✅ Token reuse (guard copies JWT to browser console)
✅ Multiple roles (one user = one role enforced by DB)
✅ Admin creates guard (guard must login via LIFF first)
✅ Guard loses LINE access (can use phone/PIN login)

## Files Created/Modified

### Backend
- ✅ `backend/src/middleware/auth.middleware.ts` - Added `LiffContext`, `requireLiffOnly`, `requireNonLiff`
- ✅ `backend/src/middleware/liff-context.middleware.ts` - LIFF detection middleware
- ✅ `backend/src/middleware/index.ts` - Centralized middleware exports
- ✅ `backend/src/modules/auth/auth.service.ts` - Updated `generateTokens()` to accept LIFF context
- ✅ `backend/src/modules/auth/auth.controller.ts` - Pass LIFF context to service methods

### Frontend
- ✅ `frontend/src/hooks/useLiff.ts` - LIFF detection and utilities
- ✅ `frontend/src/components/auth/LiffProtectedRoute.tsx` - LIFF route guard
- ✅ `frontend/src/components/auth/NonLiffProtectedRoute.tsx` - Non-LIFF route guard
- ✅ `frontend/src/routes.tsx` - Updated with new route guards
- ✅ `frontend/src/services/api.ts` - Auto-include LIFF headers

### Documentation
- ✅ `.agent/RBAC_LIFF_DESIGN.md` - Architecture and design doc
- ✅ `.agent/RBAC_IMPLEMENTATION_GUIDE.md` - Step-by-step implementation guide
- ✅ `.agent/RBAC_USAGE_EXAMPLES.md` - Copy-paste ready examples
- ✅ `RBAC_LIFF_README.md` - This file

## Testing

### Backend
```bash
npm run test:backend
```

### Frontend
```bash
npm run test:frontend
```

### Integration
```bash
# See .agent/RBAC_USAGE_EXAMPLES.md for curl test scripts
```

## Documentation

| Document | Purpose |
|----------|---------|
| [RBAC_LIFF_DESIGN.md](.agent/RBAC_LIFF_DESIGN.md) | Architecture overview, design decisions, security considerations |
| [RBAC_IMPLEMENTATION_GUIDE.md](.agent/RBAC_IMPLEMENTATION_GUIDE.md) | Step-by-step implementation guide, troubleshooting |
| [RBAC_USAGE_EXAMPLES.md](.agent/RBAC_USAGE_EXAMPLES.md) | Copy-paste ready code examples |

## Migration Guide

### Phase 1: Deploy Backend (Non-Breaking)
1. Deploy updated backend with new middleware
2. Existing tokens continue to work (no LIFF context)
3. New logins get LIFF context

### Phase 2: Enable Frontend Guards
1. Deploy updated frontend with route guards
2. Guards see error screen when accessing web routes
3. Admins unaffected

### Phase 3: Enable Backend Enforcement
1. Apply `requireLiffOnly` to guard endpoints
2. Apply `requireNonLiff` to admin endpoints
3. Monitor logs for violations

### Phase 4: Full Enforcement
1. All routes protected
2. All users migrated
3. Legacy tokens expired

## Support

For issues or questions:
- Check [Troubleshooting Guide](.agent/RBAC_IMPLEMENTATION_GUIDE.md#troubleshooting)
- Review [Usage Examples](.agent/RBAC_USAGE_EXAMPLES.md)
- See [Design Documentation](.agent/RBAC_LIFF_DESIGN.md)

## Security Checklist

Before deploying to production:

- [ ] `detectLiffContext` middleware applied globally
- [ ] All guard API endpoints have `requireLiffOnly`
- [ ] All admin/manager web endpoints have `requireNonLiff`
- [ ] Frontend routes use appropriate guards
- [ ] LIFF headers included in API requests
- [ ] Token generation includes LIFF context
- [ ] Token refresh preserves LIFF context
- [ ] Security events are logged
- [ ] Tests pass for all scenarios
- [ ] Documentation reviewed and updated

## License

Same as parent project.
