// GardnerAnalysis.jsx
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

const DEFAULT_ORDER = ["L", "M", "S", "B", "Mu", "I", "In", "N"];
const DEFAULT_NAMES = {
  L: "کلامی-زبانی",
  M: "منطقی-ریاضی",
  S: "فضایی/دیداری",
  B: "بدنی-جنبشی",
  Mu: "موسیقایی",
  I: "میان‌فردی",
  In: "درون‌فردی",
  N: "طبیعت‌گرا",
};

const toNum = (v, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};
const fmtPct = (v) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? "—" : `${Math.round(Number(v))}%`;
const toList = (val) =>
  Array.isArray(val)
    ? val
    : val
    ? String(val)
        .split(/[،,•|-]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

// ــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
// برداشت امنِ درصدها:
// 1) data.dataForUI.normalizedScores  ← اولویت اصلی
// 2) data.normalizedScores            ← اگر 1 نبود یا صفر بود
// 3) intelligenceProfiles[code].percentage
// 4) اگر هیچ‌کدوم نبود، از chartData استفاده نمی‌کنیم و 0 می‌ذاریم
// نکته: بعضی وقت‌ها normalized در ریشه خامه (مثلاً 37، 44، ...). اگر دیدیم max>100 یا max<=50
// و هم‌زمان dataForUI.normalizedScores موجود و معتبره، همان dataForUI را می‌گیریم.
// ــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
function pickNormalizedScores(data) {
  const fromUI = data?.dataForUI?.normalizedScores || null;
  const fromRoot = data?.normalizedScores || null;
  const fromProfiles = data?.intelligenceProfiles || data?.dataForUI?.intelligenceProfiles || null;

  const isAllZero = (obj) =>
    obj && Object.keys(obj).length > 0 && Object.values(obj).every((v) => Number(v) === 0);

  const looksLikePercent = (obj) => {
    if (!obj || !Object.keys(obj).length) return false;
    const vals = Object.values(obj).map((x) => Number(x)).filter((x) => Number.isFinite(x));
    if (!vals.length) return false;
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    // درصد منطقی: داخل [0..100] و حداقل یکی غیرصفر
    return max <= 100 && max >= 1 && min >= 0;
  };

  // 1) اگر UI موجود و به نظر درصد است → همین
  if (fromUI && looksLikePercent(fromUI)) return { ...fromUI };

  // 2) اگر ریشه به نظر درصد است → همین
  if (fromRoot && looksLikePercent(fromRoot)) return { ...fromRoot };

  // 3) اگر ریشه صفر یا خام باشد ولی پروفایل‌ها درصد دارند → از پروفایل‌ها
  if (fromProfiles) {
    const map = {};
    Object.keys(fromProfiles).forEach((k) => {
      const p = fromProfiles[k];
      if (typeof p?.percentage === "number") map[k] = p.percentage;
    });
    if (Object.keys(map).length) return map;
  }

  // 4) fallback: اگر ریشه صفر کامل بود ولی UI صفر نیست (یا برعکس)، یکی را انتخاب کن
  if (fromRoot && !isAllZero(fromRoot)) return { ...fromRoot };
  if (fromUI && !isAllZero(fromUI)) return { ...fromUI };

  // تهِFallback
  return {};
}

const GardnerAnalysis = ({ data = {}, benchmark = null, debug = false }) => {
  // اگر دیتایی نیست
  const hasPayload =
    !!data &&
    (data.normalizedScores ||
      data.rawScores ||
      data.intelligenceProfiles ||
      data?.dataForUI?.normalizedScores ||
      data?.dataForUI?.intelligenceProfiles);
  if (!hasPayload) return <p className="muted" dir="rtl">داده‌ای برای نمایش موجود نیست.</p>;

  const {
    topIntelligences = data?.dataForUI?.topIntelligences || [],
    primaryIntelligence = data?.dataForUI?.primaryIntelligence,
    rawScores = data?.rawScores || data?.dataForUI?.rawScores || {},
    intelligenceProfiles =
      data?.intelligenceProfiles || data?.dataForUI?.intelligenceProfiles || {},
    developmentSuggestions = data?.developmentSuggestions || [],
    summary = data?.summary || data?.dataForUI?.summary,
    analyzedAt = data?.analyzedAt || data?.dataForUI?.analyzedAt,
    userInfo = data?.userInfo || {},
  } = data;

  // chartData را هم از data، هم از dataForUI چک کن
  const incomingChartData = data?.chartData || data?.dataForUI?.chartData || null;

  const normalizedMap = useMemo(() => pickNormalizedScores(data), [data]);

  const containerRef = useRef(null);
  const barRef = useRef(null);
  const radarRef = useRef(null);
  const [mode, setMode] = useState(benchmark ? "compare" : "bar");

    /* ✅ NEW: keep a solid chart container height so Chart.js can measure */
    const GardchartWrapRef = useRef(null);

    // ✅ ارتفاع قطعی برای ظرف نمودار + تحریک resize پس از mount/تعویض مود
  useEffect(() => {
    const el = GardchartWrapRef.current;
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

  useEffect(() => {
    const root = document.documentElement;
    const obs = new MutationObserver(() => {});
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // کدها: union + سورت پایدار
  const codes = useMemo(() => {
    const set = new Set([
      ...DEFAULT_ORDER,
      ...Object.keys(normalizedMap || {}),
      ...Object.keys(intelligenceProfiles || {}),
      ...Object.keys(rawScores || {}),
      ...(benchmark ? Object.keys(benchmark.normalizedScores || {}) : []),
    ]);
    const arr = Array.from(set);

    arr.sort((a, b) => {
      const dv = (toNum(normalizedMap[b], 0) - toNum(normalizedMap[a], 0)) || 0;
      if (dv !== 0) return dv;
      const na = intelligenceProfiles[a]?.name || DEFAULT_NAMES[a] || a;
      const nb = intelligenceProfiles[b]?.name || DEFAULT_NAMES[b] || b;
      return String(na).localeCompare(String(nb), "fa");
    });
    return arr;
  }, [normalizedMap, intelligenceProfiles, rawScores, benchmark]);

  const getName = useCallback(
    (code) => intelligenceProfiles?.[code]?.name || DEFAULT_NAMES[code] || code,
    [intelligenceProfiles]
  );

  // KPI
  const kpi = useMemo(() => {
    const entries = codes.map((k) => ({ key: k, val: toNum(normalizedMap[k], 0) }));
    if (!entries.length) return { max: null, min: null, spread: 0, balance: "—" };
    const sorted = [...entries].sort((a, b) => b.val - a.val);
    const max = sorted[0];
    const min = sorted[sorted.length - 1];
    const spread = Math.round(max.val - min.val);
    const variance = entries.reduce((s, e) => s + Math.pow(e.val - 50, 2), 0) / entries.length;
    const balance = variance < 400 ? "متعادل" : variance < 900 ? "نیمه‌متعادل" : "متخصص/نامتعادل";
    return { max, min, spread, balance };
  }, [codes, normalizedMap]);

  // داده نمودارها
  const labels = useMemo(() => codes.map(getName), [codes, getName]);
  const userVals = useMemo(() => codes.map((k) => toNum(normalizedMap[k], 0)), [codes, normalizedMap]);
  const benchVals = useMemo(
    () => codes.map((k) => toNum(benchmark?.normalizedScores?.[k], 0)),
    [codes, benchmark]
  );

  const barData = useMemo(() => {
    if (incomingChartData) return incomingChartData;
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
  }, [incomingChartData, labels, userVals, benchVals, mode, benchmark, userInfo]);

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
        normalizedMap?.[code] ?? intelligenceProfiles?.[code]?.percentage ?? "",
      ]);
    });
    const csvBody = rows.map((r) => r.join(",")).join("\n");
    const csv = "\uFEFF" + csvBody; // BOM برای Excel
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

  const debugOn =
    debug ||
    (typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("debug") === "1");

  return (
    <section
      className="gardner-analysis-container card"
      ref={containerRef}
      dir="rtl"
      aria-label="تحلیل هوش‌های چندگانه گاردنر"
    >
      <header className="ga-head">
        <div>
          <h2 className="title ignorePrint">تحلیل هوش‌های چندگانه گاردنر</h2>
        </div>
        <div className="meta muted small" aria-label="اطلاعات کاربر و زمان تحلیل">
          {/* {userInfo?.fullName ? `کاربر: ${userInfo.fullName} • ` : null} */}
          زمان تحلیل: {dateFa}
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
          <p className="summary-text" data-testid="summary">
            <strong>خلاصه:</strong> {summary}
          </p>
        )}
        <div className="badges" role="status" aria-live="polite">
          {primaryIntelligence && (
            <span className="badge primary">هوش اصلی: {getName(primaryIntelligence)}</span>
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
          <div className="kpi-value" data-testid="kpi-max">
            {kpi.max ? `${getName(kpi.max.key)} (${fmtPct(kpi.max.val)})` : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">ضعیف‌ترین هوش</div>
          <div className="kpi-value" data-testid="kpi-min">
            {kpi.min ? `${getName(kpi.min.key)} (${fmtPct(kpi.min.val)})` : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">پراکندگی نمرات</div>
          <div className="kpi-value" data-testid="kpi-spread">
            {kpi.spread || 0} امتیاز
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">تعادل کلی</div>
          <div className="kpi-value" data-testid="kpi-balance">
            {kpi.balance}
          </div>
        </div>
      </section>

      {/* Scores table */}
      <section className="scores-section">
        <h3>نمرات خام و نرمال‌شده</h3>
        <div className="table-wrap">
          <table className="scores-table" aria-label="جدول نمرات گاردنر">
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
                    <td>{fmtPct(normalizedMap?.[code] ?? prof?.percentage)}</td>
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
      <section className="profiles-section ignorePrint">
        <h3>توضیحات هوش‌ها</h3>
        <div className="profiles-list">
          {codes.map((code) => {
            const p = intelligenceProfiles?.[code] || { name: getName(code) };
            const isTop =
              p?.isTop || topIntelligences?.includes?.(code) || primaryIntelligence === code;
            const chars = toList(p?.characteristics);
            const careers = toList(p?.careers);
            const suggestions =
              developmentSuggestions.find((d) => d.intelligence === code)?.suggestions || [];

            return (
              <article className={`profile-card ${isTop ? "top" : ""}`} key={code}>
                <header className="profile-head">
                  <h4>{p.name}</h4>
                  {isTop && <span className="top-label">هوش برتر</span>}
                </header>

                {p.englishName && (
                  <p className="muted small">
                    <strong>نام انگلیسی:</strong> {p.englishName}
                  </p>
                )}

                {p.description && <p className="desc">{p.description}</p>}

                <div className="profile-meta">
                  <div className="meta-item">
                    <strong>نمره:</strong> {p?.score ?? "—"}{" "}
                    {p?.percentage !== undefined && `(${fmtPct(p.percentage)})`}
                  </div>
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

        <div className="chart-wrap" ref={GardchartWrapRef} data-testid="chart">
          {(mode === "bar" || mode === "compare") && (
            <Bar ref={barRef} data={barData} options={barOptions} />
          )}
          {mode === "radar" && <Radar ref={radarRef} data={radarData} options={radarOptions} />}
        </div>

        <p className="muted small">راهنما: مقیاس نمودارها نرمال‌شده (۰ تا ۱۰۰) است.</p>

        {debugOn && (
          <pre className="debug-box" dir="ltr">
            {JSON.stringify(
              {
                hasUI: !!data?.dataForUI,
                pickedFromUI: !!data?.dataForUI?.normalizedScores,
                pickedFromRoot: !!data?.normalizedScores,
                codes,
                topIntelligences,
                primaryIntelligence,
                normalizedMap,
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

GardnerAnalysis.propTypes = {
  data: PropTypes.shape({
    topIntelligences: PropTypes.arrayOf(PropTypes.string),
    primaryIntelligence: PropTypes.string,
    rawScores: PropTypes.object,
    normalizedScores: PropTypes.object,
    intelligenceProfiles: PropTypes.object,
    developmentSuggestions: PropTypes.arrayOf(
      PropTypes.shape({
        intelligence: PropTypes.string.isRequired,
        suggestions: PropTypes.arrayOf(PropTypes.string).isRequired,
      })
    ),
    chartData: PropTypes.object,
    summary: PropTypes.string,
    analyzedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
    userInfo: PropTypes.shape({ fullName: PropTypes.string }),
    dataForUI: PropTypes.shape({
      normalizedScores: PropTypes.object,
      intelligenceProfiles: PropTypes.object,
      rawScores: PropTypes.object,
      chartData: PropTypes.object,
      topIntelligences: PropTypes.arrayOf(PropTypes.string),
      primaryIntelligence: PropTypes.string,
      summary: PropTypes.string,
      analyzedAt: PropTypes.string,
    }),
  }),
  benchmark: PropTypes.shape({
    label: PropTypes.string,
    normalizedScores: PropTypes.object,
  }),
  debug: PropTypes.bool,
};

export default GardnerAnalysis;
