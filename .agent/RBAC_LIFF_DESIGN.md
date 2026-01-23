# RBAC LIFF-Only Access Design

## Overview
This document outlines the design and implementation of role-based access control (RBAC) where users with the `guard` role are restricted to LINE LIFF pages only and explicitly blocked from all non-LIFF web routes and APIs.

## 1. Architecture Overview

### Component Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐              ┌──────────────┐                 │
│  │ LIFF Pages   │              │ Web Pages    │                 │
│  │ (/liff/*)    │              │ (/)          │                 │
│  │              │              │              │                 │
│  │ - Schedule   │              │ - Dashboard  │                 │
│  │ - Clock      │              │ - Employees  │                 │
│  │ - Leave      │              │ - Reports    │                 │
│  │ - Profile    │              │ - Settings   │                 │
│  └──────┬───────┘              └──────┬───────┘                 │
│         │                             │                          │
│    LiffProtected                 NonLiffProtected                │
│    Route Guard                   Route Guard                     │
│         │                             │                          │
│         │         AuthContext         │                          │
│         └──────────────┬──────────────┘                          │
│                        │                                         │
└────────────────────────┼─────────────────────────────────────────┘
                         │
                    JWT Token
                         │
┌────────────────────────┼─────────────────────────────────────────┐
│                   Backend                                        │
├────────────────────────┼─────────────────────────────────────────┤
│                        │                                         │
│              authMiddleware                                      │
│                   +                                              │
│            requireLiffOnly         requireNonLiff               │
│            (guards only)           (non-guards only)            │
│                   │                        │                     │
│         ┌─────────┴─────────┐    ┌─────────┴──────────┐        │
│         │                   │    │                     │         │
│    ┌────▼────┐        ┌────▼────▼───┐          ┌──────▼────┐   │
│    │ LIFF    │        │ Guard API   │          │ Web API   │   │
│    │ Auth    │        │ Endpoints   │          │ Endpoints │   │
│    │ /liff/* │        │ - shifts    │          │ - users   │   │
│    └─────────┘        │ - attendance│          │ - reports │   │
│                       │ - leaves    │          │           │   │
│                       └─────────────┘          └───────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 2. JWT Token Claims

### Enhanced JWT Payload
```typescript
interface JwtPayload {
  userId: string;
  companyId: string;
  role: 'super_admin' | 'company_admin' | 'manager' | 'guard';
  email: string;
  employeeId?: string;
  lineUserId?: string;

  // NEW: LIFF context tracking
  liffContext?: {
    isLiff: boolean;           // Token issued from LIFF
    liffId?: string;           // LIFF app ID
    issuedAt: number;          // Timestamp
    userAgent?: string;        // Browser fingerprint (optional)
  };
}
```

### Token Issuance Rules

1. **LINE Login (LIFF)**: `liffContext.isLiff = true`
2. **Phone/PIN Login (LIFF)**: `liffContext.isLiff = true`
3. **Email/Password Login (Web)**: `liffContext.isLiff = false` or undefined
4. **Admin-created Guard**: No token until guard logs in via LIFF

## 3. Backend Enforcement

### Middleware Stack

#### 3.1 LIFF-Only Middleware (`requireLiffOnly`)
```typescript
// Apply to ALL guard API endpoints
export const requireLiffOnly = (req, res, next) => {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  // Only enforce for guard role
  if (req.user.role === 'guard') {
    if (!req.user.liffContext?.isLiff) {
      throw new ForbiddenError(
        'Guard users must access this endpoint via LIFF only',
        'ยามจำเป็นต้องเข้าใช้งานผ่าน LINE เท่านั้น'
      );
    }
  }

  next();
};
```

#### 3.2 Non-LIFF Middleware (`requireNonLiff`)
```typescript
// Apply to admin/manager web-only routes
export const requireNonLiff = (req, res, next) => {
  if (!req.user) {
    throw new UnauthorizedError('Not authenticated');
  }

  // Block guards from accessing web routes
  if (req.user.role === 'guard') {
    throw new ForbiddenError(
      'Access denied. Guard users cannot access web routes.',
      'ไม่อนุญาตให้เข้าถึง ยามต้องใช้ LINE LIFF เท่านั้น'
    );
  }

  next();
};
```

### API Route Protection

```typescript
// Guard-only LIFF endpoints
router.get('/api/v1/shifts/my', authMiddleware, requireLiffOnly, getMyShifts);
router.post('/api/v1/attendance/clock-in', authMiddleware, requireLiffOnly, clockIn);
router.get('/api/v1/leave/my', authMiddleware, requireLiffOnly, getMyLeaves);

// Admin/Manager web-only endpoints
router.get('/api/v1/employees', authMiddleware, requireNonLiff, requireManager, getEmployees);
router.get('/api/v1/reports', authMiddleware, requireNonLiff, requireManager, getReports);

// Mixed access (both LIFF and web)
router.get('/api/v1/profile', authMiddleware, getProfile);
```

## 4. Frontend Enforcement

### 4.1 LIFF Protected Route
```typescript
export function LiffProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const liff = useLiff();

  // Check if in LIFF context
  if (!liff.isInClient()) {
    return <Navigate to="/liff/login-select" />;
  }

  // Check authentication
  if (!isAuthenticated) {
    return <Navigate to="/liff/link" />;
  }

  // Guards can access, non-guards are redirected
  if (user?.role !== 'guard') {
    return <Navigate to="/" />; // Redirect to web dashboard
  }

  return <>{children}</>;
}
```

### 4.2 Non-LIFF Protected Route
```typescript
export function NonLiffProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Block guards from accessing web routes
  if (user?.role === 'guard') {
    return (
      <div className="error-screen">
        <h1>Access Denied</h1>
        <p>Guard users must use LINE LIFF to access the system.</p>
        <p>กรุณาเข้าใช้งานผ่าน LINE</p>
      </div>
    );
  }

  return <>{children}</>;
}
```

### 4.3 Route Configuration
```typescript
// Non-LIFF routes (admin/manager only)
{
  path: '/',
  element: <NonLiffProtectedRoute><DashboardLayout /></NonLiffProtectedRoute>,
  children: [...]
}

// LIFF routes (guards only)
{
  path: '/liff',
  element: <LiffProtectedRoute><LiffLayout /></LiffProtectedRoute>,
  children: [...]
}
```

## 5. Authentication Flows

### 5.1 Guard Login via LINE LIFF
```
1. Guard opens LIFF app in LINE
2. LIFF SDK initializes, gets LINE ID token
3. Frontend calls /api/v1/auth/line/verify with idToken + liffId
4. Backend verifies LINE token, finds/creates guard user
5. Backend generates JWT with liffContext.isLiff = true
6. Frontend stores token, redirects to /liff/schedule
```

### 5.2 Guard Login via Phone/PIN (LIFF)
```
1. Guard opens LIFF app (company URL)
2. Guard enters phone + PIN
3. Frontend calls /api/v1/auth/phone-login with liffContext header
4. Backend verifies credentials
5. Backend generates JWT with liffContext.isLiff = true
6. Frontend stores token, redirects to /liff/schedule
```

### 5.3 Admin Login via Web
```
1. Admin opens web app (/login)
2. Admin enters email + password
3. Frontend calls /api/v1/auth/login (no LIFF context)
4. Backend verifies credentials
5. Backend generates JWT with liffContext.isLiff = false
6. Frontend stores token, redirects to /
```

## 6. LIFF Context Detection

### 6.1 Backend Detection
```typescript
// Middleware to detect LIFF context
export const detectLiffContext = (req, res, next) => {
  const liffId = req.headers['x-liff-id'];
  const liffVersion = req.headers['x-liff-version'];
  const userAgent = req.headers['user-agent'];

  req.liffContext = {
    isLiff: !!liffId,
    liffId,
    liffVersion,
    userAgent
  };

  next();
};
```

### 6.2 Frontend Detection
```typescript
// Hook to check LIFF context
export function useLiff() {
  const [isInClient, setIsInClient] = useState(false);
  const [liffId, setLiffId] = useState<string | null>(null);

  useEffect(() => {
    liff.init({ liffId: import.meta.env.VITE_LIFF_SCHEDULE_ID })
      .then(() => {
        setIsInClient(liff.isInClient());
        setLiffId(liff.id);
      });
  }, []);

  return { isInClient, liffId };
}
```

## 7. Security Considerations

### 7.1 Token Replay Prevention
- **Problem**: Guard gets JWT from LIFF, copies it, uses it in web browser
- **Solution**: Backend checks `liffContext.isLiff` for all guard API calls
- **Additional**: Optional fingerprinting via User-Agent (not foolproof but adds friction)

### 7.2 LIFF Token Validation
- Verify LINE ID token with LINE API on every login
- Check token expiry and channel ID match
- Store `lineUserId` in user record for audit trail

### 7.3 Role Escalation Prevention
- Never trust client-side role checks
- Always enforce role + LIFF context on backend
- RLS policies in Supabase provide additional layer

### 7.4 Token Refresh
- Refresh tokens inherit LIFF context from original token
- Guard tokens refreshed outside LIFF are rejected

## 8. Edge Cases

### 8.1 Direct URL Access
**Scenario**: Guard manually types `https://app.example.com/employees`
**Behavior**: Frontend `NonLiffProtectedRoute` shows "Access Denied" screen

### 8.2 Token Reuse in Browser
**Scenario**: Guard copies JWT from LIFF, pastes into web browser console
**Behavior**: Backend `requireLiffOnly` middleware rejects API calls with 403

### 8.3 Multiple Roles
**Scenario**: User has both `admin` and `guard` roles (hypothetical)
**Current Design**: One user = one role (database constraint)
**Future**: If multi-role needed, check `liffContext` to determine which role is active

### 8.4 Admin Creates Guard
**Scenario**: Admin creates guard via web UI
**Behavior**:
- Guard user created with no password, no LINE link
- Guard cannot log in via web (no password)
- Guard must use LIFF to link account and get first token

### 8.5 Guard Loses LINE Access
**Scenario**: Guard uninstalls LINE or changes phone
**Behavior**:
- Guard can request PIN reset via company URL
- Admin approves reset
- Guard can set new PIN and login via phone/PIN in LIFF

## 9. Implementation Checklist

### Backend
- [x] Update `JwtPayload` interface with `liffContext`
- [ ] Modify `AuthService.generateTokens()` to accept LIFF context
- [ ] Create `requireLiffOnly` middleware
- [ ] Create `requireNonLiff` middleware
- [ ] Create `detectLiffContext` middleware
- [ ] Update all auth endpoints (lineLogin, phoneLogin, etc.)
- [ ] Apply middleware to protected routes
- [ ] Add unit tests for middleware

### Frontend
- [ ] Create `useLiff` hook for LIFF detection
- [ ] Create `LiffProtectedRoute` component
- [ ] Create `NonLiffProtectedRoute` component
- [ ] Update routes.tsx with new route guards
- [ ] Add LIFF headers to API client
- [ ] Update AuthContext to track LIFF context
- [ ] Add UI for "Access Denied" scenarios
- [ ] Add tests for route guards

### Documentation
- [ ] Update API documentation
- [ ] Update deployment guide
- [ ] Create troubleshooting guide
- [ ] Update security best practices

## 10. Monitoring & Logging

### Metrics to Track
- Failed LIFF auth attempts
- Guard users accessing non-LIFF endpoints (security violations)
- Token replay attempts
- LIFF context mismatches

### Logging Examples
```typescript
logger.warn('Guard user attempted to access non-LIFF endpoint', {
  userId: req.user.userId,
  role: req.user.role,
  endpoint: req.path,
  liffContext: req.user.liffContext,
  ip: req.ip
});
```

## 11. Testing Strategy

### Unit Tests
- Middleware logic (requireLiffOnly, requireNonLiff)
- JWT generation with LIFF context
- Route guard logic

### Integration Tests
- Guard login via LIFF → access LIFF endpoint → success
- Guard login via LIFF → access web endpoint → 403
- Admin login via web → access web endpoint → success
- Admin login via web → access LIFF endpoint → success (admins can use both)

### E2E Tests
- Full guard journey (LINE login → LIFF pages → clock in)
- Full admin journey (web login → dashboard → manage employees)
- Cross-context rejection (guard tries web, admin tries... wait, admins can use both)

## 12. Migration Plan

### Phase 1: Add LIFF Context Tracking (Non-Breaking)
- Deploy backend changes
- All new logins get LIFF context
- Existing tokens continue to work (liffContext = undefined)

### Phase 2: Soft Enforcement (Warnings)
- Enable middleware but log violations instead of blocking
- Monitor for unexpected patterns
- Fix any issues

### Phase 3: Hard Enforcement
- Enable full blocking
- Communicate to users
- Provide migration path for any edge cases

## 13. Future Enhancements

### 13.1 Device Binding
- Bind JWT to specific device/LINE client
- Use LIFF's device fingerprint APIs
- Prevent token sharing across devices

### 13.2 Session Management
- Track active sessions per user
- Allow admin to force logout guard sessions
- Implement session timeout for guards

### 13.3 Biometric Auth
- Use LINE's biometric APIs (if available)
- Add fingerprint/face unlock for sensitive actions

### 13.4 Audit Trail
- Log all guard actions with LIFF context
- Track location data from LIFF
- Generate compliance reports
