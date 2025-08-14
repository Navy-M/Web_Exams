import { useState } from 'react';
import AdminSidebar from '../../components/Admin/AdminSidebar';
import '../../styles/admin.css';
import { useAuth } from '../../context/AuthContext';
import { Test_Cards, jobRequirements  } from '../../services/dummyData';
import UsersPage from "./UsersPage";
import TestsPage from "./TestsPage";
import TestsStatus from "../../components/Admin/TestsStatus";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const{user} = useAuth();
  
  return (
    <div className="admin-dashboard">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      

      <main className="admin-main">
        <h1>Hi {user.email}</h1>
        <hr/>
        <br/>
        <br/>
        {activeTab === 'dashboard' && <TestsStatus/>}
        {activeTab === 'users' && <UsersPage/>}
        {activeTab === 'tests' && <div>
          <section className="admin-tests-section">
              <h2>لیست آزمون‌ها</h2>
              <table className="admin-tests-table">
                <thead>
                  <tr>
                    <th style={{textAlign: 'center'}}>ردیف</th>
                    <th>نام آزمون</th>
                    <th>نوع</th>
                    <th>فرمت سوال</th>
                  </tr>
                </thead>
                <tbody>
                  {Test_Cards.map( ( test, index) => (
                    <tr key={test.id}>
                      <td style={{textAlign: 'center'}}>{index + 1}</td>
                      <td>{test.name}</td>
                      <td>{test.type}</td>
                      <td>{test.questionFormat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          <br/>
          <br/>
          {/* Job Requirements */}
    {Object.keys(jobRequirements).length > 0 && (
      <section className="job-requirements-section">
        <h3>ویژگی‌ها و مهارت‌های مورد نیاز برای هر شغل</h3>
        <br/>
        {Object.entries(jobRequirements).map(([jobName, requirements]) => (
          <div key={jobName} className="job-requirements">
            <h4>{jobName}</h4>
            <ul>
              {Object.entries(requirements).map(([key, values]) => (
                <li key={key}>
                  <strong>{key.toUpperCase()}:</strong> {values.join(', ')}
                </li>
              ))}
            </ul>
        <hr/>
        <br/>

          </div>
        ))}
      </section>
    )}

            <br/>
            <br/>
            <TestsPage/>
        </div>}
      </main>
    </div>
  );
};

export default AdminDashboard;