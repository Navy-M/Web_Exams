import React, { useEffect, useState } from 'react';
import { getUsers } from '../../services/api';
import "../../styles/TestsStatus.css"

const TestsStatus = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState([]);

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
    const result = users.filter(user =>
  (user.name?.toLowerCase()?.includes(keyword)) ||
  (user.email?.toLowerCase()?.includes(keyword)) ||
  (user.role?.toLowerCase()?.includes(keyword))
);
    setFiltered(result);
  }, [search, users]);

  return (
    <section className="admin-user-tests-section">
      <h2>وضعیت آزمون‌های کاربران</h2>

      <input
        type="text"
        placeholder="جستجو بر اساس نام، ایمیل یا نقش..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="admin-search-input"
      />

      <table className="admin-user-tests-table">
        <thead>
          <tr>
            <th>نام و نام خانوادگی</th>
            <th>ایمیل</th>
            <th>آزمون‌ها</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(user => (
            <tr key={user._id}>
              <td>{user.profile.fullName}</td>
              <td>{user.email}</td>
              <td>
                {user.testsAssigned?.private?.length > 0 ? (

                  
                  <ul>
                    {user.testsAssigned.private.map(test => (
                      <li key={test.testName}>
                        {test.testName} - امتیاز: {test.score ?? 'نامشخص'}
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
