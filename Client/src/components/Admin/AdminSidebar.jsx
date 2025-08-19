import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext'; 
import { Sun, Moon, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardIcon from "../../assets/AdminSidebar/Dashboard_Icon.png";
import UsersIcon from "../../assets/AdminSidebar/Users_Icon.png";
import TestsIcon from "../../assets/AdminSidebar/Tests_Icon.png";
import "../../styles/AdminSidebar.css"

const AdminSidebar = ({ activeTab, setActiveTab }) => {
  const { logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const handleResize = () => setIsMobile(window.innerWidth <= 768);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const menuItems = [
    { key: 'dashboard', label: 'داشبورد مدیریت', icon: DashboardIcon },
    { key: 'users', label: 'کاربران', icon: UsersIcon },
    { key: 'tests', label: 'آزمون ها', icon: TestsIcon },
  ];

  return (
    <aside
      className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobile ? 'mobile' : ''}`}
    >
      {/* Mobile Hamburger */}
      {/* {isMobile && (
        <button className="sidebar-toggle-btn" onClick={() => setIsCollapsed(prev => !prev)}>
          {isCollapsed ? <Menu /> : <X />}
        </button>
      )} */}

      <div className="sidebar-content">
        <button className="theme-toggle-btn" onClick={toggleTheme}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          {/* {!isCollapsed && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>} */}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {!isCollapsed  && <h2 className="sidebar-title"><br/> Admin Menu <br/><hr/></h2>}

        <nav className="sidebar-nav">
          <ul>
            {menuItems.map(item => (
              <li key={item.key}>
                <button
                  onClick={() => setActiveTab(item.key)}
                  className={`sidebar-link ${activeTab === item.key ? 'active' : ''}`}
                >
                  <img src={item.icon} alt="icon" className="sidebar-icon" />
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <button className="logout-btn" onClick={handleLogout}>
        {!isCollapsed ? 'Logout' : '❌'}
      </button>
    </aside>
  );
};

export default AdminSidebar;
