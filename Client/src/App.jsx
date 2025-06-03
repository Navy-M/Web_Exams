import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import LoginPage from "./pages/Public/LoginPage";
import AdminDashboard from "./pages/Admin/Dashboard";
import UserDashboard from "./pages/User/Dashboard";
import TestsPage from "./pages/Admin/TestsPage";
import StarterTestPage from "./pages/User/StarterTestPage"

const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />

    {/* Admin routes */}
    <Route element={<ProtectedRoute role="admin" />}>
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/tests" element={<TestsPage />} />
      <Route path="/admin/users" element={<TestsPage />} />
    </Route>

    {/* User routes */}
    <Route element={<ProtectedRoute role="user" />}>
      <Route path="/dashboard" element={<UserDashboard />} />
      <Route path="/users/tests" element={<TestsPage />} />
      <Route path="/users/starttest/:testId" element={<StarterTestPage />} />
    </Route>

    {/* Redirect unknown routes */}
    <Route path="*" element={<Navigate to="/login" />} />
  </Routes>
);

export default App;
