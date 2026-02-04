import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../utils/tokenManager';

/**
 * ProtectedRoute Component
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
