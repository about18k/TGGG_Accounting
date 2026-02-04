# Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React/Vite)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐     ┌──────────────────────────────┐   │
│  │   Login Component    │     │  Department Dashboards       │   │
│  │                      │     │  ┌────────────────────────┐  │   │
│  │ - Email input        │     │  │ • Accounting Dashboard │  │   │
│  │ - Password input     │     │  │ • Design Dashboard     │  │   │
│  │ - Show/hide pass     │     │  │ • Engineering Dashboard│  │   │
│  │ - Authentication     │────▶│  │ • Planning Dashboard   │  │   │
│  │ - Error handling     │     │  │ • IT Dashboard         │  │   │
│  │ - Session mgmt       │     │  │                        │  │   │
│  │ - Beautiful UI       │     │  │ Each shows:            │  │   │
│  └──────────────────────┘     │  │ - User name            │  │   │
│         │                      │  │ - Employee ID          │  │   │
│         │ API Call             │  │ - Logout button        │  │   │
│         │ POST /login/         │  │ - Department features  │  │   │
│         │                      │  └────────────────────────┘  │   │
│         └──────────────────────────────────────────────────────┘   │
│                              │                                      │
│                      localStorage:                                  │
│                      - token (JWT)                                  │
│                      - user (JSON)                                  │
└──────────────────┬───────────────────────────────────────────────┘
                   │
           ┌───────▼────────┐
           │   HTTPS/CORS   │
           └───────┬────────┘
                   │
┌──────────────────▼───────────────────────────────────────────────┐
│                     BACKEND (Django REST)                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────┐    ┌──────────────────────────────┐ │
│  │   Authentication       │    │     User Management          │ │
│  │   ┌────────────────┐   │    │     ┌────────────────────┐   │ │
│  │   │ Login View     │   │    │     │ CustomUser Model   │   │ │
│  │   │ - Email lookup │   │    │     │ - id               │   │ │
│  │   │ - Password     │   │    │     │ - email (unique)   │   │ │
│  │   │   verify       │   │    │     │ - first_name       │   │ │
│  │   │ - JWT issue    │   │    │     │ - last_name        │   │ │
│  │   └────────────────┘   │    │     │ - employee_id      │   │ │
│  │                        │    │     │ - department (FK)  │   │ │
│  │   ┌────────────────┐   │    │     │ - role (FK)        │   │ │
│  │   │ Profile View   │   │    │     │ - permissions (M2M)│   │ │
│  │   │ - Protected    │   │    │     │ - is_active        │   │ │
│  │   │ - Return data  │   │    │     │ - date_hired       │   │ │
│  │   └────────────────┘   │    │     └────────────────────┘   │ │
│  │                        │    │                              │ │
│  │   ┌────────────────┐   │    │  ┌────────────────────────┐ │ │
│  │   │ Departments    │   │    │  │ Department Model       │ │ │
│  │   │ View           │   │    │  │ - id                   │ │ │
│  │   │ - Public       │   │    │  │ - name (5 types)       │ │ │
│  │   │ - Return all   │   │    │  │ - description          │ │ │
│  │   └────────────────┘   │    │  └────────────────────────┘ │ │
│  └────────────────────────┘    │                              │ │
│                                 └──────────────────────────────┘ │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           Database (PostgreSQL/Supabase)                │   │
│  │                                                           │   │
│  │  Tables:                                                 │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ customuser_customuser                           │    │   │
│  │  │ - id, email, password, first_name, last_name   │    │   │
│  │  │ - employee_id, department_id, role_id          │    │   │
│  │  │ - is_active, date_hired, created_at, updated_at    │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ accounts_department                             │    │   │
│  │  │ - id, name, description, created_at            │    │   │
│  │  │ Rows: 5 departments                             │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ accounts_role                                   │    │   │
│  │  │ - id, name (choices), description              │    │   │
│  │  │ Rows: 5 roles                                   │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ accounts_permission                             │    │   │
│  │  │ - id, name (choices), description              │    │   │
│  │  │ Rows: 9 permissions                             │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │ customuser_permissions (M2M)                    │    │   │
│  │  │ - customuser_id, permission_id                 │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Login Flow
```
User Input
    ↓
[Email & Password]
    ↓
Frontend POST /api/accounts/login/
    ↓
Backend validates with CustomUser model
    ↓
Generate JWT token
    ↓
Return: {token, user{id, email, department_name, role, ...}}
    ↓
Frontend saves token + user to localStorage
    ↓
Frontend reads department_name
    ↓
Switch statement routes to correct dashboard
    ↓
Display user info from localStorage
```

