# Setup Checklist

## Pre-Setup Requirements
- [ ] Python 3.10+ installed
- [ ] Node.js 16+ installed
- [ ] pip and npm available in terminal
- [ ] Backend dependencies installed (`pip install -r requirements.txt`)
- [ ] Frontend dependencies installed (`npm install` in frontend folder)

---

## Backend Setup

### Step 1: Create Migrations
- [ ] `cd backend`
- [ ] `python manage.py makemigrations`
- [ ] `python manage.py migrate`

Expected output:
```
Operations to perform:
  Apply all migrations: admin, auth, contenttypes, sessions, accounts, attendance, payroll
```

### Step 2: Initialize Data
- [ ] `python manage.py init_departments`

Expected output:
```
Created department: Accounting Department
Created department: Design Department
Created department: Engineering Department
Created department: Planning Department
Created department: IT Department
```

### Step 3: Create Superuser
- [ ] `python manage.py createsuperuser`
- [ ] Email: (create one)
- [ ] Password: (create one)

### Step 4: Verify Django Server Works
- [ ] `python manage.py runserver`
- [ ] Go to http://localhost:8000/admin
- [ ] Log in with superuser credentials
- [ ] Should see admin panel

### Step 5: Verify API Endpoints
- [ ] Go to http://localhost:8000/api/accounts/departments/
- [ ] Should see JSON list of 5 departments

---

## Create Test Users

Using Django Admin:

### Test User 1
- [ ] Email: `john.accounting@example.com`
- [ ] First Name: `John`
- [ ] Last Name: `Doe`
- [ ] Department: `Accounting Department`
- [ ] Role: `employee`
- [ ] Set Password: `Test1234!`
- [ ] Verify created

### Test User 2
- [ ] Email: `jane.engineering@example.com`
- [ ] First Name: `Jane`
- [ ] Last Name: `Smith`
- [ ] Department: `Engineering Department`
- [ ] Role: `employee`
- [ ] Set Password: `Test1234!`
- [ ] Verify created

### Test User 3 (Optional)
- [ ] Email: `bob.design@example.com`
- [ ] First Name: `Bob`
- [ ] Last Name: `Johnson`
- [ ] Department: `Design Department`
- [ ] Role: `employee`
- [ ] Set Password: `Test1234!`
- [ ] Verify created

---

## Frontend Setup

### Step 1: Install Dependencies
- [ ] `cd frontend`
- [ ] `npm install`

### Step 2: Start Dev Server
- [ ] `npm run dev`
- [ ] Should show: `VITE v... ready in ... ms`
- [ ] Local URL: http://localhost:5173

### Step 3: Verify Page Loads
- [ ] Go to http://localhost:5173
- [ ] Should see beautiful login page
- [ ] Check for any console errors (F12)

---

## Integration Testing

### Test Login Flow

#### Test 1: Accounting Department
- [ ] Go to http://localhost:5173
- [ ] Email: `john.accounting@example.com`
- [ ] Password: `Test1234!`
- [ ] Click "Sign in"
- [ ] Should redirect to Accounting Dashboard
- [ ] Should show "Welcome, John Doe"
- [ ] Should show "Employee ID: (empty or value)"

#### Test 2: Engineering Department
- [ ] Click Logout
- [ ] Email: `jane.engineering@example.com`
- [ ] Password: `Test1234!`
- [ ] Click "Sign in"
- [ ] Should redirect to Engineering Dashboard
- [ ] Should show "Welcome, Jane Smith"

#### Test 3: Session Persistence
- [ ] While logged in, refresh page (F5)
- [ ] Should stay logged in (not show login page)
- [ ] User info should still display

#### Test 4: Logout
- [ ] Click Logout button
- [ ] Should return to login page
- [ ] Refresh page
- [ ] Should still show login page (session cleared)

#### Test 5: Invalid Credentials
- [ ] Email: `john.accounting@example.com`
- [ ] Password: `wrong`
- [ ] Should show error message
- [ ] Stay on login page

---

## API Testing

### Test Endpoints with curl

#### Departments (No Auth)
- [ ] `curl http://localhost:8000/api/accounts/departments/`
- [ ] Should return JSON array of 5 departments

