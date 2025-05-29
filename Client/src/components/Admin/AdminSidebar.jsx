// src/components/Admin/AdminSidebar.jsx
import React from 'react';

const AdminSidebar = () => {
  return (
    <aside style={{
      width: '250px',
      backgroundColor: '#2563eb',
      color: 'white',
      height: '100vh',
      padding: '1rem',
      boxSizing: 'border-box',
    }}>
      <h2>Admin Menu</h2>
      <nav>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li><a href="/admin/dashboard" style={{ color: 'white', textDecoration: 'none' }}>Dashboard</a></li>
          <li><a href="/admin/users" style={{ color: 'white', textDecoration: 'none' }}>Users</a></li>
          <li><a href="/admin/settings" style={{ color: 'white', textDecoration: 'none' }}>Settings</a></li>
        </ul>
      </nav>
    </aside>
  );
};

export default AdminSidebar;
