// PersonalFavoritesAnalysis.jsx
import React, { useCallback, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import "./PersonalFavoritesAnalysis.css";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const toNum = (v, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};
const fmtPct = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? "—" : `${Math.round(Number(v))}%`;

// برداشت امن داده‌ها از ریشه یا dataForUI
const pick = (data) => ({
  traits: data?.dataForUI?.traits || Object.keys(data?.normalizedScores || {}) || [],
  rawScores: data?.dataForUI?.rawScores || data?.rawScores || data?.scores || {},
  normalized: data?.dataForUI?.normalizedScores || data?.normalizedScores || {},
  frequencies: data?.dataForUI?.frequencies || data?.frequencies || {},
  topPreferences: data?.dataForUI?.topPreferences || data?.topPreferences || {},
  summary: data?.dataForUI?.summary || data?.summary,
  analyzedAt: data?.dataForUI?.analyzedAt || data?.analyzedAt,
  chartData: data?.dataForUI?.chartData || data?.chartData || null,
});

const PersonalFavoritesAnalysis = ({ data = {}, benchmark = null }) => {
  if (!data) return <p className="muted" dir="rtl">داده‌ای برای نمایش موجود نیست.</p>;

  const {
    traits,
    rawScores,
    normalized,
    frequencies,
    topPreferences,
    summary,
    analyzedAt,
    chartData,
  } = pick(data);

  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const [mode] = useState("bar"); // فعلاً فقط میله‌ای کافی است

  const dateFa = analyzedAt
    ? new Date(analyzedAt).toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  // تم از CSS vars
  const readVar = useCallback((name) => {
    const el = containerRef.current || document.documentElement;
    const v = getComputedStyle(el).getPropertyValue(name);
    return v ? v.trim() : "";
  }, []);
  const axisColor = readVar("--chart-axis") || "rgba(2,6,23,.75)";
  const gridColor = readVar("--chart-grid") || "rgba(148,163,184,.25)";
  const tooltipBg = readVar("--tooltip-bg") || "#fff";
  const tooltipBorder = readVar("--tooltip-border") || "#e5e7eb";
  const textColor = readVar("--text") || "#0f172a";

  // KPIها
  const kpi = useMemo(() => {
    const arr = (traits || []).map((t) => ({ t, val: toNum(normalized?.[t], 0) }));
    if (!arr.length) return { strongest: null, weakest: null, spread: 0, balance: "—" };
    const sorted = [...arr].sort((a, b) => b.val - a.val);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];
    const spread = Math.round(strongest.val - weakest.val);
    const variance = arr.reduce((s, x) => s + Math.pow(x.val - 50, 2), 0) / arr.length;
    const balance = variance < 400 ? "متعادل" : variance < 900 ? "نیمه‌متعادل" : "نامتعادل/متخصص";
    return { strongest, weakest, spread, balance };
  }, [traits, normalized]);

  // نمودار
  const labels = useMemo(() => traits || [], [traits]);
  const userVals = useMemo(() => (traits || []).map((t) => toNum(normalized?.[t], 0)), [traits, normalized]);
  const benchVals = useMemo(
    () => (traits || []).map((t) => toNum(benchmark?.normalizedScores?.[t], 0)),
    [traits, benchmark]
  );

  const barData = useMemo(() => {
    if (chartData) return chartData;
    const datasets = [
      {
        label: "پروفایل فردی",
        data: userVals,
        backgroundColor: "rgba(37,99,235,.65)",
        borderColor: "#2563eb",
        borderWidth: 1,
        borderRadius: 8,
        barPercentage: 0.8,
        categoryPercentage: 0.9,
      },
    ];
    if (benchmark?.normalizedScores) {
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
  }, [chartData, labels, userVals, benchVals, benchmark]);

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

  // اکشن‌ها
  const handleDownloadPNG = () => {
    const chart = chartRef.current;
    if (!chart) return;
    const url = chart.toBase64Image?.() || chart.canvas?.toDataURL?.("image/png");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `personal_favorites_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportCSV = () => {
    const rows = [["trait", "rawScore", "normalized(%)", "topPreference", "count"]];
    (traits || []).forEach((t) => {
      const top = topPreferences?.[t] || {};
      rows.push([
        t,
        rawScores?.[t] ?? "",
        normalized?.[t] ?? "",
        top.value ? String(top.value).replace(/,/g, "،") : "",
        top.count ?? "",
      ]);
    });
    const csvBody = rows.map((r) => r.join(",")).join("\n");
    const csv = "\uFEFF" + csvBody; // BOM برای Excel
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `personal_favorites_${Date.now()}.csv`;
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
      thead th { background: rgba(37,99,235,.08); }
      .top-row { background: rgba(245,158,11,.12); }
    `;
    const win = window.open("", "", "width=1024,height=720");
    if (!win) return;
    win.document.write(`
      <html>
        <head><meta charset="UTF-8"/><title>گزارش Personal Favorites</title><style>${css}</style></head>
        <body>${html}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  // رندر
  return (
    <section className="pf-analysis card" ref={containerRef} dir="rtl" aria-label="تحلیل Personal Favorites">
      <header className="pf-head">
        <div>
          <h2 className="title">تحلیل ترجیحات شخصی (Personal Favorites)</h2>
          <div className="muted small">زمان تحلیل: {dateFa}</div>
        </div>
        <div className="actions">
          <button className="btn outline" onClick={handleExportCSV}>خروجی CSV</button>
          <button className="btn outline" onClick={handleDownloadPNG}>دانلود نمودار</button>
          <button className="btn primary" onClick={handlePrint}>چاپ گزارش</button>
        </div>
      </header>

      {summary && (
        <section className="summary-section">
          <p className="summary-text"><strong>خلاصه:</strong> {summary}</p>
        </section>
      )}

      {/* KPI */}
      {/* <section className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">قوی‌ترین حوزه</div>
          <div className="kpi-value">
            {kpi.strongest ? `${kpi.strongest.t} (${fmtPct(kpi.strongest.val)})` : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">ضعیف‌ترین حوزه</div>
          <div className="kpi-value">
            {kpi.weakest ? `${kpi.weakest.t} (${fmtPct(kpi.weakest.val)})` : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">پراکندگی نمرات</div>
          <div className="kpi-value">{kpi.spread} امتیاز</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">تعادل کلی</div>
          <div className="kpi-value">{kpi.balance}</div>
        </div>
      </section> */}

      {/* جدول نمرات */}
      <section className="scores-section">
        <h3>نمرات خام و نرمال‌شده</h3>
        <div className="table-wrap">
          <table className="scores-table">
            <thead>
              <tr>
                <th>حوزه</th>
                <th>نمره خام</th>
                <th>نمره نرمال‌شده (%)</th>
                <th>ترجیح غالب (فراوان‌ترین گزینه)</th>
              </tr>
            </thead>
            <tbody>
              {(traits || []).map((t) => {
                const tp = topPreferences?.[t];
                return (
                  <tr key={t}>
                    <td>{t}</td>
                    <td>{rawScores?.[t] ?? "—"}</td>
                    <td>{fmtPct(normalized?.[t])}</td>
                    <td>
                      {tp?.value ? (
                        <>
                          <span className="tag">{tp.value}</span>
                          <span className="muted small"> × {tp.count}</span>
                        </>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
              {!traits?.length && (
                <tr>
                  <td colSpan="4" className="muted">داده‌ای ثبت نشده است.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* نمودار */}
      <section className="chart-section">
        <div className="chart-wrap">
          <Bar ref={chartRef} data={barData} options={barOptions} />
        </div>
      <br/>
        <p className="muted small">راهنما: محور افقی درصد نرمال‌شده (۰ تا ۱۰۰) است.</p>
      </section>

      {/* فراوانی گزینه‌ها (اختیاری) */}
      {/* <section className="freq-section">
        <h3>فراوانی پاسخ‌ها</h3>
        <div className="freq-grid">
          {(traits || []).map((t) => {
            const f = frequencies?.[t] || {};
            const entries = Object.entries(f);
            return (
              <div className="freq-card" key={t}>
                <h4 className="freq-title">{t}</h4>
                {entries.length ? (
                  <ul className="freq-list">
                    {entries.sort((a,b)=>b[1]-a[1]).map(([label, count]) => (
                      <li key={label}>
                        <span className="tag">{label}</span>
                        <span className="muted small"> × {count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="muted">—</div>
                )}
              </div>
            );
          })}
        </div>
      </section> */}
    </section>
  );
};

PersonalFavoritesAnalysis.propTypes = {
  data: PropTypes.shape({
    scores: PropTypes.object,
    normalizedScores: PropTypes.object,
    frequencies: PropTypes.object,
    topPreferences: PropTypes.object,
    summary: PropTypes.string,
    analyzedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
    dataForUI: PropTypes.shape({
      traits: PropTypes.arrayOf(PropTypes.string),
      rawScores: PropTypes.object,
      normalizedScores: PropTypes.object,
      frequencies: PropTypes.object,
      topPreferences: PropTypes.object,
      summary: PropTypes.string,
      analyzedAt: PropTypes.string,
      chartData: PropTypes.object,
    }),
  }),
  benchmark: PropTypes.shape({
    label: PropTypes.string,
    normalizedScores: PropTypes.object,
  }),
};

export default PersonalFavoritesAnalysis;
