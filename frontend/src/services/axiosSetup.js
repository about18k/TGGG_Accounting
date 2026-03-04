/**
 * Axios interceptors extracted from App.jsx
 * Import this file once at app startup to register the interceptors.
 */
import axios from 'axios';

// Add auth token to all outgoing requests
axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Handle 401 Unauthorized responses globally
axios.interceptors.response.use((response) => {
    return response;
}, (error) => {
    const statusCode = error.response?.status;
    const requestUrl = String(error.config?.url || '');
    const token = localStorage.getItem('token');
    const isLoginOrRegisterRequest =
        requestUrl.includes('/accounts/login/') ||
        requestUrl.includes('/accounts/register/') ||
        requestUrl.includes('/token/refresh/') ||
        requestUrl.includes('/token/verify/');

    if (statusCode === 401 && token && !isLoginOrRegisterRequest) {
        window.dispatchEvent(new Event('authError'));
    }
    return Promise.reject(error);
});
