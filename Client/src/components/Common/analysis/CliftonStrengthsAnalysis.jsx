// CliftonStrengthsAnalysis.jsx
import React, { useMemo, useRef, useState, useEffect  } from "react";
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

/* -----------------------------
 * Dictionaries & Mappings (FA)
 * ----------------------------- */
const DOMAIN_FA = {
  Executing: "اجرایی",
  Influencing: "تأثیرگذاری",
  Relationship: "رابطه‌سازی",
  Strategic: "تفکر راهبردی",
  Other: "سایر",
};

const THEME_META = {
  Achiever: { fa: "موفقیت‌جو", domain: "Executing" },
  Activator: { fa: "فعال‌کننده", domain: "Influencing" },
  Adaptability: { fa: "سازگاری", domain: "Relationship" },
  Analytical: { fa: "تحلیلی", domain: "Strategic" },
  Arranger: { fa: "تنظیم‌کننده", domain: "Executing" },
  Belief: { fa: "باور", domain: "Executing" },
  Command: { fa: "فرماندهی", domain: "Influencing" },
  Communication: { fa: "ارتباط", domain: "Influencing" },
  Competition: { fa: "رقابت", domain: "Influencing" },
  Connectedness: { fa: "پیوندگرا", domain: "Relationship" },
  Consistency: { fa: "ثبات/یکنواختی", domain: "Executing" },
  Context: { fa: "زمینه‌گرا", domain: "Strategic" },
  Deliberative: { fa: "خردمند/دوراندیش", domain: "Executing" },
  Developer: { fa: "توسعه‌دهنده", domain: "Relationship" },
  Empathy: { fa: "همدلی", domain: "Relationship" },
  Focus: { fa: "تمرکز", domain: "Executing" },
  Futuristic: { fa: "آینده‌گرا", domain: "Strategic" },
  Harmony: { fa: "هماهنگی", domain: "Relationship" },
  Ideation: { fa: "ایده‌پردازی", domain: "Strategic" },
  Includer: { fa: "فراگیر/شامل‌گر", domain: "Relationship" },
  Individualization: { fa: "فردی‌سازی", domain: "Relationship" },
  Input: { fa: "ورودی/اطلاعات‌جو", domain: "Strategic" },
  Intellection: { fa: "اندیشمند", domain: "Strategic" },
  Learner: { fa: "یادگیرنده", domain: "Strategic" },
  Maximizer: { fa: "حداکثرکننده", domain: "Influencing" },
  Positivity: { fa: "مثبت‌اندیش", domain: "Relationship" },
  Relator: { fa: "رابطه‌گر", domain: "Relationship" },
  Responsibility: { fa: "مسئولیت‌پذیری", domain: "Executing" },
  Restorative: { fa: "ترمیم‌بخش", domain: "Executing" },
  SelfAssurance: { fa: "اعتمادبه‌نفس", domain: "Influencing" },
  Significance: { fa: "اهمیت/اعتبار", domain: "Influencing" },
  Strategic: { fa: "استراتژیک", domain: "Strategic" },
  Woo: { fa: "دوست‌یاب (WOO)", domain: "Influencing" },
};

const ALIASES = {
  ارتباط: "Communication",
  اعتماد_به_نفس: "SelfAssurance",
  "اعتمادبه‌نفس": "SelfAssurance",
  "حداکثرکننده": "Maximizer",
  "ترمیم‌بخش": "Restorative",
  "فردی‌سازی": "Individualization",
  "مسئولیت": "Responsibility",
  "مسئولیت‌پذیری": "Responsibility",
  "ورودی": "Input",
  "اندیشمند": "Intellection",
  "ایده‌پردازی": "Ideation",
  "مثبت‌اندیش": "Positivity",
  "رابطه‌گر": "Relator",
  "هماهنگی": "Harmony",
  "آینده‌گرا": "Futuristic",
  "زمینه‌گرا": "Context",
  "تحلیلی": "Analytical",
  "تنظیم‌کننده": "Arranger",
  "فعال‌کننده": "Activator",
  "فرماندهی": "Command",
  "رقابت": "Competition",
  "پیوندگرا": "Connectedness",
  "ثبات": "Consistency",
  "خرد": "Deliberative",
  "توسعه‌دهنده": "Developer",
  "همدلی": "Empathy",
  "تمرکز": "Focus",
  "یادگیرنده": "Learner",
  "فراگیری": "Includer",
  "فراگیر": "Includer",
  "اهمیت": "Significance",
  "استراتژیک": "Strategic",
  "وای": "Woo",
  "خوشحال": "Positivity",
};

