import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Adjust path if needed

const AdminSidebar = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout(); // Your context should call the API to logout & clear state
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
      justifyContent: 'space-between', // To push logout to bottom
    }}>
      <div>
        <h2>Admin Menu</h2>
        <nav>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li><a href="/admin/dashboard" style={{ color: 'white', textDecoration: 'none' }}>Dashboard</a></li>
            <li><a href="/admin/users" style={{ color: 'white', textDecoration: 'none' }}>Users</a></li>
            <li><a href="/admin/settings" style={{ color: 'white', textDecoration: 'none' }}>Settings</a></li>
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
