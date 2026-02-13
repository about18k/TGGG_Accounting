import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * JWT Token Management Utility
 * Handles token storage, retrieval, refresh, and API calls with automatic token injection
 */

// Get access token from storage
export const getAccessToken = () => {
  return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
};

// Get refresh token from storage
export const getRefreshToken = () => {
  return localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
};

// Store tokens
export const storeTokens = (accessToken, refreshToken, rememberMe = false) => {
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

    const response = await axios.post(`${API_URL}/token/refresh/`, {
      refresh: refreshToken
    });

    const newAccessToken = response.data.access;
    
    // Store new token in same location as old one
    if (localStorage.getItem('access_token')) {
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
    await axios.post(`${API_URL}/token/verify/`, { token });
    return true;
  } catch {
    return false;
  }
};

// Create axios instance with automatic token injection and refresh
const createApiClient = () => {
  const client = axios.create({
    baseURL: API_URL,
  });

  // Request interceptor - add token to headers
  client.interceptors.request.use(
    (config) => {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - handle 401 and refresh token
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // If 401 and we haven't already tried to refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const newToken = await refreshAccessToken();
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return client(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          clearTokens();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
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
