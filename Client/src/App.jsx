import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import LoginPage from './pages/Public/LoginPage';
import AdminDashboard from './pages/Admin/Dashboard';
import UserDashboard from './pages/User/Dashboard';

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute role="admin" />}>
        <Route path="/admin/*" element={<AdminDashboard />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard/*" element={<UserDashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
};

export default App;