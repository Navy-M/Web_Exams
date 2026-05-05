// src/components/Reports/AllocationReport.jsx
import React, { useMemo } from "react";
import PropTypes from "prop-types";

/**
 * پشتیبانی از هر دو مدل داده:
 * Legacy: { allocations:{ [job]:{ name, persons:[{id,rank,score,fullName,phone,field}] } }, quotas:{...}, meta? }
 * New   : { assignments:[{job,slots:[{userId,username,score}]}],
 *           waitlist:[{job,queue:[{userId,username,score}]}],
 *           unassigned?:[{userId,username,fullName,field?}],
 *           table?:[{job,rank,assigned,assignedJob,userId,username,fullName,field?,score,...}],
 *           quotas?:{...}, meta? }
 */
const AllocationReport = ({
  data,
  title = "گزارش تخصیص",
  subtitle = "نتیجه رتبه‌بندی و توزیع ظرفیت‌ها",
  onClose,
  fileNamePrefix = "allocation",
}) => {
  const {
    allocations: legacyAllocations = {},
    quotas = {},
    meta = {},
    assignments = [],
    waitlist = [],
    unassigned: unassignedInput = [],
    table = [],
  } = data || {};

  console.log("AllocationReport data:", data);
  
  /* ---------- capacities by job name ---------- */
  const capacities = useMemo(() => {
    const byName = {};
    Object.values(quotas || {}).forEach((q) => {
      if (!q?.name) return;
      byName[q.name] = Number(q.tableCount) || 0;
    });
    return byName;
  }, [quotas]);

  /* ---------- enrichment from table (fullName/username/field/score/rank/assigned) ---------- */
  const personFromTable = useMemo(() => {
    const m = new Map();
    (table || []).forEach((r) => {
      if (!r?.userId) return;
      const uid = String(r.userId);
      m.set(uid, {
        fullName: r.fullName ?? "",
        username: r.username ?? "",
        field: r.field ?? "",
        score: Number(r.score ?? 0),
        rank: r.rank,
        assigned: !!r.assigned,
        assignedJob: r.assignedJob ?? null,
      });
    });
    return m;
  }, [table]);

  /* ---------- Selected per job ---------- */
  const selectedByJob = useMemo(() => {
    // Legacy mode
    if (Object.keys(legacyAllocations).length) {
      const map = {};
      Object.entries(legacyAllocations).forEach(([job, block]) => {
        map[job] = (block?.persons || []).map((p, i) => ({
          id: p.id,
          userId: p.id,
          fullName: p.fullName ?? "",
          username: p.username ?? "",
          field: p.field ?? "",
          phone: p.phone ?? "",
          rank: p.rank || i + 1,
          score: Number(p.score ?? 0),
          status: "منتخب",
        }));
      });
      return map;
    }
    // New mode
    const map = {};
    assignments.forEach(({ job, slots = [] }) => {
      const rows = slots.map((s, i) => {
        const enrich = personFromTable.get(String(s.userId)) || {};
        return {
          id: s.userId,
          userId: s.userId,
          fullName: enrich.fullName || "",
          username: enrich.username || s.username || "",
          field: enrich.field || "",
          rank: enrich.rank || i + 1,
          score: Number(s.score ?? enrich.score ?? 0),
          status: "منتخب",
        };
      });
      rows.sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));
      map[job] = rows;
    });
    return map;
  }, [legacyAllocations, assignments, personFromTable]);

  /* ---------- Waitlist per job (new mode) ---------- */
  const waitlistByJob = useMemo(() => {
    const map = {};
    waitlist.forEach(({ job, queue = [] }) => {
      map[job] = queue.map((s, idx) => {
        const enrich = personFromTable.get(String(s.userId)) || {};
        return {
          id: s.userId,
          userId: s.userId,
          fullName: enrich.fullName || "",
          username: enrich.username || s.username || "",
          field: enrich.field || "",
          rank: enrich.rank || idx + 1,
          score: Number(s.score ?? enrich.score ?? 0),
          status: "انتظار",
        };
      });
    });
    return map;
  }, [waitlist, personFromTable]);

  /* ---------- jobs union ---------- */
  const jobKeys = useMemo(() => {
    const set = new Set();
    Object.keys(legacyAllocations || {}).forEach((j) => set.add(j));
    assignments.forEach((a) => set.add(a.job));
    waitlist.forEach((w) => set.add(w.job));
    Object.values(quotas || {}).forEach((q) => q?.name && set.add(q.name));
    return [...set].sort((a, b) => String(a).localeCompare(String(b), "fa"));
  }, [legacyAllocations, assignments, waitlist, quotas]);

  /* ---------- per-job counts ---------- */
  const assignedTotals = useMemo(() => {
    const t = {};
    jobKeys.forEach((j) => (t[j] = (selectedByJob[j] || []).length));
    return t;
  }, [jobKeys, selectedByJob]);
  const waitTotals = useMemo(() => {
    const t = {};
    jobKeys.forEach((j) => (t[j] = (waitlistByJob[j] || []).length));
    return t;
  }, [jobKeys, waitlistByJob]);

  const totalAssigned = useMemo(
    () => Object.values(assignedTotals).reduce((a, b) => a + (b || 0), 0),
    [assignedTotals]
  );
  const totalWait = useMemo(
    () => Object.values(waitTotals).reduce((a, b) => a + (b || 0), 0),
    [waitTotals]
  );
  const totalCapacity = useMemo(
    () => Object.values(capacities).reduce((a, b) => a + (b || 0), 0),
    [capacities]
  );

  /* ---------- Unassigned compute (prefer explicit; else derive from table) ---------- */
  const unassigned = useMemo(() => {
    if (unassignedInput && unassignedInput.length) return unassignedInput;
    // اگر table داریم، از آن دربیاریم: کسانی که assigned=false
    if (table && table.length) {
      const seen = new Set();
      const out = [];
      table.forEach((r) => {
        if (r.assigned) return;
        const uid = String(r.userId);
        if (seen.has(uid)) return;
        seen.add(uid);
        out.push({
          userId: uid,
          username: r.username || "",
          fullName: r.fullName || "",
          field: r.field || "",
        });
      });
      return out;
    }
    return [];
  }, [unassignedInput, table]);

  /* ---------- Export: Excel ---------- */
  const downloadExcel = async () => {
    try {
      const XLSX = (await import("xlsx")).default || (await import("xlsx"));
      const wb = XLSX.utils.book_new();

      // Summary
      const summaryRows = jobKeys.map((jk) => ({
        Job: jk,
        Capacity: capacities[jk] ?? 0,
        Selected: assignedTotals[jk] ?? 0,
        Waitlist: waitTotals[jk] ?? 0,
        Unfilled: Math.max(0, (capacities[jk] ?? 0) - (assignedTotals[jk] ?? 0)),
      }));
      summaryRows.push({
        Job: "TOTAL",
        Capacity: totalCapacity,
        Selected: totalAssigned,
        Waitlist: totalWait,
        Unfilled: Math.max(0, totalCapacity - totalAssigned),
      });
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

      // Per job - Selected
      jobKeys.forEach((jk) => {
        const selectedRows = (selectedByJob[jk] || []).map((p) => ({
          Rank: p.rank,
          UserID: p.userId,
          Username: p.username || "",
          Name: p.fullName || "",
          Field: p.field || "",
          Score: round2(p.score),
          Notes: "", // ستون خالی برای ملاحظات
        }));
        const wsSel = XLSX.utils.json_to_sheet(selectedRows);
        XLSX.utils.book_append_sheet(wb, wsSel, cleanSheetName(`Selected_${jk}`));

        const waitRows = (waitlistByJob[jk] || []).map((p) => ({
          Rank: p.rank,
          UserID: p.userId,
          Username: p.username || "",
          Name: p.fullName || "",
          Field: p.field || "",
          Score: round2(p.score),
          Notes: "",
        }));
        if (waitRows.length) {
          const wsWait = XLSX.utils.json_to_sheet(waitRows);
          XLSX.utils.book_append_sheet(wb, wsWait, cleanSheetName(`Waitlist_${jk}`));
        }
      });

      // Unassigned
      if (unassigned.length) {
        const wsUn = XLSX.utils.json_to_sheet(
          unassigned.map((u) => ({
            UserID: u.userId,
            Username: u.username || "",
            Name: u.fullName || "",
            Field: u.field || "",
            Notes: "",
          }))
        );
        XLSX.utils.book_append_sheet(wb, wsUn, "Unassigned");
      }

      const file = `${fileNamePrefix}_${slug(title)}_${dateStamp()}.xlsx`;
      XLSX.writeFile(wb, file);
    } catch (err) {
      console.error("Excel export failed; falling back to CSV:", err);
      downloadCSV();
    }
  };

  /* ---------- Export: CSV (fallback) ---------- */
  const downloadCSV = () => {
    const chunks = [];

    chunks.push("=== Summary ===");
    chunks.push("Job,Capacity,Selected,Waitlist,Unfilled");
    jobKeys.forEach((jk) =>
      chunks.push(
        [
          escapeCSV(jk),
          capacities[jk] ?? 0,
          assignedTotals[jk] ?? 0,
          waitTotals[jk] ?? 0,
          Math.max(0, (capacities[jk] ?? 0) - (assignedTotals[jk] ?? 0)),
        ].join(",")
      )
    );
    chunks.push(
      [
        "TOTAL",
        totalCapacity,
        totalAssigned,
        totalWait,
        Math.max(0, totalCapacity - totalAssigned),
      ].join(",")
    );
    chunks.push("");

    jobKeys.forEach((jk) => {
      chunks.push(`=== Selected ${jk} ===`);
      chunks.push("Rank,UserID,Username,Name,Field,Score,Notes");
      (selectedByJob[jk] || []).forEach((p) => {
        chunks.push(
          [
            p.rank ?? "",
            // escapeCSV(p.userId ?? ""),
            // escapeCSV(p.username ?? ""),
            escapeCSV(p.fullName ?? ""),
            escapeCSV(p.field ?? ""),
            round2(p.score ?? 0),
            "", // Notes
          ].join(",")
        );
      });
      chunks.push("");

      const wl = waitlistByJob[jk] || [];
      if (wl.length) {
        chunks.push(`=== Waitlist ${jk} ===`);
        chunks.push("Rank,UserID,Username,Name,Field,Score,Notes");
        wl.forEach((p) => {
          chunks.push(
            [
              p.rank ?? "",
              // escapeCSV(p.userId ?? ""),
              // escapeCSV(p.username ?? ""),
              escapeCSV(p.fullName ?? ""),
              escapeCSV(p.field ?? ""),
              round2(p.score ?? 0),
              "",
            ].join(",")
          );
        });
        chunks.push("");
      }
    });

    if (unassigned.length) {
      chunks.push("=== Unassigned ===");
      chunks.push("UserID,Username,Name,Field,Notes");
      unassigned.forEach((u) =>
        chunks.push(
          [
            // escapeCSV(u.userId),
            // escapeCSV(u.username || ""),
            escapeCSV(u.fullName || ""),
            escapeCSV(u.field || ""),
            "",
          ].join(",")
        )
      );
    }

    const blob = new Blob([chunks.join("\n")], { type: "text/csv;charset=utf-8;" });
    triggerDownload(
      URL.createObjectURL(blob),
      `${fileNamePrefix}_${slug(title)}_${dateStamp()}.csv`
    );
  };

  const handlePrint = () => window.print();

  /* ---------- UI ---------- */
  return (
    <section className="allocation-report" dir="rtl">
      <header className="allocation-header">
        <div>
          <h2 className="allocation-title">{title}</h2>
        <div className="allocation-sub muted small">
          {subtitle}
          {!!meta?.source && <> • منبع داده: {meta.source}</>}
        </div>
        </div>
        <div className="allocation-actions">
          <button className="btn" onClick={downloadCSV}>دانلود CSV</button>
          <button className="btn primary" onClick={downloadExcel}>دانلود Excel</button>
          <button className="btn outline" onClick={handlePrint}>چاپ</button>
          {onClose && <button className="btn ghost" onClick={onClose}>بستن</button>}
        </div>
      </header>

      {/* KPIs */}
      <div className="rep-summary">
        <div className="sum-grid">
          <div className="sum-item">
            <div className="muted small">تعداد رسته‌ها</div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{jobKeys.length}</div>
          </div>
          <div className="sum-item">
            <div className="muted small">مجموع ظرفیت</div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{totalCapacity}</div>
          </div>
          <div className="sum-item">
            <div className="muted small">منتخب نهایی</div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{totalAssigned}</div>
          </div>
          <div className="sum-item">
            <div className="muted small">لیست انتظار</div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{totalWait}</div>
          </div>
          <div className="sum-item">
            <div className="muted small">بدون تخصیص</div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{unassigned.length}</div>
          </div>
        </div>
      </div>

      {/* Totals table */}
      <table className="totals-table">
        <thead>
          <tr>
            <th>رسته</th>
            <th>ظرفیت</th>
            <th>منتخب</th>
            <th>لیست انتظار</th>
            <th>ظرفیت خالی</th>
          </tr>
        </thead>
        <tbody>
          {jobKeys.map((jk) => (
            <tr key={jk}>
              <td className="t-left" style={{ textAlign: "right" }}>{jk}</td>
              <td className="num">{capacities[jk] ?? 0}</td>
              <td className="num">{assignedTotals[jk] ?? 0}</td>
              <td className="num">{waitTotals[jk] ?? 0}</td>
              <td className="num">
                {Math.max(0, (capacities[jk] ?? 0) - (assignedTotals[jk] ?? 0))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Per job: Selected + Waitlist */}
      {jobKeys.map((jk) => {
        const selected = selectedByJob[jk] || [];
        const wl = waitlistByJob[jk] || [];
        return (
          <div key={jk} className="allocation-container" style={{ marginTop: 10 }}>
            <div className="group-row">
              <table className="allocation-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th colSpan="6" className="t-left" style={{ textAlign: "right" }}>
                      {jk}
                      <span className="badge" style={{ marginInlineStart: 8 }}>
                        ظرفیت: {capacities[jk] ?? 0}
                      </span>
                      <span className="badge" style={{ marginInlineStart: 6 }}>
                        منتخب: {selected.length}
                      </span>
                      {wl.length > 0 && (
                        <span className="badge" style={{ marginInlineStart: 6 }}>
                          انتظار: {wl.length}
                        </span>
                      )}
                    </th>
                  </tr>
                  <tr>
                    <th>رتبه</th>
                    <th style={{ textAlign: "right" }}>نام</th>
                    <th>رشته تحصیلی</th>
                    <th>امتیاز</th>
                    <th>ملاحظات</th>
                    <th>وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.map((p) => (
                    <tr key={`sel-${jk}-${p.userId}`}>
                      <td className="num">{p.rank ?? ""}</td>
                      <td className="t-left" style={{ textAlign: "right" }}>{p.fullName || "—"}</td>
                      <td className="t-left" style={{ textAlign: "right" }}>{p.field || "—"}</td>
                      <td className="num">{round2(p.score)}</td>
                      <td className="t-left" style={{ textAlign: "right" }}>{""}</td>
                      <td><span className="badge ok">منتخب</span></td>
                    </tr>
                  ))}
                  {selected.length === 0 && (
                    <tr><td colSpan="6" className="muted center">—</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {wl.length > 0 && (
              <div className="group-row" style={{ marginTop: 8 }}>
                <table className="allocation-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th colSpan="6" className="t-left" style={{ textAlign: "right" }}>
                        لیست انتظار
                      </th>
                    </tr>
                    <tr>
                      <th>رتبه</th>
                      <th style={{ textAlign: "right" }}>نام</th>
                      <th>رشته تحصیلی</th>
                      <th>امتیاز</th>
                      <th>ملاحظات</th>
                      {/* <th>وضعیت</th> */}
                    </tr>
                  </thead>
                  <tbody>
                    {wl.map((p) => (
                      <tr key={`wl-${jk}-${p.userId}`}>
                        <td className="num">{p.rank ?? ""}</td>
                        <td className="t-left" style={{ textAlign: "right" }}>{p.fullName || "—"}</td>
                        <td className="t-left" style={{ textAlign: "right" }}>{p.field || "—"}</td>
                        <td className="num">{round2(p.score)}</td>
                        <td className="t-left" style={{ textAlign: "right" }}>{""}</td>
                        {/* <td><span className="badge warn">انتظار</span></td> */}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Unassigned */}
      {unassigned.length > 0 && (
        <div className="allocation-container" style={{ marginTop: 12 }}>
          <div className="group-row">
            <table className="allocation-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th colSpan="4" className="t-left" style={{ textAlign: "right" }}>
                    افراد بدون تخصیص
                    <span className="badge" style={{ marginInlineStart: 8 }}>
                      تعداد: {unassigned.length}
                    </span>
                  </th>
                </tr>
                <tr>
                  <th>کد کاربر</th>
                  <th>نام</th>
                  <th>رشته تحصیلی</th>
                  <th>ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {unassigned.map((u) => (
                  <tr key={`un-${u.userId}`}>
                    <td className="num">{u.userId}</td>
                    <td className="t-left" style={{ textAlign: "right" }}>{u.fullName || "—"}</td>
                    <td className="t-left" style={{ textAlign: "right" }}>{u.field || "—"}</td>
                    <td className="t-left" style={{ textAlign: "right" }}>{""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

/* ------------ helpers ------------ */
function round2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
function cleanSheetName(name) { return String(name).slice(0, 31).replace(/[\\/?*\]\[:]/g, "-"); }
function slug(s) { return String(s || "").trim().replace(/\s+/g, "_").replace(/[^\w\-]+/g, ""); }
function dateStamp() {
  const d = new Date(); const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
}
function triggerDownload(href, filename) {
  const a = document.createElement("a");
  a.href = href; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(href);
}
function escapeCSV(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

AllocationReport.propTypes = {
  data: PropTypes.object,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  onClose: PropTypes.func,
  fileNamePrefix: PropTypes.string,
};

export default AllocationReport;
