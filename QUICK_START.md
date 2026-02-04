# Quick Start - Authentication & Department Routing

## Complete Setup in 5 Steps

### Step 1: Run Migrations
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

### Step 2: Initialize Departments & Roles
```bash
python manage.py init_departments
```

Output will show:
- 5 Departments created (Accounting, Design, Engineering, Planning, IT)
- 5 Roles created (Admin, Manager, Supervisor, Employee, Intern)
- 9 Permissions created

### Step 3: Create Admin Account
```bash
python manage.py createsuperuser
```

Example:
- Email: `admin@example.com`
- Password: `admin123`

### Step 4: Create Test Users via Admin
1. Start Django server: `python manage.py runserver`
2. Go to http://localhost:8000/admin
3. Log in with your admin credentials
4. Click "Users" → "Add User"
5. Fill in example data:

**Test User 1 (Accounting)**
- Email: `john.accounting@example.com`
- First Name: John
- Last Name: Doe
- Department: Accounting Department
- Role: employee
- Set Password: `Test1234!`

**Test User 2 (Engineering)**
- Email: `jane.engineering@example.com`
- First Name: Jane
- Last Name: Smith
- Department: Engineering Department
- Role: employee
- Set Password: `Test1234!`

### Step 5: Test the Login Flow
1. Start frontend: `npm run dev` (in frontend folder)
2. Go to http://localhost:5173
3. Try logging in with:
   - Email: `john.accounting@example.com`
   - Password: `Test1234!`
4. Should see Accounting Department dashboard
5. Try another user to see different department

## API Overview

### Login
```
POST /api/accounts/login/
Content-Type: application/json

{
  "email": "john.accounting@example.com",
  "password": "Test1234!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "email": "john.accounting@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "employee_id": null,
    "department": 1,
    "department_name": "Accounting Department",
    "role": "employee",
    "permissions": []
  }
}
```

## Department Dashboards

After login, users see their department-specific page:

| Department | URL | Features |
|-----------|-----|----------|
| Accounting | Auto redirect | Chart of Accounts, Journal Entries, General Ledger, Financial Reports |
| Design | Auto redirect | Design Projects, Asset Management, Design Guidelines, Team Collaboration |
| Engineering | Auto redirect | Technical Documentation, Build & Deployment, Performance Monitoring, Infrastructure |
| Planning | Auto redirect | Project Planning, Timeline Management, Resource Allocation, Progress Tracking |
| IT | Auto redirect | System Administration, Network Management, Support Ticketing, Security & Compliance |

## Frontend Features Included

✅ Beautiful login page with animations
✅ Email & password authentication
✅ Department-based routing
✅ 5 Department dashboards
✅ User profile display
✅ Logout functionality
✅ Error handling
✅ Session persistence
✅ Loading states
✅ Responsive design

## What's Next?

1. **Attendance Module** - Create attendance tracking page
2. **Payroll Module** - Create payroll management page
3. **Reports** - Add department-specific reports
4. **Notifications** - Add email/in-app notifications
5. **User Management** - Add user management pages
6. **Permissions** - Implement granular permission checks

## Troubleshooting

### "Port already in use"
- Django: `python manage.py runserver 8001`
- Frontend: Update port in package.json

### "Module not found" errors
- Run: `pip install -r requirements.txt`
- Then run migrations again

### Database issues
- Delete `db.sqlite3` and run migrations fresh
- Or for Supabase, check connection string in settings

### Login not working
1. Check user exists: http://localhost:8000/admin/accounts/customuser/
2. Check browser console for errors
3. Verify email spelling (case-sensitive)
4. Test API directly: http://localhost:8000/api/accounts/departments/

## Files Changed/Created

### Backend
- `accounts/models.py` - User, Department, Role, Permission models
- `accounts/views.py` - Login, register, profile endpoints
- `accounts/urls.py` - API routes
- `accounts/admin.py` - Django admin configuration
- `accounts/serializers.py` - DRF serializers
- `accounts/management/commands/init_departments.py` - Initialize data
- `core/settings.py` - Added AUTH_USER_MODEL

### Frontend
- `src/App.jsx` - Complete app with auth & 5 dashboards
  - Login component
  - 5 Department dashboard components
  - Routing logic
  - Session management

## Support

For issues or questions, check:
- `backend/AUTHENTICATION_SETUP.md` - Detailed setup guide
- Django admin at http://localhost:8000/admin
- API endpoints documentation
