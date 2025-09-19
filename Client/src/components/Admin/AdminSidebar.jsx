import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Sun, Moon, Menu, X, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

import DashboardIcon from "../../assets/AdminSidebar/Dashboard_Icon.png";
import UsersIcon from "../../assets/AdminSidebar/Users_Icon.png";
import TestsIcon from "../../assets/AdminSidebar/Tests_Icon.png";

import "../../styles/AdminSidebar.css";

const SIDEBAR_COLLAPSED_KEY = "admin:sidebarCollapsed";

const AdminSidebar = ({ activeTab, setActiveTab }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  // responsive + persisted collapse
  const getInitialCollapsed = () => {
    try {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (saved !== null) return saved === "1";
    } catch {}
    if (typeof window !== "undefined") return window.innerWidth <= 768;
    return false;
  };

  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsed);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  const handleResize = useCallback(() => {
    const mobile = window.innerWidth <= 768;
    setIsMobile(mobile);
    if (mobile) setIsCollapsed(true);
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, isCollapsed ? "1" : "0");
    } catch {}
  }, [isCollapsed]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const menuItems = useMemo(
    () => [
      { key: "dashboard", label: "داشبورد مدیریت", icon: DashboardIcon },
      { key: "users", label: "کاربران", icon: UsersIcon },
      { key: "tests", label: "آزمون‌ها", icon: TestsIcon },
    ],
    []
  );

  const toggleCollapse = () => setIsCollapsed((v) => !v);

  const onSelect = (key) => {
    setActiveTab(key);
    if (isMobile) setIsCollapsed(true); // auto-close on mobile
  };

  return (
    <aside
      className={[
        "admin-sidebar",
        isCollapsed ? "collapsed" : "",
        isMobile ? "mobile" : "",
      ].join(" ")}
      aria-label="منوی مدیر"
    >
      {/* Top bar: logo / toggle / theme */}
      <div className="sidebar-top" style={{ display: isCollapsed ? "block" : "flex" }}>
        {isMobile ? (
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? "باز کردن منو" : "بستن منو"}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        ) : (
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? "باز کردن منو" : "جمع کردن منو"}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <Menu size={18} /> : <X size={18} />}
          </button>
        )}

        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-pressed={isDark}
          aria-label={isDark ? "تغییر به حالت روشن" : "تغییر به حالت تیره"}
          title={isDark ? "Light mode" : "Dark mode"}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          {!isCollapsed && <span>{isDark ? "حالت روشن" : "حالت تیره"}</span>}
        </button>
      </div>
      <br />
      <br />
      {!isCollapsed && (
        <h2 className="sidebar-title" aria-hidden="true">
          منوی مدیریت
        </h2>
      )}
<br />

      
      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="بخش‌ها">
        <ul>
          {menuItems.map((item) => {
            const active = activeTab === item.key;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => onSelect(item.key)}
                  className={`sidebar-link ${active ? "active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  title={isCollapsed ? item.label : undefined}
                >
                  <img
                    src={item.icon}
                    alt=""
                    className="sidebar-icon"
                    aria-hidden="true"
                  />
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer actions */}
      <div className="sidebar-footer">
        <button type="button" className="logout-btn" onClick={handleLogout}>
          <LogOut size={16} />
          {!isCollapsed && <span>خروج</span>}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
