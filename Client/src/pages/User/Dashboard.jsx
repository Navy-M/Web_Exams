import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAssignedTests } from '../../services/api';
import TestCard from '../../components/User/TestCard';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import '../../styles/user-dashboard.scss';

const UserDashboard = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const data = await getAssignedTests(user.id);
        setTests(data);
      } catch (err) {
        setError('Failed to load tests. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, [user.id]);

  const handleStartTest = (testId) => {
    navigate(`/test/${testId}`);
  };

  const getTestStatus = (test) => {
    if (test.completed) return 'Completed';
    if (new Date(test.deadline) < new Date()) return 'Expired';
    return 'Pending';
  };

  return (
    <div className="user-dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {user.email}</h1>
        <div className="stats">
          <div className="stat-item">
            <span className="stat-number">{tests.length}</span>
            <span className="stat-label">Total Tests</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">
              {tests.filter(t => t.status === 'completed').length}
            </span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          <section className="active-tests">
            <h2>Active Tests</h2>
            <div className="tests-grid">
              {tests
                .filter(t => getTestStatus(t) === 'Pending')
                .map(test => (
                  <TestCard
                    key={test._id}
                    test={test}
                    onStart={() => handleStartTest(test._id)}
                  />
                ))}
            </div>
          </section>

          <section className="test-history">
            <h2>Test History</h2>
            <div className="history-table">
              <div className="table-header">
                <span>Test Name</span>
                <span>Date Completed</span>
                <span>Status</span>
                <span>Score</span>
              </div>
              {tests
                .filter(t => getTestStatus(t) !== 'Pending')
                .map(test => (
                  <div key={test._id} className="table-row">
                    <span>{test.name}</span>
                    <span>
                      {test.completedAt 
                        ? new Date(test.completedAt).toLocaleDateString() 
                        : '-'}
                    </span>
                    <span className={`status ${getTestStatus(test).toLowerCase()}`}>
                      {getTestStatus(test)}
                    </span>
                    <span>{test.score || '-'}</span>
                  </div>
                ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default UserDashboard;