import React, { useMemo, useRef, useState,useEffect  } from "react";
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
import "./GHQAnalysis.css";

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
 *     rawScores?: Record<string, number>,
 *     normalizedScores?: Record<string, number>, // 0..100
 *     totalScore?: number,
 *     normalizedTotal?: number, // 0..100
 *     riskLevel?: "Low" | "Moderate" | "High",
 *     traits?: Record<string, { name:string, description?:string, score?:number, percentage?:number }>,
 *     chartData?: any, // optional Chart.js dataset
 *     summary?: string,
 *     analyzedAt?: string | number | Date,
 *     userInfo?: { fullName?: string }
 *   }
 * - benchmark?: { label?: string, normalizedScores: Record<string, number> } // اختیاری برای مقایسه
 */
const GHQAnalysis = ({ data, benchmark }) => {
  if (!data) return <p className="muted" dir="rtl">داده‌ای برای نمایش موجود نیست.</p>;

  const {
    rawScores = {},
    normalizedScores = {},
    totalScore = null,
    normalizedTotal = null,
    riskLevel = "Low",
    traits = {},
    chartData,
    summary,
    analyzedAt,
    userInfo = {},
  } = data || {};

    console.log("incoming Analysis GHQ data: ", data);

  
  const containerRef = useRef(null);
  const barRef = useRef(null);
  const radarRef = useRef(null);

  const [mode, setMode] = useState(benchmark ? "compare" : "bar"); // 'bar' | 'radar' | 'compare'

    /* ✅ NEW: keep a solid chart container height so Chart.js can measure */
    const GHQchartWrapRef = useRef(null);

    // ✅ ارتفاع قطعی برای ظرف نمودار + تحریک resize پس از mount/تعویض مود
  useEffect(() => {
    const el = GHQchartWrapRef.current;
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


  const dateFa = analyzedAt
    ? new Date(analyzedAt).toLocaleDateString("fa-IR", {
        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—";

  // CSS vars for theme-aware charts
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

  const fmtPct = (v) =>
    v === null || v === undefined || Number.isNaN(Number(v))
      ? "—"
      : `${Math.round(Number(v))}%`;

  // پایدارسازی آرایه ابعاد
  const keys = useMemo(() => {
    const set = new Set([
      ...Object.keys(normalizedScores || {}),
      ...Object.keys(rawScores || {}),
      ...Object.keys(traits || {}),
      ...(benchmark ? Object.keys(benchmark.normalizedScores || {}) : []),
    ]);
    const arr = Array.from(set);
    // مرتب‌سازی: نزولی بر اساس نمره نرمال، سپس نام
    arr.sort((a, b) => {
      const dv = (normalizedScores[b] || 0) - (normalizedScores[a] || 0);
      if (dv !== 0) return dv;
      const na = traits[a]?.name || a;
      const nb = traits[b]?.name || b;
      return String(na).localeCompare(String(nb), "fa");
    });
    return arr;
  }, [normalizedScores, rawScores, traits, benchmark]);

  const labels = useMemo(() => keys.map((k) => traits[k]?.name || k), [keys, traits]);

  const userVals = useMemo(
    () => keys.map((k) => Number(normalizedScores?.[k] ?? traits?.[k]?.percentage ?? 0)),
    [keys, normalizedScores, traits]
  );
  const benchVals = useMemo(
    () => keys.map((k) => Number(benchmark?.normalizedScores?.[k] ?? 0)),
    [keys, benchmark]
  );

  // نمودار میله‌ای (افقی) + مقایسه
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
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${Math.round(ctx.parsed.x)}%`,
          },
        },
      },
    }),
    [axisColor, gridColor, tooltipBg, tooltipBorder, textColor]
  );

  // نمودار رادار
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

  // KPI و آمار
  const kpi = useMemo(() => {
    const entries = keys.map((k) => ({ key: k, val: Number(normalizedScores?.[k] ?? 0) }));
    if (!entries.length) return { max: null, min: null, spread: 0 };
    const sorted = [...entries].sort((a, b) => b.val - a.val);
    const max = sorted[0];
    const min = sorted[sorted.length - 1];
    const spread = Math.round(max.val - min.val);
    return { max, min, spread };
  }, [keys, normalizedScores]);

  // تولید پیشنهادهای رشد (پویا)
  const suggestionLib = {
    Stress: [
      "تنفس دیافراگمی 4-7-8 روزی دو بار",
      "کاهش کافئین و خواب منظم",
      "مدیتیشن مایندفولنس 10 دقیقه‌ای",
    ],
    Mood: ["فعالیت بدنی هوازی 3× در هفته", "قرار گرفتن در نور روز/آفتاب", "ثبت قدردانی روزانه"],
    Function: ["تقسیم کارها به ریزکارهای 25 دقیقه‌ای", "لیست اولویت روزانه", "قانون 2 دقیقه"],
    Social: ["تماس منظم با یک دوست قابل اعتماد", "پیوستن به گروه‌های علاقه‌مندی", "تمرین مهارت نه‌گفتن"],
    Sleep: ["بهداشت خواب (خاموشی صفحه‌ها 1 ساعت قبل)", "ثبات زمان خواب/بیداری", "کاهش چرت طولانی"],
  };

  const developmentSuggestions = useMemo(() => {
    const high = keys.filter((k) => (normalizedScores?.[k] ?? 0) >= 60);
    const packs = high.map((k) => {
      const name = traits?.[k]?.name || k;
      const base =
        suggestionLib[k] ||
        ["پیگیری منظم حال عمومی", "ورزش سبک و ارتباط اجتماعی", "مدیریت زمان و استرس"];
      return { trait: name, suggestions: base };
    });
    if (riskLevel === "High" || riskLevel === "Moderate") {
      packs.push({
        trait: "سلامت کلی",
        suggestions: [
          "مشاوره با روانشناس برای ارزیابی دقیق‌تر",
          "ایجاد روتین‌های کاهش استرس و ثبت روزانه خلق",
          "اتصال به شبکه‌های حمایتی خانواده/دوستان",
        ],
      });
    }
    return packs;
  }, [keys, normalizedScores, riskLevel, traits]);

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
      .high-risk-row { background: rgba(239,68,68,.12); }
      .risk-badge.high { background: #ef4444; color: #fff; }
      .risk-badge.moderate { background: #f59e0b; color: #111; }
      .risk-badge.low { background: #10b981; color: #fff; }
    `;
    const win = window.open("", "", "width=1024,height=720");
    if (!win) return;
    win.document.write(`
      <html>
        <head><meta charset="UTF-8"/><title>گزارش GHQ</title><style>${css}</style></head>
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
    a.download = `ghq_${mode}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportCSV = () => {
    const rows = [["key", "name", "rawScore", "normalized(%)"]];
    keys.forEach((k) => {
      rows.push([
        k,
        (traits?.[k]?.name || k).replace(/,/g, "،"),
        rawScores?.[k] ?? traits?.[k]?.score ?? "",
        normalizedScores?.[k] ?? traits?.[k]?.percentage ?? "",
      ]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ghq_traits_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // کلاس ریسک
  const riskClass =
    riskLevel === "High" ? "high" : riskLevel === "Moderate" ? "moderate" : "low";

  return (
    <section className="ghq-analysis-container card" ref={containerRef} dir="rtl">
      <header className="ghq-head">
        <div>
          <h2 className="title ignorePrint">تحلیل آزمون سلامت عمومی (GHQ)</h2>
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

      {/* خلاصه و نشان ریسک */}
      <section className="summary-section">
        <div className="badges">
          {/* <span className={`risk-badge ${riskClass}`}>
            سطح خطر: {riskLevel === "High" ? "بالا (نیاز به توجه)" : riskLevel === "Moderate" ? "متوسط" : "پایین (خوب)"}
          </span> */}
          <span className={`risk-badge ${riskClass}`}>
            {summary}
          </span>
          {normalizedTotal !== null && (
            <span className="badge info">امتیاز کل نرمال: {fmtPct(normalizedTotal)}</span>
          )}
        </div>
        {/* {summary && (
          <p className="summary-text"><strong>خلاصه:</strong> {summary}</p>
        )} */}
      </section>

      {/* KPI */}
      <section className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">قوی‌ترین بُعد</div>
          <div className="kpi-value">
            {kpi.max ? `${traits[kpi.max.key]?.name || kpi.max.key} (${fmtPct(kpi.max.val)})` : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">ضعیف‌ترین بُعد</div>
          <div className="kpi-value">
            {kpi.min ? `${traits[kpi.min.key]?.name || kpi.min.key} (${fmtPct(kpi.min.val)})` : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">پراکندگی نمرات</div>
          <div className="kpi-value">{kpi.spread || 0} امتیاز</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">امتیاز کل</div>
          <div className="kpi-value">
            {totalScore !== null ? totalScore : "—"} {normalizedTotal !== null && `(${fmtPct(normalizedTotal)})`}
          </div>
        </div>
      </section>

      {/* جدول نمرات */}
      <section className="scores-section">
        <h3>نمرات خام و نرمال‌شده</h3>
        <div className="table-wrap">
          <table className="scores-table">
            <thead>
              <tr>
                <th>کُد</th>
                <th>نام ویژگی</th>
                <th>نمره خام</th>
                <th>نمره نرمال‌شده (%)</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => {
                const high = (normalizedScores?.[k] ?? 0) >= 60;
                return (
                  <tr key={k} className={high ? "high-risk-row" : ""}>
                    <td>{k}</td>
                    <td>{traits[k]?.name || k}</td>
                    <td>{rawScores?.[k] ?? traits[k]?.score ?? "—"}</td>
                    <td>{fmtPct(normalizedScores?.[k] ?? traits[k]?.percentage)}</td>
                  </tr>
                );
              })}
              {keys.length === 0 && (
                <tr><td colSpan="4" className="muted">داده‌ای ثبت نشده است.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* توضیحات ابعاد */}
      <section className="profiles-section ignorePrint">
        <h3>توضیحات ویژگی‌ها</h3>
        <div className="profiles-list">
          {keys.map((k) => {
            const p = traits[k] || { name: k };
            const high = (normalizedScores?.[k] ?? 0) >= 60;
            return (
              <article className={`profile-card ${high ? "high" : ""}`} key={k}>
                <header className="profile-head">
                  <h4>{p.name}</h4>
                  {high && <span className="high-label">نیاز به توجه</span>}
                </header>
                {p.description && <p className="desc">{p.description}</p>}
                <div className="profile-meta">
                  <div className="meta-item">
                    <strong>نمره:</strong> {p?.score ?? "—"} {p?.percentage !== undefined && `(${fmtPct(p.percentage)})`}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* پیشنهادهای رشد */}
      <section className="development-section ignorePrint">
        <h3>پیشنهادات بهبود سلامت روان</h3>
        {developmentSuggestions.length > 0 ? (
          developmentSuggestions.map(({ trait, suggestions }) => (
            <div key={trait} className="development-card">
              <h4>{trait}</h4>
              <ul>
                {suggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          ))
        ) : (
          <p className="muted">نیاز به پیشنهاد خاصی نیست؛ وضعیت کلی مطلوب است.</p>
        )}
      </section>

      {/* نمودارها */}
      <section className="chart-section">
        <div className="segmented">
          <button className={`seg-btn ${mode === "bar" ? "active" : ""}`} onClick={() => setMode("bar")}>میله‌ای</button>
          <button className={`seg-btn ${mode === "radar" ? "active" : ""}`} onClick={() => setMode("radar")}>رادار</button>
          {benchmark && (
            <button className={`seg-btn ${mode === "compare" ? "active" : ""}`} onClick={() => setMode("compare")}>مقایسه با میانگین</button>
          )}
        </div>

        <div className="chart-wrap" ref={GHQchartWrapRef} aria-live="polite">
          {(mode === "bar" || mode === "compare") && (
            <Bar ref={barRef} data={barData} options={barOptions} />
          )}
          {mode === "radar" && (
            <Radar ref={radarRef} data={radarData} options={radarOptions} />
          )}
        </div>
        <p className="muted small">راهنما: مقیاس همه نمودارها نرمال‌شده (۰ تا ۱۰۰) است.</p>
      </section>
    </section>
  );
};

export default GHQAnalysis;
