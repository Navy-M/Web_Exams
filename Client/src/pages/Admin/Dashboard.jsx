import { useEffect, useMemo, useState, useCallback } from "react";
import AdminSidebar from "../../components/Admin/AdminSidebar";
import "../../styles/admin.css";
import { useAuth } from "../../context/AuthContext";
import { Test_Cards, jobRequirements } from "../../services/dummyData";
import UsersPage from "./UsersPage";
import AdminTestsManager from "./AdminTestsManager";
import TestsStatus from "./TestsStatus";

const ALLOWED_TABS = ["dashboard", "users", "tests"];
const TAB_KEY = "admin:activeTab";

const AdminDashboard = () => {
  const { user } = useAuth();

  // initial tab: ?tab -> localStorage -> 'users'
  const getInitialTab = () => {
    const q = new URLSearchParams(window.location.search).get("tab");
    if (q && ALLOWED_TABS.includes(q)) return q;
    const saved = localStorage.getItem(TAB_KEY);
    return ALLOWED_TABS.includes(saved) ? saved : "users";
  };

  const [activeTab, _setActiveTab] = useState(getInitialTab);

  // guard: only allow known tabs
  const setActiveTab = useCallback((next) => {
    if (ALLOWED_TABS.includes(next)) _setActiveTab(next);
  }, []);

  // keep URL + localStorage in sync
  useEffect(() => {
    localStorage.setItem(TAB_KEY, activeTab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);
    window.history.replaceState({}, "", url);
  }, [activeTab]);

  // nicer title
  useEffect(() => {
    const map = { dashboard: "داشبورد", users: "کاربران", tests: "تست‌ها" };
    document.title = `Admin · ${map[activeTab] || ""}`;
  }, [activeTab]);

  const displayName = useMemo(
    () => user?.profile?.fullName || user?.username || "ادمین",
    [user]
  );

  const content = useMemo(() => {
    switch (activeTab) {
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
  }, [activeTab]);

  return (
    <div className="admin-dashboard" dir="rtl">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="admin-main" role="main" aria-live="polite">
        <header className="admin-header">
          <h1 className="admin-greet">Hi {displayName}</h1>
        </header>

        {/* main content */}
        {content}
      </main>
    </div>
  );
};

export default AdminDashboard;
