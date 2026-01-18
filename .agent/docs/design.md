# Security Guard HRM SaaS - Technical Design Document

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├─────────────────────┬─────────────────────┬─────────────────────────────────┤
│   Web Dashboard     │     LINE LIFF       │     LINE Messaging              │
│   (React SPA)       │   (React in LINE)   │     (Notifications)             │
│   - Admin/Manager   │   - Guard Clock     │     - Push messages             │
│   - Desktop/Mobile  │   - Schedule View   │     - Rich menus                │
│                     │   - Leave Request   │                                 │
└─────────┬───────────┴─────────┬───────────┴─────────────────┬───────────────┘
          │                     │                             │
          │ HTTPS               │ HTTPS                       │ HTTPS
          ▼                     ▼                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY / VERCEL                                 │
│                    (Rate Limiting, CORS, SSL)                               │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js + Express + TypeScript)                │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │    Auth      │  │   Company    │  │   Employee   │  │   Schedule   │    │
│  │   Module     │  │   Module     │  │   Module     │  │   Module     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Attendance  │  │    Leave     │  │ Notification │  │   Report     │    │
│  │   Module     │  │   Module     │  │   Module     │  │   Module     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
├─────────────────────────────────────────────────────────────────────────────┤
│                         Middleware Layer                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   JWT Auth   │  │Tenant Context│  │  Validation  │  │ Error Handler│    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE                                        │
├──────────────────────────┬──────────────────────────────────────────────────┤
│      PostgreSQL          │              Storage                              │
│   (with RLS enabled)     │         (Documents, Images)                       │
├──────────────────────────┴──────────────────────────────────────────────────┤
│                         Row-Level Security                                   │
│              (Tenant isolation via company_id)                              │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                                     │
├─────────────────────┬───────────────────────────────────────────────────────┤
│  LINE Messaging API │              Email Service (future)                    │
│  (Notifications)    │              (SendGrid/SES)                           │
└─────────────────────┴───────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18, TypeScript, Tailwind CSS | Web dashboard & LIFF apps |
| **Routing** | React Router v6 | Client-side navigation |
| **HTTP Client** | Axios | API communication |
| **i18n** | react-i18next | Thai/English support |
| **Backend** | Node.js, Express, TypeScript | REST API server |
| **Database** | Supabase (PostgreSQL) | Data persistence |
| **Auth** | JWT + Supabase Auth | Authentication |
| **Storage** | Supabase Storage | File uploads |
| **Notifications** | LINE Messaging API | Push notifications |
| **Testing** | Vitest | Unit & integration tests |
| **Deployment** | Vercel | Hosting & CI/CD |

---

## 2. Database Design

### 2.1 Entity Relationship Diagram (ERD)

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    companies    │       │      users      │       │   employees     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──┐   │ id (PK)         │◄──┐   │ id (PK)         │
│ name            │   │   │ company_id (FK) │───┘   │ company_id (FK) │───┐
│ slug            │   │   │ employee_id(FK) │───────│ user_id (FK)    │◄──┘
│ logo_url        │   │   │ email           │       │ employee_code   │
│ address         │   │   │ password_hash   │       │ full_name       │
│ phone           │   │   │ role            │       │ phone           │
│ settings (JSON) │   │   │ line_user_id    │       │ hire_date       │
│ created_at      │   │   │ is_active       │       │ status          │
│ updated_at      │   │   │ language        │       │ created_at      │
└─────────────────┘   │   │ created_at      │       └────────┬────────┘
                      │   └─────────────────┘                │
                      │                                      │
                      │   ┌─────────────────┐                │
                      │   │ certifications  │                │
                      │   ├─────────────────┤                │
                      │   │ id (PK)         │                │
                      └───│ company_id (FK) │                │
                          │ employee_id(FK) │────────────────┤
                          │ type            │                │
                          │ issue_date      │                │
                          │ expiry_date     │                │
                          │ document_url    │                │
                          │ status          │                │
                          └─────────────────┘                │
                                                             │
