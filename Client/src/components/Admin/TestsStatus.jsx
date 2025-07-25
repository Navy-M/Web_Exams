import React, { useEffect, useState } from 'react';
import { getUsers } from '../../services/api';
import "../../styles/TestsStatus.css"

const TestsStatus = () => {
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);


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
      <h2>وضعیت آزمون‌های کاربران</h2>

      <div className="admin-search-container">
        <input
          type="text"
          placeholder="جستجو..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="admin-search-input"
        />

        <select
          value={searchFilter}
          onChange={e => setSearchFilter(e.target.value)}
          className="admin-search-select"
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
          className="admin-search-select"
        >
          <option value="10">نمایش ۱۰ نفر</option>
          <option value="50">نمایش ۵۰ نفر</option>
          <option value="100">نمایش ۱۰۰ نفر</option>
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
    </section>
  );
};

export default TestsStatus;
