# RBAC LIFF-Only Implementation Guide

This guide explains how to use the RBAC system to restrict `guard` users to LIFF-only access.

## Table of Contents
1. [Backend Middleware Usage](#backend-middleware-usage)
2. [Frontend Route Guards](#frontend-route-guards)
3. [Authentication Flow Integration](#authentication-flow-integration)
4. [Testing](#testing)
5. [Troubleshooting](#troubleshooting)

## Backend Middleware Usage

### 1. Import Middleware

```typescript
import {
  authMiddleware,
  requireLiffOnly,
  requireNonLiff,
  requireManager,
  detectLiffContext,
} from '../middleware/index.js';
```

### 2. Apply Global LIFF Detection

In your main app file (`server.ts` or `app.ts`):

```typescript
import { detectLiffContext } from './middleware/index.js';

// Apply before routes
app.use(detectLiffContext);
```

This middleware adds `req.detectedLiffContext` to all requests, making LIFF detection available throughout the app.

### 3. Protect Guard-Only LIFF Routes

Use `requireLiffOnly` to ensure guards can ONLY access endpoints via LIFF:

```typescript
// Guard API endpoints - LIFF only
router.get(
  '/api/v1/shifts/my',
  authMiddleware,
  requireLiffOnly,
  getMyShifts
);

router.post(
  '/api/v1/attendance/clock-in',
  authMiddleware,
  requireLiffOnly,
  clockIn
);

router.get(
  '/api/v1/leave/my',
  authMiddleware,
  requireLiffOnly,
  getMyLeaves
);
```

**What happens:**
- ✅ Guard with LIFF token → Access granted
- ❌ Guard with web token → 401 "Guard users must access this endpoint via LINE LIFF only"
- ✅ Admin/Manager (any context) → Access granted

### 4. Protect Web-Only Routes

Use `requireNonLiff` to block guards from accessing admin/manager dashboards:

```typescript
// Admin/Manager web-only endpoints
router.get(
  '/api/v1/employees',
  authMiddleware,
  requireNonLiff,
  requireManager,
  getEmployees
);

router.get(
  '/api/v1/reports',
  authMiddleware,
  requireNonLiff,
  requireManager,
  getReports
);

router.put(
  '/api/v1/users/:id',
  authMiddleware,
  requireNonLiff,
  requireAdmin,
  updateUser
);
```

**What happens:**
- ❌ Guard (any context) → 401 "Access denied. Guard users cannot access web routes."
- ✅ Admin/Manager → Access granted

### 5. Mixed Access Routes

Some routes can be accessed by both guards (LIFF) and admins (web):

```typescript
// Profile - accessible by all authenticated users
router.get(
  '/api/v1/profile',
  authMiddleware,
  getProfile
);

// Update own profile
router.put(
  '/api/v1/profile',
  authMiddleware,
  updateProfile
);
```

**What happens:**
- ✅ Guard via LIFF → Access granted
- ✅ Admin via web → Access granted
- ❌ Unauthenticated → 401

## Frontend Route Guards

### 1. Import Route Guards

```typescript
import { LiffProtectedRoute } from './components/auth/LiffProtectedRoute';
import { NonLiffProtectedRoute } from './components/auth/NonLiffProtectedRoute';
```

### 2. Protect LIFF Routes

Wrap LIFF routes with `LiffProtectedRoute`:

```typescript
{
  path: '/liff',
  element: (
    <LiffProtectedRoute>
      <LiffLayout />
    </LiffProtectedRoute>
  ),
  children: [
    { path: 'schedule', element: <LiffSchedulePage /> },
    { path: 'clock', element: <LiffClockPage /> },
    { path: 'leave', element: <LiffLeavePage /> },
    { path: 'profile', element: <LiffProfilePage /> },
  ],
}
```

**What happens:**
- ✅ Guard in LINE app → Access granted
- ❌ Guard in web browser → "กรุณาเปิดผ่าน LINE"
- ❌ Admin in LINE app → Redirected to web dashboard
- ❌ Unauthenticated → Redirected to /liff/link

### 3. Protect Web Routes

Wrap web dashboard routes with `NonLiffProtectedRoute`:

```typescript
{
  path: '/',
  element: (
    <NonLiffProtectedRoute>
      <DashboardLayout />
    </NonLiffProtectedRoute>
  ),
  children: [
    { path: '', element: <DashboardPage /> },
    { path: 'employees', element: <EmployeesPage /> },
    { path: 'reports', element: <ReportsPage /> },
  ],
}
```

**What happens:**
- ❌ Guard (any context) → "ไม่อนุญาตให้เข้าถึง ยามต้องใช้ LINE LIFF เท่านั้น"
- ✅ Admin/Manager → Access granted
- ❌ Unauthenticated → Redirected to /login

### 4. Use LIFF Hook

```typescript
import { useLiff, getLiffIdToken, getLiffHeaders } from '../hooks/useLiff';

function MyLiffComponent() {
  const { isInClient, isReady, liffId, error } = useLiff();

  if (!isReady) {
    return <Loading />;
  }

  if (!isInClient) {
    return <div>Please open in LINE</div>;
  }

  return (
    <div>
      <h1>LIFF App</h1>
      <p>LIFF ID: {liffId}</p>
    </div>
  );
}
```

## Authentication Flow Integration

### 1. Update Auth Service Methods (Backend)

Modify auth service methods to accept and include LIFF context:

```typescript
// In auth.service.ts
import type { LiffContext } from '../../middleware/auth.middleware.js';

async login(data: LoginRequest, liffContext?: LiffContext): Promise<LoginResponse> {
  // ... existing login logic ...

  // Generate tokens with LIFF context
  const tokens = this.generateTokens({
    userId: user.id,
    companyId: user.company_id,
    role: user.role,
    email: user.email,
    employeeId: user.employee_id,
    lineUserId: user.line_user_id,
  }, liffContext);

  return { user: this.mapToAuthUser(user), tokens };
}
```

### 2. Update Auth Controller (Backend)

Pass LIFF context from request to auth service:

```typescript
// In auth.controller.ts
import { createLiffContextFromRequest } from '../../middleware/liff-context.middleware.js';

async lineLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = lineLoginSchema.safeParse(req.body);
    if (!validation.success) {
      throw formatZodError(validation.error);
    }

    // Extract LIFF context from request
    const liffContext = createLiffContextFromRequest(req);

    const result = await authService.lineLogin(validation.data, liffContext);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}
```

### 3. Client-Side Auth Flow

LIFF headers are automatically added by the API interceptor, so no changes needed in most cases:

```typescript
// This automatically includes LIFF headers if in LIFF context
const response = await authService.login({ email, password });
```

## Testing

### Backend Tests

```typescript
import { requireLiffOnly, requireNonLiff } from '../middleware/auth.middleware';

describe('RBAC LIFF Middleware', () => {
  describe('requireLiffOnly', () => {
    it('should allow guard with LIFF context', () => {
      const req = {
        user: {
          role: 'guard',
          liffContext: { isLiff: true, issuedAt: Date.now() }
        }
      };
      requireLiffOnly(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject guard without LIFF context', () => {
      const req = {
        user: { role: 'guard' }
      };
      requireLiffOnly(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should allow non-guard users', () => {
      const req = {
        user: { role: 'company_admin' }
      };
      requireLiffOnly(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('requireNonLiff', () => {
    it('should reject guard users', () => {
      const req = {
        user: { role: 'guard' }
      };
      requireNonLiff(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should allow non-guard users', () => {
      const req = {
        user: { role: 'company_admin' }
      };
      requireNonLiff(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });
});
```

### Frontend Tests

```typescript
import { render, screen } from '@testing-library/react';
import { LiffProtectedRoute } from './LiffProtectedRoute';
import { useLiff } from '../../hooks/useLiff';
import { useAuth } from '../../context/AuthContext';

jest.mock('../../hooks/useLiff');
jest.mock('../../context/AuthContext');

describe('LiffProtectedRoute', () => {
  it('should render children when guard user in LIFF', () => {
    (useLiff as jest.Mock).mockReturnValue({
      isInClient: true,
      isReady: true,
      liffId: 'test-liff-id'
    });
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      user: { role: 'guard' },
      isLoading: false
    });

    render(
      <LiffProtectedRoute>
        <div>Protected Content</div>
      </LiffProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should show error when not in LIFF', () => {
    (useLiff as jest.Mock).mockReturnValue({
      isInClient: false,
      isReady: true
    });
    (useAuth as jest.Mock).mockReturnValue({
      isAuthenticated: true,
      user: { role: 'guard' },
      isLoading: false
    });

    render(
      <LiffProtectedRoute>
        <div>Protected Content</div>
      </LiffProtectedRoute>
    );

    expect(screen.getByText(/กรุณาเปิดผ่าน LINE/)).toBeInTheDocument();
  });
});
```

### Integration Tests

```bash
# Test guard login via LIFF → access LIFF endpoint
curl -X POST http://localhost:3001/api/v1/auth/line/verify \
  -H "Content-Type: application/json" \
  -H "X-LIFF-ID: 2008914377-NDoaNvUa" \
  -d '{"idToken":"...", "liffId":"2008914377-NDoaNvUa"}'

# Test guard with LIFF token trying to access web endpoint
curl -X GET http://localhost:3001/api/v1/employees \
  -H "Authorization: Bearer <guard_liff_token>"
# Expected: 401 "Guard users must access this endpoint via LINE LIFF only"

# Test admin login via web → access web endpoint
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

curl -X GET http://localhost:3001/api/v1/employees \
  -H "Authorization: Bearer <admin_web_token>"
# Expected: 200 OK
```

## Troubleshooting

### Issue: "Guard users must access this endpoint via LINE LIFF only"

**Cause:** Guard user's token doesn't have LIFF context.

**Solution:**
1. Check if LIFF detection middleware is applied: `app.use(detectLiffContext);`
2. Verify frontend is sending LIFF headers (check Network tab)
3. Check if `createLiffContextFromRequest()` is called in auth controller
4. Verify JWT payload includes `liffContext` field

### Issue: Guards can access web routes

**Cause:** `requireNonLiff` middleware not applied.

**Solution:**
1. Add `requireNonLiff` to protected web routes
2. Check middleware order (should be after `authMiddleware`)
3. Verify route registration

### Issue: LIFF SDK not initializing

**Cause:** LIFF ID not configured or invalid.

**Solution:**
1. Check `.env` files for `VITE_LIFF_*` variables
2. Verify LIFF app is registered in LINE Developers Console
3. Check LIFF ID format: `{channelId}-{appId}`

### Issue: "กรุณาเปิดผ่าน LINE" shown in LINE app

**Cause:** LIFF SDK initialization failed or not completed.

**Solution:**
1. Check browser console for LIFF errors
2. Verify LIFF ID matches the app's channel
3. Check LINE Developers Console for app status
4. Ensure LIFF SDK is loaded before initialization

## Best Practices

### 1. Always Use Middleware Stacking

```typescript
// ✅ Good
router.get('/employees',
  authMiddleware,
  requireNonLiff,
  requireManager,
  getEmployees
);

// ❌ Bad - Missing requireNonLiff
router.get('/employees',
  authMiddleware,
  requireManager,
  getEmployees
);
```

### 2. Test Both Web and LIFF Contexts

Always test routes with:
- Guard + LIFF token
- Guard + web token
- Admin + web token
- Admin + LIFF token (if applicable)

### 3. Use Type-Safe Middleware

```typescript
// ✅ Good - Type-safe
import type { JwtPayload, LiffContext } from '../middleware/index.js';

// ❌ Bad - Untyped
const liffContext = req.detectedLiffContext;
```

### 4. Log Security Events

```typescript
logger.warn('Guard user attempted to access non-LIFF endpoint', {
  userId: req.user.userId,
  role: req.user.role,
  endpoint: req.path,
  liffContext: req.user.liffContext,
  ip: req.ip
});
```

### 5. Handle Token Refresh Properly

Ensure refresh tokens inherit LIFF context from original token:

```typescript
async refreshToken(refreshToken: string): Promise<RefreshResponse> {
  const decoded = jwt.verify(refreshToken, env.JWT_SECRET) as {
    userId: string;
    type: string;
    liffContext?: LiffContext;
  };

  // Preserve LIFF context on refresh
  const tokens = this.generateTokens(payload, decoded.liffContext);
  return tokens;
}
```

## Security Checklist

- [ ] `detectLiffContext` middleware applied globally
- [ ] All guard API endpoints have `requireLiffOnly` middleware
- [ ] All admin/manager web endpoints have `requireNonLiff` middleware
- [ ] Frontend routes use appropriate guards (`LiffProtectedRoute` / `NonLiffProtectedRoute`)
- [ ] LIFF headers included in API requests
- [ ] Token generation includes LIFF context
- [ ] Token refresh preserves LIFF context
- [ ] Error messages don't leak sensitive information
- [ ] Security events are logged
- [ ] Tests cover all access scenarios
