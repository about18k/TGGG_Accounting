import { useState, useEffect, useCallback } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// Extracted modules
import { isTokenExpired, getPageFromPath, getDefaultPage } from './utils/authUtils';
import './services/api'; // registers shared axios instance + interceptors
import Login from './pages/Login';
import { renderDashboard } from './routes/routeConfig';
import * as notifService from './services/notificationService';

// AdminDashboard removed. Use StudioHeadDashboard instead.

export default function App() {
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

  const markNotificationRead = useCallback(async (notif) => {
    if (notif.is_read) return;
    try {
      await notifService.markNotificationRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    } catch (err) { /* ignore */ }
  }, []);

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

  const handleNavigate = (page) => {
    const rawTarget = String(page || 'attendance').trim().replace(/^\//, '') || 'attendance';
    const [nextPage = 'attendance', ...queryParts] = rawTarget.split('?');
    const nextQuery = queryParts.join('?');
    const targetPath = nextQuery ? `/dashboard/${nextPage}?${nextQuery}` : `/dashboard/${nextPage}`;
    setCurrentPage(nextPage || 'attendance');
    navigate(targetPath);
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#021B2C', color: 'white' }}>Loading...</div>;
  }

  const defaultDashboardPath = `/dashboard/${currentPage || 'attendance'}`;

  return (
    <>
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: '#001f35',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
          },
          classNames: {
            title: 'text-white font-semibold text-sm',
            description: 'text-[#F27229] text-xs',
            error: 'border-[#d4183d]/30 bg-[#001f35]',
            success: 'border-[#F27229]/30 bg-[#001f35]',
          },
        }}
        richColors={false}
        expand={false}
        closeButton
        style={{ zIndex: 99999 }}
      />
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
