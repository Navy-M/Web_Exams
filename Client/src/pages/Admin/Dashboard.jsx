// src/pages/Admin/Dashboard.jsx
import { useMemo } from "react";
import AdminSidebar from "../../components/Admin/AdminSidebar";
import "../../styles/admin.css";
import { useAuth } from "../../context/AuthContext";
import { Test_Cards, jobRequirements } from "../../services/dummyData";
import UsersPage from "./UsersPage";
import AdminTestsManager from "./AdminTestsManager";
import TestsStatus from "./TestsStatus";
import { useSyncedTab } from "../../hooks/useSyncedTab";

const ALLOWED_TABS = ["dashboard", "users", "tests"];

const TITLES_FA = {
  dashboard: "داشبورد",
  users: "کاربران",
  tests: "تست‌ها",
};

const AdminDashboard = () => {
  const { user } = useAuth();

  const { tab, switchTab } = useSyncedTab({
    allowed: ALLOWED_TABS,
    defaultTab: "users",
    storageKey: "admin:activeTab",
    queryKey: "tab",
    titles: TITLES_FA,
  });

  const displayName = useMemo(
    () => user?.profile?.fullName || user?.username || "ادمین",
    [user]
  );

  const content = useMemo(() => {
    switch (tab) {
      case "dashboard":
        return <TestsStatus />;
      case "users":
        return <UsersPage />;
      case "tests":
        return (
          <AdminTestsManager
            Test_Cards={Test_Cards}
            jobRequirements={jobRequirements}
          />
        );
      default:
        return null;
    }
  }, [tab]);

  return (
    <div className="admin-dashboard" dir="rtl">
      <AdminSidebar activeTab={tab} setActiveTab={switchTab} />
      <main className="admin-main" role="main" aria-live="polite">
        <header className="admin-header">
          <h1 className="admin-greet">سلام {displayName}</h1>
        </header>
        {content}
      </main>
    </div>
  );
};

export default AdminDashboard;
