import React, { useMemo, useRef, useState } from "react";
import "./AdminTestManager/AdminTestManager.css";
import TestsPage from "./AdminTestManager/TestsPage";

/**
 * Props:
 * - Test_Cards: Array<{
 *     id: string, name: string, type: string,
 *     questionFormat?: string, description?: string,
 *     questions?: any[], tags?: string[], sampleQuestion?: string
 *   }>
 * - jobRequirements: Record<string, Record<string, string[]>>
 */
const AdminTestsManager = ({ Test_Cards = [], jobRequirements = {} }) => {
  // UI state
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [sortKey, setSortKey] = useState("name_asc");
  const [viewGrouped, setViewGrouped] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  const listRef = useRef(null);

  const lc = (v) => (v ?? "").toString().toLowerCase();

  // Derive filters
  const allTypes = useMemo(
    () => Array.from(new Set(Test_Cards.map((t) => t.type).filter(Boolean))),
    [Test_Cards]
  );
  const allFormats = useMemo(
    () =>
      Array.from(
        new Set(Test_Cards.map((t) => t.questionFormat).filter(Boolean))
      ),
    [Test_Cards]
  );

  // Filter + search
  const filtered = useMemo(() => {
    const query = lc(q);
    return (Test_Cards || []).filter((t) => {
      const byQuery =
        !query ||
        lc(t.name).includes(query) ||
        lc(t.type).includes(query) ||
        lc(t.questionFormat).includes(query) ||
        lc(t.description).includes(query);
      const byType = !typeFilter || t.type === typeFilter;
      const byFormat = !formatFilter || t.questionFormat === formatFilter;
      return byQuery && byType && byFormat;
    });
  }, [Test_Cards, q, typeFilter, formatFilter]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortKey) {
      case "name_asc":
        arr.sort((a, b) => a.name.localeCompare(b.name, "fa"));
        break;
      case "name_desc":
        arr.sort((a, b) => b.name.localeCompare(a.name, "fa"));
        break;
      case "type_asc":
        arr.sort((a, b) => (a.type || "").localeCompare(b.type || "", "fa"));
        break;
      case "format_asc":
        arr.sort((a, b) =>
          (a.questionFormat || "").localeCompare(b.questionFormat || "", "fa")
        );
        break;
      default:
        break;
    }
    return arr;
  }, [filtered, sortKey]);

  // Group by type (optional)
  const groups = useMemo(() => {
    const map = new Map();
    sorted.forEach((t) => {
      const key = t.type || "سایر";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    });
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      items,
    }));
  }, [sorted]);

  // Quick stats
  const stats = useMemo(() => {
    const total = Test_Cards.length;
    const byType = allTypes.map((t) => ({
      type: t,
      count: Test_Cards.filter((x) => x.type === t).length,
    }));
    const byFormat = allFormats.map((f) => ({
      format: f,
      count: Test_Cards.filter((x) => x.questionFormat === f).length,
    }));
    return { total, byType, byFormat };
  }, [Test_Cards, allTypes, allFormats]);

  // Actions
  const handleExportCSV = () => {
    const rows = [["id", "name", "type", "questionFormat", "questionsCount"]];
    sorted.forEach((t) => {
      rows.push([
        (t.id || "").replace(/,/g, "،"),
        (t.name || "").replace(/,/g, "،"),
        (t.type || "").replace(/,/g, "،"),
        (t.questionFormat || "").replace(/,/g, "،"),
        t.questions?.length ?? "",
      ]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tests_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!listRef.current) return;
    const html = listRef.current.innerHTML;
    const win = window.open("", "", "width=1024,height=720");
    if (!win) return;
    const printCSS = `
      @page{ size: A4; margin: 14mm; }
      body{ direction: rtl; font-family: Tahoma, Vazir, Arial, sans-serif; color:#111; }
      h2{ margin-top:0; }
      table{ width:100%; border-collapse: collapse; font-size: 11pt; }
      th,td{ border:1px solid #ccc; padding:8px; text-align:center; }
      thead th{ background:#f0f3f8; }
      .muted{ color:#666; }
    `;
    win.document.write(`
      <html>
        <head><meta charset="UTF-8" /><title>فهرست آزمون‌ها</title>
          <style>${printCSS}</style>
        </head>
        <body>${html}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="atm-root" dir="rtl">
      {/* Header + actions */}
      <header className="atm-head">
        <div>
          <h2 className="atm-title">مدیریت آزمون‌ها</h2>
          <div className="muted">فهرست کامل آزمون‌ها، جستجو، فیلتر، آمار و جزئیات</div>
        </div>
        <div className="atm-actions">
          <button className="btn outline" onClick={handleExportCSV}>
            خروجی CSV
          </button>
          <button className="btn primary" onClick={handlePrint}>
            چاپ فهرست
          </button>
        </div>
      </header>

      {/* Quick stats */}
      <section className="atm-stats card">
        <div className="stat">
          <div className="stat-label">تعداد کل آزمون‌ها</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat">
          <div className="stat-label">توزیع بر اساس نوع</div>
          <div className="chips">
            {stats.byType.map((r) => (
              <span className="chip" key={r.type}>
                {r.type} <b>{r.count}</b>
              </span>
            ))}
            {stats.byType.length === 0 && <span className="muted">—</span>}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">توزیع بر اساس فرمت سوال</div>
          <div className="chips">
            {stats.byFormat.map((r) => (
              <span className="chip" key={r.format}>
                {r.format} <b>{r.count}</b>
              </span>
            ))}
            {stats.byFormat.length === 0 && <span className="muted">—</span>}
          </div>
        </div>
      </section>

      {/* Controls */}
      <section className="atm-controls">
        <div className="search-wrap">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو… (نام، نوع، فرمت، توضیحات)"
            aria-label="جستجو"
          />
        </div>
        <div className="filters">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="فیلتر نوع"
          >
            <option value="">همه نوع‌ها</option>
            {allTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            aria-label="فیلتر فرمت سوال"
          >
            <option value="">همه فرمت‌ها</option>
            {allFormats.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            aria-label="مرتب‌سازی"
          >
            <option value="name_asc">مرتب‌سازی: نام (الفبا)</option>
            <option value="name_desc">مرتب‌سازی: نام (معکوس)</option>
            <option value="type_asc">مرتب‌سازی: نوع</option>
            <option value="format_asc">مرتب‌سازی: فرمت سوال</option>
          </select>

          <label className="toggle">
            <input
              type="checkbox"
              checked={viewGrouped}
              onChange={(e) => setViewGrouped(e.target.checked)}
            />
            <span>نمایش گروهی بر اساس نوع</span>
          </label>
        </div>
      </section>

      {/* List (printable) */}
      <section className="atm-list card" ref={listRef}>
        {!viewGrouped ? (
          <TestsTable
            items={sorted}
            onSelect={(t) => setSelectedTest(t)}
          />
        ) : (
          <div className="groups">
            {groups.map((g) => (
              <div key={g.key} className="group">
                <div className="group-head">
                  <h3 className="group-title">{g.key}</h3>
                  <span className="badge">{g.items.length} آیتم</span>
                </div>
                <TestsTable items={g.items} onSelect={(t) => setSelectedTest(t)} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Detail drawer */}
      {selectedTest && (
        <TestDrawer test={selectedTest} onClose={() => setSelectedTest(null)} />
      )}

      {/* Job Requirements */}
      {Object.keys(jobRequirements).length > 0 && (
        <section className="job-req card">
          <h3>ویژگی‌ها و مهارت‌های مورد نیاز برای هر شغل</h3>
          <p className="muted">
            این فهرست برای تفسیر نتایج آزمون‌ها در فرایند تخصیص شغلی استفاده می‌شود.
          </p>
          <div className="job-grid">
            {Object.entries(jobRequirements).map(([jobName, requirements]) => (
              <article className="job-card" key={jobName}>
                <header className="job-head">
                  <h4>{jobName}</h4>
                </header>
                <ul className="job-list">
                  {Object.entries(requirements).map(([key, values]) => (
                    <li key={key}>
                      <strong>{key.toUpperCase()}:</strong> {values.join("، ")}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Your existing page below */}
      <section className="atm-footer">
        <TestsPage />
      </section>
    </div>
  );
};

export default AdminTestsManager;

/* ---------- Subcomponents ---------- */

const TestsTable = ({ items = [], onSelect }) => {
  return (
    <div className="table-wrap">
      <table className="tests-table">
        <thead>
          <tr>
            <th className="center">ردیف</th>
            <th>نام آزمون</th>
            <th>نوع</th>
            <th>فرمت سؤال</th>
            <th>تعداد سؤال</th>
            <th>اقدامات</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t, i) => (
            <tr key={t.id}>
              <td className="center">{i + 1}</td>
              <td>{t.name || "—"}</td>
              <td>{t.type || "—"}</td>
              <td>{t.questionFormat || "—"}</td>
              <td>{t.questions?.length ?? "—"}</td>
              <td className="actions">
                <button className="btn tiny" onClick={() => onSelect?.(t)}>
                  جزئیات
                </button>
                {/* <button
                  className="btn tiny outline"
                  onClick={() => alert("پیش‌نمایش آزمون (دمو)")}
                >
                  پیش‌نمایش
                </button> */}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td className="center muted" colSpan="6">
                موردی یافت نشد
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const TestDrawer = ({ test, onClose }) => {
  const qCount = test?.questions?.length ?? 0;
  const tags = test?.tags || [];

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer card" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <h3>{test?.name}</h3>
          <button className="btn ghost" onClick={onClose}>
            بستن
          </button>
        </header>

        <div className="drawer-body">
          <div className="kv">
            <span className="label">نوع:</span>
            <span className="value">{test?.type || "—"}</span>
          </div>
          <div className="kv">
            <span className="label">فرمت سؤال:</span>
            <span className="value">{test?.questionFormat || "—"}</span>
          </div>
          <div className="kv">
            <span className="label">تعداد سؤال:</span>
            <span className="value">{qCount}</span>
          </div>
          {tags.length > 0 && (
            <div className="kv">
              <span className="label">برچسب‌ها:</span>
              <span className="value">
                {tags.map((t) => (
                  <span className="chip" key={t}>
                    {t}
                  </span>
                ))}
              </span>
            </div>
          )}
          {test?.description && (
            <div className="desc">
              <h4>توضیحات</h4>
              <p>{test.description}</p>
            </div>
          )}
          {test?.sampleQuestion && (
            <div className="desc">
              <h4>نمونه سؤال</h4>
              <p>{test.sampleQuestion}</p>
            </div>
          )}
          {!test?.description && !test?.sampleQuestion && (
            <p className="muted">اطلاعات تکمیلی برای این آزمون ثبت نشده است.</p>
          )}
        </div>

        <footer className="drawer-foot">
          <button
            className="btn outline"
            onClick={() => alert("ویرایش آزمون (دمو)")}
          >
            ویرایش
          </button>
          <button
            className="btn danger"
            onClick={() => alert("حذف آزمون (دمو)")}
          >
            حذف
          </button>
        </footer>
      </aside>
    </div>
  );
};
