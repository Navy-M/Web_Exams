import React, { useMemo } from "react";

const UserStat = ({ u }) => {
  const { testsAssigned = [] } = u || {};
  const stats = useMemo(() => {
    let analyzed = 0, feedback = 0, last = null;
    testsAssigned.forEach((t) => {
      if (t?.analyzedAt || t?.analysis) analyzed++;
      if (t?.adminFeedback) feedback++;
      const dt = t?.completedAt ? new Date(t.completedAt) : null;
      if (dt && (!last || dt > last)) last = dt;
    });
    return {
      count: testsAssigned.length,
      analyzed,
      feedback,
      lastAt: last ? last.toLocaleDateString("fa-IR", {
        year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      }) : "—",
    };
  }, [testsAssigned]);

  return (
    <div className="u-stat">
      <span className="chip total">کل: {stats.count}</span>
      <span className="chip good">تحلیل: {stats.analyzed}</span>
      <span className="chip info">بازخورد: {stats.feedback}</span>
      <span className="muted small">آخرین فعالیت: {stats.lastAt}</span>
    </div>
  );
};

const UsersTable = ({ users, selected, onToggleUser, onToggleAll, allVisibleSelected }) => {
  return (
    <div className="ts-table-wrap">
      <table className="ts-table">
        <thead>
          <tr>
            <th className="center">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={onToggleAll}
                aria-label="انتخاب همه ردیف‌های قابل‌مشاهده"
              />
            </th>
            <th>ردیف</th>
            <th>نام و نام خانوادگی</th>
            {/* <th>ایمیل</th> */}
            <th>دوره</th>
            <th>استان</th>
            <th>آزمون‌ها</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, idx) => {
            const checked = selected.has(u._id);
            return (
              <tr key={u._id} className={checked ? "selected-row" : ""}>
                <td className="center">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleUser(u._id)}
                    aria-label={`انتخاب ${u.profile?.fullName || u.username || "کاربر"}`}
                  />
                </td>
                <td className="center">{idx + 1}</td>
                <td>{u.profile?.fullName || "—"}</td>
                {/* <td>{u.email || "—"}</td> */}
                <td>{u.period || "—"}</td>
                <td>{u.profile?.province || "—"}</td>
                <td><UserStat u={u} /></td>
              </tr>
            );
          })}
          {users.length === 0 && (
            <tr>
              <td colSpan="7" className="center muted">کاربری یافت نشد</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UsersTable;
