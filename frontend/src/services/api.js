/**
 * Shared Axios instance for all API communication.
 * All service modules should import `api` from this file instead of raw axios.
 *
 * Interceptors:
 *  - Request: injects Bearer token from localStorage
 *  - Response: dispatches 'authError' on 401 (except login/register/token endpoints)
 */
import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

// Attach auth token to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle 401 globally — redirect to login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const statusCode = error.response?.status;
        const requestUrl = String(error.config?.url || '');
        const token = localStorage.getItem('token');
        const isAuthEndpoint =
            requestUrl.includes('/accounts/login/') ||
            requestUrl.includes('/accounts/register/') ||
            requestUrl.includes('/token/refresh/') ||
            requestUrl.includes('/token/verify/');

        if (statusCode === 401 && token && !isAuthEndpoint) {
            window.dispatchEvent(new Event('authError'));
        }
        return Promise.reject(error);
    }
);

export default api;