#### Login
- [ ] Copy-paste login curl command from API_TESTING.md
- [ ] Should return token and user info
- [ ] Save token for next test

#### Profile (With Auth)
- [ ] Use token from login
- [ ] `curl -H "Authorization: Bearer <token>" http://localhost:8000/api/accounts/profile/`
- [ ] Should return user profile data

---

## Browser Developer Tools Check

### Console (F12 → Console)
- [ ] No red errors
- [ ] No CORS warnings
- [ ] Network requests should show 200/201 status

### Application (F12 → Application)
- [ ] localStorage shows:
  - `token` key with JWT value
  - `user` key with user object JSON

### Network (F12 → Network)
- [ ] Login request returns 200
- [ ] Token is valid
- [ ] No failed requests

---

## Django Admin Check

Go to http://localhost:8000/admin

### Users Section
- [ ] Can see all created users
- [ ] Can edit user details
- [ ] Can see Department assignments
- [ ] Can see Role assignments

### Departments Section
- [ ] 5 departments listed
- [ ] All have descriptions
- [ ] Can create new departments

### Roles Section
- [ ] 5 roles listed (admin, manager, supervisor, employee, intern)
- [ ] Can assign to users

### Permissions Section
- [ ] 9 permissions listed
- [ ] Can assign to roles/users

---

## Optional: Create More Test Users

Create users for remaining departments:

### IT Department User
- [ ] Email: `alice.it@example.com`
- [ ] First Name: `Alice`
- [ ] Last Name: `Williams`
- [ ] Department: `IT Department`

### Planning Department User
- [ ] Email: `charlie.planning@example.com`
- [ ] First Name: `Charlie`
- [ ] Last Name: `Brown`
- [ ] Department: `Planning Department`

---

## Final Verification Checklist

- [ ] Backend migrations completed
- [ ] Departments initialized
- [ ] Superuser created
- [ ] Django server running on :8000
- [ ] Frontend server running on :5173
- [ ] Can access http://localhost:5173
- [ ] Can see login page
- [ ] Can log in with test user
- [ ] Redirects to correct department
- [ ] User info displays correctly
- [ ] Logout works
- [ ] Session persists on refresh
- [ ] Django admin accessible
- [ ] API endpoints return data
- [ ] No console errors

---

## Troubleshooting Checklist

If something doesn't work:

### Backend Issues
- [ ] Check Python version: `python --version`
- [ ] Check Django installed: `python -m django --version`
- [ ] Check migrations applied: `python manage.py migrate --list`
- [ ] Check user created: `python manage.py shell` → `from accounts.models import CustomUser; print(CustomUser.objects.all())`
- [ ] Check ports: `netstat -an | grep 8000`
- [ ] Clear database and start over if needed

### Frontend Issues
- [ ] Check Node version: `node --version`
- [ ] Check npm installed: `npm --version`
- [ ] Clear node_modules and reinstall: `rm -r node_modules && npm install`
- [ ] Clear cache: `npm cache clean --force`
- [ ] Check API URL is correct in App.jsx
- [ ] Check browser console for errors

### Connection Issues
- [ ] Make sure both servers running
- [ ] Check CORS settings in Django
- [ ] Check frontend is hitting correct API URL
- [ ] Try accessing API directly: http://localhost:8000/api/accounts/departments/

---

## Success Indicators

You'll know everything is working when:

1. ✅ Login page loads beautifully
2. ✅ Can enter credentials without errors
3. ✅ API responds with token
4. ✅ Token saved to localStorage
5. ✅ Redirected to correct department dashboard
6. ✅ User name displays on dashboard
7. ✅ Logout button clears session
8. ✅ Refresh page stays logged in
9. ✅ Invalid credentials show error
10. ✅ All 5 department dashboards unique

---

## Next Steps After Setup

1. Read IMPLEMENTATION_SUMMARY.md for complete overview
2. Read QUICK_START.md for quick reference
3. Check API_TESTING.md for API examples
4. Start building department-specific features
5. Add attendance tracking
6. Add payroll features
7. Add reports and analytics

---

Good luck! 🚀

If you get stuck, check the documentation files or the code comments.
