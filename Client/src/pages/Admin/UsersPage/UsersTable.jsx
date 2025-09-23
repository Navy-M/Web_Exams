import React from "react";

const UsersTable = ({
  users,
  onView,
  onDelete,
  showAddRow,
  setShowAddRow,
  newUser,
  setNewUser,
  onSubmitNew,
}) => {
  return (
    <div className="table-wrap">
      <table className="admin-users-table">
        <thead>
          <tr>
            <th>ردیف</th>
            <th>نام و نام خانوادگی</th>
            <th>نام کاربری</th>
            <th>نقش</th>
            <th>اقدامات</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, idx) => (
            <tr key={u._id}>
              <td className="center">{idx + 1}</td>
              <td>{u.profile?.fullName || "—"}</td>
              <td>{u.username || "—"}</td>
              <td>{u.role || "—"}</td>
              <td className="actions">
                <button className="btn ghost" onClick={() => onView(u)}>
                  مشاهده نتایج
                </button>
                <button className="btn danger" onClick={() => onDelete(u._id)}>
                  حذف
                </button>
              </td>
            </tr>
          ))}

          {showAddRow && (
            <tr className="add-user-row">
              <td colSpan="5">
                <div className="add-user-form">
                  <input
                    type="text"
                    placeholder="نام و نام خانوادگی"
                    value={newUser.fullName}
                    onChange={(e) =>
                      setNewUser({ ...newUser, fullName: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    placeholder="دوره"
                    value={newUser.period}
                    onChange={(e) =>
                      setNewUser({ ...newUser, period: e.target.value })
                    }
                  />
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                  >
                    <option value="user">کاربر</option>
                    <option value="admin">ادمین</option>
                  </select>
                  <input
                    type="text"
                    placeholder="نام کاربری"
                    value={newUser.username}
                    onChange={(e) =>
                      setNewUser({ ...newUser, username: e.target.value })
                    }
                  />
                  <input
                    type="password"
                    placeholder="رمز عبور"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                  />
                  <button className="btn primary" onClick={onSubmitNew}>
                    ثبت
                  </button>
                </div>
              </td>
            </tr>
          )}
        </tbody>

        <tfoot>
          <tr>
            <td colSpan="5">
              <button
                className="btn outline"
                onClick={() => setShowAddRow((v) => !v)}
              >
                {showAddRow ? "❌ بستن فرم" : "➕ افزودن کاربر جدید"}
              </button>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default UsersTable;
