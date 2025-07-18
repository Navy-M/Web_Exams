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

import TestResultCardGrid from '../../components/common/TestResultCardGrid';
import { Test_Cards } from '../../services/dummyData';
import ShowAnalysis from '../../components/common/ShowAnalysis';

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const [allTests, setAllTests] = useState([]);
  const [completedTests, setCompletedTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [selectedCompletedTest, setSelectedCompletedTest]= useState()

  useEffect(() => {
    const fetchTests = async () => {
      try {
        // Fill existing Test information
        const data = Test_Cards;
        setAllTests(data);

        // Fill user Tests Data
        const userData = user?.testsAssigned || [];
        // console.log(user);
        
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
    // console.log("completedTests : " , completedTests);
    if (completedTests.some(completed => completed.testType === test.id) ) return 'Completed';
    if (new Date(test.deadline) < new Date()) return 'Expired';
    return 'Pending';
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSelectCompletedResult = async (id) => {
    try {
        const _result = await getTestResults(id);
        if (_result) {
          console.log("Selected Result", _result);
          setSelectedCompletedTest(_result.data);

            
        }
      } catch (error) {
        console.error("❌ Error Select Result:", error);
      }
  }

 

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

        {user.profile?.age && user.profile?.gender ? 
          <div className="stats">
            <div className="stat-item">
              <h3>{allTests.length}</h3>
              <p>کل تست ها</p>
            </div>
            <div className="stat-item">
              <h3>{completedTests?.length}</h3>
              <p>انجام شده</p>
            </div>
            <div className="stat-item">
              <h3>{completedTests?.reduce((acc, t) => acc + (t.score || 0), 0)}</h3>
              <p>مجموع امتیازات</p>
            </div>
          </div>
          : <div className='complete-user-profile'>
           <p> لطفا ابتدا اطلاعات خود را تکمیل نمایید.</p>
           <button type="submit" className="button-primary complete-user-profile-btn"  onClick={() => navigate("/users/completeProfile")}>تکمیل اطلاعات</button>
          </div>
        }

      </header>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : (
        <>
          <br/>

          { user.profile?.age && allTests.filter(t => getTestStatus(t) === 'Pending').length > 0 &&
            <section className="recommended-tests">
              <h2>تست های پیشنهادی</h2>
              <br/>
              {/* {JSON.stringify(allTests.length)} */}
              {/* <TestCardGrid onSelectTest={handleStartTest} /> */}
              {allTests.filter(t => getTestStatus(t) === 'Pending').map(test => (
                  <TestCard
                    key={test.id}
                    test={test}
                    onStart={() => handleStartTest(test.id)}
                  />
                ))}
            </section>
          }

          {/* <br/> */}

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

          
          <br/>
          <hr/>
          <br/>
          
            {user.profile?.age && user.profile?.gender && user.profile?.education &&
              <>
              <h2>تست های انجام شده</h2>
              {completedTests?.length > 0 ?
                <>
                  <section className="active-tests">

                    <div className="tests-grid">
                      <TestResultCardGrid onSelectTest={handleSelectCompletedResult} />

                      {/* {completedTests.map(test => {
                        <div key={test.id} className="test-card" onClick={() => onSelectTest(test.id)}>
                        <h3>{test.name}</h3>
                        <p>{test.description}</p>
                        <span className="tag">{test.type}</span>
                      </div>
                      })} */}
                    </div>
                  </section>
                      
                  {/* <section className="test-history">
                    <h2>تاریخچه تست ها</h2>
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>نام تست</th>
                          <th>تاریخ تکمیل</th>
                          <th>مدت زمان</th>
                          <th>امتیاز</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completedTests.map(test => (
                          test.isPublic && 
                            <tr key={test.testType}>
                              <td>{test.testType}</td>
                              <td>{test.completedAt ? new Date(test.completedAt).toLocaleDateString() : '-'}</td>
                              <td className={getTestStatus(test).toLowerCase()}>{test.duration} Sec</td>
                              <td>{test.score || '--'}</td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                  </section> */}

                  {
                    selectedCompletedTest && 
                      <ShowAnalysis testType={selectedCompletedTest.testType} analysisData={selectedCompletedTest.analysis}/>
                  }

                </>
                : <> 
                <p> جداول نتایج تست های شما پس از برسی در دسترس میباشد ...</p> </>
              }
              </>
          }
        </>
      )}
    </div>
  );
};

export default UserDashboard;
