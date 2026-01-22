# Review Report

## 1. Review `/liff/email-login` implementation

*   **Route**: `/liff/email-login` is defined in `frontend/src/routes.tsx`. It is a public route (not wrapped in `LiffLayout` or `ProtectedRoute`).
*   **Component**: `frontend/src/pages/liff/LiffEmailLoginPage.tsx`.
*   **Functionality**:
    *   Designed for guards without LINE accounts.
    *   Form fields: Company Code, Employee Code, Phone Number, Password.
    *   Service Call: `liffAuthService.liffEmployeeLogin`.
    *   On success: Stores tokens in local storage/cookie via `setTokens` and navigates to `/liff/clock`.
    *   Validation: Basic client-side validation (non-empty fields).

## 2. Review `auth/login` endpoints

*   **Controller**: `AuthController` in `backend/src/modules/auth/auth.controller.ts`.
*   **Endpoints**:
    *   `POST /api/v1/auth/liff/employee-login`: Handles the email login for guards. Calls `authService.liffEmployeeLogin`.
    *   `POST /api/v1/auth/login-phone`: Handles Phone + PIN login (used by `CompanyLoginPage`).
    *   `POST /api/v1/auth/login`: Standard Email + Password login (likely for admins/managers).
    *   `POST /api/v1/auth/line`: LINE Login.
    *   Various linking endpoints (`link-line`, `line/link-employee`, `line/link-credentials`).

## 3. Review `user`/`employee` table structure

*   **Schema**:
    *   `companies`: Contains `slug` (unique), `name`, etc.
    *   `users`: Contains authentication info (`email`, `password_hash`, `line_user_id`, `pin_attempts`).
    *   `employees`: Contains profile info (`employee_code`, `phone`, `full_name`).
*   **Relationship**:
    *   `users.employee_id` -> `employees.id`
    *   `employees.user_id` -> `users.id` (Circular reference, synced manually in service logic).
*   **Note**: `password_hash` in `users` table is used for both:
    *   Password (for Admin/Email Login).
    *   PIN (for Guard/Phone Login).
    *   `liffEmployeeLogin` validates against this field. If a user has set a PIN (via `setPin`), that PIN acts as their password.

## 4. Review existing JWT generation logic

*   **Location**: `AuthService.generateTokens` in `backend/src/modules/auth/auth.service.ts`.
*   **Library**: `jsonwebtoken`.
*   **Tokens**:
    *   `accessToken`: Defaults to 15 minutes.
    *   `refreshToken`: Defaults to 7 days.
*   **Payload**: `userId`, `companyId`, `role`, `email`, `employeeId`, `lineUserId`.

## 5. Review existing routing setup (React Router)

*   **File**: `frontend/src/routes.tsx`.
*   **Router**: `createBrowserRouter`.
*   **Structure**:
    *   `/login`: Public admin login.
    *   `/`: Protected dashboard routes (Admin/Manager).
    *   `/liff`: LIFF routes wrapped in `LiffLayout` (Guard).
    *   `/liff/email-login`: Public standalone route.
    *   `/liff/:companySlug/login`: Public standalone route.

## 6. Review existing form components and validation patterns

*   **LiffEmailLoginPage**:
    *   Uses standard HTML `input` elements managed by React `useState`.
    *   Manual validation logic in `handleSubmit`.
    *   No external form library (like `react-hook-form` or `formik`) used in this specific page.
*   **CompanyLoginPage**:
    *   Uses custom components: `PhoneInput`, `PinInput`, `NumericKeypad`.
    *   Manual validation.

## 7. Check if company "slug" field exists in companies table

*   **Confirmed**: `slug VARCHAR(100) UNIQUE NOT NULL` exists in `companies` table (migration `001_initial_schema.sql`).
*   **Usage**: Used for company identification in public login URLs (`/liff/:companySlug/login`) and during `liffEmployeeLogin` to resolve company ID.
