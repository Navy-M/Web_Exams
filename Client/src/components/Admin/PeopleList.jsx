import React from 'react'

const PeopleList = () => {
  return (
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
  )
}

export default PeopleList
