// HollandAnalysis.jsx
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
import "./HollandAnalysis.css";

// ثبت پلاگین‌های Chart.js
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

/* =============================================================================
   ثابت‌ها و کمک‌تابع‌ها
============================================================================= */
const ORDER = ["R", "I", "A", "S", "E", "C"]; // Realistic, Investigative, Artistic, Social, Enterprising, Conventional

const FALLBACK_NAMES = {
  R: "واقع‌گرا (Realistic)",
  I: "پژوهشی (Investigative)",
  A: "هنری (Artistic)",
  S: "اجتماعی (Social)",
  E: "پیشرو/کارآفرین (Enterprising)",
  C: "قراردادی/اداری (Conventional)",
};

const toNum = (v, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};

const fmtPct = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? "—" : `${Math.round(Number(v))}%`;

const isAllZero = (obj = {}) =>
  Object.values(obj || {}).length > 0 && Object.values(obj).every((v) => Number(v) === 0);

const toList = (val) =>
  Array.isArray(val)
    ? val.filter(Boolean).map((s) => String(s).trim())
    : val
    ? String(val)
        .split(/[،,•|-]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

/** تلاش برای نگاشت chartData.labels به کدهای RIASEC و ساخت یک شیء {R:.., I:.., ...} */
const mapChartToCodes = (chartData) => {
  const codeByLabel = {
    R: "R",
    Realistic: "R",
    "واقع‌گرا": "R",

    I: "I",
    Investigative: "I",
    "پژوهشی": "I",

    A: "A",
    Artistic: "A",
    "هنری": "A",

    S: "S",
    Social: "S",
    "اجتماعی": "S",

    E: "E",
    Enterprising: "E",
    "پیشرو": "E",
    "کارآفرین": "E",
    "پیشرو/کارآفرین": "E",

    C: "C",
    Conventional: "C",
    "قراردادی": "C",
    "اداری": "C",
    "قراردادی/اداری": "C",
  };

  try {
    const ds = chartData?.datasets?.[0];
    const labels = chartData?.labels || [];
    if (!ds || !Array.isArray(ds.data) || !Array.isArray(labels)) return null;

    const out = {};
    labels.forEach((lbl, i) => {
      const raw = String(lbl || "").trim();
      // سعی در تشخیص با برچسب مستقیم یا معادل فارسی/انگلیسی
      const code =
        codeByLabel[raw] ||
        codeByLabel[raw.split(" ")[0]] || // مثل "واقع‌گرا (Realistic)"
        codeByLabel[raw.replace(/\(.*\)/g, "").trim()] || // حذف پرانتز‌ها
        null;

      if (code) out[code] = Number(ds.data[i]) || 0;
    });
    return out;
  } catch {
    return null;
  }
};

/* =============================================================================
   کامپوننت اصلی
============================================================================= */
const HollandAnalysis = ({ data = null, benchmark = null, debug = false }) => {
  // گارد ورودی
  const hasPayload = !!data && (data.normalizedScores || data.rawScores || data.traits);
  if (!hasPayload) return <p className="muted" dir="rtl">داده‌ای برای نمایش موجود نیست.</p>;

  const {
    hollandCode = "",
    dominantTraits = [],
    rawScores = {},
    normalizedScores: normalizedScoresProp = {},
    traits = {},
    careerSuggestions = [],
    chartData,
    summary,
    analyzedAt,
    userInfo = {},
  } = data;

  /* =========================================================================
     CSS Vars (سازگار با تم)
  ========================================================================= */
  const containerRef = useRef(null);
  const barRef = useRef(null);
  const radarRef = useRef(null);
  const [mode, setMode] = useState(benchmark ? "compare" : "bar"); // 'bar' | 'radar' | 'compare'

    /* ✅ NEW: keep a solid chart container height so Chart.js can measure */
    const HollandchartWrapRef = useRef(null);

    // ✅ ارتفاع قطعی برای ظرف نمودار + تحریک resize پس از mount/تعویض مود
  useEffect(() => {
    const el = HollandchartWrapRef.current;
    if (!el) return;
    // اگر ارتفاع نداشت، تعیینش کن تا Chart.js صفر×صفر رندر نشه
    if (el.clientHeight < 220) {
      el.style.minHeight = "320px";
      el.style.height = "320px";
    }
    // یک تِیک بعد از رندر، رویداد resize تا چارت بازاندازه‌گیری شود
    const t = setTimeout(() => {
      try { window.dispatchEvent(new Event("resize")); } catch {}
    }, 60);
    return () => clearTimeout(t);
  }, [mode]);


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

  // واکنش به تغییر تم (تغییر کلاس روی html/body)
  useEffect(() => {
    const root = document.documentElement;
    const obs = new MutationObserver(() => {});
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  /* =========================================================================
     تاریخ فارسی
  ========================================================================= */
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

  /* =========================================================================
     نرمال مؤثر (fallback chain):
     1) normalizedScores
     2) traits[*].percentage
     3) chartData.dataset[0] (با نگاشت labels→کد)
  ========================================================================= */
  const traitsPct = useMemo(
    () => Object.fromEntries(ORDER.map((k) => [k, Number(traits?.[k]?.percentage ?? 0)])),
    [traits]
  );
  const fromChart = useMemo(() => mapChartToCodes(chartData), [chartData]);

  const effectiveNorm = useMemo(() => {
    const base = normalizedScoresProp || {};
    if (Object.keys(base).length && !isAllZero(base)) return base;

    if (Object.values(traitsPct).some((v) => v > 0)) return traitsPct;

    if (fromChart && Object.values(fromChart).some((v) => v > 0)) return fromChart;

    // هیچ داده‌ی عددی قابل اتکایی نداریم
    return {};
  }, [normalizedScoresProp, traitsPct, fromChart]);

  /* =========================================================================
     مجموعه کدهای موجود (با اولویت ORDER)
  ========================================================================= */
  const codes = useMemo(() => {
    const set = new Set([
      ...ORDER,
      ...Object.keys(effectiveNorm || {}),
      ...Object.keys(rawScores || {}),
      ...Object.keys(traits || {}),
      ...(benchmark ? Object.keys(benchmark.normalizedScores || {}) : []),
    ]);
    return ORDER.filter((k) => set.has(k));
  }, [effectiveNorm, rawScores, traits, benchmark]);

  // نام‌ها
  const getName = useCallback(
    (k) => traits?.[k]?.name || FALLBACK_NAMES[k] || k,
    [traits]
  );

  /* =========================================================================
     مقادیر کاربر/بنچمارک
  ========================================================================= */
  const labels = useMemo(() => codes.map(getName), [codes, getName]);

  const userVals = useMemo(
    () => codes.map((k) => toNum(effectiveNorm?.[k] ?? traits?.[k]?.percentage, 0)),
    [codes, effectiveNorm, traits]
  );

  const benchVals = useMemo(
    () => codes.map((k) => toNum(benchmark?.normalizedScores?.[k], 0)),
    [codes, benchmark]
  );

  /* =========================================================================
     KPI‌ها
  ========================================================================= */
  const kpi = useMemo(() => {
    const entries = codes.map((k) => ({ key: k, val: Number(effectiveNorm?.[k] ?? 0) }));
    if (!entries.length) return { top: null, bottom: null, spread: 0, code3: hollandCode || "—" };

    const sorted = [...entries].sort((a, b) => b.val - a.val);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    const spread = Math.round(top.val - bottom.val);
    const code3 = hollandCode || sorted.slice(0, 3).map((e) => e.key).join("");

    return { top, bottom, spread, code3 };
  }, [codes, effectiveNorm, hollandCode]);

  /* =========================================================================
     داده‌ی نمودارها (Bar افقی + Radar + Compare)
  ========================================================================= */
  const barData = useMemo(() => {
    // اگر chartData از بک‌اند تزریق شده و معتبر است، می‌توانی مستقیماً از آن استفاده کنی
    const hasExternal = chartData && Array.isArray(chartData?.datasets?.[0]?.data);
    if (hasExternal && Object.keys(effectiveNorm).length === 0) return chartData;

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
  }, [labels, userVals, benchVals, mode, benchmark, userInfo, chartData, effectiveNorm]);

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

  /* =========================================================================
     پیشنهادهای شغلی (در صورت نبودِ لیست صریح)
  ========================================================================= */
  const autoCareerSuggestions = useMemo(() => {
    if (careerSuggestions?.length) return careerSuggestions;
    const sorted = [...codes].sort(
      (a, b) =>
        toNum(effectiveNorm[b] ?? traits?.[b]?.percentage, 0) -
        toNum(effectiveNorm[a] ?? traits?.[a]?.percentage, 0)
    );
    const top = sorted.slice(0, 3);
    const pool = new Set();
    top.forEach((k) => toList(traits[k]?.careers).forEach((c) => pool.add(c)));
    return Array.from(pool);
  }, [careerSuggestions, codes, effectiveNorm, traits]);

  /* =========================================================================
     اکشن‌ها (دانلود، CSV، چاپ)
  ========================================================================= */
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
        effectiveNorm?.[k] ?? traits?.[k]?.percentage ?? "",
      ]);
    });
    const csvBody = rows.map((r) => r.join(",")).join("\n");
    const csv = "\uFEFF" + csvBody; // BOM برای Excel
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

  /* =========================================================================
     حالت دیباگ
  ========================================================================= */
  const debugOn =
    debug ||
    (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1");

  /* =========================================================================
     رندر
  ========================================================================= */
  const hasNumeric = Object.keys(effectiveNorm).length > 0;

  return (
    <section className="holland-analysis-container card" ref={containerRef} dir="rtl" aria-label="تحلیل هالند (RIASEC)">
      <header className="hol-head">
        <div>
          <h2 className="title ignorePrint">تحلیل آزمون هالند (RIASEC)</h2>
        </div>
        <div className="meta muted small" aria-label="اطلاعات کاربر و زمان تحلیل">
          {userInfo?.fullName ? `کاربر: ${userInfo.fullName} • ` : null}
          زمان تحلیل: {dateFa}
        </div>
        <div className="actions">
          <button className="btn outline" onClick={handleExportCSV}>خروجی CSV</button>
          <button className="btn outline" onClick={handleDownloadPNG} disabled={!hasNumeric} aria-disabled={!hasNumeric}>دانلود نمودار</button>
          <button className="btn primary" onClick={handlePrint}>چاپ گزارش</button>
        </div>
      </header>

      {/* خلاصه + بج‌ها */}
      <section className="summary-section">
        {summary && (
          <p className="summary-text ignorePrint" data-testid="summary">
            <strong>خلاصه:</strong> {summary}
          </p>
        )}
        <div className="badges" role="status" aria-live="polite">
          <span className="badge primary">
            کد هالند: <span className="holland-code">{(hollandCode && hollandCode.length >= 2) ? hollandCode : (kpi.code3 || "—")}</span>
          </span>
          {Array.isArray(dominantTraits) && dominantTraits.length > 0 && (
            <span className="badge info">ابعاد غالب: {dominantTraits.map(getName).join("، ")}</span>
          )}
        </div>
      </section>

      {/* KPI ها */}
      <section className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">قوی‌ترین بُعد</div>
          <div className="kpi-value" data-testid="kpi-top">
            {kpi.top ? `${getName(kpi.top.key)} (${fmtPct(kpi.top.val)})` : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">ضعیف‌ترین بُعد</div>
          <div className="kpi-value" data-testid="kpi-bottom">
            {kpi.bottom ? `${getName(kpi.bottom.key)} (${fmtPct(kpi.bottom.val)})` : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">پراکندگی نمرات</div>
          <div className="kpi-value" data-testid="kpi-spread">{kpi.spread || 0} امتیاز</div>
        </div>
      </section>

      {/* جدول نمرات */}
      <section className="scores-section">
        <h3>نمرات خام و نرمال‌شده</h3>
        <div className="table-wrap">
          <table className="scores-table" aria-label="جدول نمرات هالند">
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
                  traits?.[k]?.isDominant ||
                  (Array.isArray(dominantTraits) && dominantTraits.includes(k)) ||
                  ((hollandCode || kpi.code3 || "").includes(k));
                return (
                  <tr key={k} className={isTop ? "top-row" : ""}>
                    <td>{k}</td>
                    <td>{getName(k)}</td>
                    <td>{rawScores?.[k] ?? traits?.[k]?.score ?? "—"}</td>
                    <td>{fmtPct(effectiveNorm?.[k] ?? traits?.[k]?.percentage)}</td>
                  </tr>
                );
              })}
              {codes.length === 0 && (
                <tr>
                  <td colSpan="4" className="muted">داده‌ای ثبت نشده است.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* توضیحات ویژگی‌ها */}
      <section className="traits-details-section ignorePrint">
        <h3>توضیحات ویژگی‌ها</h3>
        <div className="traits-list">
          {codes.map((k) => {
            const t = traits?.[k] || { name: getName(k) };
            const isTop =
              t?.isDominant ||
              (Array.isArray(dominantTraits) && dominantTraits.includes(k)) ||
              ((hollandCode || kpi.code3 || "").includes(k));
            const careers = toList(t?.careers);
            return (
              <article className={`trait-card ${isTop ? "dominant" : ""}`} key={k}>
                <header className="trait-head">
                  <h4>{t.name || getName(k)}</h4>
                  {isTop && <span className="dominant-label">ویژگی غالب</span>}
                </header>
                {t.description && <p className="desc">{t.description}</p>}

                <div className="profile-meta">
                  <div className="meta-item">
                    <strong>نمره:</strong> {t?.score ?? "—"}{" "}
                    {t?.percentage !== undefined && `(${fmtPct(t.percentage)})`}
                  </div>
                </div>

                {careers.length > 0 && (
                  <div className="profile-list">
                    <h5>مشاغل پیشنهادی</h5>
                    <ul className="tags">
                      {careers.map((c, i) => (
                        <li key={i} className="tag">{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* پیشنهادات شغلی (تجمیع‌شده) */}
      <section className="career-suggestions-section ignorePrint">
        <h3>پیشنهادات شغلی</h3>
        {autoCareerSuggestions.length > 0 ? (
          <ul className="career-list">
            {autoCareerSuggestions.map((job, idx) => <li key={idx}>{job}</li>)}
          </ul>
        ) : (
          <p className="muted small">—</p>
        )}
      </section>

      {/* نمودارها */}
      <section className="chart-section">
        <div className="segmented" role="tablist" aria-label="انتخاب نوع نمودار">
          <button
            className={`seg-btn ${mode === "bar" ? "active" : ""}`}
            onClick={() => setMode("bar")}
            role="tab"
            aria-selected={mode === "bar"}
          >
            میله‌ای
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

        {/* اگر داده‌ی عددی نداریم، نمودار را نشان نده و هشدار بده */}
        {hasNumeric ? (
          <div className="chart-wrap" ref={HollandchartWrapRef} aria-live="polite" data-testid="chart">
            {(mode === "bar" || mode === "compare") && <Bar ref={barRef} data={barData} options={barOptions} />}
            {mode === "radar" && <Radar ref={radarRef} data={radarData} options={radarOptions} />}
          </div>
        ) : (
          <p className="muted small" role="note">
            دادهٔ عددی کافی برای رسم نمودار موجود نیست؛ لطفاً نرمال‌سازی پاسخ‌ها را بررسی کنید.
          </p>
        )}

        <p className="muted small">راهنما: مقیاس نمودارها نرمال‌شده (۰ تا ۱۰۰) است.</p>

        <div className="actions footer-actions">
          <button className="btn outline" onClick={handleDownloadPNG} disabled={!hasNumeric} aria-disabled={!hasNumeric}>
            دانلود نمودار
          </button>
          <button className="btn primary" onClick={handlePrint}>
            چاپ گزارش
          </button>
        </div>

        {debugOn && (
          <pre className="debug-box" dir="ltr">
{JSON.stringify(
  {
    hollandCode,
    dominantTraits,
    labels,
    userVals,
    benchVals,
    hasEffectiveNorm: Object.keys(effectiveNorm).length > 0,
    hasChartDataProp: !!chartData,
    traitsKeys: Object.keys(traits || {}),
    normalizedScoresProp: normalizedScoresProp,
    effectiveNorm,
  },
  null,
  2
)}
          </pre>
        )}
      </section>
    </section>
  );
};

/* =============================================================================
   PropTypes
============================================================================= */
HollandAnalysis.propTypes = {
  data: PropTypes.shape({
    hollandCode: PropTypes.string,
    dominantTraits: PropTypes.arrayOf(PropTypes.string),
    rawScores: PropTypes.object,
    normalizedScores: PropTypes.object,
    traits: PropTypes.object,
    careerSuggestions: PropTypes.arrayOf(PropTypes.string),
    chartData: PropTypes.object,
    summary: PropTypes.string,
    analyzedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
    userInfo: PropTypes.shape({
      fullName: PropTypes.string,
    }),
  }),
  benchmark: PropTypes.shape({
    label: PropTypes.string,
    normalizedScores: PropTypes.object,
  }),
  debug: PropTypes.bool,
};

export default HollandAnalysis;
