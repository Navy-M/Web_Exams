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
import "./GardnerAnalysis.css";

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
 *     topIntelligences?: string[],    // کدهای هوش‌های برتر (e.g. "LING","LOGI"...)
 *     primaryIntelligence?: string,
 *     rawScores?: Record<string, number>,
 *     normalizedScores?: Record<string, number>, // 0..100
 *     intelligenceProfiles?: Record<string, {
 *       name: string,
 *       englishName?: string,
 *       description?: string,
 *       characteristics?: string | string[],
 *       careers?: string | string[],
 *       score?: number,
 *       percentage?: number, // 0..100
 *       isTop?: boolean
 *     }>,
 *     developmentSuggestions?: Array<{ intelligence: string, suggestions: string[] }>,
 *     chartData?: any, // اختیاری
 *     summary?: string,
 *     analyzedAt?: string|number|Date,
 *     userInfo?: { fullName?: string }
 *   }
 * - benchmark?: { label?: string, normalizedScores: Record<string, number> }
 */
const GardnerAnalysis = ({ data, benchmark }) => {
  if (!data) return <p className="muted" dir="rtl">داده‌ای برای نمایش موجود نیست.</p>;

  const {
    topIntelligences = [],
    primaryIntelligence,
    rawScores = {},
    normalizedScores = {},
    intelligenceProfiles = {},
    developmentSuggestions = [],
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

  // Theme vars for charts (dark/light aware)
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

  // نمره نرمال‌شده بر اساس profile.percentage یا normalizedScores
  const normMap = useMemo(() => {
    const m = { ...normalizedScores };
    Object.entries(intelligenceProfiles).forEach(([code, prof]) => {
      if (typeof prof.percentage === "number") m[code] = prof.percentage;
    });
    return m;
  }, [normalizedScores, intelligenceProfiles]);

  // ترتیب پایدار: بر اساس نمره نزولی، سپس نام
  const codes = useMemo(() => {
    const set = new Set([
      ...Object.keys(normMap),
      ...Object.keys(intelligenceProfiles),
      ...Object.keys(rawScores),
      ...(benchmark ? Object.keys(benchmark.normalizedScores || {}) : []),
    ]);
    const arr = Array.from(set);
    arr.sort((a, b) => {
      const dv = (normMap[b] || 0) - (normMap[a] || 0);
      if (dv !== 0) return dv;
      const na = intelligenceProfiles[a]?.name || a;
      const nb = intelligenceProfiles[b]?.name || b;
      return String(na).localeCompare(String(nb), "fa");
    });
    return arr;
  }, [normMap, intelligenceProfiles, rawScores, benchmark]);

  const getName = (code) => intelligenceProfiles?.[code]?.name || code;
  const fmtPct = (v) =>
    v === null || v === undefined || Number.isNaN(Number(v))
      ? "—"
      : `${Math.round(Number(v))}%`;

  // KPI ها
  const kpi = useMemo(() => {
    const entries = codes.map((k) => ({ key: k, val: Number(normMap[k] ?? 0) }));
    if (!entries.length) return { max: null, min: null, spread: 0, balance: "—" };
    const sorted = [...entries].sort((a, b) => b.val - a.val);
    const max = sorted[0];
    const min = sorted[sorted.length - 1];
    const spread = Math.round(max.val - min.val);
    // تعادل پروفایل: واریانس نسبت به 50
    const variance = entries.reduce((s, e) => s + Math.pow(e.val - 50, 2), 0) / entries.length;
    const balance = variance < 400 ? "متعادل" : variance < 900 ? "نیمه‌متعادل" : "متخصص/نامتعادل";
    return { max, min, spread, balance };
  }, [codes, normMap]);

  // داده‌های نمودار میله‌ای افقی
  const labels = useMemo(() => codes.map(getName), [codes]);
  const userVals = useMemo(() => codes.map((k) => Number(normMap[k] ?? 0)), [codes, normMap]);
  const benchVals = useMemo(
    () => codes.map((k) => Number(benchmark?.normalizedScores?.[k] ?? 0)),
    [codes, benchmark]
  );

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

  // داده‌های رادار (تمام هوش‌ها)
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
          ? [
              {
                label: benchmark.label || "میانگین گروه",
                data: benchVals,
                backgroundColor: "rgba(148,163,184,.18)",
                borderColor: "rgba(148,163,184,.8)",
                pointBackgroundColor: "rgba(148,163,184,.8)",
                pointBorderColor: "#fff",
                fill: true,
              },
            ]
          : []),
      ],
    }),
    [labels, userVals, benchVals, userInfo, mode, benchmark]
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

  // اکشن‌ها
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
        <head><meta charset="UTF-8"/><title>گزارش هوش‌های چندگانه گاردنر</title><style>${css}</style></head>
        <body>${html}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const activeChartRef = () => (mode === "radar" ? radarRef.current : barRef.current);

  const handleDownloadPNG = () => {
    const chart = activeChartRef();
    if (!chart) return;
    const url = chart.toBase64Image?.() || chart.canvas?.toDataURL?.("image/png");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `gardner_${mode}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportCSV = () => {
    const rows = [["code", "name", "rawScore", "normalized(%)"]];
    codes.forEach((code) => {
      rows.push([
        code,
        (getName(code) || "").replace(/,/g, "،"),
        rawScores?.[code] ?? intelligenceProfiles?.[code]?.score ?? "",
        normMap?.[code] ?? intelligenceProfiles?.[code]?.percentage ?? "",
      ]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gardner_intelligences_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // helpers
  const toList = (val) =>
    Array.isArray(val)
      ? val
      : (val ? String(val).split(/[،,•|-]/).map((s) => s.trim()).filter(Boolean) : []);

  // Render
  return (
    <section className="gardner-analysis-container card" ref={containerRef} dir="rtl">
      <header className="ga-head">
        <div>
          <h2 className="title">تحلیل هوش‌های چندگانه گاردنر</h2>
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
        {summary && (
          <p className="summary-text"><strong>خلاصه:</strong> {summary}</p>
        )}
        <div className="badges">
          {primaryIntelligence && (
            <span className="badge primary">
              هوش اصلی: {getName(primaryIntelligence)}
            </span>
          )}
          {topIntelligences?.length > 0 && (
            <span className="badge info">
              هوش‌های برتر: {topIntelligences.map(getName).join("، ")}
            </span>
          )}
        </div>
      </section>

      {/* KPIs */}
      <section className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">قوی‌ترین هوش</div>
          <div className="kpi-value">
            {kpi.max ? `${getName(kpi.max.key)} (${fmtPct(kpi.max.val)})` : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">ضعیف‌ترین هوش</div>
          <div className="kpi-value">
            {kpi.min ? `${getName(kpi.min.key)} (${fmtPct(kpi.min.val)})` : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">پراکندگی نمرات</div>
          <div className="kpi-value">{kpi.spread || 0} امتیاز</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">تعادل کلی</div>
          <div className="kpi-value">{kpi.balance}</div>
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
                <th>نام هوش</th>
                <th>نمره خام</th>
                <th>نمره نرمال‌شده (%)</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((code) => {
                const prof = intelligenceProfiles?.[code];
                const isTop =
                  prof?.isTop || topIntelligences?.includes?.(code) || primaryIntelligence === code;
                return (
                  <tr key={code} className={isTop ? "top-row" : ""}>
                    <td>{code}</td>
                    <td>{getName(code)}</td>
                    <td>{rawScores?.[code] ?? prof?.score ?? "—"}</td>
                    <td>{fmtPct(normMap?.[code] ?? prof?.percentage)}</td>
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

      {/* Profiles detail */}
      <section className="profiles-section">
        <h3>توضیحات هوش‌ها</h3>
        <div className="profiles-list">
          {codes.map((code) => {
            const p = intelligenceProfiles?.[code] || { name: code };
            const isTop = p?.isTop || topIntelligences?.includes?.(code) || primaryIntelligence === code;
            const chars = toList(p?.characteristics);
            const careers = toList(p?.careers);

            const suggestions = developmentSuggestions.find((d) => d.intelligence === code)?.suggestions || [];

            return (
              <article className={`profile-card ${isTop ? "top" : ""}`} key={code}>
                <header className="profile-head">
                  <h4>{p.name}</h4>
                  {isTop && <span className="top-label">هوش برتر</span>}
                </header>

                {p.englishName && (
                  <p className="muted small"><strong>نام انگلیسی:</strong> {p.englishName}</p>
                )}

                {p.description && <p className="desc">{p.description}</p>}

                <div className="profile-meta">
                  <div className="meta-item"><strong>نمره:</strong> {p?.score ?? "—"} {p?.percentage !== undefined && `(${fmtPct(p.percentage)})`}</div>
                </div>

                {chars.length > 0 && (
                  <div className="profile-list">
                    <h5>ویژگی‌ها</h5>
                    <ul>{chars.map((c, i) => <li key={i}>{c}</li>)}</ul>
                  </div>
                )}

                {careers.length > 0 && (
                  <div className="profile-list">
                    <h5>مشاغل پیشنهادی</h5>
                    <ul className="tags">
                      {careers.map((c, i) => <li className="tag" key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}

                {suggestions.length > 0 && (
                  <div className="profile-list">
                    <h5>پیشنهادهای رشد</h5>
                    <ul>{suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                )}
              </article>
            );
          })}
        </div>
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
      </section>
    </section>
  );
};

export default GardnerAnalysis;