┌─────────────────┐       ┌─────────────────┐                │
│ shift_templates │       │     shifts      │                │
├─────────────────┤       ├─────────────────┤                │
│ id (PK)         │       │ id (PK)         │                │
│ company_id (FK) │       │ company_id (FK) │                │
│ name            │       │ employee_id(FK) │────────────────┤
│ start_time      │       │ template_id(FK) │                │
│ end_time        │       │ date            │                │
│ break_minutes   │       │ start_time      │                │
│ color           │       │ end_time        │                │
│ is_active       │       │ location        │                │
└─────────────────┘       │ status          │                │
                          │ notes           │                │
                          │ published_at    │                │
                          └────────┬────────┘                │
                                   │                         │
                          ┌────────▼────────┐                │
                          │attendance_logs  │                │
                          ├─────────────────┤                │
                          │ id (PK)         │                │
                          │ company_id (FK) │                │
                          │ employee_id(FK) │────────────────┤
                          │ shift_id (FK)   │                │
                          │ clock_in_time   │                │
                          │ clock_in_lat    │                │
                          │ clock_in_lng    │                │
                          │ clock_in_accuracy                │
                          │ clock_out_time  │                │
                          │ clock_out_lat   │                │
                          │ clock_out_lng   │                │
                          │ clock_out_accuracy               │
                          │ status          │                │
                          │ notes           │                │
                          └─────────────────┘                │
                                                             │
┌─────────────────┐       ┌─────────────────┐                │
│  leave_types    │       │ leave_requests  │                │
├─────────────────┤       ├─────────────────┤                │
│ id (PK)         │◄──┐   │ id (PK)         │                │
│ company_id (FK) │   │   │ company_id (FK) │                │
│ name            │   │   │ employee_id(FK) │────────────────┘
│ name_th         │   │   │ leave_type_id   │───┘
│ is_paid         │   │   │ start_date      │
│ max_days        │   │   │ end_date        │
│ requires_approval    │   │ reason          │
│ is_active       │   │   │ status          │
└─────────────────┘   │   │ reviewed_by(FK) │
                      │   │ reviewed_at     │
                      │   │ review_notes    │
                      │   │ document_url    │
                      │   └─────────────────┘
                      │
                      │   ┌─────────────────┐
                      │   │  leave_balances │
                      │   ├─────────────────┤
                      │   │ id (PK)         │
                      │   │ company_id (FK) │
                      │   │ employee_id(FK) │
                      └───│ leave_type_id   │
                          │ year            │
                          │ entitled_days   │
                          │ used_days       │
                          │ pending_days    │
                          └─────────────────┘

┌─────────────────┐
│  notifications  │
├─────────────────┤
│ id (PK)         │
│ company_id (FK) │
│ user_id (FK)    │
│ type            │
│ title           │
│ message         │
│ data (JSON)     │
│ is_read         │
│ sent_via        │
│ sent_at         │
│ created_at      │
└─────────────────┘
```

### 2.2 Table Definitions

#### 2.2.1 companies
```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    settings JSONB DEFAULT '{
        "timezone": "Asia/Bangkok",
        "late_threshold_minutes": 15,
        "early_leave_threshold_minutes": 15,
        "clock_in_before_shift_minutes": 30,
        "leave_reset_month": 1,
        "default_language": "th"
    }'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_companies_slug ON companies(slug);
```

#### 2.2.2 users
```sql
CREATE TYPE user_role AS ENUM ('super_admin', 'company_admin', 'manager', 'guard');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    role user_role NOT NULL DEFAULT 'guard',
    line_user_id VARCHAR(255) UNIQUE,
    line_display_name VARCHAR(255),
    line_picture_url TEXT,
    is_active BOOLEAN DEFAULT true,
    language VARCHAR(5) DEFAULT 'th',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, email)
);

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_line_user_id ON users(line_user_id);
```

#### 2.2.3 employees
```sql
CREATE TYPE employment_status AS ENUM ('active', 'on_leave', 'terminated');

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    employee_code VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    full_name_th VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    hire_date DATE NOT NULL,
    termination_date DATE,
    status employment_status DEFAULT 'active',
    profile_image_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, employee_code)
);

CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_employees_status ON employees(company_id, status);
```

#### 2.2.4 certifications
```sql
CREATE TYPE certification_status AS ENUM ('valid', 'expiring_soon', 'expired');

CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    type_th VARCHAR(100),
    license_number VARCHAR(100),
    issue_date DATE NOT NULL,
    expiry_date DATE,
    document_url TEXT,
    status certification_status DEFAULT 'valid',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_certifications_employee ON certifications(employee_id);
CREATE INDEX idx_certifications_expiry ON certifications(company_id, expiry_date);
```

#### 2.2.5 shift_templates
```sql
CREATE TABLE shift_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    name_th VARCHAR(100),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_minutes INTEGER DEFAULT 0,
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_overnight BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shift_templates_company ON shift_templates(company_id);
```

#### 2.2.6 shifts
```sql
CREATE TYPE shift_status AS ENUM ('draft', 'published', 'cancelled');

CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    template_id UUID REFERENCES shift_templates(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(255),
    status shift_status DEFAULT 'draft',
    notes TEXT,
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(employee_id, date, start_time)
);

CREATE INDEX idx_shifts_company_date ON shifts(company_id, date);
CREATE INDEX idx_shifts_employee_date ON shifts(employee_id, date);
CREATE INDEX idx_shifts_status ON shifts(company_id, status);
```

#### 2.2.7 attendance_logs
```sql
CREATE TYPE attendance_status AS ENUM ('pending', 'on_time', 'late', 'early_leave', 'no_show', 'completed');

CREATE TABLE attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,
    
    clock_in_time TIMESTAMPTZ,
    clock_in_latitude DECIMAL(10, 8),
    clock_in_longitude DECIMAL(11, 8),
    clock_in_accuracy DECIMAL(10, 2),
    
    clock_out_time TIMESTAMPTZ,
    clock_out_latitude DECIMAL(10, 8),
    clock_out_longitude DECIMAL(11, 8),
    clock_out_accuracy DECIMAL(10, 2),
    
    status attendance_status DEFAULT 'pending',
    total_hours DECIMAL(5, 2),
    overtime_hours DECIMAL(5, 2) DEFAULT 0,
    
    notes TEXT,
    adjusted_by UUID REFERENCES users(id),
    adjustment_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attendance_company_date ON attendance_logs(company_id, clock_in_time);
CREATE INDEX idx_attendance_employee ON attendance_logs(employee_id, clock_in_time);
CREATE INDEX idx_attendance_shift ON attendance_logs(shift_id);
```

#### 2.2.8 leave_types
```sql
CREATE TABLE leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    name_th VARCHAR(100),
    description TEXT,
    is_paid BOOLEAN DEFAULT true,
    max_days_per_year INTEGER,
    requires_approval BOOLEAN DEFAULT true,
    requires_document BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leave_types_company ON leave_types(company_id);
```

#### 2.2.9 leave_requests
```sql
CREATE TYPE leave_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(3, 1) NOT NULL,
    reason TEXT,
    document_url TEXT,
    status leave_request_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leave_requests_company ON leave_requests(company_id);
CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(company_id, status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(company_id, start_date, end_date);
```

#### 2.2.10 leave_balances
```sql
CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id),
    year INTEGER NOT NULL,
    entitled_days DECIMAL(4, 1) NOT NULL DEFAULT 0,
    used_days DECIMAL(4, 1) NOT NULL DEFAULT 0,
    pending_days DECIMAL(4, 1) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(employee_id, leave_type_id, year)
);

CREATE INDEX idx_leave_balances_employee ON leave_balances(employee_id, year);
```

#### 2.2.11 notifications
```sql
CREATE TYPE notification_type AS ENUM (
    'shift_published', 'shift_changed', 'shift_reminder',
    'leave_submitted', 'leave_approved', 'leave_rejected',
    'cert_expiring', 'attendance_late', 'attendance_no_show',
    'system'
);

CREATE TYPE notification_channel AS ENUM ('line', 'in_app', 'email');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    title_th VARCHAR(255),
    message TEXT NOT NULL,
    message_th TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    sent_via notification_channel[] DEFAULT '{}',
    line_message_id VARCHAR(255),
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_company ON notifications(company_id, created_at);
```

### 2.3 Row-Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Example RLS policy for employees table
CREATE POLICY "Users can view employees in their company"
ON employees FOR SELECT
USING (company_id = current_setting('app.current_company_id')::uuid);

CREATE POLICY "Admins and managers can insert employees"
ON employees FOR INSERT
WITH CHECK (
    company_id = current_setting('app.current_company_id')::uuid
    AND current_setting('app.current_user_role') IN ('company_admin', 'manager', 'super_admin')
);

-- Similar policies for other tables...
```

