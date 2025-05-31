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
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const data = Test_Cards;
        setTests(data);
      } catch (err) {
        setError('Failed to load tests. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchTests();
  }, [user?.id]);

  const handleStartTest = (testId) => navigate(`/test/${testId}`);

  const getTestStatus = (test) => {
    if (test.completed) return 'Completed';
    if (new Date(test.deadline) < new Date()) return 'Expired';
    return 'Pending';
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const completedTests = tests.filter(t => t.completed);

  const takenTestIds = tests.map(t => t._id || t.id); // IDs of completed/active tests

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
            <h3>{tests.length}</h3>
            <p>Total Tests</p>
          </div>
          <div className="stat-item">
            <h3>{completedTests.length}</h3>
            <p>Completed</p>
          </div>
          <div className="stat-item">
            <h3>{tests.reduce((acc, t) => acc + (t.score || 0), 0)}</h3>
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
          <section className="active-tests">
            <h2>Submited  Tests</h2>
            <div className="tests-grid">
              {tests.filter(t => getTestStatus(t) === 'Pending').map(test => (
                <TestCard
                  key={test._id}
                  test={test}
                  onStart={() => handleStartTest(test._id)}
                />
              ))}
            </div>
          </section>

          <section className="recommended-tests">
            <h2>Recommended Tests</h2>
            <TestCardGrid onSelectTest={handleStartTest} />
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

          {tests.length > 0 && 
            <section className="test-history">
              <h2>Test History</h2>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Test Name</th>
                    <th>Date Completed</th>
                    <th>Status</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.filter(t => getTestStatus(t) !== 'Pending').map(test => (
                    <tr key={test._id}>
                      <td>{test.name}</td>
                      <td>{test.completedAt ? new Date(test.completedAt).toLocaleDateString() : '-'}</td>
                      <td className={getTestStatus(test).toLowerCase()}>{getTestStatus(test)}</td>
                      <td>{test.score || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          }
        </>
      )}
    </div>
  );
};

export default UserDashboard;
