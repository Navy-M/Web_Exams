import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getTestResults } from '../../services/api';
import TestCard from '../../components/User/TestCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import '../../styles/user-dashboard.css';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

import TestCardGrid from '../../components/common/TestCardGrid'; // ✅ added
import { Test_Cards } from '../../services/dummyData';

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const [allTests, setAllTests] = useState([]);
  const [completedTests, setCompletedTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchTests = async () => {
      try {
        // Fill existing Test information
        const data = Test_Cards;
        setAllTests(data);

        // Fill user Tests Data
        const userData = user?.testsAssigned || [];
        console.log(user);
        
        setCompletedTests(userData);

      } catch (err) {
        setError('Failed to load tests. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchTests();
  }, [user?.id]);

  const handleStartTest = (testId) => {
    // console.log(testId);
    navigate(`/users/starttest/${testId}`);
    
  }

  const getTestStatus = (test) => {
    if (completedTests.some(completed => completed.testName === test.id) ) return 'Completed';
    if (new Date(test.deadline) < new Date()) return 'Expired';
    return 'Pending';
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  


  return (
    <div className="user-dashboard">
      <header className="dashboard-header">
        <div className="header-top">
          <button onClick={toggleTheme} className="theme-toggle">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <h1 className="user-email">{user.email}</h1>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>

        <div className="stats">
          <div className="stat-item">
            <h3>{allTests.length}</h3>
            <p>Total Tests</p>
          </div>
          <div className="stat-item">
            <h3>{completedTests?.length}</h3>
            <p>Completed</p>
          </div>
          <div className="stat-item">
            <h3>{completedTests.reduce((acc, t) => acc + (t.score || 0), 0)}</h3>
            <p>Total Points</p>
          </div>
        </div>
      </header>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : (
        <>
          <section className="recommended-tests">
            <h2>Recommended Tests</h2>
            {/* <TestCardGrid onSelectTest={handleStartTest} /> */}
            {allTests.filter(t => getTestStatus(t) === 'Pending').map(test => (
                <TestCard
                  key={test.id}
                  test={test}
                  onStart={() => handleStartTest(test.id)}
                />
              ))}
          </section>

          {/* {completedTests.length > 0 && (
            <section className="score-graph">
              <h2>Score Over Time</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={completedTests.map(t => ({
                  name: t.name,
                  score: t.score || 0,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </section>
          )} */}

          {completedTests.length > 0 &&
            <>
              <section className="active-tests">
                <h2>Submited  Tests</h2>
                <div className="tests-grid">
                  <TestCardGrid onSelectTest={handleStartTest} />
              
                  {/* {completedTests.map(test => {
                    <div key={test.id} className="test-card" onClick={() => onSelectTest(test.id)}>
                    <h3>{test.name}</h3>
                    <p>{test.description}</p>
                    <span className="tag">{test.type}</span>
                  </div>
                  })} */}
                </div>
              </section>
           
              <section className="test-history">
                <h2>Test History</h2>
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Test Name</th>
                      <th>Date Completed</th>
                      <th>duraion</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedTests.map(test => (
                      <tr key={test.testName}>
                        <td>{test.testName}</td>
                        <td>{test.completedAt ? new Date(test.completedAt).toLocaleDateString() : '-'}</td>
                        <td className={getTestStatus(test).toLowerCase()}>{test.duration} Min</td>
                        <td>{test.score || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          }
        </>
      )}
    </div>
  );
};

export default UserDashboard;
