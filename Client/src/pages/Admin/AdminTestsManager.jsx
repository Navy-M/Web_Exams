// AdminTestsManager.jsx
import React, { useMemo, useRef, useState, useCallback } from "react";
import "./AdminTestManager/AdminTestManager.css";
import TestsPage from "./AdminTestManager/TestsPage";

// ====== ثابت‌ها ======
const TEST_FAMILIES = ["DISC", "MBTI", "HOLLAND", "GARDNER", "CLIFTON", "PERSONAL_FAVORITES"];
const FAMILY_KEYS = {
  disc: "DISC",
  mbti: "MBTI",
  holland: "HOLLAND",
  gardner: "GARDNER",
  clifton: "CLIFTON",
  pf: "PERSONAL_FAVORITES",
};
const DEFAULT_DISC_THRESHOLDS = { high: 65, low: 35 };

// ====== کمک‌تابع‌ها ======
const lc = (v) => (v ?? "").toString().toLowerCase();
const safeArr = (x) => (Array.isArray(x) ? x : x && typeof x === "object" ? Object.values(x) : []);
const toCsv = (rows) => rows.map((r) => r.map((c) => String(c ?? "").replace(/,/g, "،")).join(",")).join("\n");
const has = (obj, k) => Object.prototype.hasOwnProperty.call(obj || {}, k);

// normalize jobRequirements to v2-like shape
const normalizeJob = (name, req) => {
  // اگر نسخه‌ی ساده باشد:
  if (Array.isArray(req?.disc) || Array.isArray(req?.mbti) || Array.isArray(req?.holland)) {
    return {
      summary: req.summary || "",
      disc: { require: [], prefer: req.disc || [], thresholds: DEFAULT_DISC_THRESHOLDS },
      mbti: { prefer: req.mbti || [] },
      holland: { top3: req.holland || [] },
      gardner: { prefer: req.gardner || [] },
      clifton: {
        domainsPrefer: Array.isArray(req.clifton) ? req.clifton.filter(isDomainKey) : [],
        themesPrefer: Array.isArray(req.clifton) ? req.clifton.filter((x) => !isDomainKey(x)) : [],
      },
      pf: { itemIdsPrefer: Array.isArray(req.PF) ? req.PF : [], keywords: [] },
      weights: req.weights || null,
      benchmark: req.benchmark || null,
      _raw: req,
      _name: name,
    };
  }
  // نسخه‌ی غنی (v2)
  return { ...req, _name: name };
};

const isDomainKey = (s) => ["Executing", "Influencing", "Relationship", "Strategic"].includes(String(s));
const anyVal = (o) => Object.values(o || {}).some(Boolean);
const uniq = (arr) => Array.from(new Set(arr));

// پوشش تست‌ها: آیا در Test_Cards تستی برای هر خانواده هست؟
const detectCoverage = (tests = []) => {
  const byFamily = {};
  for (const fam of TEST_FAMILIES) byFamily[fam] = [];
  tests.forEach((t) => {
    const family = (t.type || t.testType || "").toUpperCase();
    if (TEST_FAMILIES.includes(family)) byFamily[family].push(t);
  });
  return byFamily;
};

// اعتبارسنجی حداقلی jobRequirements
const validateJob = (job) => {
  const issues = [];
  // Clifton: Discpline غلط املایی رایج
  const clPref = (job?.clifton?.themesPrefer || []).map(String);
  if (clPref.some((x) => x.toLowerCase() === "discpline")) {
    issues.push("Clifton Theme «Discpline» اشتباه است؛ «Discipline» صحیح است.");
  }
  // Clifton: Thinking (به عنوان Domain وجود ندارد -> احتمالاً Strategic منظور بوده)
  if (clPref.some((x) => x.toLowerCase() === "thinking")) {
    issues.push("Clifton Theme/Domain «Thinking» ناشناخته است؛ «Strategic» یا «Analytical» را بررسی کنید.");
  }
  // DISC: الگوهای High/Low
  const discPrefs = (job?.disc?.prefer || []).concat(job?.disc?.require || []);
  const discBad = discPrefs.filter((x) => !/^high\s*[DISC]|^low\s*[DISC]/i.test(x.replace(/\s+/g, " ")));
  if (discBad.length) issues.push(`DISC الگوی ناشناخته: ${discBad.join("، ")}`);
  return issues;
};