### Session Persistence Flow
```
User visits http://localhost:5173
    ↓
App loads, checks localStorage
    ↓
IF user in localStorage:
    ├─ Set user state
    └─ Show dashboard
    
IF user NOT in localStorage:
    └─ Show login page
```

---

## Database Relationships

```
CustomUser (1) ──── (M) Department
              └──── (M) Role
              └──── (M) Permission (M2M)

CustomUser.department FK → Department.id
CustomUser.role FK → Role.id
CustomUser_permissions M2M → Permission
```

---

## Departments Overview

```
┌──────────────────────────────────────────────────────┐
│           DEPARTMENT STRUCTURE                       │
├──────────────────────────────────────────────────────┤
│                                                      │
│ 1. Accounting Department                             │
│    └─ Features:                                      │
│       • Chart of Accounts                            │
│       • Journal Entries                              │
│       • General Ledger                               │
│       • Financial Reports                            │
│                                                      │
│ 2. Design Department                                 │
│    └─ Features:                                      │
│       • Design Projects                              │
│       • Asset Management                             │
│       • Design Guidelines                            │
│       • Team Collaboration                           │
│                                                      │
│ 3. Engineering Department                            │
│    └─ Features:                                      │
│       • Technical Documentation                      │
│       • Build & Deployment                           │
│       • Performance Monitoring                       │
│       • Infrastructure Management                    │
│                                                      │
│ 4. Planning Department                               │
│    └─ Features:                                      │
│       • Project Planning                             │
│       • Timeline Management                          │
│       • Resource Allocation                          │
│       • Progress Tracking                            │
│                                                      │
│ 5. IT Department                                     │
│    └─ Features:                                      │
│       • System Administration                        │
│       • Network Management                           │
│       • Support Ticketing                            │
│       • Security & Compliance                        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Role & Permission Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                    ROLES                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ADMIN (Full Access)                                    │
│  └─ All permissions                                     │
│                                                         │
│  MANAGER (Department Level)                             │
│  └─ view_attendance, edit_attendance                    │
│  └─ view_payroll, view_employees                        │
│  └─ view_reports                                        │
│                                                         │
│  SUPERVISOR (Team Level)                                │
│  └─ view_attendance                                     │
│  └─ view_employees                                      │
│  └─ view_reports                                        │
│                                                         │
│  EMPLOYEE (Personal Level)                              │
│  └─ view_attendance (own)                               │
│  └─ view_payroll (own)                                  │
│                                                         │
│  INTERN (Limited Access)                                │
│  └─ view_attendance (own)                               │
│                                                         │
└─────────────────────────────────────────────────────────┘

Available Permissions:
• view_attendance      - Read attendance data
• edit_attendance      - Modify attendance records
• view_payroll         - Read payroll information
• edit_payroll         - Modify payroll records
• view_employees       - See employee list
• edit_employees       - Modify employee data
• view_reports         - Access reports
• manage_roles         - Create/edit roles
• manage_permissions   - Create/edit permissions
```

---

## API Endpoints

