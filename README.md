# TGGG Accounting System

A modern full-stack accounting management system built with React + Vite (frontend) and Django (backend).

## 🚀 Tech Stack

### Frontend
- **React 18** - JavaScript UI library (no TypeScript)
- **Vite** - Ultra-fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible component library
- **Radix UI** - Headless UI primitives
- **Recharts** - Charting library for data visualization
- **Lucide React** - Icon library

### Backend
- **Django** - Secure Python web framework
- **Python** - Backend programming language

## 📋 Prerequisites

Before running this project, make sure you have installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Python** (v3.8 or higher) - [Download here](https://www.python.org/)
- **pip** (comes with Python)

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd TGGG_Accounting
```

### 2. Frontend Setup (React + Vite)

```bash
# Install all frontend dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run at **http://localhost:3000**

### 3. Backend Setup (Django)

```bash
# Create a virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install Python dependencies
pip install django djangorestframework django-cors-headers

# Run database migrations
python manage.py migrate

# Create a superuser (admin account)
python manage.py createsuperuser

# Start the Django server
python manage.py runserver
```

The backend will run at **http://localhost:8000**

## 📦 Key Dependencies

### Frontend (package.json)
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.487.0",
    "tailwind-merge": "^2.5.5",
    "@radix-ui/react-*": "Various UI primitives"
  },
  "devDependencies": {
    "vite": "^6.3.5",
    "@vitejs/plugin-react": "^4.2.1",
    "tailwindcss": "^4.1.3"
  }
}
```

### Backend (Python)
```txt
Django>=4.2
djangorestframework>=3.14
django-cors-headers>=4.0
```

## 🎯 Available Scripts

### Frontend
```bash
npm run dev      # Start development server (port 3000)
npm run build    # Build for production
npm run preview  # Preview production build
```

### Backend
```bash
python manage.py runserver        # Start Django server
python manage.py migrate          # Run database migrations
python manage.py createsuperuser  # Create admin user
python manage.py makemigrations   # Create new migrations
```

## 🔧 Project Structure

```
TGGG_Accounting/
├── src/                        # Frontend source code
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── DashboardLayout.jsx
│   │   ├── DashboardOverview.jsx
│   │   ├── EmployeeManagement.jsx
│   │   ├── AttendanceLeave.jsx
│   │   ├── PayrollManagement.jsx
│   │   └── AIAssistant.jsx
│   ├── lib/                  # Utility functions
│   ├── assets/               # Images, fonts, etc.
│   ├── App.jsx               # Main app component
│   ├── main.jsx              # Entry point
│   └── index.css             # Global styles
├── core/                      # Django core settings
├── backend/                   # Django apps
├── public/                    # Static assets
├── index.html                # HTML template
├── vite.config.js            # Vite configuration
├── tailwind.config.js        # Tailwind configuration
├── package.json              # Frontend dependencies
└── manage.py                 # Django management script
```

## 🔐 Security Features (Django)

- SQL injection protection (built-in ORM)
- XSS (Cross-Site Scripting) protection
- CSRF (Cross-Site Request Forgery) protection
- Secure password hashing (PBKDF2)
- Session security
- HTTPS/SSL support

## 👥 For Collaborators

### To start working on this project:

1. **Pull the latest code**
   ```bash
   git pull origin main
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies** (in virtual environment)
   ```bash
   pip install -r requirements.txt
   ```

4. **Run both servers**
   ```bash
   # Terminal 1 - Frontend
   npm run dev
   
   # Terminal 2 - Backend
   python manage.py runserver
   ```

### Important Notes:
- ✅ This project uses **JavaScript (JSX)**, NOT TypeScript
- ✅ All `.tsx` files have been converted to `.jsx`
- ✅ No TypeScript dependencies required
- ✅ Vite provides fast hot module replacement (HMR)
- ✅ Django backend handles all data securely

## 📚 Learn More

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Django Documentation](https://docs.djangoproject.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
# Accounting_TGGG
# TGGG_Accounting
# TGGG_Accounting
# TGGG_Accounting
# TGGG_Accounting
# TGGG_Accounting