---

## 3. API Design

### 3.1 API Structure

Base URL: `/api/v1`

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Email/password login |
| POST | `/auth/line` | LINE Login callback |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Invalidate session |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Reset password |

#### Companies
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/companies` | List all companies (super admin) |
| POST | `/companies` | Create company |
| GET | `/companies/:id` | Get company details |
| PUT | `/companies/:id` | Update company |
| GET | `/companies/:id/settings` | Get company settings |
| PUT | `/companies/:id/settings` | Update settings |

#### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List users (in company) |
| POST | `/users` | Create user |
| GET | `/users/:id` | Get user details |
| PUT | `/users/:id` | Update user |
| DELETE | `/users/:id` | Deactivate user |
| PUT | `/users/:id/link-line` | Link LINE account |
| GET | `/users/me` | Get current user |
| PUT | `/users/me` | Update current user |

#### Employees
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/employees` | List employees |
| POST | `/employees` | Create employee |
| GET | `/employees/:id` | Get employee details |
| PUT | `/employees/:id` | Update employee |
| DELETE | `/employees/:id` | Terminate employee |
| GET | `/employees/:id/certifications` | Get certifications |
| POST | `/employees/:id/certifications` | Add certification |
| GET | `/employees/:id/documents` | Get documents |
| POST | `/employees/:id/documents` | Upload document |

#### Shift Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/shift-templates` | List templates |
| POST | `/shift-templates` | Create template |
| PUT | `/shift-templates/:id` | Update template |
| DELETE | `/shift-templates/:id` | Delete template |

#### Shifts (Schedules)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/shifts` | List shifts (filterable) |
| POST | `/shifts` | Create shift |
| POST | `/shifts/bulk` | Create multiple shifts |
| PUT | `/shifts/:id` | Update shift |
| DELETE | `/shifts/:id` | Delete shift |
| POST | `/shifts/publish` | Publish draft shifts |
| GET | `/shifts/calendar` | Calendar view data |
| GET | `/shifts/my` | Guard's own shifts |

#### Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/attendance` | List attendance records |
| POST | `/attendance/clock-in` | Clock in (with GPS) |
| POST | `/attendance/clock-out` | Clock out (with GPS) |
| PUT | `/attendance/:id` | Adjust attendance |
| GET | `/attendance/my` | Guard's own records |
| GET | `/attendance/today` | Today's status |
| GET | `/attendance/report` | Attendance report |

#### Leave Types
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/leave-types` | List leave types |
| POST | `/leave-types` | Create leave type |
| PUT | `/leave-types/:id` | Update leave type |
| DELETE | `/leave-types/:id` | Delete leave type |

#### Leave Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/leave-requests` | List requests |
| POST | `/leave-requests` | Submit request |
| GET | `/leave-requests/:id` | Get request details |
| PUT | `/leave-requests/:id` | Update request |
| POST | `/leave-requests/:id/approve` | Approve request |
| POST | `/leave-requests/:id/reject` | Reject request |
| POST | `/leave-requests/:id/cancel` | Cancel request |
| GET | `/leave-requests/my` | Guard's own requests |
| GET | `/leave-balances/my` | Guard's balances |

#### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | List notifications |
| PUT | `/notifications/:id/read` | Mark as read |
| PUT | `/notifications/read-all` | Mark all as read |
| GET | `/notifications/unread-count` | Unread count |

#### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/attendance` | Attendance summary |
| GET | `/reports/leave` | Leave usage report |
| GET | `/reports/overtime` | Overtime report |
| GET | `/reports/export` | Export to CSV |

### 3.2 Request/Response Examples

#### Clock In
```typescript
// POST /api/v1/attendance/clock-in
// Request
{
  "shift_id": "uuid", // optional, auto-detect if not provided
  "latitude": 13.7563,
  "longitude": 100.5018,
  "accuracy": 10.5
}

// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "clock_in_time": "2025-01-17T08:00:00+07:00",
    "status": "on_time",
    "shift": {
      "id": "uuid",
      "start_time": "08:00",
      "end_time": "17:00",
      "location": "Building A"
    }
  }
}
```

