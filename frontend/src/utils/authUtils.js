/**
 * Auth utility functions extracted from App.jsx
 */

export const isTokenExpired = (token) => {
    if (!token) return true;
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        const payload = JSON.parse(atob(padded));
        if (!payload?.exp) return false;
        return Date.now() >= payload.exp * 1000;
    } catch {
        return false;
    }
};

export const getPageFromPath = (pathname) => {
    if (!pathname.startsWith('/dashboard')) {
        return 'attendance';
    }
    const parts = pathname.split('/').filter(Boolean);
    return parts[1] || 'attendance';
};
