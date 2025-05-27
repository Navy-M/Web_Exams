import { useState } from 'react';
import AdminSidebar from '../../components/Admin/AdminSidebar';
import '../../styles/admin.scss';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="admin-dashboard">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="admin-main">
        {activeTab === 'users' && <div>User Management</div>}
        {activeTab === 'tests' && <div>Test Management</div>}
        {activeTab === 'results' && <div>Results Overview</div>}
      </main>
    </div>
  );
};

export default AdminDashboard;