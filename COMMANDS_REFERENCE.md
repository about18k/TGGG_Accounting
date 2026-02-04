# Commands Reference

## Django Commands

### Setup & Migrations
```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# View migration status
python manage.py migrate --list

# Show SQL for a migration
python manage.py sqlmigrate accounts 0001

# Revert migrations
python manage.py migrate accounts 0001  # Go to specific migration
```

### User Management
```bash
# Create superuser (admin)
python manage.py createsuperuser

# Create regular user
python manage.py shell
>>> from accounts.models import CustomUser
>>> user = CustomUser.objects.create_user(
...     email='test@example.com',
...     password='password123',
...     first_name='John',
...     last_name='Doe'
... )
>>> exit()

# Change user password
python manage.py changepassword username

# Delete all users
python manage.py shell
>>> from accounts.models import CustomUser
>>> CustomUser.objects.all().delete()
>>> exit()

# List all users
python manage.py shell
>>> from accounts.models import CustomUser
>>> for user in CustomUser.objects.all():
...     print(f"{user.email} - {user.department}")
>>> exit()
```

### Database Management
```bash
# Shell access
python manage.py shell

# Database backup
python manage.py dumpdata > backup.json

# Database restore
python manage.py loaddata backup.json

# Delete and recreate database
# 1. Delete db.sqlite3
# 2. Run migrations again
python manage.py migrate
```

### Initialize Data
```bash
# Create departments, roles, permissions
python manage.py init_departments

# Run custom command
python manage.py init_departments --help
```

### Server & Debugging
```bash
# Run development server
python manage.py runserver

# Run on different port
python manage.py runserver 8001

# Run on all interfaces
python manage.py runserver 0.0.0.0:8000

# Check for issues
python manage.py check

# Collect static files
python manage.py collectstatic

# Show all available commands
python manage.py help
```

### Testing
```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test accounts

# Run specific test class
python manage.py test accounts.tests.LoginTestCase

# Run with verbose output
python manage.py test -v 2

# Run with coverage
coverage run --source='.' manage.py test
coverage report
coverage html
```

---

## Frontend Commands

### Installation & Setup
```bash
# Install dependencies
npm install

# Update dependencies
npm update

# Install specific package
npm install axios

# Install dev dependency
npm install --save-dev eslint

# Remove node_modules and reinstall
rm -r node_modules
npm install
```

### Development
```bash
# Start dev server (Vite)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests (if configured)
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### Troubleshooting
```bash
# Clear npm cache
npm cache clean --force

# Clear Vite cache
rm -r node_modules/.vite

# Reinstall everything
rm -r node_modules
rm package-lock.json
npm install

# Check for security vulnerabilities
npm audit

# Fix security issues
npm audit fix
```

---

## API Testing Commands

### Using curl

#### Get Departments (No Auth)
```bash
curl http://localhost:8000/api/accounts/departments/
```

#### Login
```bash
curl -X POST http://localhost:8000/api/accounts/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

#### Get Profile (With Auth)
```bash
curl -X GET http://localhost:8000/api/accounts/profile/ \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Pretty Print JSON
```bash
curl http://localhost:8000/api/accounts/departments/ | python -m json.tool
```

### Using Postman

1. Create new request
2. Select method (GET/POST)
3. Enter URL: `http://localhost:8000/api/accounts/login/`
4. Go to Body tab
5. Select "raw" and "JSON"
6. Enter JSON data
7. Click Send

---

## Git Commands

### Basic Workflow
```bash
# Check status
git status

# Add changes
git add .
git add filename.py

# Commit changes
git commit -m "Add authentication system"

# Push to remote
git push origin main

# Pull from remote
git pull origin main

# View log
git log --oneline
```

### Branching
```bash
# Create new branch
git checkout -b feature/authentication

# Switch branches
git checkout main

# Delete branch
git branch -d feature/authentication

# List branches
git branch -a
```

---

## Database Commands

### PostgreSQL/Supabase (psql)

```bash
# Connect to database
psql -h localhost -U postgres -d dbname

# List databases
\l

# Connect to database
\c database_name

# List tables
\dt

# Describe table
\d tablename

# Run SQL
SELECT * FROM accounts_customuser;

# Exit
\q
```

### SQLite

```bash
# Access database
sqlite3 db.sqlite3

# List tables
.tables

# Describe table
.schema tablename

# Run SQL
SELECT * FROM accounts_customuser;

# Exit
.quit
```

---

## Python/Virtual Environment Commands

### Virtual Environment (venv)
```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Deactivate
deactivate

# Check active environment
which python  # (Mac/Linux)
where python  # (Windows)
```

