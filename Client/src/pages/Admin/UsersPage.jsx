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
    period: '',
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

  const generatePrintContent = () => {
    const user = selectedUser;
    const results = userResults;

    if (!user || !results) return '';

    // Map test types to Persian names
    const testTypeMap = {
      PERSONAL_FAVORITES: 'اولویت‌های شخصی',
      GHQ: 'سلامت عمومی',
      CLIFTON: 'نقاط قوت کلیفتون',
      GARDNER: 'هوش‌های چندگانه گاردنر'
    };

    let html = `
      <html>
        <head>
          <meta charset="UTF-8">
          <title>کارنامه کاربر - ${user.profile?.fullName || 'نامشخص'}</title>
          <style>
            @font-face {
              font-family: 'Vazir';
              src: url('https://cdn.fontcdn.ir/Font/Persian/Vazir/Vazir.woff2') format('woff2');
            }
            body {
              font-family: 'Vazir', Arial, sans-serif;
              direction: rtl;
              margin: 20mm;
              font-size: 12pt;
              line-height: 1.6;
              color: #333;
            }
            @page {
              size: A4;
              margin: 20mm;
            }
            h1 {
              text-align: center;
              font-size: 18pt;
              color: #2c3e50;
              margin-bottom: 20px;
              border-bottom: 2px solid #4CAF50;
              padding-bottom: 10px;
            }
            h2 {
              font-size: 14pt;
              color: #34495e;
              margin: 20px 0 10px;
              border-right: 4px solid #4CAF50;
              padding-right: 10px;
            }
            h3 {
              font-size: 12pt;
              color: #555;
              margin: 15px 0 8px;
            }
            .section {
              margin-bottom: 20px;
              padding: 15px;
              background: #f9f9f9;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .profile-table, .results-table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
            }
            .profile-table td, .results-table th, .results-table td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: right;
            }
            .profile-table td:first-child {
              font-weight: bold;
              width: 30%;
              background: #f0faff;
            }
            .results-table th {
              background: #4CAF50;
              color: white;
              font-weight: bold;
            }
            .results-table tr:nth-child(even) {
              background: #f9f9f9;
            }
            .no-data {
              text-align: center;
              color: #e74c3c;
              font-style: italic;
            }
            .footer {
              text-align: center;
              font-size: 10pt;
              color: #777;
              margin-top: 30px;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <h1>کارنامه کاربر: ${user.profile?.fullName || 'نامشخص'}</h1>
          
          <div class="section">
            <h2>اطلاعات فردی</h2>
            <table class="profile-table">
              <tr><td>نام و نام خانوادگی</td><td>${user.profile?.fullName || 'نامشخص'}</td></tr>
              <tr><td>ایمیل</td><td>${user.email || 'نامشخص'}</td></tr>
              <tr><td>سن</td><td>${user.profile?.age || 'نامشخص'}</td></tr>
              <tr><td>وضعیت تاهل</td><td>${user.profile?.single ? 'مجرد' : 'متاهل'}</td></tr>
              <tr><td>تحصیلات</td><td>${user.profile?.education || 'نامشخص'}</td></tr>
              <tr><td>رشته</td><td>${user.profile?.field || 'نامشخص'}</td></tr>
              <tr><td>تلفن</td><td>${user.profile?.phone || 'نامشخص'}</td></tr>
              <tr><td>شهر</td><td>${user.profile?.city || 'نامشخص'}</td></tr>
              <tr><td>استان</td><td>${user.profile?.province || 'نامشخص'}</td></tr>
              <tr><td>شغل</td><td>${user.profile?.jobPosition || 'نامشخص'}</td></tr>
            </table>
          </div>
          
          <div class="section">
            <h2>نتایج آزمون‌ها</h2>
            ${results.length > 0 ? results.map(result => `
              <div class="section">
                <h3>آزمون: ${testTypeMap[result.testType] || result.testType}</h3>
                <p><strong>تاریخ انجام:</strong> ${formatDate(result.completedAt)}</p>
                <p><strong>مدت زمان:</strong> ${result.duration ? `${result.duration} ثانیه` : 'نامشخص'}</p>
                <p><strong>بازخورد ادمین:</strong> ${result.adminFeedback || 'بدون بازخورد'}</p>
                ${result.analysis ? `
                  <h3>تحلیل آزمون</h3>
                  ${result.testType === 'PERSONAL_FAVORITES' ? `
                    <p><strong>خلاصه:</strong> ${result.analysis.summary || 'نامشخص'}</p>
                    <p><strong>زمان تحلیل:</strong> ${formatDate(result.analysis.analyzedAt)}</p>
                    <table class="results-table">
                      <thead>
                        <tr>
                          <th>ویژگی</th>
                          <th>ترجیح برتر</th>
                          <th>تکرار انتخاب‌ها</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${Object.entries(result.analysis.traits || {}).map(([traitKey, trait]) => `
                          <tr>
                            <td>${trait.name || traitKey}</td>
                            <td>${trait.topPreference || 'هیچ'}</td>
                            <td>
                              ${Object.entries(trait.frequency || {}).map(([opt, count]) => `${opt}: ${count} بار`).join('<br>') || 'هیچ'}
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                    <h3>پیشنهادات</h3>
                    <ul>
                      ${Object.entries(result.analysis.topPreferences || {})
                        .filter(([_, pref]) => pref !== null)
                        .map(([trait, { value }]) => `
                          <li>افزایش مشارکت در فعالیت‌های مرتبط با ${value} برای تقویت ${result.analysis.traits[trait]?.name || trait}</li>
                        `).join('') || '<li>هیچ پیشنهادی موجود نیست</li>'}
                    </ul>
                  ` : result.testType === 'GHQ' ? `
                    <p><strong>سطح خطر:</strong> ${result.analysis.riskLevel === 'High' ? 'بالا (نیاز به توجه)' : result.analysis.riskLevel === 'Moderate' ? 'متوسط' : 'پایین (خوب)'}</p>
                    <p><strong>امتیاز کل:</strong> ${result.analysis.totalScore || 0} (${result.analysis.normalizedTotal || 0}%)</p>
                    <p><strong>خلاصه:</strong> ${result.analysis.summary || 'نامشخص'}</p>
                    <p><strong>زمان تحلیل:</strong> ${formatDate(result.analysis.analyzedAt)}</p>
                    <table class="results-table">
                      <thead>
                        <tr>
                          <th>ویژگی</th>
                          <th>امتیاز</th>
                          <th>توضیح</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${Object.entries(result.analysis.traits || {}).map(([traitKey, trait]) => `
                          <tr>
                            <td>${trait.name || traitKey}</td>
                            <td>${trait.score || 0}%</td>
                            <td>${trait.description || 'نامشخص'}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  ` : `
                    <p>تحلیل برای ${testTypeMap[result.testType] || result.testType} در دسترس نیست.</p>
                  `}
                ` : `
                  <p class="no-data">تحلیل برای این آزمون انجام نشده است.</p>
                `}
              </div>
            `).join('') : `
              <p class="no-data">هیچ نتیجه‌ای برای این کاربر وجود ندارد.</p>
            `}
          </div>
          
          <div class="footer">
            <p>تولید شده در تاریخ: ${formatDate(new Date())}</p>
            <p>سامانه استعدادیابی دانشجویی</p>
            <p>دانشگاه علوم دریایی امام خمینی (ره)</p>
          </div>
        </body>
      </html>
    `;
    return html;
  };
  const handlePrintUserResume = async () => {
    
    if(!selectedUser.profile.age){
      alert(`کاربر ${selectedUser.profile.fullName} هنوز اطلاعات فردی خود را وارد نکرده است!`);
      return;
    }
    const confirmed = window.confirm('آیا از چاپ کارنامه کاربر مطمئن هستید؟');
    if (!confirmed) return;

    try {
      if (!selectedUser || !userResults) {
        throw new Error('اطلاعات کاربر یا نتایج آزمون در دسترس نیست.');
      }

      const printContent = generatePrintContent();
      if (!printContent) {
        throw new Error('خطا در تولید محتوای چاپ');
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('خطا در باز کردن پنجره چاپ');
      }

      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      // printWindow.close();
    } catch (err) {
      console.error('Error printing resume:', err);
      alert(`خطا در چاپ کارنامه کاربر: ${err.message}`);
    }
  };

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
      case 'period':
        return user.period?.toLowerCase().includes(query);
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

  const findFilterName = (value) => {
    switch (value) {
      case "name":
        return "نام";
      case "period":
        return "دوره";
      case "email":
        return "ایمیل";
      case "job":
        return "شماره دانشجویی";
      case "role":
        return "نقش";
      case "province":
        return "استان";
      default:
        return "";
    }
  }

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
                // disabled={!!selectedUser}
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
              < div className="user-profile-header-BG" >
                <h3>🧾 اطلاعات فردی</h3>
                <button type="button"> {selectedUser.period? `دوره ${selectedUser.period}`: "دوره نامشخص"}</button>
              </div>
              <ul>
                <li><strong>📧 ایمیل:</strong> {selectedUser.email}</li>
                <li><strong>🎂 سن:</strong> {selectedUser.profile.age}</li>
                <li><strong>👨‍💼 شغل پدر:</strong> {selectedUser.profile.fathersJob}</li>
                <li><strong>💍 وضعیت تاهل:</strong> {selectedUser.profile.age ? (selectedUser.profile.single ? "مجرد" : "متاهل") : "نامشخص"}</li>
                <li><strong>🎓 تحصیلات:</strong> {selectedUser.profile.education}</li>
                <li><strong>🅰️ معدل دیپلم:</strong> {selectedUser.profile.diplomaAverage}</li>
                <li><strong>📚 رشته:</strong> {selectedUser.profile.field}</li>
                <li><strong>📞 تلفن:</strong> {selectedUser.profile.phone}</li>
                <li><strong>🏙️ شهر:</strong> {selectedUser.profile.city}</li>
                <li><strong>🗺️ استان:</strong> {selectedUser.profile.province}</li>
                <li><strong>💼 شماره دانشجویی:</strong> {selectedUser.profile.jobPosition}</li>
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

          <section className="admin-users-section-BG">
          <h2>مدیریت کاربران</h2>



            {loading ? (
              <p>در حال بارگذاری...</p>
            ) : error ? (
              <p style={{ color: 'red' }}>{error}</p>
            ) : (
            <>
              <div className="admin-search-container">
                <select
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="admin-search-select"
                >
                  <option value="">فیلتر بر اساس همه</option>
                  <option value="name">نام</option>
                  <option value="period">دوره</option>
                  <option value="email">ایمیل</option>
                  <option value="role">نقش</option>
                  <option value="job">شماره پرسنلی</option>
                  <option value="province">استان</option>
                </select>
                <input 
                  type="text" 
                  placeholder={`جستجو${searchFilter? "ی " + findFilterName(searchFilter) : ""} ... `} 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)} 
                  className="admin-search-input"
                />
                
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
                          <input
                            type="text"
                            placeholder="دوره"
                            value={newUser.period}
                            onChange={e => setNewUser({ ...newUser, period: e.target.value })}
                          />
                          <select
                            value={newUser.role}
                            onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                          >
                            <option value="" disabled>انتخاب نقش</option>
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