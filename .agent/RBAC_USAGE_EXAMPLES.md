# RBAC LIFF Usage Examples

This document provides complete, copy-paste ready examples for implementing RBAC LIFF-only access.

## Backend Examples

### 1. Server Setup with LIFF Detection

```typescript
// backend/src/server.ts
import express from 'express';
import { detectLiffContext } from './middleware/index.js';
import authRoutes from './modules/auth/auth.routes.js';
import shiftRoutes from './modules/shifts/shift.routes.js';
import attendanceRoutes from './modules/attendance/attendance.routes.js';

const app = express();

// Middleware
app.use(express.json());

// CRITICAL: Apply LIFF detection before routes
app.use(detectLiffContext);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/shifts', shiftRoutes);
app.use('/api/v1/attendance', attendanceRoutes);

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
```

### 2. Guard-Only LIFF Routes

```typescript
// backend/src/modules/shifts/shift.routes.ts
import { Router } from 'express';
import { authMiddleware, requireLiffOnly } from '../../middleware/index.js';
import { shiftController } from './shift.controller.js';

const router = Router();

// Guard-only LIFF endpoints
// Guards CANNOT access these via web browser
router.get(
  '/my',
  authMiddleware,
  requireLiffOnly,
  shiftController.getMyShifts
);

router.get(
  '/upcoming',
  authMiddleware,
  requireLiffOnly,
  shiftController.getUpcomingShifts
);

export default router;
```

### 3. Admin/Manager Web-Only Routes

```typescript
// backend/src/modules/employees/employee.routes.ts
import { Router } from 'express';
import {
  authMiddleware,
  requireNonLiff,
  requireManager,
  requireAdmin,
} from '../../middleware/index.js';
import { employeeController } from './employee.controller.js';

const router = Router();

// Admin/Manager web-only endpoints
// Guards CANNOT access these at all
router.get(
  '/',
  authMiddleware,
  requireNonLiff,
  requireManager,
  employeeController.getEmployees
);

router.post(
  '/',
  authMiddleware,
  requireNonLiff,
  requireAdmin,
  employeeController.createEmployee
);

router.put(
  '/:id',
  authMiddleware,
  requireNonLiff,
  requireManager,
  employeeController.updateEmployee
);

router.delete(
  '/:id',
  authMiddleware,
  requireNonLiff,
  requireAdmin,
  employeeController.deleteEmployee
);

export default router;
```

### 4. Mixed Access Routes

```typescript
// backend/src/modules/profile/profile.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../../middleware/index.js';
import { profileController } from './profile.controller.js';

const router = Router();

// Mixed access - both LIFF and web
// Guards can access via LIFF, Admins via web
router.get(
  '/',
  authMiddleware,
  profileController.getProfile
);

router.put(
  '/',
  authMiddleware,
  profileController.updateProfile
);

export default router;
```

### 5. Auth Controller with LIFF Context

```typescript
// backend/src/modules/auth/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import { createLiffContextFromRequest } from '../../middleware/liff-context.middleware.js';
import { authService } from './auth.service.js';
import { sendSuccess } from '../../utils/response.js';
import { lineLoginSchema } from './auth.validation.js';

class AuthController {
  // LINE Login - Always LIFF context
  async lineLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = lineLoginSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Invalid input', validation.error.issues);
      }

      // Extract LIFF context from request headers
      const liffContext = createLiffContextFromRequest(req);

      const result = await authService.lineLogin(
        validation.data,
        liffContext
      );

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  // Phone Login - Can be LIFF or web
  async phoneLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = phoneLoginSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Invalid input', validation.error.issues);
      }

      // Extract LIFF context (may be undefined if web)
      const liffContext = createLiffContextFromRequest(req);

      const result = await authService.phoneLogin(
        validation.data,
        liffContext
      );

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  // Web Login - Never LIFF context
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError('Invalid input', validation.error.issues);
      }

      // No LIFF context for web login
      const result = await authService.login(validation.data);

      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
```

## Frontend Examples

### 1. Route Configuration

```typescript
// frontend/src/routes.tsx
import { createBrowserRouter } from 'react-router-dom';
import { lazy } from 'react';
import { LiffProtectedRoute } from './components/auth/LiffProtectedRoute';
import { NonLiffProtectedRoute } from './components/auth/NonLiffProtectedRoute';

const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'));
const LiffLayout = lazy(() => import('./components/layout/LiffLayout'));

const routes = [
  // Public routes
  {
    path: '/login',
    element: <LoginPage />,
  },

  // Web routes - Admin/Manager only (blocks guards)
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
      { path: 'settings', element: <SettingsPage /> },
    ],
  },

  // LIFF routes - Guards only (must be in LINE)
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
  },

  // LIFF public routes (outside protected area)
  {
    path: '/liff/link',
    element: <LiffLinkPage />,
  },
];

export const router = createBrowserRouter(routes);
```

