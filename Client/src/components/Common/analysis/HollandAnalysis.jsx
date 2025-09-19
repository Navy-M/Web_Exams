import React, { useMemo, useRef, useState } from "react";
import { Bar, Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import "./HollandAnalysis.css";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

/**
 * Props:
 * - data: {
 *     hollandCode?: string,                  // e.g. "RIA"
 *     dominantTraits?: string[],             // e.g. ["R","I","A"]
 *     rawScores?: Record<'R'|'I'|'A'|'S'|'E'|'C', number>,
 *     normalizedScores?: Record<'R'|'I'|'A'|'S'|'E'|'C', number>, // 0..100
 *     traits?: Record<'R'|'I'|'A'|'S'|'E'|'C', {
 *       name: string,
 *       description?: string,
 *       careers?: string|string[],
 *       score?: number,
 *       percentage?: number,
 *       isDominant?: boolean
 *     }>,
 *     careerSuggestions?: string[],
 *     chartData?: any, // اختیاری؛ اگر بدهی از همان استفاده می‌شود
 *     summary?: string,
 *     analyzedAt?: string|number|Date,
 *     userInfo?: { fullName?: string }
 *   }
 * - benchmark?: { label?: string, normalizedScores: Record<'R'|'I'|'A'|'S'|'E'|'C', number> }
 */
const HollandAnalysis = ({ data, benchmark }) => {
  if (!data) return <p className="muted" dir="rtl">داده‌ای برای نمایش موجود نیست.</p>;

  const {
    hollandCode = "",
    dominantTraits = [],
    rawScores = {},
    normalizedScores = {},
    traits = {},
    careerSuggestions = [],
    chartData,
    summary,
    analyzedAt,
    userInfo = {},
  } = data || {};

  const containerRef = useRef(null);
  const barRef = useRef(null);
  const radarRef = useRef(null);

  const [mode, setMode] = useState(benchmark ? "compare" : "bar"); // 'bar' | 'radar' | 'compare'

  const dateFa = analyzedAt
    ? new Date(analyzedAt).toLocaleDateString("fa-IR", {
        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—";

  // ===== CSS vars (theme-aware) =====
  const getVar = (name) => {
    const el = containerRef.current || document.documentElement;
    const v = getComputedStyle(el).getPropertyValue(name);
    return v ? v.trim() : "";
  };
  const axisColor = getVar("--chart-axis") || "rgba(2,6,23,.75)";
  const gridColor = getVar("--chart-grid") || "rgba(148,163,184,.25)";
  const tooltipBg = getVar("--tooltip-bg") || "#fff";
  const tooltipBorder = getVar("--tooltip-border") || "#e5e7eb";
  const textColor = getVar("--text") || "#0f172a";
  const headBg = getVar("--head-bg") || "rgba(37,99,235,.08)";

  const ORDER = ["R", "I", "A", "S", "E", "C"]; // Realistic, Investigative, Artistic, Social, Enterprising, Conventional
  const FALLBACK_NAMES = {
    R: "واقع‌گرا (Realistic)",
    I: "پژوهشی (Investigative)",
    A: "هنری (Artistic)",
    S: "اجتماعی (Social)",
    E: "پیشرو/کارآفرین (Enterprising)",
    C: "قراردادی/اداری (Conventional)",
  };
  const getName = (k) => traits?.[k]?.name || FALLBACK_NAMES[k] || k;
  const fmtPct = (v) =>
    v === null || v === undefined || Number.isNaN(Number(v))
      ? "—"
      : `${Math.round(Number(v))}%`;

  // ===== Stable list of codes present =====
  const codes = useMemo(() => {
    const set = new Set([
      ...ORDER,
      ...Object.keys(normalizedScores || {}),
      ...Object.keys(rawScores || {}),
      ...Object.keys(traits || {}),
      ...(benchmark ? Object.keys(benchmark.normalizedScores || {}) : []),
    ]);
    return ORDER.filter((k) => set.has(k));
  }, [normalizedScores, rawScores, traits, benchmark]);

  // Values
  const userVals = useMemo(
    () => codes.map((k) => Number(normalizedScores?.[k] ?? traits?.[k]?.percentage ?? 0)),
    [codes, normalizedScores, traits]
  );
  const benchVals = useMemo(
    () => codes.map((k) => Number(benchmark?.normalizedScores?.[k] ?? 0)),
    [codes, benchmark]
  );

  // ===== KPIs =====
  const kpi = useMemo(() => {
    const entries = codes.map((k) => ({ key: k, val: Number(normalizedScores?.[k] ?? 0) }));
    if (!entries.length) return { top: null, bottom: null, spread: 0, code3: hollandCode || "—" };
    const sorted = [...entries].sort((a, b) => b.val - a.val);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    const spread = Math.round(top.val - bottom.val);
    return { top, bottom, spread, code3: hollandCode || sorted.slice(0, 3).map(e => e.key).join("") };
  }, [codes, normalizedScores, hollandCode]);

  // ===== Chart: Bar (horizontal) & Compare =====
  const labels = useMemo(() => codes.map(getName), [codes]);

  const barData = useMemo(() => {
    if (chartData) return chartData;
    const datasets = [
      {
        label: userInfo?.fullName ? `پروفایل ${userInfo.fullName}` : "پروفایل فردی",
        data: userVals,
        backgroundColor: "rgba(37,99,235,.65)",
        borderColor: "#2563eb",
        borderWidth: 1,
        borderRadius: 8,
        barPercentage: 0.8,
        categoryPercentage: 0.9,
      },
    ];
    if (mode === "compare" && benchmark) {
      datasets.push({
        label: benchmark.label || "میانگین گروه",
        data: benchVals,
        backgroundColor: "rgba(148,163,184,.35)",
        borderColor: "rgba(148,163,184,.65)",
        borderWidth: 1,
        borderRadius: 8,
        barPercentage: 0.8,
        categoryPercentage: 0.9,
      });
    }
    return { labels, datasets };
  }, [chartData, labels, userVals, benchVals, mode, benchmark, userInfo]);

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          ticks: { stepSize: 20, color: axisColor, callback: (v) => `${v}%` },
          grid: { color: gridColor },
        },
        y: {
          ticks: { color: axisColor },
          grid: { color: "transparent" },
        },
      },
      plugins: {
        legend: { position: "top", labels: { color: axisColor } },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: tooltipBorder,
          borderWidth: 1,
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Math.round(ctx.parsed.x)}%` },
        },
      },
    }),
    [axisColor, gridColor, tooltipBg, tooltipBorder, textColor]
  );

  // ===== Chart: Radar =====
  const radarData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: userInfo?.fullName ? `پروفایل ${userInfo.fullName}` : "پروفایل فردی",
          data: userVals,
          backgroundColor: "rgba(37,99,235,.18)",
          borderColor: "#2563eb",
          pointBackgroundColor: "#2563eb",
          pointBorderColor: "#fff",
          fill: true,
        },
        ...(mode === "compare" && benchmark
          ? [{
              label: benchmark.label || "میانگین گروه",
              data: benchVals,
              backgroundColor: "rgba(148,163,184,.18)",
              borderColor: "rgba(148,163,184,.8)",
              pointBackgroundColor: "rgba(148,163,184,.8)",
              pointBorderColor: "#fff",
              fill: true,
            }]
          : []),
      ],
    }),
    [labels, userVals, benchVals, mode, benchmark, userInfo]
  );

  const radarOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { color: gridColor },
          grid: { color: gridColor },
          suggestedMin: 0,
          suggestedMax: 100,
          ticks: { stepSize: 20, showLabelBackdrop: false, color: axisColor },
          pointLabels: { color: axisColor, font: { size: 12 } },
        },
      },
      plugins: {
        legend: { position: "top", labels: { color: axisColor } },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: tooltipBorder,
          borderWidth: 1,
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.r}%` },
        },
      },
    }),
    [axisColor, gridColor, tooltipBg, tooltipBorder, textColor]
  );

  // ===== Suggestions (fallback if not provided) =====
  const toList = (val) =>
    Array.isArray(val) ? val : (val ? String(val).split(/[،,•|-]/).map(s=>s.trim()).filter(Boolean) : []);

  const autoCareerSuggestions = useMemo(() => {
    if (careerSuggestions?.length) return careerSuggestions;
    // از ۲–۳ بُعد برتر، مشاغل داخل traits را جمع کن
    const sorted = [...codes].sort((a, b) => (normalizedScores[b]||0) - (normalizedScores[a]||0));
    const top = sorted.slice(0, 3);
    const pool = new Set();
    top.forEach(k => toList(traits[k]?.careers).forEach(c => pool.add(c)));
    return Array.from(pool);
  }, [careerSuggestions, codes, normalizedScores, traits]);

  // ===== Actions =====
  const activeChartRef = () => (mode === "radar" ? radarRef.current : barRef.current);

  const handleDownloadPNG = () => {
    const chart = activeChartRef();
    if (!chart) return;
    const url = chart.toBase64Image?.() || chart.canvas?.toDataURL?.("image/png");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `holland_${mode}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportCSV = () => {
    const rows = [["code", "name", "rawScore", "normalized(%)"]];
    codes.forEach((k) => {
      rows.push([
        k,
        (getName(k) || "").replace(/,/g, "،"),
        rawScores?.[k] ?? traits?.[k]?.score ?? "",
        normalizedScores?.[k] ?? traits?.[k]?.percentage ?? "",
      ]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `holland_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!containerRef.current) return;
    const html = containerRef.current.innerHTML;
    const css = `
      @page { size: A4; margin: 14mm; }
      body { direction: rtl; font-family: Tahoma, Vazir, Arial, sans-serif; color: #111; }
      .title { margin: 0 0 8px 0; }
      .muted { color: #555; }
      table { width:100%; border-collapse: collapse; font-size: 11pt; }
      th, td { border:1px solid #ccc; padding:8px; text-align:center; }
      thead th { background: ${headBg}; }
      .top-row { background: rgba(245,158,11,.12); }
    `;
    const win = window.open("", "", "width=1024,height=720");
    if (!win) return;
    win.document.write(`
      <html>
        <head><meta charset="UTF-8"/><title>گزارش هالند (RIASEC)</title><style>${css}</style></head>
        <body>${html}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  // ===== Render =====
  return (
    <section className="holland-analysis-container card" ref={containerRef} dir="rtl">
      <header className="hol-head">
        <div>
          <h2 className="title">تحلیل آزمون هالند (RIASEC)</h2>
          <div className="muted small">
            {userInfo?.fullName ? `کاربر: ${userInfo.fullName} • ` : null}
            زمان تحلیل: {dateFa}
          </div>
        </div>
        <div className="actions">
          <button className="btn outline" onClick={handleExportCSV}>خروجی CSV</button>
          <button className="btn outline" onClick={handleDownloadPNG}>دانلود نمودار</button>
          <button className="btn primary" onClick={handlePrint}>چاپ گزارش</button>
        </div>
      </header>

      {/* Summary + badges */}
      <section className="summary-section">
        {summary && <p className="summary-text"><strong>خلاصه:</strong> {summary}</p>}
        <div className="badges">
          <span className="badge primary">کد هالند: <span className="holland-code">{kpi.code3}</span></span>
          {dominantTraits?.length > 0 && (
            <span className="badge info">ابعاد غالب: {dominantTraits.map(getName).join("، ")}</span>
          )}
        </div>
      </section>

      {/* KPIs */}
      <section className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">قوی‌ترین بُعد</div>
          <div className="kpi-value">
            {kpi.top ? `${getName(kpi.top.key)} (${fmtPct(kpi.top.val)})` : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">ضعیف‌ترین بُعد</div>
          <div className="kpi-value">
            {kpi.bottom ? `${getName(kpi.bottom.key)} (${fmtPct(kpi.bottom.val)})` : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">پراکندگی نمرات</div>
          <div className="kpi-value">{kpi.spread || 0} امتیاز</div>
        </div>
      </section>

      {/* Scores table */}
      <section className="scores-section">
        <h3>نمرات خام و نرمال‌شده</h3>
        <div className="table-wrap">
          <table className="scores-table">
            <thead>
              <tr>
                <th>کُد</th>
                <th>نام</th>
                <th>نمره خام</th>
                <th>نمره نرمال‌شده (%)</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((k) => {
                const isTop =
                  traits?.[k]?.isDominant || dominantTraits?.includes?.(k) || kpi.code3.includes(k);
                return (
                  <tr key={k} className={isTop ? "top-row" : ""}>
                    <td>{k}</td>
                    <td>{getName(k)}</td>
                    <td>{rawScores?.[k] ?? traits?.[k]?.score ?? "—"}</td>
                    <td>{fmtPct(normalizedScores?.[k] ?? traits?.[k]?.percentage)}</td>
                  </tr>
                );
              })}
              {codes.length === 0 && (
                <tr><td colSpan="4" className="muted">داده‌ای ثبت نشده است.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Traits detail */}
      <section className="traits-details-section">
        <h3>توضیحات ویژگی‌ها</h3>
        <div className="traits-list">
          {codes.map((k) => {
            const t = traits?.[k] || { name: getName(k) };
            const isTop =
              t?.isDominant || dominantTraits?.includes?.(k) || kpi.code3.includes(k);
            const careers = toList(t?.careers);
            return (
              <article className={`trait-card ${isTop ? "dominant" : ""}`} key={k}>
                <header className="trait-head">
                  <h4>{t.name}</h4>
                  {isTop && <span className="dominant-label">ویژگی غالب</span>}
                </header>
                {t.description && <p className="desc">{t.description}</p>}

                <div className="profile-meta">
                  <div className="meta-item">
                    <strong>نمره:</strong> {t?.score ?? "—"} {t?.percentage !== undefined && `(${fmtPct(t.percentage)})`}
                  </div>
                </div>

                {careers.length > 0 && (
                  <div className="profile-list">
                    <h5>مشاغل پیشنهادی</h5>
                    <ul className="tags">{careers.map((c, i) => <li key={i} className="tag">{c}</li>)}</ul>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Career suggestions (aggregated) */}
      <section className="career-suggestions-section">
        <h3>پیشنهادات شغلی</h3>
        {autoCareerSuggestions.length > 0 ? (
          <ul className="career-list">
            {autoCareerSuggestions.map((job, idx) => <li key={idx}>{job}</li>)}
          </ul>
        ) : (
          <p className="muted small">—</p>
        )}
      </section>

      {/* Charts */}
      <section className="chart-section">
        <div className="segmented">
          <button className={`seg-btn ${mode === "bar" ? "active" : ""}`} onClick={() => setMode("bar")}>میله‌ای</button>
          <button className={`seg-btn ${mode === "radar" ? "active" : ""}`} onClick={() => setMode("radar")}>رادار</button>
          {benchmark && (
            <button className={`seg-btn ${mode === "compare" ? "active" : ""}`} onClick={() => setMode("compare")}>مقایسه با میانگین</button>
          )}
        </div>

        <div className="chart-wrap">
          {(mode === "bar" || mode === "compare") && (
            <Bar ref={barRef} data={barData} options={barOptions} />
          )}
          {mode === "radar" && (
            <Radar ref={radarRef} data={radarData} options={radarOptions} />
          )}
        </div>
        <p className="muted small">راهنما: مقیاس نمودارها نرمال‌شده (۰ تا ۱۰۰) است.</p>

        <div className="actions footer-actions">
          <button className="btn outline" onClick={handleDownloadPNG}>دانلود نمودار</button>
          <button className="btn primary" onClick={handlePrint}>چاپ گزارش</button>
        </div>
      </section>
    </section>
  );
};

export default HollandAnalysis;
