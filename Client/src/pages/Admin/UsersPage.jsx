import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { faIR } from 'date-fns/locale';
import {
  getUsers,
  deleteUser,
  getUserResults,
  submitTestFeedback
} from "../../services/api";
import "./usersPage.css";

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userResults, setUserResults] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersData = await getUsers();
        
        const nonAdminUsers = usersData.filter(user => user.role !== 'admin');
        setUsers(nonAdminUsers);
        console.log(nonAdminUsers);


        setError('');
      } catch (err) {
        console.error(err);
        setError('خطا در دریافت کاربران');
      }
      setLoading(false);
    };

    fetchUsers();
  }, [refresh]);

  // Fetch user results when visiting a user
  useEffect(() => {
    if (selectedUser) {
      const fetchResults = async () => {
        try {
          // const results = await getUserResults(selectedUser._id);
          // setUserResults(results);
          setUserResults(selectedUser.testsAssigned.private);
        } catch (err) {
          console.error(err);
          alert('خطا در دریافت نتایج کاربر');
        }
      };
      fetchResults();
    }
  }, [selectedUser]);

  const handleDeleteUser = async (id) => {
    const confirmed = window.confirm('آیا از حذف کاربر مطمئن هستید؟');
    if (!confirmed) return;

    try {
      await deleteUser(id);
      setRefresh(prev => !prev);
    } catch (err) {
      console.error(err);
      alert('خطا در حذف کاربر');
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim() || !selectedResult) return;
      console.log(feedback);

    try {
      await submitTestFeedback({
        userId: selectedUser._id,
        resultId: selectedResult._id,
        feedback
      });
      alert('بازخورد با موفقیت ثبت شد');
      setFeedback('');
      setSelectedResult(null);
      // Refresh results
      const results = await getUserResults(selectedUser._id);
      console.log(results);
      
      setUserResults(results);
    } catch (err) {
      console.error(err);
      alert('خطا در ثبت بازخورد');
    }
  };

  const formatDate = (dateString) => {
    console.log("dateString:", dateString );
    
    return format(new Date(dateString), 'd MMMM yyyy - HH:mm', {
      locale: faIR
    });
  };

  return (
    <div className="admin-users-container">
      {selectedUser ? (
        <div className="user-results-section">
          <div className="user-header">
            <h2>
              نتایج تست های کاربر: {selectedUser.profile.fullName}
              <button 
                onClick={() => setSelectedUser(null)}
                className="back-button"
              >
                بازگشت
              </button>
            </h2>
            <p>ایمیل: {selectedUser.email}</p>
          </div>

          <div className="results-container">
            <h3>لیست نتایج ارسال شده</h3>
            {userResults.length > 0 ? (
              <table className="results-table">
                <thead>
                  <tr>
                    <th>نام تست</th>
                    <th>تاریخ انجام</th>
                    <th>امتیاز</th>
                    <th>بازخورد</th>
                    <th>اقدامات</th>
                  </tr>
                </thead>
                <tbody>
                  {userResults.map(result => (
                    <tr key={result._id}>
                      <td>{result.testType}</td>
                      <td>{formatDate(result.completedAt)}</td>
                      <td>{result.score || '--'}</td>
                      <td>{result.adminFeedback || 'بدون بازخورد'}</td>
                      <td>
                        <button 
                          onClick={() => setSelectedResult(result)}
                          disabled={!!selectedResult}
                          className='submit-feedback'
                        >
                          ثبت بازخورد
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>نتیجه ای برای نمایش وجود ندارد</p>
            )}

            {selectedResult && (
              <div className="feedback-form">
                <h4>ثبت بازخورد برای تست {selectedResult.testType}</h4>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="متن بازخورد..."
                  rows={4}
                />
                <div className="form-actions">
                  <button className="form-actions-submit" onClick={handleSubmitFeedback}>ثبت نهایی</button>
                  <button 
                    onClick={() => {
                      setSelectedResult(null);
                      setFeedback('');
                    }}
                    className="cancel-button"
                  >
                    انصراف
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <section className="admin-users-section">
          <h2>مدیریت کاربران</h2>

          {loading ? (
            <p>در حال بارگذاری...</p>
          ) : error ? (
            <p style={{ color: 'red' }}>{error}</p>
          ) : (
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>نام و نام خانوادگی</th>
                  <th>ایمیل</th>
                  <th>نقش</th>
                  <th>اقدامات</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user._id}>
                    <td>{user.profile.fullName}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      <button 
                        onClick={() => setSelectedUser(user)}
                        className="view-button"
                      >
                        مشاهده نتایج
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user._id)}
                        className="delete-button"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
};

export default UsersPage;