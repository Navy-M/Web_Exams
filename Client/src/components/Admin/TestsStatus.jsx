import React, { useEffect, useState } from 'react';
import { getUsers, prioritizeUsers } from '../../services/api';
import "../../styles/TestsStatus.css"
import AllocationReport from './AllocationReport';

const TestsStatus = () => {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showPrioritizationModal, setShowPrioritizationModal] = useState(false);
  const [jobQuotas, setJobQuotas] = useState({
    job1:{ name: "ناوبری و فرماندهی کشتی" , tableCount: 0},
    job2:{ name: "مهندسی مکانیک و موتور دریایی" , tableCount: 0},
    job3:{ name: "مهندسی برق و الکترونیک دریایی" , tableCount: 0},
    job4:{ name: "تفنگدار دریایی" , tableCount: 0},
    job5:{ name: "کمیسر دریایی" , tableCount: 0},
  });
  const [assignmentResult, setAssignmentResult] = useState(null);

  const tableActions = [
    {
      icon: "start process",
      text: "شروع اولویت بندی",
      action: ()=> {handleStartPrioritization() }
    },
    {
      icon: "delete from table",
      text: "حذف از لیست",
      action: ()=> {console.log("Delete these user Ids : ", selectedUsers) }


    },
    {
      icon: "create a group",
      text: "دسته بندی",
      action: ()=> {console.log("Make Group Of These Ids : ", selectedUsers) }


    }
  ]

// 1) Add state for modal


// 2) Update the prioritization action
const handleStartPrioritization = () => {
  if (selectedUsers.length === 0) {
    alert("ابتدا چند کاربر را انتخاب کنید");
    return;
  }
  setShowPrioritizationModal(true);
};

// 3) Send to server
const submitPrioritization = async () => {
 try {
    const data = {
      people: selectedUsers,
      quotas: jobQuotas,
      weights: {
        DISC: 1,
        CLIFTON: 1,
        HOLLAND: 1,
        MBTI: 1,
        GARDNER: 1,
        GHQ: 1
      },
    };

    const res = await prioritizeUsers(data); // your API call
    setAssignmentResult(res); // store server response
    // console.log(res);
    
    setShowPrioritizationModal(false);
  } catch (err) {
    console.error("Error submitting prioritization:", err);
  }
};


  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getUsers();
        setUsers(data);
        setFiltered(data);
      } catch (err) {
        console.error('Error fetching users', err);
      }
    };
    fetch();
  }, []);

  useEffect(() => {
    const keyword = search.toLowerCase();
    const result = users.filter(user => {
      const targetField = searchFilter || 'name';
      const value = (user[targetField] || user.profile?.[targetField] || user.profile?.fullName || '').toLowerCase();
      return value.includes(keyword);
    });
    setFiltered(result);
  }, [search, searchFilter, users]);

    const handleUserSelect = (id) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      const visibleUserIds = filtered.slice(0, visibleCount).map(u => u._id);
      setSelectedUsers(visibleUserIds);
    }
    setSelectAll(!selectAll);
  };

 return (
    <section className="admin-user-tests-section">
      

      {assignmentResult ? <>
          <AllocationReport selectedUsers={filtered.filter(_user => selectedUsers.some(f => f === _user._id))} assignmentResult={assignmentResult}/>
          <button className='back-testResults-button' onClick={() => {setAssignmentResult(null)}}>بازگشت</button>
        </> : <>
        <h2>وضعیت آزمون‌های کاربران</h2>

      <div className="admin-status-search-container">
        <input
          type="text"
          placeholder="جستجو..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="admin-status-search-input"
        />
        <br/>
       
        <select
          value={searchFilter}
          onChange={e => setSearchFilter(e.target.value)}
          className="admin-status-search-select"
        >
          <option value="">فیلتر بر اساس</option>
          <option value="name">نام</option>
          <option value="email">ایمیل</option>
          <option value="role">نقش</option>
          <option value="job">شغل</option>
          <option value="province">استان</option>
        </select>

        <select
          value={visibleCount}
          onChange={e => setVisibleCount(parseInt(e.target.value))}
          className="admin-status-search-select"
        >
          <option value="10">تعداد نمایش ۱۰ نفر</option>
          <option value="50">تعداد نمایش ۵۰ نفر</option>
          <option value="100">تعداد نمایش ۱۰۰ نفر</option>
        </select>
      </div>

      <table className="admin-user-tests-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
              />
            </th>
            <th>ردیف</th>
            <th>نام و نام خانوادگی</th>
            <th>ایمیل</th>
            <th>آزمون‌ها</th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice(0, visibleCount).map((user, index) => (
            <tr key={user._id} className={selectedUsers.includes(user._id) ? "selected-row" : ""}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user._id)}
                  onChange={() => handleUserSelect(user._id)}
                />
              </td>
              <td style={{ textAlign: 'center' }}>{index + 1}</td>
              <td>{user.profile?.fullName || '—'}</td>
              <td>{user.email}</td>
              <td>
                {user.testsAssigned?.length > 0 ? (
                  <ul>
                    {user.testsAssigned.map(test => (
                      <li key={test._id}>
                        {test.testType} - امتیاز: {test.score ?? 'نامشخص'}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span>بدون آزمون</span>
                )}
              </td>
            </tr>
          ))}
            
        </tbody>
        
      </table>
      
      {selectedUsers.length > 0 && (
        <div className="admin-user-tests-table-actions-BG">
          {showPrioritizationModal ? (
            <div className="modal">
              <h3>تعداد افراد مورد نیاز برای هر رسته</h3>
          
              {jobQuotas && Object.keys(jobQuotas).length > 0 ? (
                Object.keys(jobQuotas).map((job, i) => (
                  <div key={i}>
                    <label>{jobQuotas[job].name}</label>
                    <input
                      type="number"
                      value={jobQuotas[job].tableCount}
                      onChange={(e) =>
                        setJobQuotas({
                          ...jobQuotas,
                          [job]: { name: jobQuotas[job].name, tableCount:parseInt(e.target.value, 10) || 0},
                        })
                      }
                    />
                  </div>
                ))
              ) : (
                <p>هیچ شغلی تعریف نشده است</p>
              )}

              <div className="modal-actions">
                <button onClick={submitPrioritization}>شروع</button>
                <button onClick={() => setShowPrioritizationModal(false)}>انصراف</button>
              </div>
            </div>
          ) : (
            tableActions.map((A) => (
              <div
                key={A.text}
                onClick={A.action}
                className="admin-user-tests-table-actions-btn"
              >
                {A.text}
              </div>
            ))
          )}
        </div>
      )}
      </>}
    </section>
  );
};

export default TestsStatus;
