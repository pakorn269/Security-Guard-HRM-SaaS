# CLAUDE.md - Security Guard HRM SaaS

## Project Overview

Multi-tenant Human Resource Management SaaS for Thai security companies. Features shift scheduling, GPS-based attendance tracking, leave management, and LINE LIFF integration for mobile guards.

## Tech Stack

### Frontend (`/frontend`)
- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Zustand (state management)
- React Router v7
- react-i18next (Thai/English)
- LINE LIFF SDK

### Backend (`/backend`)
- Node.js 20+ + Express + TypeScript
- Supabase (PostgreSQL with RLS)
- JWT authentication + LINE Login
- Zod validation
- node-cron (background jobs)

## Quick Commands

```bash
# Development (runs both frontend and backend)
npm run dev

# Individual services
npm run dev:frontend    # Vite on port 5173
npm run dev:backend     # Express on port 3001

# Build
npm run build

# Testing
npm test                # Run all tests
npm run test:frontend   # Frontend tests only
npm run test:backend    # Backend tests only

# Linting & Formatting
npm run lint            # Check both
npm run lint:fix        # Fix issues
npm run format          # Format code
```

## Project Structure

```
Security-Guard-HRM-SaaS/
├── backend/
│   ├── src/
│   │   ├── modules/       # Feature modules (auth, employee, shift, attendance, leave, etc.)
│   │   ├── middleware/    # Auth, tenant context, validation, error handling
│   │   ├── config/        # Environment, database, Supabase, LINE config
│   │   ├── utils/         # Helpers (response, errors, JWT, logging)
│   │   ├── jobs/          # Background jobs (node-cron scheduler)
│   │   └── types/         # TypeScript types
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── pages/         # Feature pages (auth, dashboard, employees, shifts, etc.)
│   │   ├── components/    # Reusable UI components by domain
│   │   ├── services/      # API clients (axios-based)
│   │   ├── hooks/         # Custom hooks (useAuth, useEmployees, useLiff, etc.)
│   │   ├── store/         # Zustand state slices
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Utility functions
│   │   ├── i18n/          # Internationalization config
│   │   └── context/       # React Context (Auth, Notification)
│   └── tests/
└── .agent/                # Design docs, requirements, task tracking
```

## Code Style

- **Prettier**: Semi, single quotes, 100 print width, 2-space tabs, trailing commas (es5)
- **ESLint**: TypeScript-eslint with Prettier integration
- **Unused vars**: Prefix with `_` (e.g., `_unusedParam`)
- **Path aliases**: Use `@/*` for imports (maps to `src/*`)

## Architecture Patterns

### Multi-Tenancy
- All tables include `company_id` for tenant isolation
- Row-Level Security (RLS) policies enforce data separation
- Tenant context middleware extracts company from JWT

### User Roles (RBAC)
1. **Super Admin** - Platform-wide access
2. **Company Admin** - Full company access
3. **Manager** - Team management
4. **Guard** - Self-service only

### API Design
- Base URL: `/api/v1`
- RESTful endpoints per module
- Zod schemas for request validation
- Consistent response format via `utils/response.ts`

## Environment Setup

Copy `.env.example` to `.env` in both `/backend` and `/frontend`:

### Backend Environment
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`
- `LIFF_SCHEDULE_ID`, `LIFF_CLOCK_ID`, `LIFF_LEAVE_ID`, `LIFF_PROFILE_ID`

### Frontend Environment
- `VITE_API_BASE_URL` (default: `http://localhost:3001/api/v1`)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_LIFF_*` IDs for LINE LIFF apps

## Testing

- **Framework**: Vitest
- **Frontend**: jsdom environment, React Testing Library
- **Backend**: Node environment
- **Coverage**: V8 provider, run with `npm run test:coverage`

## Database Schema (Key Tables)

- `companies` - Tenant data
- `users` - Auth (email/password + LINE)
- `employees` - Guard profiles
- `shifts` / `shift_templates` - Scheduling
- `attendance_logs` - Clock in/out with GPS
- `leave_requests` / `leave_balances` - Leave management
- `notifications` - LINE + in-app messages

## i18n

- Default language: Thai (`th`)
- Supported: Thai, English
- Frontend: react-i18next with browser detection
- Translation files in `frontend/src/i18n/locales/`

## Documentation

See `.agent/` directory for:
- `design.md` - Full system architecture, database ERD, API specs
- `requirements.md` - Product requirements, user stories
- `tasks.md` - Sprint breakdown and progress tracking
