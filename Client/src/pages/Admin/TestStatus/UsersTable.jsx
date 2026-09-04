import React, { useMemo } from "react";

const EMPTY = "—";

const UserStat = ({ u }) => {
  const { testsAssigned = [] } = u || {};
  const stats = useMemo(() => {
    let analyzed = 0;
    let feedback = 0;
    let last = null;

    testsAssigned.forEach((test) => {
      if (test?.analyzedAt || test?.analysis || Number.isFinite(Number(test?.score))) analyzed += 1;
      if (test?.adminFeedback) feedback += 1;
      const date = test?.completedAt ? new Date(test.completedAt) : null;
      if (date && (!last || date > last)) last = date;
    });

    return {
      count: testsAssigned.length,
      analyzed,
      feedback,
      lastAt: last
        ? last.toLocaleDateString("fa-IR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : EMPTY,
    };
  }, [testsAssigned]);

  return (
    <div className="u-stat">
      <span className="chip total">کل: {stats.count}</span>
      <span className="chip good">تحلیل‌شده: {stats.analyzed}</span>
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
                aria-label="انتخاب همه ردیف‌های قابل مشاهده"
              />
            </th>
            <th>ردیف</th>
            <th>نام و نام خانوادگی</th>
            <th>دوره</th>
            <th>استان</th>
            <th>آزمون‌ها</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, index) => {
            const checked = selected.has(u._id);
            const label = u.profile?.fullName || u.username || "کاربر";
            return (
              <tr key={u._id} className={checked ? "selected-row" : ""}>
                <td className="center">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleUser(u._id)}
                    aria-label={`انتخاب ${label}`}
                  />
                </td>
                <td className="center">{index + 1}</td>
                <td>{u.profile?.fullName || EMPTY}</td>
                <td>{u.period || EMPTY}</td>
                <td>{u.profile?.province || EMPTY}</td>
                <td><UserStat u={u} /></td>
              </tr>
            );
          })}
          {users.length === 0 && (
            <tr>
              <td colSpan="6" className="center muted">کاربری یافت نشد</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UsersTable;
