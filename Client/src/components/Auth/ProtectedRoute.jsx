// src/components/Auth/ProtectedRoute.jsx
import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ role }) => {
  const { user } = useAuth();
// console.log(user);

  if (!user) {
    // Not logged in
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    // Role doesn't match
    return <Navigate to="/dashboard" replace />;
  }

  // User is authenticated and role matches (if specified)
  return <Outlet />;
};

export default ProtectedRoute;
