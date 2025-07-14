import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext'; 
import { Sun, Moon, Icon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardIcon from "../../assets/AdminSidebar/Dashboard_Icon.png"
import UsersIcon from "../../assets/AdminSidebar/Users_Icon.png"
import TestsIcon from "../../assets/AdminSidebar/Tests_Icon.png"


const AdminSidebar = ({ activeTab, setActiveTab }) => {
  const { logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const menuItems = [
    { key: 'dashboard', label: 'Dashboard' , icon: DashboardIcon},
    { key: 'users', label: 'Users' , icon: UsersIcon},
    { key: 'tests', label: 'Tests' , icon: TestsIcon},
  ];

  return (
    <aside style={{
      width: '250px',
      backgroundColor: '#2563eb',
      color: 'white',
      height: '100vh',
      padding: '1rem',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'fixed'
    }}>
      <div>
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          style={{
            marginTop: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: '1px solid white',
            color: 'white',
            padding: '0.4rem 0.8rem',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background 0.3s',
          }}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>

        <h2 style={{ marginTop: '2rem' }}>Admin Menu</h2>

        <nav style={{ marginTop: '1rem' }}>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {menuItems.map(item => (
              <li key={item.key}>
                <button
                  onClick={() => setActiveTab(item.key)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    padding: '0.5rem 0',
                    textAlign: 'left',
                    alignContent: "center",
                    alignItems: "center",
                    display:"flex",
                    cursor: 'pointer',
                    fontWeight: activeTab === item.key ? 'bold' : 'normal',
                    textDecoration: activeTab === item.key ? 'underline' : 'none',
                    width: '100%',
                  }}
                >
                  <img src={item.icon} alt='icon' style={{
                    paddingRight: "0.5rem",
                    width: '35px',
                    height: '100%',

                  }}/>
                  {/* <br/> */}
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <button
        onClick={handleLogout}
        style={{
          backgroundColor: '#ef4444',
          border: 'none',
          color: 'white',
          padding: '0.5rem 1rem',
          cursor: 'pointer',
          borderRadius: '4px',
          alignSelf: 'flex-start',
        }}
      >
        Logout
      </button>
    </aside>
  );
};

export default AdminSidebar;
