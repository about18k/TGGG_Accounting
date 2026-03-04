import api from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * JWT Token Management Utility
 * Handles token storage, retrieval, refresh, and API calls with automatic token injection
 */

// Get access token from storage
export const getAccessToken = () => {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('access_token') ||
    sessionStorage.getItem('access_token')
  );
};

// Get refresh token from storage
export const getRefreshToken = () => {
  return localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
};

// Store tokens
export const storeTokens = (accessToken, refreshToken, rememberMe = false) => {
  // Keep compatibility with App.jsx which reads "token"
  localStorage.setItem('token', accessToken);

  if (rememberMe) {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  } else {
    sessionStorage.setItem('access_token', accessToken);
    sessionStorage.setItem('refresh_token', refreshToken);
  }
};

// Clear tokens
export const clearTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
  localStorage.removeItem('rememberMe');
};

// Refresh access token using refresh token
export const refreshAccessToken = async () => {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post(`/token/refresh/`, {
      refresh: refreshToken
    });

    const newAccessToken = response.data.access;

    // Store new token in same location as old one
    if (localStorage.getItem('access_token') || localStorage.getItem('token')) {
      localStorage.setItem('token', newAccessToken);
      localStorage.setItem('access_token', newAccessToken);
    } else {
      sessionStorage.setItem('access_token', newAccessToken);
    }

    return newAccessToken;
  } catch (error) {
    clearTokens();
    throw error;
  }
};

// Verify token validity
export const verifyToken = async (token) => {
  try {
    await api.post(`/token/verify/`, { token });
    return true;
  } catch {
    return false;
  }
};

const createApiClient = () => {
  return api;
};

export const apiClient = createApiClient();

// Helper function to check if user is authenticated
export const isAuthenticated = () => {
  return !!getAccessToken();
};

// Helper function to logout
export const logout = () => {
  clearTokens();
  window.location.href = '/login';
};
