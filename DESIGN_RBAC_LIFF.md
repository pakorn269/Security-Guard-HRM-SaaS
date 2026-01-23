# RBAC Design for Security Guard LIFF Access

## Architecture Overview

The system enforces strict Role-Based Access Control (RBAC) to ensure `security_guard` users are confined to the LINE LIFF environment (or equivalent mobile web views) and cannot access administrative dashboards.

### Frontend
- **Framework**: React with React Router.
- **Route Guards**:
  - `DashboardLayout`: Protected by `ProtectedRoute` allowing only `admin` and `manager` roles.
  - `LiffLayout`: Protected by `ProtectedRoute` allowing only `guard` (and optionally `admin` for testing).
- **Behavior**:
  - If a `guard` logs in via the main web portal (`/login`), they are redirected to the LIFF interface (`/liff/clock` or `/liff/schedule`).
  - If an `admin` tries to access LIFF, they are allowed (useful for testing) or blocked depending on strictness.

### Backend
- **Framework**: Node.js / Express.
- **Middleware**: Custom RBAC middleware (`enforceGuardRestrictions`).
- **Logic**:
  - Intercepts all requests.
  - If `req.user.role === 'guard'`, checks the request path against a strict **Allowlist**.
  - If the path is not allowed, rejects with `403 Forbidden`.

### Auth Flow
1.  **Login**:
    - **LIFF**: Uses LINE Login or Phone+PIN. Issues JWT with `role: guard`.
    - **Web**: Uses Email+Password. Issues JWT with `role: admin/manager`.
2.  **Token**: Standard JWT with `role` claim.
3.  **Validation**:
    - Backend validates signature and expiration.
    - RBAC Middleware validates `role` vs `resource`.

## Authentication & Authorization Strategy

### Detecting LIFF Context
While we can check `sec-fetch-dest`, `origin`, or `user-agent`, these are spoofable. The most secure method is **Role-Based Enforcement** regardless of the client.
- We assume that if a user has the `guard` role, they *should* be in the LIFF context.
- Even if they use `curl` or Postman, they are restricted to "Guard APIs" only.

### Backend Enforcement

We implement a middleware `enforceGuardRestrictions` that runs after authentication.

```typescript
const ALLOWED_GUARD_PATHS = [
    '/api/v1/auth/me',
    '/api/v1/auth/logout',
    '/api/v1/attendance/clock-in',
    '/api/v1/attendance/clock-out',
    '/api/v1/shifts/my-shifts',
    '/api/v1/leave/request',
    // ... other guard-specific endpoints
];

export const enforceGuardRestrictions = (req, res, next) => {
    if (req.user?.role === 'guard') {
        const isAllowed = ALLOWED_GUARD_PATHS.some(path => req.path.startsWith(path));
        // Or better, use regex or specific route matching
        if (!isAllowed) {
            return next(new ForbiddenError('Guards are restricted to LIFF functionality'));
        }
    }
    next();
};
```

### Frontend Handling

**Route Guards (`routes.tsx`):**
```typescript
{
    path: '/',
    element: <ProtectedRoute allowedRoles={['super_admin', 'company_admin', 'manager']}><DashboardLayout /></ProtectedRoute>,
    children: [...]
}
```

**UX Behavior (`ProtectedRoute.tsx`):**
- If `user.role === 'guard'` tries to access `/`:
  - **Redirect** to `/liff/clock` immediately.
  - Show a toast/alert: "Redirecting to Guard Interface".

## Security Considerations

1.  **Token Replay**:
    - If a guard's token is stolen, the attacker can only access Guard APIs (Clock In/Out, View Schedule). They cannot access Admin APIs (List Employees, Payroll).
    - To prevent clock-in spoofing (e.g. clocking in from home), we rely on:
        - **GPS Coordinates**: Validated by backend logic.
        - **LIFF ID Token**: For LINE login, we verify the ID token.
2.  **Client-Side Trust**:
    - We do **not** trust the frontend to hide admin buttons.
    - We enforce permissions at the API level.

## Edge Cases

1.  **Direct URL Access**:
    - If a guard types `https://app.com/employees`, the frontend router redirects them.
    - If they bypass frontend, the API returns `403`.
2.  **Token Reuse in Browser**:
    - If a guard logs in on a desktop browser, they are forced into the LIFF/Mobile view. They cannot see the Admin Dashboard.
3.  **Multiple Roles**:
    - Our system currently supports single role per user.
    - If a user needs both, they should have two accounts (e.g., separate email/phone).
