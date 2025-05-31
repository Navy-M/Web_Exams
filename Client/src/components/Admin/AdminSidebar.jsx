import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext'; 
import { Sun, Moon } from 'lucide-react';

const AdminSidebar = ({ activeTab, setActiveTab }) => {
  const { logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await logout();
      // You may want to redirect after logout or reset UI state
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const menuItems = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'users', label: 'Users' },
    { key: 'tests', label: 'Tests' },
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
                    cursor: 'pointer',
                    fontWeight: activeTab === item.key ? 'bold' : 'normal',
                    textDecoration: activeTab === item.key ? 'underline' : 'none',
                    width: '100%',
                  }}
                >
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