#### Create Leave Request
```typescript
// POST /api/v1/leave-requests
// Request
{
  "leave_type_id": "uuid",
  "start_date": "2025-01-20",
  "end_date": "2025-01-21",
  "reason": "Family event"
}

// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "pending",
    "total_days": 2,
    "leave_type": {
      "name": "Annual Leave",
      "name_th": "ลาพักร้อน"
    },
    "balance_after": {
      "entitled": 10,
      "used": 3,
      "pending": 2,
      "remaining": 5
    }
  }
}
```

### 3.3 Error Response Format

```typescript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "message_th": "การตรวจสอบล้มเหลว",
    "details": [
      {
        "field": "start_date",
        "message": "Start date must be in the future",
        "message_th": "วันเริ่มต้นต้องเป็นวันในอนาคต"
      }
    ]
  }
}
```

### 3.4 Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or expired token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `CONFLICT` | 409 | Resource conflict (e.g., double booking) |
| `ALREADY_CLOCKED_IN` | 400 | Guard already clocked in |
| `SHIFT_NOT_FOUND` | 400 | No shift for today |
| `INSUFFICIENT_BALANCE` | 400 | Not enough leave days |

---

## 4. Frontend Architecture

### 4.1 Project Structure

```
frontend/
├── public/
│   ├── locales/
│   │   ├── en/
│   │   │   └── translation.json
│   │   └── th/
│   │       └── translation.json
│   └── index.html
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Calendar.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── LiffLayout.tsx
│   │   ├── employees/
│   │   │   ├── EmployeeList.tsx
│   │   │   ├── EmployeeForm.tsx
│   │   │   └── EmployeeCard.tsx
│   │   ├── shifts/
│   │   │   ├── ShiftCalendar.tsx
│   │   │   ├── ShiftForm.tsx
│   │   │   └── ShiftCard.tsx
│   │   ├── attendance/
│   │   │   ├── ClockInButton.tsx
│   │   │   ├── AttendanceList.tsx
│   │   │   └── AttendanceStatus.tsx
│   │   └── leave/
│   │       ├── LeaveRequestForm.tsx
│   │       ├── LeaveRequestList.tsx
│   │       └── LeaveBalance.tsx
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── ForgotPasswordPage.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
│   │   ├── employees/
│   │   │   ├── EmployeesPage.tsx
│   │   │   └── EmployeeDetailPage.tsx
│   │   ├── shifts/
│   │   │   └── SchedulePage.tsx
│   │   ├── attendance/
│   │   │   └── AttendancePage.tsx
│   │   ├── leave/
│   │   │   └── LeavePage.tsx
│   │   ├── reports/
│   │   │   └── ReportsPage.tsx
│   │   ├── settings/
│   │   │   └── SettingsPage.tsx
│   │   └── liff/
│   │       ├── LiffSchedulePage.tsx
│   │       ├── LiffClockPage.tsx
│   │       ├── LiffLeavePage.tsx
│   │       └── LiffProfilePage.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCompany.ts
│   │   ├── useEmployees.ts
│   │   ├── useShifts.ts
│   │   ├── useAttendance.ts
│   │   ├── useLeave.ts
│   │   ├── useLiff.ts
│   │   └── useGeolocation.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.service.ts
│   │   ├── employee.service.ts
│   │   ├── shift.service.ts
│   │   ├── attendance.service.ts
│   │   ├── leave.service.ts
│   │   └── notification.service.ts
│   ├── store/
│   │   ├── index.ts
│   │   ├── authSlice.ts
│   │   └── uiSlice.ts
│   ├── types/
│   │   ├── index.ts
│   │   ├── user.types.ts
│   │   ├── employee.types.ts
│   │   ├── shift.types.ts
│   │   ├── attendance.types.ts
│   │   └── leave.types.ts
│   ├── utils/
│   │   ├── date.ts
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── constants.ts
│   ├── i18n/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── routes.tsx
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── vitest.config.ts
```

### 4.2 Key Components

