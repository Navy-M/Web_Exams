import React, { useEffect, useState } from 'react';
import {
  getUsers,
  deleteUser,
  updateUser,
  createUser,
} from "../../services/api"

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(false);

  // Fetch users on mount or when refresh changes
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersData = await getUsers();
        const nonAdminUsers = usersData.filter(user => user.role !== 'admin');
        setUsers(nonAdminUsers);
        setError('');
      } catch (err) {
        console.error(err);
        setError('خطا در دریافت کاربران');
      }
      setLoading(false);
    };

    fetchUsers();
  }, [refresh]);

  const handleDeleteUser = async (id) => {
    const confirmed = window.confirm('آیا از حذف کاربر مطمئن هستید؟');
    if (!confirmed) return;

    try {
      await deleteUser(id);
      setRefresh(prev => !prev); // Trigger refetch
    } catch (err) {
      console.error(err);
      alert('خطا در حذف کاربر');
    }
  };

  return (
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
                  {/* Add edit/create functionality later */}
                  <button onClick={() => alert('ویرایش به‌زودی')}>ویرایش</button>
                  <button onClick={() => handleDeleteUser(user._id)}>حذف</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};

export default UsersPage;