// درصدی از 0..100
const clampPct = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

// ====== کامپوننت اصلی ======
const AdminTestsManager = ({ Test_Cards = [], jobRequirements = {} }) => {
  // UI state
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [sortKey, setSortKey] = useState("name_asc");
  const [viewGrouped, setViewGrouped] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  // افزوده‌ها:
  const [coverageFilter, setCoverageFilter] = useState(""); // 'full'|'partial'|'none'
  const [onlyWithBenchmark, setOnlyWithBenchmark] = useState(false);

  const listRef = useRef(null);
  const jobsRef = useRef(null);

  // Derive filters
  const allTypes = useMemo(
    () => Array.from(new Set(Test_Cards.map((t) => t.type).filter(Boolean))),
    [Test_Cards]
  );
  const allFormats = useMemo(
    () => Array.from(new Set(Test_Cards.map((t) => t.questionFormat).filter(Boolean))),
    [Test_Cards]
  );

  // پوشش تست‌ها نسبت به خانواده‌ها
  const coverageByFamily = useMemo(() => detectCoverage(Test_Cards), [Test_Cards]);

  // فهرست مشاغل نرمال‌شده + اعتبارسنجی
  const normalizedJobs = useMemo(() => {
    const out = Object.entries(jobRequirements || {}).map(([name, req]) => {
      const job = normalizeJob(name, req || {});
      const issues = validateJob(job);
      return { name, job, issues };
    });
    return out;
  }, [jobRequirements]);

  // محاسبۀ پوشش برای هر شغل
  const jobCoverage = useMemo(() => {
    return normalizedJobs.map(({ name, job, issues }) => {
      const need = {
        DISC: anyVal(job?.disc),
        MBTI: anyVal(job?.mbti),
        HOLLAND: anyVal(job?.holland),
        GARDNER: anyVal(job?.gardner),
        CLIFTON: anyVal(job?.clifton),
        PERSONAL_FAVORITES: anyVal(job?.pf),
      };
      const have = Object.fromEntries(
        Object.entries(coverageByFamily).map(([fam, items]) => [fam, items.length > 0])
      );
      const families = Object.keys(need).filter((k) => need[k]);
      const satisfied = families.filter((fam) => have[fam]);
      const coverageRatio = families.length ? Math.round((satisfied.length / families.length) * 100) : 100;
      const status = families.length === satisfied.length ? "full" : satisfied.length > 0 ? "partial" : "none";
      const hasBenchmark = !!job?.benchmark;

      return {
        name,
        job,
        issues,
        familiesNeeded: families,
        familiesSatisfied: satisfied,
        coverageRatio,
        status,
        hasBenchmark,
      };
    });
  }, [normalizedJobs, coverageByFamily]);

  // Search/Filter jobs by coverage & benchmark
  const filteredJobs = useMemo(() => {
    return jobCoverage.filter((j) => {
      const byQ =
        !q ||
        lc(j.name).includes(lc(q)) ||
        lc(j.job?.summary).includes(lc(q)) ||
        (j.job?.hardSkills || []).some((s) => lc(s).includes(lc(q))) ||
        (j.job?.softSkills || []).some((s) => lc(s).includes(lc(q)));
      const byCoverage = !coverageFilter || j.status === coverageFilter;
      const byBench = !onlyWithBenchmark || j.hasBenchmark;
      return byQ && byCoverage && byBench;
    });
  }, [jobCoverage, q, coverageFilter, onlyWithBenchmark]);

  // Filter + search tests
  const filteredTests = useMemo(() => {
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

  // Sort tests
  const sorted = useMemo(() => {
    const arr = [...filteredTests];
    switch (sortKey) {
      case "name_asc":
        arr.sort((a, b) => a.name.localeCompare(b.name, "fa")); break;
      case "name_desc":
        arr.sort((a, b) => b.name.localeCompare(a.name, "fa")); break;
      case "type_asc":
        arr.sort((a, b) => (a.type || "").localeCompare(b.type || "", "fa")); break;
      case "format_asc":
        arr.sort((a, b) => (a.questionFormat || "").localeCompare(b.questionFormat || "", "fa")); break;
      default: break;
    }
    return arr;
  }, [filteredTests, sortKey]);

  // Group by type (optional)
  const groups = useMemo(() => {
    const map = new Map();
    sorted.forEach((t) => {
      const key = t.type || "سایر";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    });
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
  }, [sorted]);

  // Quick stats
  const stats = useMemo(() => {
    const total = Test_Cards.length;
    const byType = allTypes.map((t) => ({ type: t, count: Test_Cards.filter((x) => x.type === t).length }));
    const byFormat = allFormats.map((f) => ({
      format: f,
      count: Test_Cards.filter((x) => x.questionFormat === f).length,
    }));
    const families = TEST_FAMILIES.map((fam) => ({ fam, count: coverageByFamily[fam]?.length || 0 }));
    return { total, byType, byFormat, families };
  }, [Test_Cards, allTypes, allFormats, coverageByFamily]);

  // Actions
  const handleExportCSV = () => {
    const rows = [["id", "name", "type", "questionFormat", "questionsCount"]];
    sorted.forEach((t) => {
      rows.push([t.id || "", t.name || "", t.type || "", t.questionFormat || "", t.questions?.length ?? ""]);
    });
    const csv = toCsv(rows);
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

  const handleExportJobsJSON = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      coverage: jobCoverage,
      jobRequirements,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job_requirements_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintTests = () => {
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
        <head><meta charset="UTF-8" /><title>فهرست آزمون‌ها</title><style>${printCSS}</style></head>
        <body>${html}</body>
      </html>
    `);
    win.document.close(); win.focus(); win.print();
  };

  const handlePrintJobs = () => {
    if (!jobsRef.current) return;
    const html = jobsRef.current.innerHTML;
    const win = window.open("", "", "width=1024,height=720");
    if (!win) return;
    const css = `
      @page{ size: A4; margin: 14mm; }
      body{ direction: rtl; font-family: Tahoma, Vazir, Arial, sans-serif; color:#111; }
      h3{ margin: 0 0 8px 0; }
      .job-grid{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
      .job-card{ border:1px solid #ddd; padding:10px; border-radius:8px; }
      .badge{ background:#eef2ff; padding:2px 6px; border-radius:6px; }
      .warn{ color:#b45309; }
      .ok{ color:#065f46; }
      ul{ margin:6px 0; padding-inline-start: 18px; }
      li{ margin:3px 0; }
      .chips .chip{ display:inline-block; margin:2px; padding:2px 6px; background:#f1f5f9; border-radius:9999px; }
    `;
    win.document.write(`
      <html>
        <head><meta charset="UTF-8" /><title>پوشش نیازهای شغلی</title><style>${css}</style></head>
        <body>${html}</body>
      </html>
    `);
    win.document.close(); win.focus(); win.print();
  };

  const coverageLegend = (
    <div className="legend">
      <span className="dot ok" /> کامل
      <span className="dot semi" /> نسبی
      <span className="dot none" /> بدون پوشش
    </div>
  );

  return (
    <div className="atm-root" dir="rtl">
      {/* Header + actions */}
      <header className="atm-head">
        <div>
          <h2 className="atm-title">مدیریت آزمون‌ها</h2>
          <div className="muted">فهرست کامل آزمون‌ها، جستجو، فیلتر، آمار، پوشش نسبت به شغل‌ها و جزئیات</div>
        </div>
        <div className="atm-actions">
          <button className="btn outline" onClick={handleExportCSV}>خروجی CSV (آزمون‌ها)</button>
          <button className="btn outline" onClick={handleExportJobsJSON}>خروجی JSON (نیازهای شغلی + پوشش)</button>
          <button className="btn" onClick={handlePrintTests}>چاپ فهرست آزمون‌ها</button>
          <button className="btn primary" onClick={handlePrintJobs}>چاپ کارت‌های شغلی</button>
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
              <span className="chip" key={r.type}>{r.type} <b>{r.count}</b></span>
            ))}
            {stats.byType.length === 0 && <span className="muted">—</span>}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">توزیع بر اساس فرمت سؤال</div>
          <div className="chips">
            {stats.byFormat.map((r) => (
              <span className="chip" key={r.format}>{r.format} <b>{r.count}</b></span>
            ))}
            {stats.byFormat.length === 0 && <span className="muted">—</span>}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">پوشش خانواده‌های تست</div>
          <div className="chips">
            {stats.families.map((r) => (
              <span className="chip" key={r.fam}>{r.fam} <b>{r.count}</b></span>
            ))}
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
            placeholder="جستجو… (نام، نوع، فرمت، توضیحات یا شغل/مهارت)"
            aria-label="جستجو"
          />
        </div>
        <div className="filters">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="فیلتر نوع">
            <option value="">همه نوع‌ها</option>
            {allTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <select value={formatFilter} onChange={(e) => setFormatFilter(e.target.value)} aria-label="فیلتر فرمت سؤال">
            <option value="">همه فرمت‌ها</option>
            {allFormats.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>

          <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} aria-label="مرتب‌سازی">
            <option value="name_asc">مرتب‌سازی: نام (الفبا)</option>
            <option value="name_desc">مرتب‌سازی: نام (معکوس)</option>
            <option value="type_asc">مرتب‌سازی: نوع</option>
            <option value="format_asc">مرتب‌سازی: فرمت سؤال</option>
          </select>

          <label className="toggle">
            <input type="checkbox" checked={viewGrouped} onChange={(e) => setViewGrouped(e.target.checked)} />
            <span>نمایش گروهی بر اساس نوع</span>
          </label>

          <select value={coverageFilter} onChange={(e) => setCoverageFilter(e.target.value)} aria-label="پوشش موردنیاز شغلی">
            <option value="">پوشش: همه</option>
            <option value="full">فقط کامل</option>
            <option value="partial">فقط نسبی</option>
            <option value="none">بدون پوشش</option>
          </select>

          <label className="toggle">
            <input type="checkbox" checked={onlyWithBenchmark} onChange={(e) => setOnlyWithBenchmark(e.target.checked)} />
            <span>فقط شغل‌های دارای بنچمارک</span>
          </label>
        </div>
      </section>

      {/* List (printable) */}
      <section className="atm-list card" ref={listRef}>
        {!viewGrouped ? (
          <TestsTable items={sorted} onSelect={(t) => setSelectedTest(t)} />
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
      {selectedTest && <TestDrawer test={selectedTest} onClose={() => setSelectedTest(null)} />}

      {/* Job Requirements + Coverage */}
      {Object.keys(jobRequirements).length > 0 && (
        <section className="job-req card" ref={jobsRef}>
          <div className="job-req-head">
            <h3>ویژگی‌ها و مهارت‌های مورد نیاز برای هر شغل</h3>
            <div className="muted">این بخش پوشش آزمون‌ها نسبت به نیازهای شغلی را نشان می‌دهد. {coverageLegend}</div>
          </div>

          <div className="job-grid">
            {filteredJobs.map(({ name, job, issues, familiesNeeded, familiesSatisfied, coverageRatio, status, hasBenchmark }) => (
              <JobReqCard
                key={name}
                name={name}
                job={job}
                issues={issues}
                familiesNeeded={familiesNeeded}
                familiesSatisfied={familiesSatisfied}
                coverageRatio={coverageRatio}
                status={status}
                hasBenchmark={hasBenchmark}
                coverageByFamily={coverageByFamily}
              />
            ))}
            {filteredJobs.length === 0 && <p className="muted">هیچ شغلی با فیلترهای فعلی یافت نشد.</p>}
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
            <tr key={t.id || `${t.name}-${i}`}>
              <td className="center">{i + 1}</td>
              <td>{t.name || "—"}</td>
              <td>{t.type || "—"}</td>
              <td>{t.questionFormat || "—"}</td>
              <td>{t.questions?.length ?? "—"}</td>
              <td className="actions">
                <button className="btn tiny" onClick={() => onSelect?.(t)}>جزئیات</button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td className="center muted" colSpan="6">موردی یافت نشد</td>
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
          <button className="btn ghost" onClick={onClose}>بستن</button>
        </header>

        <div className="drawer-body">
          <div className="kv"><span className="label">نوع:</span><span className="value">{test?.type || "—"}</span></div>
          <div className="kv"><span className="label">فرمت سؤال:</span><span className="value">{test?.questionFormat || "—"}</span></div>
          <div className="kv"><span className="label">تعداد سؤال:</span><span className="value">{qCount}</span></div>
          {tags.length > 0 && (
            <div className="kv">
              <span className="label">برچسب‌ها:</span>
              <span className="value">{tags.map((t) => <span className="chip" key={t}>{t}</span>)}</span>
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
          <button className="btn outline" onClick={() => alert("ویرایش آزمون (دمو)")}>ویرایش</button>
          <button className="btn danger" onClick={() => alert("حذف آزمون (دمو)")}>حذف</button>
        </footer>
      </aside>
    </div>
  );
};

// --- کارت شغلی پیشرفته با پوشش، بنچمارک و هشدار ---
const JobReqCard = ({
  name,
  job,
  issues = [],
  familiesNeeded = [],
  familiesSatisfied = [],
  coverageRatio = 0,
  status = "none",
  hasBenchmark = false,
  coverageByFamily = {},
}) => {
  const badgeClass = status === "full" ? "ok" : status === "partial" ? "semi" : "none";

  const needLines = [];
  if (job?.disc) {
    const th = job.disc.thresholds || DEFAULT_DISC_THRESHOLDS;
    const need = []
      .concat(job.disc.require || [])
      .concat(job.disc.prefer || []);
    needLines.push(`DISC (${th.high}% High): ${need.join("، ") || "—"}`);
  }
  if (job?.mbti?.prefer?.length) needLines.push(`MBTI: ${job.mbti.prefer.join("، ")}`);
  if (job?.holland?.top3?.length) needLines.push(`Holland Top: ${job.holland.top3.join("، ")}`);
  if (job?.gardner?.prefer?.length) needLines.push(`Gardner: ${job.gardner.prefer.join("، ")}`);
  if (job?.clifton) {
    const d = job.clifton.domainsPrefer || [];
    const t = job.clifton.themesPrefer || [];
    const avoid = job.clifton.themesAvoid || [];
    if (d.length) needLines.push(`Clifton Domains: ${d.join("، ")}`);
    if (t.length) needLines.push(`Clifton Themes: ${t.join("، ")}`);
    if (avoid.length) needLines.push(`Clifton Avoid: ${avoid.join("، ")}`);
  }
  if (job?.pf?.itemIdsPrefer?.length) needLines.push(`PF IDs: ${job.pf.itemIdsPrefer.join(", ")}`);

  const famBadges = familiesNeeded.map((fam) => {
    const hasFam = familiesSatisfied.includes(fam);
    return <span key={fam} className={`chip ${hasFam ? "ok" : "none"}`}>{fam}</span>;
  });

  // Fit Preview ساده (صرفاً نمایشی): هر خانواده‌ای که پوشش داشته باشیم +10، و اگر نیاز آن خانواده تعریف شده باشد +20
  const fitPreview = useMemo(() => {
    let score = 0;
    familiesNeeded.forEach((fam) => {
      const has = familiesSatisfied.includes(fam);
      if (has) score += 20;
    });
    // وزن‌های اختیاری
    const w = job?.weights || null;
    if (w) {
      // صرفاً جهت نمایش مقیاس‌پذیری
      score = Math.round(score * (w.disc ? 1 + (w.disc - 0.25) : 1));
    }
    return clampPct(score);
  }, [familiesNeeded, familiesSatisfied, job]);

  return (
    <article className="job-card">
      <header className="job-head">
        <h4>{name}</h4>
        <span className={`badge ${badgeClass}`} title="نسبت پوشش">{coverageRatio}%</span>
        {hasBenchmark && <span className="badge info">دارای بنچمارک</span>}
        <span className="badge ghost">Fit Preview: {fitPreview}%</span>
      </header>

      {job?.summary && <p className="muted">{job.summary}</p>}

      {/* خانواده‌های نیازمند + وضعیت */}
      <div className="kv">
        <span className="label">خانواده‌های موردنیاز:</span>
        <span className="value chips">{famBadges}</span>
      </div>

      {/* نیازها به‌صورت خوانا */}
      {needLines.length > 0 && (
        <div className="kv">
          <span className="label">نیازهای روان‌سنجی:</span>
          <span className="value">
            <ul className="clean">
              {needLines.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </span>
        </div>
      )}

      {/* مهارت‌ها (اگر موجود باشد) */}
      {(job?.hardSkills || job?.softSkills) && (
        <div className="skills">
          {job?.hardSkills?.length > 0 && (
            <div className="kv">
              <span className="label">مهارت‌های تخصصی:</span>
              <span className="value chips">
                {job.hardSkills.map((x, i) => <span className="chip" key={i}>{x}</span>)}
              </span>
            </div>
          )}
          {job?.softSkills?.length > 0 && (
            <div className="kv">
              <span className="label">مهارت‌های نرم:</span>
              <span className="value chips">
                {job.softSkills.map((x, i) => <span className="chip" key={i}>{x}</span>)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* هشدارهای کیفیت داده */}
      {issues?.length > 0 && (
        <div className="warnings">
          <h5>هشدار داده</h5>
          <ul className="warn-list">
            {issues.map((w, i) => <li key={i} className="warn">{w}</li>)}
          </ul>
        </div>
      )}

      {/* بنچمارک (خلاصه) */}
      {job?.benchmark && (
        <div className="bench">
          <h5>خلاصه بنچمارک</h5>
          <div className="bench-grid">
            {job.benchmark.disc && (
              <div className="bench-block">
                <strong>DISC:</strong>{" "}
                <span className="chips">
                  {Object.entries(job.benchmark.disc).map(([k, v]) => (
                    <span key={k} className="chip">{k}: {v}%</span>
                  ))}
                </span>
              </div>
            )}
            {job.benchmark.holland && (
              <div className="bench-block">
                <strong>Holland:</strong>{" "}
                <span className="chips">
                  {Object.entries(job.benchmark.holland).map(([k, v]) => (
                    <span key={k} className="chip">{k}: {v}%</span>
                  ))}
                </span>
              </div>
            )}
            {job.benchmark.gardner && (
              <div className="bench-block">
                <strong>Gardner:</strong>{" "}
                <span className="chips">
                  {Object.entries(job.benchmark.gardner).map(([k, v]) => (
                    <span key={k} className="chip">{k}: {v}%</span>
                  ))}
                </span>
              </div>
            )}
            {job.benchmark.clifton && (
              <div className="bench-block">
                <strong>Clifton:</strong>{" "}
                <span className="chips">
                  {job.benchmark.clifton.domains && Object.entries(job.benchmark.clifton.domains).map(([k, v]) => (
                    <span key={k} className="chip">{k}: {v}%</span>
                  ))}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* کدام تست‌ها الان موجودند؟ */}
      <div className="available-tests">
        <h5>تست‌های موجود مرتبط</h5>
        <div className="chips">
          {familiesNeeded.map((fam) => {
            const items = coverageByFamily[fam] || [];
            return items.length ? (
              <span key={fam} className="chip ok" title={`${fam}: ${items.length} تست`}>
                {fam} × {items.length}
              </span>
            ) : (
              <span key={fam} className="chip none">{fam}: ناموجود</span>
            );
          })}
        </div>
      </div>
    </article>
  );
};