#### Route Configuration
```typescript
// src/routes.tsx
const routes = [
  // Public routes
  { path: '/login', element: <LoginPage /> },
  
  // Dashboard routes (admin/manager)
  {
    path: '/',
    element: <DashboardLayout />,
    children: [
      { path: '', element: <DashboardPage /> },
      { path: 'employees', element: <EmployeesPage /> },
      { path: 'employees/:id', element: <EmployeeDetailPage /> },
      { path: 'schedule', element: <SchedulePage /> },
      { path: 'attendance', element: <AttendancePage /> },
      { path: 'leave', element: <LeavePage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  
  // LIFF routes (guard)
  {
    path: '/liff',
    element: <LiffLayout />,
    children: [
      { path: 'schedule', element: <LiffSchedulePage /> },
      { path: 'clock', element: <LiffClockPage /> },
      { path: 'leave', element: <LiffLeavePage /> },
      { path: 'profile', element: <LiffProfilePage /> },
    ],
  },
];
```

---

## 5. Backend Architecture

### 5.1 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── supabase.ts
│   │   ├── line.ts
│   │   └── env.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── tenant.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── rate-limit.middleware.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── auth.validation.ts
│   │   ├── company/
│   │   │   ├── company.controller.ts
│   │   │   ├── company.service.ts
│   │   │   ├── company.routes.ts
│   │   │   └── company.validation.ts
│   │   ├── user/
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.routes.ts
│   │   │   └── user.validation.ts
│   │   ├── employee/
│   │   │   ├── employee.controller.ts
│   │   │   ├── employee.service.ts
│   │   │   ├── employee.routes.ts
│   │   │   └── employee.validation.ts
│   │   ├── shift/
│   │   │   ├── shift.controller.ts
│   │   │   ├── shift.service.ts
│   │   │   ├── shift.routes.ts
│   │   │   └── shift.validation.ts
│   │   ├── attendance/
│   │   │   ├── attendance.controller.ts
│   │   │   ├── attendance.service.ts
│   │   │   ├── attendance.routes.ts
│   │   │   └── attendance.validation.ts
│   │   ├── leave/
│   │   │   ├── leave.controller.ts
│   │   │   ├── leave.service.ts
│   │   │   ├── leave.routes.ts
│   │   │   └── leave.validation.ts
│   │   ├── notification/
│   │   │   ├── notification.controller.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── notification.routes.ts
│   │   │   └── line-messaging.service.ts
│   │   └── report/
│   │       ├── report.controller.ts
│   │       ├── report.service.ts
│   │       └── report.routes.ts
│   ├── types/
│   │   ├── express.d.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── response.ts
│   │   ├── errors.ts
│   │   ├── date.ts
│   │   ├── jwt.ts
│   │   └── logger.ts
│   ├── app.ts
│   └── server.ts
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### 5.2 Middleware Flow

```
Request
   │
   ▼
┌─────────────────┐
│  Rate Limiter   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   CORS / JSON   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auth Middleware│ ─── Validate JWT, set req.user
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Tenant Middleware│ ─── Set company context, validate access
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Validation    │ ─── Validate request body/params
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Controller    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Service      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Supabase     │
└────────┬────────┘
         │
         ▼
Response
```

---

## 6. LINE LIFF Integration

### 6.1 LIFF Configuration

```typescript
// LIFF App IDs (to be created in LINE Developers Console)
const LIFF_IDS = {
  schedule: 'xxxx-xxxxxxxx',  // View schedule
  clock: 'xxxx-xxxxxxxx',     // Clock in/out
  leave: 'xxxx-xxxxxxxx',     // Leave request
  profile: 'xxxx-xxxxxxxx',   // Profile view
};
```

### 6.2 LIFF Initialization

```typescript
// src/hooks/useLiff.ts
import liff from '@line/liff';

export const useLiff = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInClient, setIsInClient] = useState(false);
  const [profile, setProfile] = useState<LiffProfile | null>(null);

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: import.meta.env.VITE_LIFF_ID });
        setIsInitialized(true);
        setIsInClient(liff.isInClient());
        
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setProfile(profile);
        }
      } catch (error) {
        console.error('LIFF initialization failed:', error);
      }
    };
    
    initLiff();
  }, []);

  const login = () => {
    if (!liff.isLoggedIn()) {
      liff.login();
    }
  };

  const getAccessToken = () => liff.getAccessToken();

  return { isInitialized, isInClient, profile, login, getAccessToken };
};
```

