import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext'; 
import { Sun, Moon } from 'lucide-react';

const AdminSidebar = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

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
        <br/>
        <h2>Admin Menu</h2>
        <br/>
        <br/>
        
        <nav>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li><a href="/admin/dashboard" style={{ color: 'white', textDecoration: 'none' }}>Dashboard</a></li>
            <li><a href="/admin/users" style={{ color: 'white', textDecoration: 'none' }}>Users</a></li>
            <li><a href="/admin/settings" style={{ color: 'white', textDecoration: 'none' }}>Tests</a></li>
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
