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
import "./CliftonStrengthsAnalysis.css";

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
 *     topThemes?: string[],                 // e.g. ["Achiever","Learner",...]
 *     signatureTheme?: string,
 *     rawScores?: Record<string, number>,   // by theme key/code
 *     normalizedScores?: Record<string, number>, // 0..100 by theme key
 *     themeDetails?: Array<{
 *        theme: string,                     // key/code
 *        name: string,                      // Farsi name
 *        domain?: "Executing" | "Influencing" | "Relationship" | "Strategic",
 *        score?: number,                    // raw
 *        percentage?: number,               // normalized 0..100
 *        description?: string,
 *        characteristics?: string | string[],
 *        isTop?: boolean
 *     }>,
 *     developmentSuggestions?: Array<{ theme: string, suggestions: string[] }>,
 *     chartData?: any,                      // optional Chart.js dataset
 *     summary?: string,
 *     analyzedAt?: string | number | Date,
 *     userInfo?: { fullName?: string }
 *   }
 * - benchmark?: {                          // optional compare mode
 *     label?: string,                       // e.g. 'میانگین گروه'
 *     normalizedScores: Record<string, number> // by theme key/code (0..100)
 *   }
 */
const CliftonStrengthsAnalysis = ({ data, benchmark }) => {
  if (!data) return <p className="muted" dir="rtl">داده‌ای برای نمایش موجود نیست.</p>;

  const {
    topThemes = [],
    signatureTheme,
    rawScores = {},
    normalizedScores = {},
    themeDetails = [],
    developmentSuggestions = [],
    chartData,
    summary,
    analyzedAt,
    userInfo = {},
  } = data || {};

  const containerRef = useRef(null);
  const barRef = useRef(null);
  const radarRef = useRef(null);

  const [mode, setMode] = useState(benchmark ? "compare" : "bar"); // 'bar' | 'radarDomains' | 'compare'

  const dateFa = analyzedAt
    ? new Date(analyzedAt).toLocaleDateString("fa-IR", {
        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—";

  // CSS variables for theme-aware charts
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

  // Normalized map by theme
  const normByTheme = useMemo(() => {
    // prefer themeDetails.percentage if present, else normalizedScores
    const map = { ...normalizedScores };
    themeDetails.forEach((t) => {
      if (typeof t.percentage === "number") map[t.theme] = t.percentage;
    });
    return map;
  }, [normalizedScores, themeDetails]);

  // Ensure a stable, readable order: sort themes by normalized desc
  const orderedThemes = useMemo(() => {
    const keys = new Set([
      ...Object.keys(normByTheme),
      ...themeDetails.map((t) => t.theme),
      ...Object.keys(rawScores),
      ...(benchmark ? Object.keys(benchmark.normalizedScores || {}) : []),
    ]);
    const arr = Array.from(keys);
    arr.sort((a, b) => (normByTheme[b] || 0) - (normByTheme[a] || 0));
    return arr;
  }, [normByTheme, themeDetails, rawScores, benchmark]);

  // Lookup helpers
  const detailsByTheme = useMemo(() => {
    const m = new Map();
    themeDetails.forEach((t) => m.set(t.theme, t));
    return m;
  }, [themeDetails]);

  const getName = (key) => detailsByTheme.get(key)?.name || key;
  const getDomain = (key) => detailsByTheme.get(key)?.domain || "Other";

  const fmtPct = (v) =>
    v === null || v === undefined || Number.isNaN(Number(v))
      ? "—"
      : `${Math.round(Number(v))}%`;

  // KPIs
  const kpi = useMemo(() => {
    const entries = orderedThemes.map((k) => ({ key: k, val: Number(normByTheme[k] ?? 0) }));
    if (!entries.length) return { max: null, min: null, spread: 0, topDomain: "—" };
    const sorted = [...entries].sort((a, b) => b.val - a.val);
    const max = sorted[0];
    const min = sorted[sorted.length - 1];
    const spread = Math.round(max.val - min.val);
    // domain dominance
    const domainAcc = {};
    for (const k of orderedThemes) {
      const d = getDomain(k);
      domainAcc[d] = (domainAcc[d] || 0) + (normByTheme[k] || 0);
    }
    const topDomain = Object.entries(domainAcc).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    return { max, min, spread, topDomain };
  }, [orderedThemes, normByTheme]);

  // BAR data (Horizontal)
  const labels = useMemo(() => orderedThemes.map(getName), [orderedThemes]);
  const userValues = useMemo(
    () => orderedThemes.map((k) => Number(normByTheme[k] ?? 0)),
    [orderedThemes, normByTheme]
  );
  const benchValues = useMemo(
    () => orderedThemes.map((k) => Number(benchmark?.normalizedScores?.[k] ?? 0)),
    [orderedThemes, benchmark]
  );

  const barData = useMemo(() => {
    if (chartData) return chartData;
    const datasets = [
      {
        label: userInfo?.fullName ? `پروفایل ${userInfo.fullName}` : "پروفایل فردی",
        data: userValues,
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
        data: benchValues,
        backgroundColor: "rgba(148,163,184,.35)",
        borderColor: "rgba(148,163,184,.65)",
        borderWidth: 1,
        borderRadius: 8,
        barPercentage: 0.8,
        categoryPercentage: 0.9,
      });
    }
    return { labels, datasets };
  }, [chartData, labels, userValues, benchValues, mode, benchmark, userInfo]);

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y", // horizontal
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
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${Math.round(ctx.parsed.x)}%`,
          },
        },
      },
    }),
    [axisColor, gridColor, tooltipBg, tooltipBorder, textColor]
  );

  // Radar by domains (aggregate)
  const DOMAIN_LABELS_FA = {
    Executing: "اجرایی",
    Influencing: "تأثیرگذاری",
    Relationship: "رابطه‌سازی",
    Strategic: "تفکر راهبردی",
    Other: "سایر",
  };

  const domainKeys = ["Executing", "Influencing", "Relationship", "Strategic", "Other"];
  const radarLabels = domainKeys.map((k) => DOMAIN_LABELS_FA[k]);

  const userDomainVals = useMemo(() => {
    const acc = Object.fromEntries(domainKeys.map((k) => [k, 0]));
    const cnt = Object.fromEntries(domainKeys.map((k) => [k, 0]));
    for (const th of orderedThemes) {
      const d = getDomain(th);
      acc[d] += Number(normByTheme[th] ?? 0);
      cnt[d] += 1;
    }
    // average per domain
    return domainKeys.map((d) => (cnt[d] ? Math.round(acc[d] / cnt[d]) : 0));
  }, [orderedThemes, normByTheme]);

  const benchDomainVals = useMemo(() => {
    if (!benchmark) return domainKeys.map(() => 0);
    const acc = Object.fromEntries(domainKeys.map((k) => [k, 0]));
    const cnt = Object.fromEntries(domainKeys.map((k) => [k, 0]));
    for (const th of orderedThemes) {
      const d = getDomain(th);
      acc[d] += Number(benchmark.normalizedScores?.[th] ?? 0);
      cnt[d] += 1;
    }
    return domainKeys.map((d) => (cnt[d] ? Math.round(acc[d] / cnt[d]) : 0));
  }, [orderedThemes, benchmark]);

  const radarData = useMemo(
    () => ({
      labels: radarLabels,
      datasets: [
        {
          label: userInfo?.fullName ? `پروفایل ${userInfo.fullName}` : "پروفایل فردی",
          data: userDomainVals,
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
                data: benchDomainVals,
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
    [radarLabels, userDomainVals, benchDomainVals, userInfo, mode, benchmark]
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

  // actions
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
      .top-theme-row { background: rgba(245,158,11,.12); }
    `;
    const win = window.open("", "", "width=1024,height=720");
    if (!win) return;
    win.document.write(`
      <html>
        <head><meta charset="UTF-8"/><title>گزارش نقاط قوت کلیفتون</title><style>${css}</style></head>
        <body>${html}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const activeChartRef = () => (mode === "radarDomains" ? radarRef.current : barRef.current);

  const handleDownloadPNG = () => {
    const chart = activeChartRef();
    if (!chart) return;
    const url = chart.toBase64Image?.() || chart.canvas?.toDataURL?.("image/png");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `clifton_${mode}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportCSV = () => {
    const rows = [["themeKey", "themeName", "rawScore", "normalized(%)", "domain"]];
    orderedThemes.forEach((k) => {
      rows.push([
        k,
        (getName(k) || "").replace(/,/g, "،"),
        rawScores?.[k] ?? detailsByTheme.get(k)?.score ?? "",
        normByTheme?.[k] ?? detailsByTheme.get(k)?.percentage ?? "",
        getDomain(k),
      ]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clifton_strengths_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // suggestions map for quick lookup
  const suggestMap = useMemo(() => {
    const m = new Map();
    developmentSuggestions.forEach((x) => m.set(x.theme, x.suggestions || []));
    return m;
  }, [developmentSuggestions]);

  // characteristics normalizer
  const toList = (val) => (Array.isArray(val) ? val : (val ? String(val).split(/[،,•|-]/).map(s => s.trim()).filter(Boolean) : []));

  return (
    <section className="clifton-container card" ref={containerRef} dir="rtl">
      <header className="clifton-head">
        <div>
          <h2 className="title">تحلیل نقاط قوت کلیفتون</h2>
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
          <p className="summary-text">
            <strong>خلاصه:</strong> {summary}
          </p>
        )}

        <div className="badges">
          {signatureTheme && (
            <span className="badge primary">تم اصلی: {getName(signatureTheme)}</span>
          )}
          {topThemes?.length > 0 && (
            <span className="badge info">تم‌های برتر: {topThemes.map(getName).join("، ")}</span>
          )}
        </div>
      </section>

      {/* KPI */}
      <section className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">قوی‌ترین تم</div>
          <div className="kpi-value">
            {kpi.max ? `${getName(kpi.max.key)} (${fmtPct(kpi.max.val)})` : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">کمترین تم</div>
          <div className="kpi-value">
            {kpi.min ? `${getName(kpi.min.key)} (${fmtPct(kpi.min.val)})` : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">پراکندگی نمرات</div>
          <div className="kpi-value">{kpi.spread || 0} امتیاز</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">دامنه‌ی غالب</div>
          <div className="kpi-value">{DOMAIN_LABELS_FA[kpi.topDomain] || kpi.topDomain}</div>
        </div>
      </section>

      {/* Scores table */}
      <section className="scores-section">
        <h3>نمرات خام و نرمال‌شده</h3>
        <div className="table-wrap">
          <table className="scores-table">
            <thead>
              <tr>
                <th>کُد تم</th>
                <th>نام تم</th>
                <th>دامنه</th>
                <th>نمره خام</th>
                <th>نمره نرمال‌شده (%)</th>
              </tr>
            </thead>
            <tbody>
              {orderedThemes.map((k) => {
                const det = detailsByTheme.get(k);
                const isTop = det?.isTop || topThemes?.includes?.(k) || signatureTheme === k;
                return (
                  <tr key={k} className={isTop ? "top-theme-row" : ""}>
                    <td>{k}</td>
                    <td>{getName(k)}</td>
                    <td>{DOMAIN_LABELS_FA[getDomain(k)] || getDomain(k)}</td>
                    <td>{rawScores?.[k] ?? det?.score ?? "—"}</td>
                    <td>{fmtPct(normByTheme?.[k] ?? det?.percentage)}</td>
                  </tr>
                );
              })}
              {orderedThemes.length === 0 && (
                <tr><td colSpan="5" className="muted">داده‌ای ثبت نشده است.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Themes detail */}
      <section className="details-section">
        <h3>توضیحات تم‌ها</h3>
        <div className="themes-list">
          {orderedThemes.map((key) => {
            const det = detailsByTheme.get(key) || { theme: key, name: key };
            const isTop = det?.isTop || topThemes?.includes?.(key) || signatureTheme === key;
            const chars = toList(det?.characteristics);
            const sugg = suggestMap.get(key) || [];

            return (
              <article className={`theme-card ${isTop ? "top" : ""}`} key={key}>
                <header className="theme-head">
                  <h4>{det.name}</h4>
                  {isTop && <span className="top-label">تم برتر</span>}
                </header>
                {det.description && <p className="desc">{det.description}</p>}

                {chars.length > 0 && (
                  <div className="theme-list">
                    <h5>ویژگی‌ها</h5>
                    <ul>{chars.map((c, i) => <li key={i}>{c}</li>)}</ul>
                  </div>
                )}

                {sugg.length > 0 && (
                  <div className="theme-list">
                    <h5>پیشنهادهای رشد</h5>
                    <ul>{sugg.map((s, i) => <li key={i}>{s}</li>)}</ul>
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
          <button className={`seg-btn ${mode === "bar" ? "active" : ""}`} onClick={() => setMode("bar")}>میله‌ای (تم‌ها)</button>
          <button className={`seg-btn ${mode === "radarDomains" ? "active" : ""}`} onClick={() => setMode("radarDomains")}>رادار (دامنه‌ها)</button>
          {benchmark && (
            <button className={`seg-btn ${mode === "compare" ? "active" : ""}`} onClick={() => setMode("compare")}>مقایسه با میانگین</button>
          )}
        </div>

        <div className="chart-wrap">
          {(mode === "bar" || mode === "compare") && (
            <Bar ref={barRef} data={barData} options={barOptions} />
          )}
          {mode === "radarDomains" && (
            <Radar ref={radarRef} data={radarData} options={radarOptions} />
          )}
        </div>
        <p className="muted small">راهنما: مقیاس همه نمودارها نرمال‌شده (۰ تا ۱۰۰) است.</p>
      </section>
    </section>
  );
};

export default CliftonStrengthsAnalysis;
