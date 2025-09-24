import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import LoginPage from "./pages/Public/LoginPage";
import SignupPage from "./pages/Public/SignupPage";
import AdminDashboard from "./pages/Admin/Dashboard";
import UserDashboard from "./pages/User/Dashboard";
import TestsPage from "./pages/Admin/AdminTestManager/TestsPage";
import StarterTestPage from "./pages/User/StarterTestPage"
import CompleteProfilePage from "./pages/User/CompleteProfilePage"


// Block right-click
document.addEventListener("contextmenu", (e) => e.preventDefault());

// Block text drag
document.addEventListener("dragstart", (e) => e.preventDefault());

const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />

    {/* Admin routes */}
    <Route element={<ProtectedRoute role="admin" />}>
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/tests" element={<TestsPage />} />
      <Route path="/admin/users" element={<TestsPage />} />
    </Route>

    {/* User routes */}
    <Route element={<ProtectedRoute role="user" />}>
      <Route path="/dashboard" element={<UserDashboard />} />
      <Route path="/users/completeProfile" element={<CompleteProfilePage />} />
      <Route path="/users/tests" element={<TestsPage />} />
      <Route path="/users/starttest/:testId" element={<StarterTestPage />} />
    </Route>

    {/* Redirect unknown routes */}
    <Route path="*" element={<Navigate to="/login" />} />
  </Routes>
  
);

export default App;
