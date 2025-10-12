// DiscAnalysis.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
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

// ترتیب معیارها (ثابت) و رنگ‌های پایه
const ORDER = ["D", "I", "S", "C"];
const COLORS = { D: "#ef4444", I: "#f59e0b", S: "#10b981", C: "#3b82f6", DEFAULT: "#2563eb" };

// نگهبانِ عدد امن
const toNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// فرمت درصد
const fmtPct = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? "—" : `${Math.round(Number(v))}%`;

const DiscAnalysis = ({ data, benchmark }) => {
  // ===== 0) گارد داده =====
  const hasData = !!(data && (data.normalizedScores || data.rawScores));
  if (!hasData) return <p className="muted" dir="rtl" data-testid="no-data">داده‌ای برای نمایش موجود نیست.</p>;

  // ===== 1) استخراج داده =====
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

  // ===== 2) رفرنس‌ها/وضعیت‌ها =====
  const containerRef = useRef(null);
  const barRef = useRef(null);     // ref به نمونه Chart برای خروجی PNG
  const radarRef = useRef(null);   // ref به نمونه Chart برای خروجی PNG
  const [mode, setMode] = useState(benchmark ? "compare" : "bar"); // 'bar' | 'radar' | 'compare'

  // تاریخ فارسی
  const dateFa = useMemo(
    () =>
      analyzedAt
        ? new Date(analyzedAt).toLocaleDateString("fa-IR", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—",
    [analyzedAt]
  );

  // ===== 3) هم‌خوانی با تم (CSS Variables) =====
  // خواندن امن متغیرهای CSS از ریشه یا کانتینر
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
  const headBg = readVar("--head-bg") || "rgba(37,99,235,.08)";

  // وقتی تم (class روی html/body) تغییر کند، مقادیر CSS Vars را رفرش کن
  useEffect(() => {
    const root = document.documentElement;
    const obs = new MutationObserver(() => {
      // با تغییر کلاس تم، ChartJS خودش با رندر مجدد گزینه‌ها را می‌خواند
      // اینجا نیازی به setState نیست، چون useMemo بر اساس css vars از نو محاسبه می‌شود.
    });
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // ===== 4) ترتیب کلیدها =====
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

  // ===== 5) برچسب‌ها و مقادیر کاربر/بنچمارک =====
  const labels = useMemo(
    () => traitKeys.map((k) => traits?.[k]?.name || k),
    [traitKeys, traits]
  );

  const userValues = useMemo(
    () => traitKeys.map((k) => toNum(normalizedScores?.[k], 0)),
    [traitKeys, normalizedScores]
  );

  const benchValues = useMemo(
    () => traitKeys.map((k) => toNum(benchmark?.normalizedScores?.[k], 0)),
    [traitKeys, benchmark]
  );

  // ===== 6) داده نمودارها =====
  const barData = useMemo(() => {
    if (chartData) return chartData; // در صورت تزریق دستی دیتاست
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

  // ===== 7) گزینه‌های نمودارها (سازگار با تم) =====
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
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Math.round(ctx.parsed.y)}%` },
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

  // ===== 8) KPI ها =====
  const kpi = useMemo(() => {
    const entries = traitKeys.map((k) => ({ key: k, val: toNum(normalizedScores[k], 0) }));
    if (!entries.length) return { max: null, min: null, spread: 0, balance: "—" };
    const sorted = [...entries].sort((a, b) => b.val - a.val);
    const max = sorted[0];
    const min = sorted[sorted.length - 1];
    const spread = Math.round(max.val - min.val);
    const variance = entries.reduce((s, e) => s + Math.pow(e.val - 50, 2), 0) / entries.length;
    const balance = variance < 400 ? "متعادل" : variance < 900 ? "نیمه‌متعادل" : "نامتعادل";
    return { max, min, spread, balance };
  }, [traitKeys, normalizedScores]);

  // ===== 9) اکشن‌ها =====
  const canExport = traitKeys.length > 0;

  // چاپ: DOM موجود را در پنجره‌ی جدید با CSS چاپی باز می‌کنیم
  const handlePrint = useCallback(() => {
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
  }, [headBg]);

  // خروجی تصویر PNG از چارت فعال
  const handleDownloadPNG = useCallback(() => {
    const chart = mode === "radar" ? radarRef.current : barRef.current;
    // react-chartjs-2 v5: ref مستقیم نمونه‌ی Chart را برمی‌گرداند
    const url =
      chart?.toBase64Image?.() || chart?.canvas?.toDataURL?.("image/png");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `disc_${mode}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [mode]);

  // خروجی CSV با BOM برای Excel
  const handleExportCSV = useCallback(() => {
    const rows = [["traitKey", "traitName", "rawScore", "normalized(%)"]];
    traitKeys.forEach((k) => {
      rows.push([
        k,
        (traits?.[k]?.name || k).replace(/,/g, "،"),
        rawScores?.[k] ?? "",
        normalizedScores?.[k] ?? "",
      ]);
    });
    const csvBody = rows.map((r) => r.join(",")).join("\n");
    const csv = "\uFEFF" + csvBody; // BOM
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `disc_scores_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [traitKeys, traits, rawScores, normalizedScores]);

  // ===== 10) پیشنهادهای پیش‌فرض =====
  const defaultAdvice = {
    D: ["اهداف روشن تعیین کنید", "بازخورد مستقیم ولی محترمانه دریافت کنید", "صبوری در تصمیم‌گیری را تمرین کنید"],
    I: ["برنامه‌ریزی و پیگیری را تقویت کنید", "به زمان‌بندی متعهد بمانید", "شنونده‌ی فعال باشید"],
    S: ["به تغییرات کوچک عادت کنید", "حس راحتی را با مرزبندی حفظ کنید", "در مواقع لازم assertive باشید"],
    C: ["وسواس کمال‌گرایی را مدیریت کنید", "در تصمیم‌گیری چابکی را تمرین کنید", "تبادل نظر غیررسمی را بپذیرید"],
  };

  // ===== 11) رندر =====
  return (
    <section className="disc-analysis-container card" ref={containerRef} dir="rtl" aria-label="تحلیل DISC">
      <header className="disc-head">
        <div>
          <h2 className="title" data-testid="title">تحلیل آزمون DISC</h2>
          <div className="muted small" aria-label="اطلاعات کاربر و زمان تحلیل">
            {userInfo?.fullName ? `کاربر: ${userInfo.fullName} • ` : null}
            زمان تحلیل: {dateFa}
          </div>
        </div>
        <div className="actions">
          <button className="btn outline" onClick={handleExportCSV} disabled={!canExport} aria-disabled={!canExport}>
            خروجی CSV
          </button>
          <button className="btn outline" onClick={handleDownloadPNG} disabled={!canExport} aria-disabled={!canExport}>
            دانلود نمودار
          </button>
          <button className="btn primary" onClick={handlePrint} disabled={!canExport} aria-disabled={!canExport}>
            چاپ گزارش
          </button>
        </div>
      </header>

      {/* Badges + summary */}
      <section className="summary-section">
        <div className="badges" role="status" aria-live="polite">
          {primaryTrait && (
            <span className="badge primary" data-testid="primary-badge">
              تیپ اصلی: {traits?.[primaryTrait]?.name || primaryTrait}
            </span>
          )}
          {secondaryTrait && (
            <span className="badge secondary" data-testid="secondary-badge">
              تیپ ثانویه: {traits?.[secondaryTrait]?.name || secondaryTrait}
            </span>
          )}
          {Array.isArray(dominantTraits) && dominantTraits.length > 0 && (
            <span className="badge info" data-testid="dominant-list">
              ویژگی‌های غالب: {dominantTraits.map((k) => traits?.[k]?.name || k).join("، ")}
            </span>
          )}
        </div>
        {summary && (
          <p className="summary-text" data-testid="summary">
            <strong>خلاصه تحلیل:</strong> {summary}
          </p>
        )}
      </section>

      {/* KPIs */}
      <section className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">قوی‌ترین بُعد</div>
          <div className="kpi-value" data-testid="kpi-strongest">
            {kpi.max ? (traits?.[kpi.max.key]?.name || kpi.max.key) : "—"} {kpi.max ? `(${fmtPct(kpi.max.val)})` : ""}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">ضعیف‌ترین بُعد</div>
          <div className="kpi-value" data-testid="kpi-weakest">
            {kpi.min ? (traits?.[kpi.min.key]?.name || kpi.min.key) : "—"} {kpi.min ? `(${fmtPct(kpi.min.val)})` : ""}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">پراکندگی نمرات</div>
          <div className="kpi-value" data-testid="kpi-spread">{kpi.spread || 0} امتیاز</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">تعادل کلی</div>
          <div className="kpi-value" data-testid="kpi-balance">{kpi.balance}</div>
        </div>
      </section>

      {/* Scores table */}
      <section className="scores-section">
        <h3>نمرات خام و نرمال‌شده</h3>
        <div className="table-wrap">
          <table className="scores-table" aria-label="جدول نمرات DISC">
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
        <div className="segmented" role="tablist" aria-label="انتخاب نوع نمودار">
          <button
            className={`seg-btn ${mode === "bar" ? "active" : ""}`}
            onClick={() => setMode("bar")}
            role="tab"
            aria-selected={mode === "bar"}
          >
            ستونی
          </button>
          <button
            className={`seg-btn ${mode === "radar" ? "active" : ""}`}
            onClick={() => setMode("radar")}
            role="tab"
            aria-selected={mode === "radar"}
          >
            رادار
          </button>
          {benchmark && (
            <button
              className={`seg-btn ${mode === "compare" ? "active" : ""}`}
              onClick={() => setMode("compare")}
              role="tab"
              aria-selected={mode === "compare"}
            >
              مقایسه با میانگین
            </button>
          )}
        </div>

        <div className="chart-wrap" data-testid="chart">
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

DiscAnalysis.propTypes = {
  data: PropTypes.shape({
    rawScores: PropTypes.object,
    normalizedScores: PropTypes.object,
    dominantTraits: PropTypes.arrayOf(PropTypes.string),
    primaryTrait: PropTypes.string,
    secondaryTrait: PropTypes.string,
    traits: PropTypes.object,
    chartData: PropTypes.object,
    summary: PropTypes.string,
    analyzedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
    userInfo: PropTypes.shape({
      fullName: PropTypes.string,
      id: PropTypes.string,
    }),
  }),
  benchmark: PropTypes.shape({
    label: PropTypes.string,
    normalizedScores: PropTypes.object,
  }),
};

export default DiscAnalysis;