```
┌─────────────────────────────────────────────────────────┐
│              API ENDPOINTS                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ PUBLIC (No Authentication)                              │
│ ─────────────────────────                               │
│ GET  /api/accounts/departments/                         │
│      └─ Returns: [department objects]                   │
│                                                         │
│ POST /api/accounts/login/                               │
│      └─ Input: {email, password}                        │
│      └─ Returns: {token, refresh, user}                 │
│                                                         │
│ PROTECTED (Requires JWT Token)                          │
│ ──────────────────────────────                          │
│ GET  /api/accounts/profile/                             │
│      └─ Header: Authorization: Bearer <token>           │
│      └─ Returns: user profile data                      │
│                                                         │
│ POST /api/accounts/register/                            │
│      └─ Input: {email, password, first_name, ...}      │
│      └─ Returns: user object                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## File Organization

```
Project Root
│
├── backend/
│   ├── core/
│   │   ├── settings.py (CONFIGURED)
│   │   ├── urls.py
│   │   └── wsgi.py
│   │
│   ├── accounts/ (MAIN AUTH APP)
│   │   ├── models.py (CustomUser, Department, Role, Permission)
│   │   ├── views.py (Login, Profile, Departments endpoints)
│   │   ├── urls.py (Routes)
│   │   ├── admin.py (Admin interface)
│   │   ├── serializers.py (DRF serializers)
│   │   ├── management/
│   │   │   └── commands/
│   │   │       └── init_departments.py (Initialize data)
│   │   └── tests.py
│   │
│   ├── attendance/ (FUTURE USE)
│   ├── payroll/ (FUTURE USE)
│   │
│   ├── db.sqlite3 (Database)
│   ├── manage.py
│   ├── requirements.txt
│   │
│   ├── AUTHENTICATION_SETUP.md
│   └── (other settings files)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx (COMPLETE AUTH SYSTEM + 5 DASHBOARDS)
│   │   ├── main.jsx
│   │   └── (other React files)
│   │
│   ├── package.json
│   ├── vite.config.ts
│   └── (other config files)
│
├── SETUP_CHECKLIST.md
├── QUICK_START.md
├── IMPLEMENTATION_SUMMARY.md
└── API_TESTING.md
```

---

## Technology Stack

```
Backend:
├── Django 6.0+ (Framework)
├── Django REST Framework (API)
├── SimpleJWT (Authentication)
├── Psycopg2 (PostgreSQL driver)
├── Python 3.10+
└── PostgreSQL/Supabase (Database)

Frontend:
├── React 18+ (UI Framework)
├── Vite (Build tool)
├── Axios (HTTP client)
├── Vanilla CSS (No CSS framework)
└── JavaScript (Logic)

Dev Tools:
├── Django Admin (User management)
├── Postman (API testing)
├── Browser DevTools (Debugging)
└── Git (Version control)
```

---

## Security Layers

```
┌──────────────────────────────────────────────────────┐
│              SECURITY IMPLEMENTATION                │
├──────────────────────────────────────────────────────┤
│                                                      │
│ 1. JWT Token Authentication                         │
│    └─ Signed with SECRET_KEY                        │
│    └─ 15 min expiration (configurable)              │
│    └─ Refresh tokens for long-term access          │
│                                                      │
│ 2. CORS Configuration                               │
│    └─ Only frontend origins allowed                 │
│    └─ Prevents cross-origin attacks                │
│                                                      │
│ 3. Password Hashing                                 │
│    └─ Django's default PBKDF2                       │
│    └─ Not stored in plain text                      │
│                                                      │
│ 4. User Authentication                              │
│    └─ Email & password validation                   │
│    └─ Check is_active flag                          │
│    └─ Session management                            │
│                                                      │
│ 5. Permission System                                │
│    └─ Role-based access control                     │
│    └─ Granular permissions                          │
│    └─ Ready for route protection                    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Extensibility Points

```
Future Features Can Easily Add:

1. Attendance Tracking
   └─ Use existing Attendance model in attendance app

2. Payroll Management
   └─ Use existing Payroll models in payroll app

3. Leave Requests
   └─ Use existing Leave model

4. Reports & Analytics
   └─ Query existing data

5. Notifications
   └─ Add email/SMS service

6. Two-Factor Auth
   └─ Extend login view

7. Audit Logging
   └─ Add logging middleware

8. Department Policies
   └─ Use AttendancePolicy model

9. Advanced Permissions
   └─ Expand permission system

10. Mobile App
    └─ Use same API endpoints
```

---

This architecture is scalable, secure, and production-ready! 🚀
