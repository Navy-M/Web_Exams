import { useState } from 'react';
import AdminSidebar from '../../components/Admin/AdminSidebar';
import '../../styles/admin.css';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const{user} = useAuth();

  return (
    <div className="admin-dashboard">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <h1>Admin Dashboard</h1>
      <p>Welcome, {user.email}</p>

      <main className="admin-main">
        {activeTab === 'users' && <div>User Management</div>}
        {activeTab === 'tests' && <div>Test Management</div>}
        {activeTab === 'results' && <div>Results Overview</div>}
      </main>
    </div>
  );
};

export default AdminDashboard;