import { useState, useEffect, useCallback } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';

// Extracted modules
import { isTokenExpired, getPageFromPath, getDefaultPage } from './utils/authUtils';
import './services/api'; // registers shared axios instance + interceptors
import Login from './pages/Login';
import { preloadDashboardAssets, renderDashboard } from './routes/routeConfig';
import * as notifService from './services/notificationService';
import { getMyAttendance, getTodayAttendance } from './services/attendanceService';
import { getMyOvertime } from './services/overtimeService';
import { configureToastConsistency } from './utils/toastUtils';

// AdminDashboard removed. Use StudioHeadDashboard instead.

export default function App() {
  configureToastConsistency();

  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [accountingSection, setAccountingSection] = useState('main');
  const [currentPage, setCurrentPage] = useState('attendance');
  const [notifications, setNotifications] = useState([]);

  const token = localStorage.getItem('token');

  const fetchNotifications = useCallback(async () => {
    const t = localStorage.getItem('token');
    if (!t || isTokenExpired(t)) return;
    try {
      const data = await notifService.getNotifications();
      setNotifications(data);
    } catch (err) {
      // silently ignore — user may not have todos access
    }
  }, []);

  const handleNavigate = (page) => {
    const rawTarget = String(page || 'attendance').trim().replace(/^\//, '') || 'attendance';
    const [nextPage = 'attendance', ...queryParts] = rawTarget.split('?');
    const nextQuery = queryParts.join('?');
    const targetPath = nextQuery ? `/dashboard/${nextPage}?${nextQuery}` : `/dashboard/${nextPage}`;
    setCurrentPage(nextPage || 'attendance');
    navigate(targetPath);
  };

  const resolveNotificationTarget = (notif) => {
    if (!notif) return '';
    const role = String(user?.role || '').toLowerCase();
    const dept = String(user?.department_name || user?.department || '').toLowerCase();
    const isAccountingUser = role === 'accounting' || dept === 'accounting' || dept === 'accounting department';
    const type = String(notif.type || '').toLowerCase();

    if (isAccountingUser) {
      if (type === 'user_verified') return 'employees';
      if (type === 'matreq_ceo_approved') return 'material-requests';
      if (type === 'payroll_processed' || type === 'contribution_added' || type === 'contribution_updated') return 'payroll';
      if (type === 'ot_submitted' || type === 'ot_rejected' || type === 'ot_fully_approved') return 'otrequest';
      if (type === 'calendar_non_work_day') return 'events';
      if (type.startsWith('task_') || type.startsWith('dept_task_')) return 'todo';
    }

    return '';
  };

  const markNotificationRead = useCallback(async (notif) => {
    const target = resolveNotificationTarget(notif);
    const type = String(notif?.type || '').toLowerCase();
    if (!notif?.is_read) {
      try {
        await notifService.markNotificationRead(notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      } catch (err) { /* ignore */ }
    }
    if (target) {
      if (target === 'todo') {
        if (type.startsWith('dept_') || type.startsWith('dept_task_')) {
          localStorage.setItem('todoActiveTab', 'department');
        } else if (type.startsWith('task_') || type.startsWith('completion_')) {
          localStorage.setItem('todoActiveTab', 'team');
        }
      }
      handleNavigate(target);
    }
  }, [handleNavigate, resolveNotificationTarget]);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await notifService.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) { /* ignore */ }
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    if (savedUser && savedToken && !isTokenExpired(savedToken)) {
      setUser(JSON.parse(savedUser));
    } else if (savedUser || savedToken) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    setLoading(false);

    const handleUserUpdate = () => {
      const updatedUser = localStorage.getItem('user');
      if (updatedUser) {
        setUser(JSON.parse(updatedUser));
      }
    };

    window.addEventListener('userUpdated', handleUserUpdate);
    return () => window.removeEventListener('userUpdated', handleUserUpdate);
  }, []);

  // Handle global auth errors (e.g. 401 Unauthorized)
  useEffect(() => {
    const handleAuthError = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setCurrentPage('attendance');
      navigate('/login', { replace: true });
    };

    window.addEventListener('authError', handleAuthError);
    return () => window.removeEventListener('authError', handleAuthError);
  }, [navigate]);

  // Fetch notifications on mount + poll every 30s
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  useEffect(() => {
    if (!location.pathname.startsWith('/dashboard')) {
      return;
    }

    const pageFromPath = getPageFromPath(location.pathname);
    setCurrentPage((prev) => (prev === pageFromPath ? prev : pageFromPath));
  }, [location.pathname]);

  // Warm likely-next chunks/data during idle time so subsequent page switches are faster.
  useEffect(() => {
    if (!user || !location.pathname.startsWith('/dashboard')) {
      return;
    }

    const scheduleIdle = window.requestIdleCallback
      ? window.requestIdleCallback.bind(window)
      : (cb) => setTimeout(cb, 180);
    const cancelIdle = window.cancelIdleCallback
      ? window.cancelIdleCallback.bind(window)
      : clearTimeout;

    const idleHandle = scheduleIdle(() => {
      preloadDashboardAssets({
        role: user.role,
        departmentName: user.department_name,
        currentPage,
      });

      const warmups = [
        getMyAttendance(),
        getTodayAttendance(),
        notifService.getNotifications(),
      ];

      // Only prefetch overtime when not already on that page.
      if (currentPage !== 'overtime') {
        warmups.push(getMyOvertime());
      }

      Promise.allSettled(warmups);
    });

    return () => {
      cancelIdle(idleHandle);
    };
  }, [user?.id, user?.role, user?.department_name, currentPage, location.pathname]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    const defaultPage = getDefaultPage(userData);
    setCurrentPage(defaultPage);
    navigate(`/dashboard/${defaultPage}`, { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentPage('attendance');
    navigate('/login', { replace: true });
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#021B2C', color: 'white' }}>Loading...</div>;
  }

  const defaultDashboardPath = `/dashboard/${currentPage || 'attendance'}`;

  return (
    <>
      <Toaster position="top-right" richColors={false} expand visibleToasts={4} closeButton />
      <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={defaultDashboardPath} replace /> : <Login onLoginSuccess={handleLoginSuccess} />}
      />
      <Route
        path="/dashboard"
        element={user ? <Navigate to={`/dashboard/${getDefaultPage(user)}`} replace /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/dashboard/:page"
        element={user ? renderDashboard({
          user, token, currentPage, accountingSection, activeTab,
          setActiveTab, setAccountingSection, handleLogout, handleNavigate, fetchNotifications,
          notifications, markNotificationRead, markAllNotificationsRead,
        }) : <Navigate to="/login" replace />}
      />
      <Route
        path="*"
        element={<Navigate to={user ? defaultDashboardPath : '/login'} replace />}
      />
      </Routes>
    </>
  );
}