### 6.3 GPS Capture Flow

```typescript
// src/hooks/useGeolocation.ts
export const useGeolocation = () => {
  const [location, setLocation] = useState<GeolocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestLocation = () => {
    setIsLoading(true);
    setError(null);
    
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return { location, error, isLoading, requestLocation };
};
```

---

## 7. Internationalization (i18n)

### 7.1 Translation Structure

```json
// public/locales/th/translation.json
{
  "common": {
    "save": "บันทึก",
    "cancel": "ยกเลิก",
    "delete": "ลบ",
    "edit": "แก้ไข",
    "search": "ค้นหา",
    "loading": "กำลังโหลด...",
    "error": "เกิดข้อผิดพลาด",
    "success": "สำเร็จ"
  },
  "auth": {
    "login": "เข้าสู่ระบบ",
    "logout": "ออกจากระบบ",
    "email": "อีเมล",
    "password": "รหัสผ่าน"
  },
  "attendance": {
    "clockIn": "ลงเวลาเข้า",
    "clockOut": "ลงเวลาออก",
    "onTime": "ตรงเวลา",
    "late": "สาย",
    "requestingLocation": "กำลังขอตำแหน่ง..."
  },
  "leave": {
    "requestLeave": "ขอลา",
    "annualLeave": "ลาพักร้อน",
    "sickLeave": "ลาป่วย",
    "pending": "รอการอนุมัติ",
    "approved": "อนุมัติแล้ว",
    "rejected": "ไม่อนุมัติ"
  }
}
```

### 7.2 i18n Configuration

```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'th',
    supportedLngs: ['th', 'en'],
    defaultNS: 'translation',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
```

---

## 8. Security Considerations

### 8.1 Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │  Server  │     │ Supabase │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     │ Login Request  │                │
     │───────────────►│                │
     │                │ Verify         │
     │                │───────────────►│
     │                │◄───────────────│
     │                │                │
     │ Access + Refresh Tokens         │
     │◄───────────────│                │
     │                │                │
     │ API Request    │                │
     │ (Bearer Token) │                │
     │───────────────►│                │
     │                │ Validate JWT   │
     │                │ Set Tenant     │
     │                │ Execute        │
     │◄───────────────│                │
```

### 8.2 Security Checklist

- [ ] JWT tokens with short expiry (15 min access, 7 day refresh)
- [ ] HttpOnly cookies for refresh tokens
- [ ] Rate limiting on auth endpoints
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Supabase parameterized queries)
- [ ] XSS prevention (React auto-escaping)
- [ ] CORS configuration
- [ ] RLS policies on all tables
- [ ] Audit logging for sensitive operations
- [ ] HTTPS only

---

## 9. Deployment Architecture

### 9.1 Vercel Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                         Vercel                               │
├─────────────────────────┬───────────────────────────────────┤
│    Frontend (React)     │      Backend (Express)            │
│    Static + SSR         │      Serverless Functions         │
│    /                    │      /api/*                       │
└─────────────────────────┴───────────────────────────────────┘
                │                         │
                │                         │
                ▼                         ▼
┌─────────────────────────────────────────────────────────────┐
│                       Supabase                               │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │   PostgreSQL    │  │     Storage     │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Environment Variables

```env
# Backend
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
JWT_SECRET=xxx
JWT_REFRESH_SECRET=xxx

# LINE
LINE_CHANNEL_ID=xxx
LINE_CHANNEL_SECRET=xxx
LINE_CHANNEL_ACCESS_TOKEN=xxx

# Frontend
VITE_API_URL=https://api.example.com
VITE_LIFF_ID=xxx
VITE_SUPABASE_URL=xxx
VITE_SUPABASE_ANON_KEY=xxx
```

---

## 10. Future Considerations

### 10.1 Scalability
- Consider connection pooling (PgBouncer) for high traffic
- Implement caching layer (Redis) for frequently accessed data
- Consider queue system for notifications (BullMQ)

### 10.2 Features for Phase 2
- Multiple job sites with geofencing
- Payroll integration
- Advanced reporting and analytics
- Mobile native apps
- Biometric verification (photo on clock-in)
- Client portal

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2025-01-17 | Claude | Initial draft |
