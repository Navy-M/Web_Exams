import React, { useMemo, useRef } from "react";
import "./AllocationReport.css";

/**
 * Props:
 * - selectedUsers: [{ _id|id, username?, profile:{ fullName, phone } }, ...]
 * - assignmentResult: {
 *     allocations: {
 *       [jobKey]: {
 *         name?: string,
 *         persons: Array<
 *           string | number | {
 *             id?: string, _id?: string,  // used only for matching (never shown/exported)
 *             rank?: number, score?: number, fullName?: string, phone?: string
 *           }
 *         >
 *       }
 *     },
 *     quotas?: {
 *       [jobKey]: { name?: string, tableCount: number }
 *     }
 *   }
 */
const AllocationReport = ({ selectedUsers = [], assignmentResult }) => {
  const containerRef = useRef(null);
  const todayFa = new Date().toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Quick lookup for user meta (fullName + phone)
  const usersMap = useMemo(() => {
    const m = new Map();
    selectedUsers.forEach((u) => {
      const id = u?._id || u?.id;
      if (!id) return;
      const profile = u?.profile || {};
      m.set(id, {
        id,
        fullName: profile.fullName || u?.fullName || u?.username || "بدون نام",
        phone: profile.phone || u?.phone || "بدون شماره",
      });
    });
    return m;
  }, [selectedUsers]);

  // Normalize allocations -> [{jobKey, jobName, persons:[{fullName, phone, rank, score}]}]
  const allocations = useMemo(() => {
    const a = assignmentResult?.allocations || {};
    return Object.entries(a).map(([jobKey, jobData]) => {
      const jobName = jobData?.name || jobKey;
      const persons = (jobData?.persons || []).map((p, idx) => {
        const id =
          typeof p === "string" || typeof p === "number" ? p : p?.id || p?._id;

        // meta from selectedUsers or fallbacks from person object
        const metaFromUsers = usersMap.get(id);
        const fullName =
          metaFromUsers?.fullName ||
          (typeof p === "object" ? p?.fullName : "") ||
          "بدون نام";
        const phone =
          metaFromUsers?.phone ||
          (typeof p === "object" ? p?.phone : "") ||
          "بدون شماره";

        return {
          // id is intentionally NOT displayed/exported; only used for keys
          id,
          fullName,
          phone,
          rank: typeof p === "object" ? p?.rank : undefined,
          score: typeof p === "object" ? p?.score : undefined,
          idx,
        };
      });
      return { jobKey, jobName, persons };
    });
  }, [assignmentResult, usersMap]);

  const quotas = assignmentResult?.quotas || null;

  // Stats
  const assignedIds = useMemo(() => {
    const set = new Set();
    allocations.forEach((j) => j.persons.forEach((p) => set.add(p.id)));
    return set;
  }, [allocations]);

  const unassigned = useMemo(() => {
    return selectedUsers
      .filter((u) => !assignedIds.has(u?._id || u?.id))
      .map((u) => u?.profile?.fullName || u?.fullName || u?.username || "بدون نام");
  }, [selectedUsers, assignedIds]);

  const totals = useMemo(() => {
    const perJob = allocations.map((j) => ({
      jobKey: j.jobKey,
      jobName: j.jobName,
      assigned: j.persons.length,
      quota: quotas?.[j.jobKey]?.tableCount ?? null,
      remaining:
        typeof quotas?.[j.jobKey]?.tableCount === "number"
          ? Math.max(quotas[j.jobKey].tableCount - j.persons.length, 0)
          : null,
    }));
    const assignedTotal = perJob.reduce((s, r) => s + r.assigned, 0);
    return { perJob, assignedTotal };
  }, [allocations, quotas]);

  const totalSelected = selectedUsers.length;

  // Print
  const handlePrint = () => {
    if (!containerRef.current) return;
    const contents = containerRef.current.innerHTML;
    const win = window.open("", "", "width=1024,height=720");
    if (!win) return;

    const inlineCSS = `
      @page { size: A4; margin: 14mm; }
      body { font-family: Tahoma, Vazir, Arial, sans-serif; direction: rtl; color: #111; }
      .rep-wrap { max-width: 100%; }
      .rep-head { display:flex; align-items:center; justify-content:space-between; margin-bottom: 12px; }
      .rep-title { margin:0; font-size: 18pt; }
      .muted { color:#555; font-size: 10pt; }
      .rep-summary, .rep-quotas, .rep-unassigned { margin: 8px 0 14px; }
      .sum-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:6px; }
      .sum-item { padding: 8px 10px; border:1px solid #ccc; border-radius: 8px; }
      table { width:100%; border-collapse: collapse; font-size: 11pt; }
      th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
      thead th { background: #f0f3f8; }
      .group-row th { background: #e6eefc; text-align: right; font-size: 12pt; }
      .badge { display:inline-block; border:1px solid #ccc; border-radius: 999px; padding: 1px 8px; font-size: 9pt; }
      .totals-table { margin-top: 12px; }
      .unassigned-box { border:1px dashed #bbb; border-radius:8px; padding:10px; }
    `;

    win.document.write(`
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>گزارش اولویت‌بندی</title>
          <style>${inlineCSS}</style>
        </head>
        <body>
          ${contents}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    // win.close(); // optional
  };

  // CSV (job, fullName, phone, rank, score) — no ID at all
  const handleExportCSV = () => {
    const rows = [["job", "fullName", "phone", "rank", "score"]];
    allocations.forEach((j) => {
      j.persons.forEach((p) => {
        rows.push([
          (j.jobName || "").replace(/,/g, "،"),
          (p.fullName || "").replace(/,/g, "،"),
          (p.phone || "").replace(/,/g, "،"),
          p.rank ?? "",
          p.score ?? "",
        ]);
      });
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `اولویت بندی_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="allocation-report" dir="rtl">
      <header className="allocation-header">
        <div className="allocation-title-wrap">
          <h2 className="allocation-title">گزارش اولویت‌بندی مشاغل</h2>
          <div className="allocation-sub muted">تاریخ: {todayFa}</div>
        </div>
        <div className="allocation-actions">
          <button className="btn outline" onClick={handleExportCSV}>خروجی CSV</button>
          <button className="btn primary" onClick={handlePrint}>چاپ گزارش</button>
        </div>
      </header>

      <div ref={containerRef} className="allocation-container">
        {/* Summary */}
        <section className="rep-summary">
          <div className="sum-grid">
            <div className="sum-item">
              <strong>تعداد انتخاب‌شده:</strong> {totalSelected}
            </div>
            <div className="sum-item">
              <strong>تخصیص‌یافته:</strong> {totals.assignedTotal}
            </div>
            <div className="sum-item">
              <strong>بدون تخصیص:</strong> {Math.max(totalSelected - totals.assignedTotal, 0)}
            </div>
          </div>
        </section>

        {/* Quotas vs assigned (if provided) */}
        {quotas && (
          <section className="rep-quotas">
            <table className="totals-table">
              <thead>
                <tr>
                  <th>رسته شغلی</th>
                  <th>سهمیه</th>
                  <th>تخصیص</th>
                  <th>باقیمانده</th>
                </tr>
              </thead>
              <tbody>
                {totals.perJob.map((r) => (
                  <tr key={r.jobKey}>
                    <td>{r.jobName}</td>
                    <td>{r.quota ?? "—"}</td>
                    <td>{r.assigned}</td>
                    <td>{typeof r.remaining === "number" ? r.remaining : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Allocations grouped by job */}
        <section className="rep-wrap">
          <table className="allocation-table">
            <thead>
              <tr>
                <th>ردیف</th>
                <th>رسته شغلی</th>
                <th>نام کاربر</th>
                <th>شماره تماس</th>
                <th>رتبه</th>
                <th>امتیاز</th>
              </tr>
            </thead>
            <tbody>
              {allocations.length === 0 ? (
                <tr>
                  <td colSpan="6" className="muted">اطلاعات تخصیص وجود ندارد</td>
                </tr>
              ) : (
                allocations.map((job, jIndex) => {
                  if (!job.persons.length) {
                    return (
                      <React.Fragment key={job.jobKey}>
                        <tr className="group-row">
                          <th colSpan="6">
                            {job.jobName} <span className="badge">بدون تخصیص</span>
                          </th>
                        </tr>
                      </React.Fragment>
                    );
                  }

                  return (
                    <React.Fragment key={job.jobKey}>
                      <tr className="group-row">
                        <th colSpan="6">
                          {job.jobName}{" "}
                          {typeof quotas?.[job.jobKey]?.tableCount === "number" && (
                            <span className="badge">
                              سهمیه: {quotas[job.jobKey].tableCount} | تخصیص: {job.persons.length}
                            </span>
                          )}
                        </th>
                      </tr>
                      {job.persons.map((p, i) => (
                        <tr key={`${job.jobKey}-${p.id}`}>
                          <td>{jIndex + 1}.{i + 1}</td>
                          <td>{job.jobName}</td>
                          <td>{p.fullName}</td>
                          <td>{p.phone}</td>
                          <td>{p.rank ?? "—"}</td>
                          <td>{p.score ?? "—"}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </section>

        {/* Unassigned list */}
        {unassigned.length > 0 && (
          <section className="rep-unassigned">
            <h3>کاربران بدون تخصیص</h3>
            <div className="unassigned-box">
              {unassigned.join("، ")}
            </div>
          </section>
        )}
      </div>
    </section>
  );
};

export default AllocationReport;
