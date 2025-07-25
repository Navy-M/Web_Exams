import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { faIR } from 'date-fns/locale';
import {
  getUsers,
  deleteUser,
  getUserResults,
  submitTestFeedback,
  createUser,
  getTestResults,
  deleteResult,
  analyzeTests
} from "../../services/api";
import "./usersPage.css";
import ShowAnalysis from '../../components/common/ShowAnalysis';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userResults, setUserResults] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const [showAddRow, setShowAddRow] = useState(false);
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    role: '',
    password: '',
  });
  const [search, setSearch] = useState('');
const [searchFilter, setSearchFilter] = useState('');


  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersData = await getUsers();
        
        const nonAdminUsers = usersData.filter(user => user.role !== 'admin');
        setUsers(nonAdminUsers);
        // console.log(nonAdminUsers);


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
          setUserResults(selectedUser.testsAssigned);
        } catch (err) {
          console.error(err);
          alert('خطا در دریافت نتایج کاربر');
        }
      };
      fetchResults();
    }
    else{
      setSearch('');
      setSearchFilter('');
    }
  }, [selectedUser]);

  const handleAddUser = async () => {
    try {
      const response = await createUser( {
        fullName: newUser.fullName,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role
      });

      alert(response.message);
      // refresh or append new user to users list
      setUsers(prev => [...prev, response.user]); // Add to table

      setNewUser({  email: '', role: '', password: '' , fullName: ''});
      setShowAddRow(false);
    
    
    } catch (err) {
      alert(err.response?.message || 'خطا در افزودن کاربر');
    }
  };

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

  const handleCheckTest = async (result) => {
  try {
    const { resultId, testType } = result;

    const response = await analyzeTests({resultId, testType});
    // console.log("resultId : " , resultId);

    alert("تحلیل با موفقیت انجام شد ✅");

    // console.log("✅ Analyzed Result:", response);
    console.log("✅ Analyzed Result:", response.data);

    
    // Optionally refresh results or update local state
    // await fetchResults();
  } catch (err) {
    console.error("❌ Error analyzing test:", err);
    alert("خطایی در تحلیل تست رخ داد");
  }
  };

  const handleSelectResult = async (id) => {
    try {
      const _result = await getTestResults(id);
      if (_result) {
          setSelectedResult(_result.data);
          // console.log("Selected Result", _result);
          
      }
    } catch (error) {
      console.error("❌ Error Select Result:", error);
    }
  }

  const handleSubmitFeedback = async () => {
    if (!feedback.trim() || !selectedResult) return;
      // console.log("feedback text:", feedback);

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
      // console.log(results);
      
      setUserResults(results);
    } catch (err) {
      console.error(err);
      alert('خطا در ثبت بازخورد');
    }
  };

  const handleDeleteUserResult = async (id) => {
       const confirmed = window.confirm('آیا از حذف آزمون مطمئن هستید؟');
    if (!confirmed) return;

    try {
      await deleteResult(id);
      setRefresh(prev => !prev);
    } catch (err) {
      console.error(err);
      alert('خطا در حذف آزمون');
    }
    
  }

  const handlePrintUserResume = async () => {
    const confirmed = window.confirm('آیا از چاپ کارنامه کاربر مطمئن هستید؟');
    if (!confirmed) return;

    try {
      //  TODO: get all information about This user and print on A4 Papers
      setRefresh(prev => !prev);
    } catch (err) {
      console.error(err);
      alert('خطا در چاپ کارنامه کاربر');
    }

  }

  const formatDate = (dateString) => {
    // console.log("dateString:", dateString );
    
    return format(new Date(dateString), 'd MMMM yyyy - HH:mm', {
      locale: faIR
    });
  };

  const filteredUsers = users.filter(user => {
  const query = search.toLowerCase();

  switch (searchFilter) {
    case 'name':
      return user.profile?.fullName?.toLowerCase().includes(query);
    case 'email':
      return user.email?.toLowerCase().includes(query);
    case 'role':
      return user.role?.toLowerCase().includes(query);
    case 'job':
      return user.profile?.jobPosition?.toLowerCase().includes(query);
    case 'province':
      return user.profile?.province?.toLowerCase().includes(query);
    default:
      return (
        user.profile?.fullName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query) ||
        user.profile?.jobPosition?.toLowerCase().includes(query) ||
        user.profile?.province?.toLowerCase().includes(query)
      );
  }
});


  return (
    <div className="admin-users-container">
      {selectedUser ? (
        <div className="user-results-section">
          <div className="user-header">
            <div className="user-header-head">
              <h2>نتایج تست های کاربر: </h2>
              <h2>{selectedUser.profile.fullName}</h2>
              <button 
                onClick={() => handlePrintUserResume()}
                disabled={!!selectedUser}
                className="print-button"
              >
                چاپ کارنامه
              </button>
              <button 
                onClick={() => setSelectedUser(null)}
                className="back-button"
              >
                بازگشت
              </button>
            </div>
            <div className='user-profile-card'>
              <h3>🧾 اطلاعات فردی</h3>
              <ul>
                <li><strong>📧 ایمیل:</strong> {selectedUser.email}</li>
                <li><strong>🎂 سن:</strong> {selectedUser.profile.age}</li>
                <li><strong>💍 وضعیت تاهل:</strong> {selectedUser.profile.single ? "مجرد" : "متاهل"}</li>
                <li><strong>🎓 تحصیلات:</strong> {selectedUser.profile.education}</li>
                <li><strong>📚 رشته:</strong> {selectedUser.profile.field}</li>
                <li><strong>📞 تلفن:</strong> {selectedUser.profile.phone}</li>
                <li><strong>🏙️ شهر:</strong> {selectedUser.profile.city}</li>
                <li><strong>🗺️ استان:</strong> {selectedUser.profile.province}</li>
                <li><strong>💼 شغل:</strong> {selectedUser.profile.jobPosition}</li>
              </ul>
            </div>
          </div>

          <div className="results-container">
            <h3>لیست نتایج ارسال شده</h3>
            {userResults.length > 0 ? (
              <table className="results-table">
                <thead>
                  <tr>
                    <th>نام تست</th>
                    <th>تاریخ انجام</th>
                    <th>مدت زمان</th>
                    <th>بازخورد</th>
                    <th>اقدامات</th>
                  </tr>
                </thead>
                <tbody>
                  {userResults.map(result => (
                    <tr key={result._id}>
                      <td>{result.testType}</td>
                      <td>{formatDate(result.completedAt)}</td>
                      <td>{result.duration || '--'} ثانیه</td>
                      <td>{result.adminFeedback || 'بدون بازخورد'}</td>
                      <td>
                        <button 
                          onClick={() => handleDeleteUserResult(result.resultId)}
                          disabled={!!selectedResult}
                          className='delete-test'
                        >
                          حذف آزمون
                        </button>
                        
                        {!result?.adminFeedback &&
                        <button 
                          onClick={() => handleSelectResult(result.resultId)}
                          disabled={!!selectedResult}
                          className='submit-feedback'
                        >
                          ثبت بازخورد
                        </button>
                        }
                        
                        {!result?.analyzedAt && 
                          <button 
                            onClick={() => {
                              // console.log(`this is starting to check ${result.testType} test`);
                              handleCheckTest(result);
                              // alert(`this is starting to check ${result.testType} test`);
                            }}
                            disabled={!!selectedResult}
                            className='check_test'
                          >
                          تصحیح 
                          </button>
                        }
                        {result?.analyzedAt && 
                          <button 
                            onClick={() => {
                              // console.log(`this is starting to check ${result.testType} test`);
                              // TODO : show result
                              handleSelectResult(result.resultId)
                              // alert(`this is starting to check ${result.testType} test`);
                            }}
                            disabled={!!selectedResult}
                            className='check_test'
                          >
                          مشاهده نتایج 
                          </button>
                        }
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
                {selectedResult?.analysis && 
                  <div>
                  <h4>نتایج آزمون {selectedResult.testType}</h4>
                    {/* {JSON.stringify(selectedResult.analysis)} */}
                  <ShowAnalysis testType={selectedResult.testType} analysisData={selectedResult.analysis}/> 
                  </div>



                }

              { !selectedResult.adminFeedback &&
              <>  
                <h4>ثبت بازخورد برای تست {selectedResult.testType}</h4>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="متن بازخورد..."
                  rows={4}
                />
                
              </>}
              <div className="form-actions">
                  { !selectedResult.adminFeedback && <button className="form-actions-submit" onClick={handleSubmitFeedback}>ثبت نهایی</button>}
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

          <section className="admin-users-section-BG">



            {loading ? (
              <p>در حال بارگذاری...</p>
            ) : error ? (
              <p style={{ color: 'red' }}>{error}</p>
            ) : (
            <>
              <div className="admin-search-container">
                <input 
                  type="text" 
                  placeholder="جستجو..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)} 
                  className="admin-search-input"
                />
                <select
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="admin-search-select"
                >
                  <option value="">فیلتر بر اساس</option>
                  <option value="name">نام</option>
                  <option value="email">ایمیل</option>
                  <option value="role">نقش</option>
                  <option value="job">شغل</option>
                  <option value="province">استان</option>
                </select>
              </div>

              <table className="admin-users-table">
                <thead>
                  <tr>
                    <th>ردیف</th>
                    <th>نام و نام خانوادگی</th>
                    <th>ایمیل</th>
                    <th>نقش</th>
                    <th>اقدامات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr key={user._id}>
                      <td style={{textAlign: 'center'}}>{index + 1}</td>
                      <td>{user.profile?.fullName}</td>
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
                  {showAddRow && (
                    <tr className="add-user-row">
                      <td colSpan="5">
                        <div className="add-user-form">
                        <p >🟩⬅️</p>

                          <input
                            type="text"
                            placeholder="نام و نام خانوادگی"
                            value={newUser.fullName}
                            onChange={e => setNewUser({ ...newUser, fullName: e.target.value })}
                          />
                          <select
                            value={newUser.role}
                            onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                          >
                            <option value="user">انتخاب نقش</option>
                            <option value="user">کاربر</option>
                            <option value="admin">ادمین</option>
                          </select>
                          <input
                            type="email"
                            placeholder="ایمیل"
                            value={newUser.email}
                            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                          />
                          <input
                            type="password"
                            placeholder="رمز عبور"
                            value={newUser.password}
                            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                          />
                          <button onClick={handleAddUser} className="submit-button">
                            ثبت
                          </button>
                          {/* <button onClick={() => setShowAddRow(false)} className="cancel-button">
                            لغو
                          </button> */}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'rught' }}>
                      <button
                        style={{ margin: "0.5rem" }}
                        onClick={() => setShowAddRow(prev => !prev)}
                      >
                        {showAddRow ? "❌ بستن فرم " : "➕ افزودن کاربر جدید"}
                      </button>
                    </td>
                  </tr>
                </tfoot>
              </table>
              </>
            )}
          </section>
        </section>
      )}
    </div>
  );
};

export default UsersPage;