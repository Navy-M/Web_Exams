// src/components/Auth/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../Common/LoadingSpinner';

const ProtectedRoute = ({ role }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="route-loader">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
