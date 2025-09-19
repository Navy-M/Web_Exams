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
import "./DiscAnalysis.css";

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

const ORDER = ["D", "I", "S", "C"];
const COLORS = { D:"#ef4444", I:"#f59e0b", S:"#10b981", C:"#3b82f6", DEFAULT:"#2563eb" };

/**
 * Props:
 * - data: {
 *     rawScores?: Record<string, number>,
 *     normalizedScores?: Record<string, number>, // 0..100
 *     dominantTraits?: string[],
 *     primaryTrait?: string,
 *     secondaryTrait?: string,
 *     traits?: Record<string, { name:string, description?:string, score?:number, percentile?:number, strengths?:string[], risks?:string[], advice?:string[] }>,
 *     chartData?: Chart.js dataset (optional),
 *     summary?: string,
 *     analyzedAt?: string|number|Date,
 *     userInfo?: { fullName?:string, id?:string }
 *   }
 * - benchmark?: { // optional for compare mode
 *     label?: string, // e.g. 'میانگین گروه'
 *     normalizedScores: Record<string, number>
 *   }
 */
const DiscAnalysis = ({ data, benchmark }) => {
  if (!data) return <p className="muted" dir="rtl">داده‌ای برای نمایش موجود نیست.</p>;

  const {
    rawScores = {},
    normalizedScores = {},
    dominantTraits = [],
    primaryTrait,
    secondaryTrait,
    traits = {},
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

  // read theme CSS vars so charts match dark/light instantly
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

  // trait keys in canonical order
  const traitKeys = useMemo(() => {
    const keys = new Set([
      ...Object.keys(traits || {}),
      ...Object.keys(normalizedScores || {}),
      ...Object.keys(rawScores || {}),
      ...(benchmark ? Object.keys(benchmark.normalizedScores || {}) : []),
    ]);
    const arr = Array.from(keys);
    arr.sort((a, b) => {
      const ia = ORDER.includes(a) ? ORDER.indexOf(a) : 99;
      const ib = ORDER.includes(b) ? ORDER.indexOf(b) : 99;
      return ia - ib || String(a).localeCompare(String(b), "fa");
    });
    return arr;
  }, [traits, normalizedScores, rawScores, benchmark]);

  const fmtPct = (v) =>
    v === null || v === undefined || Number.isNaN(Number(v))
      ? "—"
      : `${Math.round(Number(v))}%`;

  // Build chart data (bar/radar) if not provided
  const labels = useMemo(
    () => traitKeys.map((k) => traits?.[k]?.name || k),
    [traitKeys, traits]
  );

  const userValues = useMemo(
    () => traitKeys.map((k) => Number(normalizedScores?.[k] ?? 0)),
    [traitKeys, normalizedScores]
  );

  const benchValues = useMemo(
    () => traitKeys.map((k) => Number(benchmark?.normalizedScores?.[k] ?? 0)),
    [traitKeys, benchmark]
  );

  const barData = useMemo(() => {
    if (chartData) return chartData;
    const colors = traitKeys.map((k) => COLORS[k] || COLORS.DEFAULT);
    const datasets = [
      {
        label: userInfo?.fullName ? `پروفایل ${userInfo.fullName}` : "پروفایل فردی",
        data: userValues,
        backgroundColor: colors,
        borderRadius: 10,
        barPercentage: 0.7,
        categoryPercentage: 0.7,
      },
    ];
    if (mode === "compare" && benchmark) {
      datasets.push({
        label: benchmark.label || "میانگین گروه",
        data: benchValues,
        backgroundColor: "rgba(148, 163, 184, .35)",
        borderColor: "rgba(148, 163, 184, .55)",
        borderWidth: 1,
        borderRadius: 10,
        barPercentage: 0.7,
        categoryPercentage: 0.7,
      });
    }
    return { labels, datasets };
  }, [chartData, traitKeys, userValues, benchValues, benchmark, mode, labels, userInfo]);

  const radarData = useMemo(() => {
    const datasets = [
      {
        label: userInfo?.fullName ? `پروفایل ${userInfo.fullName}` : "پروفایل فردی",
        data: userValues,
        backgroundColor: "rgba(37,99,235,.18)",
        borderColor: "#2563eb",
        pointBackgroundColor: "#2563eb",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "#2563eb",
        fill: true,
      },
    ];
    if (mode === "compare" && benchmark) {
      datasets.push({
        label: benchmark.label || "میانگین گروه",
        data: benchValues,
        backgroundColor: "rgba(148,163,184,.18)",
        borderColor: "rgba(148,163,184,.8)",
        pointBackgroundColor: "rgba(148,163,184,.8)",
        pointBorderColor: "#fff",
        fill: true,
      });
    }
    return { labels, datasets };
  }, [labels, userValues, benchValues, benchmark, mode, userInfo]);

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { stepSize: 20, color: axisColor, callback: (v) => `${v}%` },
          grid: { color: gridColor },
        },
        x: {
          ticks: { color: axisColor },
          grid: { color: "transparent" },
        },
      },
      plugins: {
        legend: {
          position: "top",
          labels: { color: axisColor },
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: tooltipBorder,
          borderWidth: 1,
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}%` },
        },
      },
    }),
    [axisColor, gridColor, tooltipBg, tooltipBorder, textColor]
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

  // KPIs
  const kpi = useMemo(() => {
    const entries = traitKeys.map((k) => ({ key: k, val: Number(normalizedScores[k] ?? 0) }));
    if (!entries.length) return { max: null, min: null, spread: 0, balance: "—" };
    const sorted = [...entries].sort((a, b) => b.val - a.val);
    const max = sorted[0];
    const min = sorted[sorted.length - 1];
    const spread = Math.round(max.val - min.val);
    const variance =
      entries.reduce((s, e) => s + Math.pow(e.val - 50, 2), 0) / entries.length;
    const balance =
      variance < 400 ? "متعادل" : variance < 900 ? "نیمه‌متعادل" : "نامتعادل";
    return { max, min, spread, balance };
  }, [traitKeys, normalizedScores]);

  // Actions
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
      .dominant-row { background: rgba(245,158,11,.12); }
    `;
    const win = window.open("", "", "width=1024,height=720");
    if (!win) return;
    win.document.write(`
      <html>
        <head><meta charset="UTF-8"/><title>گزارش تحلیل DISC</title><style>${css}</style></head>
        <body>${html}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleDownloadPNG = () => {
    const chart =
      mode === "radar" ? radarRef.current : barRef.current;
    if (!chart) return;
    const url = chart.toBase64Image?.() || chart.canvas?.toDataURL?.("image/png");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `disc_${mode}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportCSV = () => {
    const rows = [["traitKey", "traitName", "rawScore", "normalized(%)"]];
    traitKeys.forEach((k) => {
      rows.push([
        k,
        (traits?.[k]?.name || k).replace(/,/g, "،"),
        rawScores?.[k] ?? "",
        normalizedScores?.[k] ?? "",
      ]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `disc_scores_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generic suggestions if trait.advice not provided
  const defaultAdvice = {
    D: ["اهداف روشن تعیین کنید", "بازخورد مستقیم ولی محترمانه دریافت کنید", "صبوری در تصمیم‌گیری را تمرین کنید"],
    I: ["برنامه‌ریزی و پیگیری را تقویت کنید", "به زمان‌بندی متعهد بمانید", "شنونده‌ی فعال باشید"],
    S: ["به تغییرات کوچک عادت کنید", "حس راحتی را با مرزبندی حفظ کنید", "در مواقع لازم assertive باشید"],
    C: ["وسواس کمال‌گرایی را مدیریت کنید", "در تصمیم‌گیری چابکی را تمرین کنید", "تبادل نظر غیررسمی را بپذیرید"],
  };

  // Render
  return (
    <section className="disc-analysis-container card" ref={containerRef} dir="rtl">
      <header className="disc-head">
        <div>
          <h2 className="title">تحلیل آزمون DISC</h2>
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

      {/* Badges + summary */}
      <section className="summary-section">
        <div className="badges">
          {primaryTrait && (
            <span className="badge primary">
              تیپ اصلی: {traits?.[primaryTrait]?.name || primaryTrait}
            </span>
          )}
          {secondaryTrait && (
            <span className="badge secondary">
              تیپ ثانویه: {traits?.[secondaryTrait]?.name || secondaryTrait}
            </span>
          )}
          {Array.isArray(dominantTraits) && dominantTraits.length > 0 && (
            <span className="badge info">
              ویژگی‌های غالب: {dominantTraits.map((k) => traits?.[k]?.name || k).join("، ")}
            </span>
          )}
        </div>
        {summary && (
          <p className="summary-text">
            <strong>خلاصه تحلیل:</strong> {summary}
          </p>
        )}
      </section>

      {/* KPIs */}
      <section className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">قوی‌ترین بُعد</div>
          <div className="kpi-value">
            {kpi.max ? (traits?.[kpi.max.key]?.name || kpi.max.key) : "—"} {kpi.max ? `(${fmtPct(kpi.max.val)})` : ""}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">ضعیف‌ترین بُعد</div>
          <div className="kpi-value">
            {kpi.min ? (traits?.[kpi.min.key]?.name || kpi.min.key) : "—"} {kpi.min ? `(${fmtPct(kpi.min.val)})` : ""}
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
                <th>ویژگی</th>
                <th>نمره خام</th>
                <th>نمره نرمال‌شده (%)</th>
              </tr>
            </thead>
            <tbody>
              {traitKeys.map((k) => {
                const isDom = dominantTraits?.includes?.(k);
                return (
                  <tr key={k} className={isDom ? "dominant-row" : ""}>
                    <td className="trait-cell">
                      <span
                        className="color-dot"
                        style={{ backgroundColor: COLORS[k] || COLORS.DEFAULT }}
                        aria-hidden
                      />
                      {traits?.[k]?.name || k}
                    </td>
                    <td>{rawScores?.[k] ?? "—"}</td>
                    <td>{fmtPct(normalizedScores?.[k])}</td>
                  </tr>
                );
              })}
              {traitKeys.length === 0 && (
                <tr>
                  <td colSpan="3" className="muted">داده‌ای ثبت نشده است.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Traits cards */}
      <section className="traits-section">
        <h3>توضیح ویژگی‌ها</h3>
        <div className="traits-list">
          {traitKeys.map((key) => {
            const tr = traits?.[key] || { name: key };
            const cls =
              key === primaryTrait
                ? "trait-card primary"
                : key === secondaryTrait
                ? "trait-card secondary"
                : "trait-card";

            const strengths = tr.strengths?.length ? tr.strengths : null;
            const risks = tr.risks?.length ? tr.risks : null;
            const advice = tr.advice?.length ? tr.advice : defaultAdvice[key] || null;

            return (
              <article className={cls} key={key}>
                <header className="trait-head">
                  <span
                    className="color-dot"
                    style={{ backgroundColor: COLORS[key] || COLORS.DEFAULT }}
                  />
                  <h4>{tr.name || key}</h4>
                </header>
                {tr.description && <p>{tr.description}</p>}
                <p className="muted small">
                  <strong>نمره:</strong> {tr?.score ?? "—"}{" "}
                  {tr?.percentile !== undefined && `(${fmtPct(tr.percentile)})`}
                </p>

                {strengths && (
                  <div className="trait-list">
                    <h5>نقاط قوت</h5>
                    <ul>{strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                )}
                {risks && (
                  <div className="trait-list">
                    <h5>چالش‌ها</h5>
                    <ul>{risks.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                )}
                {advice && (
                  <div className="trait-list">
                    <h5>پیشنهادهای رشد</h5>
                    <ul>{advice.map((s, i) => <li key={i}>{s}</li>)}</ul>
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
          <button className={`seg-btn ${mode === "bar" ? "active" : ""}`} onClick={() => setMode("bar")}>ستونی</button>
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
        <p className="muted small">
          راهنما: محور عمودی/شعاعی درصد نرمال‌شده (۰ تا ۱۰۰) را نمایش می‌دهد.
        </p>
      </section>
    </section>
  );
};

export default DiscAnalysis;