### Package Management
```bash
# Install requirements
pip install -r requirements.txt

# Install specific package
pip install django

# Install specific version
pip install django==6.0.1

# Upgrade package
pip install --upgrade django

# List installed packages
pip list

# Show package info
pip show django

# Uninstall package
pip uninstall django

# Generate requirements file
pip freeze > requirements.txt

# Check for outdated packages
pip list --outdated
```

---

## Docker Commands (Optional)

### Build & Run
```bash
# Build image
docker build -t tggg-accounting:latest .

# Run container
docker run -p 8000:8000 tggg-accounting:latest

# Run with environment variables
docker run -e DEBUG=False -p 8000:8000 tggg-accounting:latest

# Stop container
docker stop container_id

# Remove container
docker rm container_id

# View logs
docker logs container_id

# Execute command in running container
docker exec -it container_id python manage.py shell
```

---

## Useful Shortcuts & Tips

### VS Code Terminal
```bash
# Open new terminal
Ctrl+`

# Split terminal
Ctrl+Shift+5

# Kill terminal
Ctrl+Shift+`
```

### Quick Navigation
```bash
# Go to project root
cd ~/Documents/TGGG_Accounting

# Go to backend
cd backend

# Go to frontend
cd ../frontend

# Go back
cd ..

# List files
ls  # (Mac/Linux)
dir  # (Windows)

# Create directory
mkdir dirname

# Create file
touch filename.py
```

### Text Search
```bash
# Search in current directory
grep -r "search_term" .

# Search in specific file
grep "search_term" filename.py

# Search with line numbers
grep -n "search_term" filename.py

# Exclude directories
grep -r "search_term" . --exclude-dir=node_modules
```

---

## Essential Workflow

### Daily Development

```bash
# 1. Start new session
cd ~/Documents/TGGG_Accounting/backend

# 2. Activate virtual environment
source venv/bin/activate  # Mac/Linux
# or
venv\Scripts\activate  # Windows

# 3. Start Django server
python manage.py runserver

# 4. In new terminal, start frontend
cd ../frontend
npm run dev

# 5. Access application
# Frontend: http://localhost:5173
# Backend: http://localhost:8000
# Admin: http://localhost:8000/admin

# 6. When done, stop servers
# Terminal 1: Ctrl+C
# Terminal 2: Ctrl+C

# 7. Deactivate environment
deactivate
```

### Making Changes

```bash
# 1. Make code changes
# Edit files in your IDE

# 2. Backend changes with new model fields
python manage.py makemigrations
python manage.py migrate

# 3. Test changes
# Manual testing in browser
# OR use Postman/curl

# 4. Commit changes (Git)
git add .
git commit -m "Description of changes"
git push origin main

# 5. Restart servers if needed
# Usually hot-reload handles it
```

### Debugging

```bash
# Django Debug
python manage.py shell
>>> from accounts.models import CustomUser
>>> users = CustomUser.objects.all()
>>> print(users)

# Frontend Debug
# F12 → Console tab
# Check for JavaScript errors
# Check Network tab for API calls

# Check server logs
# Terminal running Django shows all requests

# Database Debug
# Go to admin: http://localhost:8000/admin
# View all data in GUI
```

---

## Quick Reference Table

| Task | Command |
|------|---------|
| Start Django | `python manage.py runserver` |
| Start Frontend | `npm run dev` |
| Make migrations | `python manage.py makemigrations` |
| Apply migrations | `python manage.py migrate` |
| Create superuser | `python manage.py createsuperuser` |
| Init departments | `python manage.py init_departments` |
| Access admin | http://localhost:8000/admin |
| Access app | http://localhost:5173 |
| Django shell | `python manage.py shell` |
| Install deps (BE) | `pip install -r requirements.txt` |
| Install deps (FE) | `npm install` |
| Run tests | `python manage.py test` |
| Check errors | `python manage.py check` |
| API test | `curl http://localhost:8000/api/...` |
| Kill process | `Ctrl+C` |
| Exit shell | `exit()` |
| Git status | `git status` |
| Git commit | `git commit -m "message"` |
| Git push | `git push origin main` |

---

## Emergency Fixes

### Everything Broken - Clean Slate
```bash
# Backend
cd backend
rm db.sqlite3
python manage.py migrate
python manage.py init_departments
python manage.py createsuperuser
python manage.py runserver

# Frontend (in new terminal)
cd frontend
rm -r node_modules
npm install
npm run dev
```

### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000  # Mac/Linux
netstat -ano | findstr :8000  # Windows

# Kill process
kill -9 <PID>  # Mac/Linux
taskkill /PID <PID> /F  # Windows

# Use different port
python manage.py runserver 8001
```

### Module Not Found
```bash
# Reinstall dependencies
pip install -r requirements.txt

# Check Python path
python -c "import sys; print(sys.path)"

# Verify installation
pip list
```

---

Good luck with development! 🚀

Save this file for quick reference while coding!