### 2. LIFF Component Example

```typescript
// frontend/src/pages/liff/LiffClockPage.tsx
import { useState } from 'react';
import { useLiff } from '../../hooks/useLiff';
import { useAuth } from '../../context/AuthContext';
import attendanceService from '../../services/attendance.service';

export function LiffClockPage() {
  const { isInClient, isReady, liffId } = useLiff();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleClockIn = async () => {
    try {
      setLoading(true);

      // Get current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      await attendanceService.clockIn({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      alert('Clock in successful!');
    } catch (error) {
      alert('Failed to clock in');
    } finally {
      setLoading(false);
    }
  };

  if (!isReady) {
    return <div>Loading LIFF...</div>;
  }

  if (!isInClient) {
    return <div>Please open in LINE</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Clock In/Out</h1>
      <p className="mb-4">Welcome, {user?.lineDisplayName || 'Guard'}</p>
      <p className="text-sm text-gray-500 mb-4">LIFF ID: {liffId}</p>

      <button
        onClick={handleClockIn}
        disabled={loading}
        className="w-full bg-primary-600 text-white py-3 rounded-lg"
      >
        {loading ? 'Processing...' : 'Clock In'}
      </button>
    </div>
  );
}
```

### 3. LIFF Authentication Flow

```typescript
// frontend/src/pages/liff/LiffLinkPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiff, getLiffIdToken } from '../../hooks/useLiff';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/auth.service';

export function LiffLinkPage() {
  const { isInClient, isReady, liffId } = useLiff();
  const { isAuthenticated, lineLogin } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && isInClient && !isAuthenticated) {
      authenticateWithLine();
    }
  }, [isReady, isInClient, isAuthenticated]);

  const authenticateWithLine = async () => {
    try {
      const idToken = await getLiffIdToken();
      if (!idToken || !liffId) {
        throw new Error('Failed to get LINE credentials');
      }

      // First, verify if user is linked
      const verifyResponse = await authService.lineVerify(idToken, liffId);

      if (verifyResponse.isLinked && verifyResponse.user) {
        // User is already linked - login
        await lineLogin(idToken, liffId);
        navigate('/liff/schedule');
      } else {
        // User not linked - go to linking page
        navigate('/liff/link/employee', {
          state: {
            lineProfile: verifyResponse.lineProfile,
            idToken,
            liffId,
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  if (!isReady) {
    return <div>Loading...</div>;
  }

  if (!isInClient) {
    return <div>Please open in LINE</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return <div>Authenticating...</div>;
}
```

### 4. Web Dashboard with Guard Blocking

```typescript
// frontend/src/pages/dashboard/DashboardPage.tsx
import { useAuth } from '../../context/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();

  // This page is protected by NonLiffProtectedRoute
  // Guards will never reach this code

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <p className="mb-4">Welcome, {user?.email}</p>
      <p className="text-sm text-gray-500">Role: {user?.role}</p>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <DashboardCard title="Employees" count={45} />
        <DashboardCard title="Active Shifts" count={12} />
        <DashboardCard title="Pending Leaves" count={3} />
      </div>
    </div>
  );
}
```

## Testing Examples

### 1. Backend Middleware Tests

```typescript
// backend/src/middleware/__tests__/auth.middleware.test.ts
import { Request, Response, NextFunction } from 'express';
import { requireLiffOnly, requireNonLiff } from '../auth.middleware';
import { UnauthorizedError } from '../../utils/errors';

describe('RBAC LIFF Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
  });

  describe('requireLiffOnly', () => {
    it('allows guard with LIFF context', () => {
      req.user = {
        userId: '1',
        role: 'guard',
        companyId: 'c1',
        email: 'guard@test.com',
        liffContext: {
          isLiff: true,
          liffId: 'test-liff-id',
          issuedAt: Date.now(),
        },
      };

      requireLiffOnly(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('rejects guard without LIFF context', () => {
      req.user = {
        userId: '1',
        role: 'guard',
        companyId: 'c1',
        email: 'guard@test.com',
      };

      requireLiffOnly(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect((next as jest.Mock).mock.calls[0][0].message).toContain('LINE LIFF only');
    });

    it('allows admin without LIFF context', () => {
      req.user = {
        userId: '1',
        role: 'company_admin',
        companyId: 'c1',
        email: 'admin@test.com',
      };

      requireLiffOnly(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('requireNonLiff', () => {
    it('rejects guard users', () => {
      req.user = {
        userId: '1',
        role: 'guard',
        companyId: 'c1',
        email: 'guard@test.com',
        liffContext: { isLiff: true, issuedAt: Date.now() },
      };

      requireNonLiff(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect((next as jest.Mock).mock.calls[0][0].message).toContain('cannot access web routes');
    });

    it('allows admin users', () => {
      req.user = {
        userId: '1',
        role: 'company_admin',
        companyId: 'c1',
        email: 'admin@test.com',
      };

      requireNonLiff(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith();
    });
  });
});
```