/* -----------------------------
 * Utility (safe UI)
 * ----------------------------- */
const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clampPct = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));

function normalizeTo100(map = {}) {
  const vals = Object.values(map).map(toNum);
  if (!vals.length) return {};
  const max = Math.max(...vals);
  if (max <= 10) {
    const scale = max > 0 ? 100 / max : 0;
    return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, clampPct(toNum(v) * scale)]));
  }
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, clampPct(v)]));
}

function normalizeThemeKey(key = "") {
  if (!key) return key;
  if (ALIASES[key]) return ALIASES[key];
  const k = String(key).replace(/\s+/g, "").replace(/_/g, "");
  const found = Object.entries(ALIASES).find(([fa]) => fa.replace(/\s+/g, "") === k);
  return found ? found[1] : key;
}

function remapKeys(obj = {}) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[normalizeThemeKey(k)] = v;
  return out;
}

function buildThemeDetails(allKeys = [], rawScores = {}, normalized = {}) {
  return allKeys.map((key) => {
    const meta = THEME_META[key] || { fa: key, domain: "Other" };
    return {
      theme: key,
      name: meta.fa || key,
      domain: meta.domain || "Other",
      score: toNum(rawScores[key]),
      percentage: toNum(normalized[key]),
    };
  });
}

const listify = (val) =>
  Array.isArray(val)
    ? val
    : val
    ? String(val)
        .split(/[،,•|-]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

/* -----------------------------
 * Component
 * ----------------------------- */
const CliftonStrengthsAnalysis = ({
  data,
  benchmark,
  defaultMode = "bar", // 'bar' | 'radarDomains' | 'compare'
  showExports = true,
  showPrint = true,
  showSummary = true,
  showDetails = true,
  showRawColumn = false, // NOTE: default false per your “hide raw in reports” preference
}) => {
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
  const [mode, setMode] = useState(benchmark ? "compare" : defaultMode);

  const ClifchartWrapRef = useRef(null);


  const dateFa = analyzedAt
    ? new Date(analyzedAt).toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  // Normalize keys/data
  const rawByKey = useMemo(() => remapKeys(rawScores), [rawScores]);
  const normByKeyRaw = useMemo(() => remapKeys(normalizedScores), [normalizedScores]);
  const normByKey = useMemo(() => normalizeTo100(normByKeyRaw), [normByKeyRaw]);

  const detailsFromProp = useMemo(() => {
    return (themeDetails || []).map((t) => {
      const key = normalizeThemeKey(t.theme);
      const meta = THEME_META[key] || { fa: t.name || key, domain: t.domain || "Other" };
      return {
        theme: key,
        name: t.name || meta.fa || key,
        domain: t.domain || meta.domain || "Other",
        score: toNum(t.score ?? rawByKey[key]),
        percentage: toNum(t.percentage ?? normByKey[key]),
        description: t.description,
        characteristics: t.characteristics,
        isTop: !!t.isTop,
      };
    });
  }, [themeDetails, rawByKey, normByKey]);

  const allKeys = useMemo(() => {
    const set = new Set([
      ...Object.keys(rawByKey),
      ...Object.keys(normByKey),
      ...detailsFromProp.map((d) => d.theme),
      ...(benchmark ? Object.keys(remapKeys(benchmark.normalizedScores || {})) : []),
    ]);
    return Array.from(set);
  }, [rawByKey, normByKey, detailsFromProp, benchmark]);

  const details = useMemo(() => {
    if (detailsFromProp.length) return detailsFromProp;
    return buildThemeDetails(allKeys, rawByKey, normByKey);
  }, [detailsFromProp, allKeys, rawByKey, normByKey]);

  const finalNorm = useMemo(() => {
    const out = { ...normByKey };
    details.forEach((d) => {
      if (typeof d.percentage === "number") out[d.theme] = clampPct(d.percentage);
    });
    return out;
  }, [normByKey, details]);

  const orderedThemes = useMemo(() => {
    const arr = [...allKeys];
    arr.sort((a, b) => (finalNorm[b] || 0) - (finalNorm[a] || 0));
    return arr;
  }, [allKeys, finalNorm]);

  const getName = (key) => THEME_META[key]?.fa || details.find((d) => d.theme === key)?.name || key;
  const getDomain = (key) => THEME_META[key]?.domain || details.find((d) => d.theme === key)?.domain || "Other";
  const fmtPct = (v) => (v == null || Number.isNaN(Number(v)) ? "—" : `${Math.round(Number(v))}%`);

  // KPI
  const kpi = useMemo(() => {
    const entries = orderedThemes.map((k) => ({ key: k, val: toNum(finalNorm[k]) }));
    if (!entries.length) return { max: null, min: null, spread: 0, topDomain: "—" };
    const sorted = [...entries].sort((a, b) => b.val - a.val);
    const max = sorted[0];
    const min = sorted[sorted.length - 1];
    const spread = Math.round(max.val - min.val);
    const domainAcc = {};
    for (const k of orderedThemes) {
      const d = getDomain(k);
      domainAcc[d] = (domainAcc[d] || 0) + (finalNorm[k] || 0);
    }
    const topDomain = Object.entries(domainAcc).sort((a, b) => b[1] - a[1])[0]?.[0] || "Other";
    return { max, min, spread, topDomain };
  }, [orderedThemes, finalNorm]);

  
  // ✅ ارتفاع قطعی برای ظرف نمودار + تحریک resize پس از mount/تعویض مود
  useEffect(() => {
    const el = ClifchartWrapRef.current;
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

  
  // Charts
  const labels = useMemo(() => orderedThemes.map(getName), [orderedThemes]);
  const userValues = useMemo(() => orderedThemes.map((k) => toNum(finalNorm[k])), [orderedThemes, finalNorm]);

  const benchMap = useMemo(
    () => (benchmark?.normalizedScores ? normalizeTo100(remapKeys(benchmark.normalizedScores)) : null),
    [benchmark]
  );
  const benchValues = useMemo(
    () => orderedThemes.map((k) => toNum(benchMap?.[k])), [orderedThemes, benchMap]
  );

  const colorPrimary = "#2563eb";
  const colorPrimaryBg = "rgba(37,99,235,.65)";
  const colorNeutral = "rgba(148,163,184,.65)";
  const colorNeutralBg = "rgba(148,163,184,.35)";
  const axisColor = "rgba(2,6,23,.75)";
  const gridColor = "rgba(148,163,184,.25)";
  const tooltipBg = "#fff";
  const tooltipBorder = "#e5e7eb";
  const textColor = "#0f172a";

  const barData = useMemo(() => {
    if (chartData) return chartData;
    const datasets = [
      {
        label: userInfo?.fullName ? `پروفایل ${userInfo.fullName}` : "پروفایل فردی",
        data: userValues,
        backgroundColor: colorPrimaryBg,
        borderColor: colorPrimary,
        borderWidth: 1,
        borderRadius: 8,
        barPercentage: 0.8,
        categoryPercentage: 0.9,
      },
    ];
    if (mode === "compare" && benchMap) {
      datasets.push({
        label: benchmark?.label || "میانگین گروه",
        data: benchValues,
        backgroundColor: colorNeutralBg,
        borderColor: colorNeutral,
        borderWidth: 1,
        borderRadius: 8,
        barPercentage: 0.8,
        categoryPercentage: 0.9,
      });
    }
    return { labels, datasets };
  }, [chartData, labels, userValues, benchValues, mode, benchMap, benchmark, userInfo]);

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
    []
  );

  const domainKeys = ["Executing", "Influencing", "Relationship", "Strategic", "Other"];
  const radarLabels = domainKeys.map((k) => DOMAIN_FA[k]);

  const userDomainVals = useMemo(() => {
    const acc = Object.fromEntries(domainKeys.map((k) => [k, 0]));
    const cnt = Object.fromEntries(domainKeys.map((k) => [k, 0]));
    for (const th of orderedThemes) {
      const d = getDomain(th);
      acc[d] += toNum(finalNorm[th]);
      cnt[d] += 1;
    }
    return domainKeys.map((d) => (cnt[d] ? Math.round(acc[d] / cnt[d]) : 0));
  }, [orderedThemes, finalNorm]);

  const benchDomainVals = useMemo(() => {
    if (!benchMap) return domainKeys.map(() => 0);
    const acc = Object.fromEntries(domainKeys.map((k) => [k, 0]));
    const cnt = Object.fromEntries(domainKeys.map((k) => [k, 0]));
    for (const th of orderedThemes) {
      const d = getDomain(th);
      acc[d] += toNum(benchMap[th]);
      cnt[d] += 1;
    }
    return domainKeys.map((d) => (cnt[d] ? Math.round(acc[d] / cnt[d]) : 0));
  }, [orderedThemes, benchMap]);

  const radarData = useMemo(
    () => ({
      labels: radarLabels,
      maintainAspectRatio: false, // ✅ same here
      datasets: [
        {
          label: userInfo?.fullName ? `پروفایل ${userInfo.fullName}` : "پروفایل فردی",
          data: userDomainVals,
          backgroundColor: "rgba(37,99,235,.18)",
          borderColor: colorPrimary,
          pointBackgroundColor: colorPrimary,
          pointBorderColor: "#fff",
          fill: true,
        },
        ...(mode === "compare" && benchMap
          ? [
              {
                label: benchmark?.label || "میانگین گروه",
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
    [radarLabels, userDomainVals, benchDomainVals, userInfo, mode, benchMap, benchmark]
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
    []
  );

  // Actions
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
    const rows = [["themeKey", "themeNameFa", "domainFa", ...(showRawColumn ? ["rawScore"] : []), "normalized(%)"]];
    orderedThemes.forEach((k) => {
      rows.push([
        k,
        (getName(k) || "").replace(/,/g, "،"),
        DOMAIN_FA[getDomain(k)] || getDomain(k),
        ...(showRawColumn ? [rawByKey?.[k] ?? ""] : []),
        finalNorm?.[k] ?? "",
      ]);
    });
    const csvBody = rows.map((r) => r.join(",")).join("\n");
    const csv = "\uFEFF" + csvBody;
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

  const handlePrint = () => {
    if (!containerRef.current) return;
    const html = containerRef.current.innerHTML;
    const win = window.open("", "", "width=1024,height=720");
    if (!win) return;
    const css = `
      @page { size: A4; margin: 14mm; }
      body { direction: rtl; font-family: -apple-system, Segoe UI, Roboto, "Vazirmatn", Arial, sans-serif; color: #111; }
      .muted { color: #555; }
      table { width:100%; border-collapse: collapse; font-size: 11pt; }
      th, td { border:1px solid #e5e7eb; padding:8px; text-align:center; }
      thead th { background: rgba(37,99,235,.08); }
      .top-theme-row { background: rgba(245,158,11,.12); }
    `;
    win.document.write(`
      <html lang="fa" dir="rtl">
        <head><meta charset="UTF-8"/><title>گزارش نقاط قوت کلیفتون</title><style>${css}</style></head>
        <body>${html}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  // Suggestions per theme (optional)
  const suggestMap = useMemo(() => {
    const m = new Map();
    (developmentSuggestions || []).forEach((x) => m.set(normalizeThemeKey(x.theme), x.suggestions || []));
    return m;
  }, [developmentSuggestions]);

  return (
    <section className="clifton-container card" ref={containerRef} dir="rtl" aria-label="تحلیل نقاط قوت کلیفتون">
      <header className="clifton-head">
        <div>
          <h2 className="title ignorePrint">تحلیل نقاط قوت کلیفتون</h2>
          <div className="muted small" aria-live="polite">
            {userInfo?.fullName ? `کاربر: ${userInfo.fullName} • ` : null}
            زمان تحلیل: {dateFa}
          </div>
        </div>

        {showExports || showPrint ? (
          <div className="actions">
            {showExports && (
              <>
                <button className="btn outline" onClick={handleExportCSV} aria-label="خروجی CSV">
                  خروجی CSV
                </button>
                <button className="btn outline" onClick={handleDownloadPNG} aria-label="دانلود تصویر نمودار">
                  دانلود نمودار
                </button>
              </>
            )}
            {showPrint && (
              <button className="btn primary" onClick={handlePrint} aria-label="چاپ گزارش">
                چاپ گزارش
              </button>
            )}
          </div>
        ) : null}
      </header>

      {showSummary && (
        <section className="summary-section">
          {summary && <p className="summary-text"><strong>خلاصه:</strong> {summary}</p>}
          <div className="badges">
            {signatureTheme && (
              <span className="badge primary">
                تم اصلی: {THEME_META[normalizeThemeKey(signatureTheme)]?.fa || signatureTheme}
              </span>
            )}
            {!!topThemes.length && (
              <span className="badge info">
                تم‌های برتر: {topThemes.map((k) => THEME_META[normalizeThemeKey(k)]?.fa || k).join("، ")}
              </span>
            )}
          </div>
        </section>
      )}

      <section className="kpi-grid" aria-label="شاخص‌های کلیدی">
        <div className="kpi">
          <div className="kpi-label">قوی‌ترین تم</div>
          <div className="kpi-value">
            {kpi.max ? `${THEME_META[kpi.max.key]?.fa || kpi.max.key} (${fmtPct(kpi.max.val)})` : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">کمترین تم</div>
          <div className="kpi-value">
            {kpi.min ? `${THEME_META[kpi.min.key]?.fa || kpi.min.key} (${fmtPct(kpi.min.val)})` : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">پراکندگی نمرات</div>
          <div className="kpi-value">{kpi.spread || 0} امتیاز</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">دامنه‌ی غالب</div>
          <div className="kpi-value">{DOMAIN_FA[kpi.topDomain] || kpi.topDomain}</div>
        </div>
      </section>

      <section className="scores-section" aria-label="امتیازات تم‌ها">
        <h3>نمرات نرمال‌شده (%) {showRawColumn ? "و نمرات خام" : ""}</h3>
        <div className="table-wrap">
          <table className="scores-table">
            <thead>
              <tr>
                <th>کُد تم</th>
                <th>نام تم</th>
                <th>دامنه</th>
                {showRawColumn && <th>نمره خام</th>}
                <th>نمره نرمال‌شده (%)</th>
              </tr>
            </thead>
            <tbody>
              {orderedThemes.map((k) => {
                const isTop =
                  (topThemes || []).map(normalizeThemeKey).includes(k) ||
                  normalizeThemeKey(signatureTheme) === k;
                return (
                  <tr key={k} className={isTop ? "top-theme-row" : ""}>
                    <td>{k}</td>
                    <td>{THEME_META[k]?.fa || k}</td>
                    <td>{DOMAIN_FA[getDomain(k)] || getDomain(k)}</td>
                    {showRawColumn && <td>{rawByKey?.[k] ?? "—"}</td>}
                    <td>{fmtPct(finalNorm?.[k])}</td>
                  </tr>
                );
              })}
              {!orderedThemes.length && (
                <tr><td colSpan={showRawColumn ? 5 : 4} className="muted">داده‌ای ثبت نشده است.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showDetails && (
        <section className="details-section ignorePrint">
          <h3>توضیحات تم‌ها</h3>
          <div className="themes-list">
            {orderedThemes.map((key) => {
              const meta = THEME_META[key] || { fa: key, domain: "Other" };
              const det = details.find((d) => d.theme === key) || { name: meta.fa, domain: meta.domain };
              const isTop =
                (topThemes || []).map(normalizeThemeKey).includes(key) ||
                normalizeThemeKey(signatureTheme) === key;
              const chars = listify(det?.characteristics);
              const sugg = listify( (developmentSuggestions || [])
                  .find((x) => normalizeThemeKey(x.theme) === key)?.suggestions );

              return (
                <article className={`theme-card ${isTop ? "top" : ""}`} key={key}>
                  <header className="theme-head">
                    <h4>{det.name || meta.fa || key}</h4>
                    {isTop && <span className="top-label">تم برتر</span>}
                  </header>

                  {det.description && <p className="desc">{det.description}</p>}

                  <div className="theme-meta">
                    <div className="meta-item">
                      <strong>دامنه:</strong> {DOMAIN_FA[det.domain] || det.domain}
                    </div>
                    <div className="meta-item">
                      <strong>نمره نرمال‌شده:</strong> {fmtPct(finalNorm?.[key])}
                    </div>
                  </div>

                  {!!chars.length && (
                    <div className="theme-list">
                      <h5>ویژگی‌ها</h5>
                      <ul>{chars.map((c, i) => <li key={i}>{c}</li>)}</ul>
                    </div>
                  )}

                  {!!sugg.length && (
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
      )}

      <section className="chart-section" aria-label="نمودارها">
        <div className="segmented" role="tablist" aria-label="انتخاب نوع نمودار">
          <button
            className={`seg-btn ${mode === "bar" ? "active" : ""}`}
            onClick={() => setMode("bar")}
            role="tab"
            aria-selected={mode === "bar"}
          >
            میله‌ای (تم‌ها)
          </button>
          <button
            className={`seg-btn ${mode === "radarDomains" ? "active" : ""}`}
            onClick={() => setMode("radarDomains")}
            role="tab"
            aria-selected={mode === "radarDomains"}
          >
            رادار (دامنه‌ها)
          </button>
          {benchMap && (
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

        <div className="chart-wrap" ref={ClifchartWrapRef} aria-live="polite">
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

CliftonStrengthsAnalysis.propTypes = {
  data: PropTypes.shape({
    topThemes: PropTypes.arrayOf(PropTypes.string),
    signatureTheme: PropTypes.string,
    rawScores: PropTypes.object,
    normalizedScores: PropTypes.object,
    themeDetails: PropTypes.arrayOf(
      PropTypes.shape({
        theme: PropTypes.string.isRequired,
        name: PropTypes.string,
        domain: PropTypes.string,
        score: PropTypes.number,
        percentage: PropTypes.number,
        description: PropTypes.string,
        characteristics: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.string), PropTypes.string]),
        isTop: PropTypes.bool,
      })
    ),
    developmentSuggestions: PropTypes.arrayOf(
      PropTypes.shape({ theme: PropTypes.string.isRequired, suggestions: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.string), PropTypes.string]) })
    ),
    chartData: PropTypes.object,
    summary: PropTypes.string,
    analyzedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
    userInfo: PropTypes.shape({ fullName: PropTypes.string }),
  }),
  benchmark: PropTypes.shape({
    label: PropTypes.string,
    normalizedScores: PropTypes.object,
  }),
  defaultMode: PropTypes.oneOf(["bar", "radarDomains", "compare"]),
  showExports: PropTypes.bool,
  showPrint: PropTypes.bool,
  showSummary: PropTypes.bool,
  showDetails: PropTypes.bool,
  showRawColumn: PropTypes.bool,
};

export default CliftonStrengthsAnalysis;
