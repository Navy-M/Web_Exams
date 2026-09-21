import React from "react";

const FILTERS = [
  { value: "", label: "همه موارد" },
  { value: "name", label: "نام" },
  { value: "period", label: "دوره" },
  { value: "email", label: "ایمیل" },
  { value: "role", label: "نقش" },
  { value: "job", label: "شماره پرسنلی" },
  { value: "province", label: "استان" },
];

const EMPTY_USER = {
  fullName: "",
  period: "",
  role: "user",
  email: "",
  password: "",
};

const noop = () => {};

const PeopleList = ({
  loading = false,
  error = "",
  searchFilter = "",
  setSearchFilter = noop,
  search = "",
  setSearch = noop,
  filteredUsers = [],
  setSelectedUser = noop,
  handleDeleteUser = noop,
  showAddRow = false,
  setShowAddRow = noop,
  newUser = EMPTY_USER,
  setNewUser = noop,
  handleAddUser = noop,
}) => {
  const activeFilter = FILTERS.find((item) => item.value === searchFilter);
  const updateNewUser = (field, value) => setNewUser({ ...EMPTY_USER, ...newUser, [field]: value });

  return (
    <section className="admin-users-section" dir="rtl">
      <section className="admin-users-section-BG">
        <h2>مدیریت کاربران</h2>

        {loading ? (
          <p>در حال بارگذاری...</p>
        ) : error ? (
          <p style={{ color: "red" }}>{error}</p>
        ) : (
          <>
            <div className="admin-search-container">
              <select
                value={searchFilter}
                onChange={(event) => setSearchFilter(event.target.value)}
                className="admin-search-select"
              >
                {FILTERS.map((filter) => (
                  <option key={filter.value || "all"} value={filter.value}>
                    {filter.value ? filter.label : "فیلتر بر اساس همه موارد"}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder={`جستجوی ${activeFilter?.value ? activeFilter.label : "کاربر"}...`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
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
                {filteredUsers.length ? (
                  filteredUsers.map((user, index) => (
                    <tr key={user._id || user.id || index}>
                      <td style={{ textAlign: "center" }}>{index + 1}</td>
                      <td>{user.profile?.fullName || "—"}</td>
                      <td>{user.email || user.username || "—"}</td>
                      <td>{user.role || "—"}</td>
                      <td>
                        <button type="button" onClick={() => setSelectedUser(user)} className="view-button">
                          مشاهده نتایج
                        </button>
                        <button type="button" onClick={() => handleDeleteUser(user._id || user.id)} className="delete-button">
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center" }}>
                      کاربری برای نمایش وجود ندارد.
                    </td>
                  </tr>
                )}

                {showAddRow && (
                  <tr className="add-user-row">
                    <td colSpan="5">
                      <div className="add-user-form">
                        <input
                          type="text"
                          placeholder="نام و نام خانوادگی"
                          value={newUser.fullName || ""}
                          onChange={(event) => updateNewUser("fullName", event.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="دوره"
                          value={newUser.period || ""}
                          onChange={(event) => updateNewUser("period", event.target.value)}
                        />
                        <select
                          value={newUser.role || "user"}
                          onChange={(event) => updateNewUser("role", event.target.value)}
                        >
                          <option value="user">کاربر</option>
                          <option value="admin">ادمین</option>
                        </select>
                        <input
                          type="email"
                          placeholder="ایمیل"
                          value={newUser.email || ""}
                          onChange={(event) => updateNewUser("email", event.target.value)}
                        />
                        <input
                          type="password"
                          placeholder="رمز عبور"
                          value={newUser.password || ""}
                          onChange={(event) => updateNewUser("password", event.target.value)}
                        />
                        <button type="button" onClick={handleAddUser} className="submit-button">
                          ثبت
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="5" style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      style={{ margin: "0.5rem" }}
                      onClick={() => setShowAddRow((prev) => !prev)}
                    >
                      {showAddRow ? "بستن فرم" : "افزودن کاربر جدید"}
                    </button>
                  </td>
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </section>
    </section>
  );
};

export default PeopleList;