### 2. Frontend Route Guard Tests

```typescript
// frontend/src/components/auth/__tests__/LiffProtectedRoute.test.tsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LiffProtectedRoute } from '../LiffProtectedRoute';
import { useLiff } from '../../../hooks/useLiff';
import { useAuth } from '../../../context/AuthContext';

jest.mock('../../../hooks/useLiff');
jest.mock('../../../context/AuthContext');

const mockUseLiff = useLiff as jest.MockedFunction<typeof useLiff>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('LiffProtectedRoute', () => {
  it('renders children when guard in LIFF', () => {
    mockUseLiff.mockReturnValue({
      isInClient: true,
      isReady: true,
      isLoggedIn: true,
      liffId: 'test-liff-id',
      error: null,
    });

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', role: 'guard', email: 'guard@test.com' },
      isLoading: false,
    } as any);

    render(
      <BrowserRouter>
        <LiffProtectedRoute>
          <div>Protected Content</div>
        </LiffProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows error when not in LIFF', () => {
    mockUseLiff.mockReturnValue({
      isInClient: false,
      isReady: true,
      isLoggedIn: false,
      liffId: null,
      error: null,
    });

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', role: 'guard', email: 'guard@test.com' },
      isLoading: false,
    } as any);

    render(
      <BrowserRouter>
        <LiffProtectedRoute>
          <div>Protected Content</div>
        </LiffProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByText(/กรุณาเปิดผ่าน LINE/)).toBeInTheDocument();
  });

  it('redirects admin to web', () => {
    mockUseLiff.mockReturnValue({
      isInClient: true,
      isReady: true,
      isLoggedIn: true,
      liffId: 'test-liff-id',
      error: null,
    });

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: '1', role: 'company_admin', email: 'admin@test.com' },
      isLoading: false,
    } as any);

    render(
      <BrowserRouter>
        <LiffProtectedRoute>
          <div>Protected Content</div>
        </LiffProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByText(/เข้าสู่ระบบผิดช่องทาง/)).toBeInTheDocument();
  });
});
```

### 3. Integration Tests with curl

```bash
#!/bin/bash

# Test 1: Guard login via LIFF
echo "Test 1: Guard login via LIFF"
GUARD_LIFF_TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/line/verify \
  -H "Content-Type: application/json" \
  -H "X-LIFF-ID: 2008914377-NDoaNvUa" \
  -d '{"idToken":"test-line-token", "liffId":"2008914377-NDoaNvUa"}' \
  | jq -r '.data.tokens.accessToken')

echo "Guard LIFF Token: $GUARD_LIFF_TOKEN"

# Test 2: Guard access LIFF endpoint (should succeed)
echo -e "\nTest 2: Guard access LIFF endpoint"
curl -X GET http://localhost:3001/api/v1/shifts/my \
  -H "Authorization: Bearer $GUARD_LIFF_TOKEN"

# Test 3: Guard access web endpoint (should fail)
echo -e "\nTest 3: Guard access web endpoint (should fail)"
curl -X GET http://localhost:3001/api/v1/employees \
  -H "Authorization: Bearer $GUARD_LIFF_TOKEN"

# Test 4: Admin login via web
echo -e "\nTest 4: Admin login via web"
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password"}' \
  | jq -r '.data.tokens.accessToken')

echo "Admin Token: $ADMIN_TOKEN"

# Test 5: Admin access web endpoint (should succeed)
echo -e "\nTest 5: Admin access web endpoint"
curl -X GET http://localhost:3001/api/v1/employees \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Summary

This RBAC implementation provides:

1. **Backend Security**: Guards can only access LIFF endpoints, admins can access web endpoints
2. **Frontend Protection**: Guards see LIFF pages only, admins see web dashboard
3. **Token Binding**: JWT tokens include LIFF context, preventing token reuse
4. **Clear Separation**: Clear separation between LIFF and web access paths
5. **Easy Testing**: Comprehensive test coverage for all scenarios

The system ensures that `security_guard` users are restricted to LIFF-only access while allowing admins and managers to use the web interface.
