import React, { useMemo, useRef, useState, useEffect  } from "react";
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
import "./MbtiAnalysis.css";

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
 *     mbtiType: "INTJ" | ...,
 *     typeName?: string,
 *     rawScores?: { [dim in 'EI'|'SN'|'TF'|'JP']?: { [side: string]: number } },
 *     normalizedScores?: { [dim]?: { [side]: number } }, // 0..100
 *     dimensions?: Array<{
 *       dimension: 'EI'|'SN'|'TF'|'JP',
 *       yourSide: string,            // e.g. 'E'
 *       difference?: number,         // abs diff (0..100)
 *       description?: string,
 *       scores?: { [side]: { name: string, description?: string } }
 *     }>,
 *     chartData?: any,               // اختیاری
 *     analyzedAt?: string|number|Date,
 *     summary?: string,
 *     userInfo?: { fullName?: string },
 *     functions?: { dominant?: string, auxiliary?: string, tertiary?: string, inferior?: string } // اختیاری
 *   }
 * - benchmark?: {
 *     label?: string,
 *     normalizedScores: { [dim]: { [side]: number } } // 0..100
 *   }
 */
const MbtiAnalysis = ({ data, benchmark }) => {
  if (!data) return <p className="muted" dir="rtl">داده‌ای برای نمایش موجود نیست.</p>;

  const {
    mbtiType = "—",
    typeName = "",
    rawScores = {},
    normalizedScores = {},
    dimensions = [],
    chartData,
    analyzedAt,
    summary,
    userInfo = {},
    functions,
    dataForUI
  } = data || {};

  console.log("incoming Analysis MBTI data: ", data);
  

  const containerRef = useRef(null);
  const barRef = useRef(null);
  const radarRef = useRef(null);

  const [mode, setMode] = useState(benchmark ? "compare" : "diverging"); // 'diverging' | 'radar' | 'compare'

    /* ✅ NEW: keep a solid chart container height so Chart.js can measure */
    const MbtichartWrapRef = useRef(null);

    // ✅ ارتفاع قطعی برای ظرف نمودار + تحریک resize پس از mount/تعویض مود
  useEffect(() => {
    const el = MbtichartWrapRef.current;
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

  // ⬇️ put this helper inside the component (above handlePrint), or extract it nearby.
const rasterizeForPrint = async (node) => {
  // give Chart.js a tick to paint if needed
  await new Promise(r => requestAnimationFrame(() => r()));
  await new Promise(r => setTimeout(r, 40));

  // clone the subtree we want to print
  const clone = node.cloneNode(true);

  // ---- Canvas → IMG
  const srcCanvases = node.querySelectorAll("canvas");
  const dstCanvases = clone.querySelectorAll("canvas");
  srcCanvases.forEach((c, i) => {
    // skip hidden/zero-size
    const rect = c.getBoundingClientRect();
    if (rect.width < 5 || rect.height < 5) return;
    const img = document.createElement("img");
    img.src = c.toDataURL("image/png");
    img.style.display = "block";
    img.style.width = (c.style.width || rect.width + "px");
    img.style.height = (c.style.height || rect.height + "px");
    dstCanvases[i]?.replaceWith(img);
  });

  // ---- SVG → IMG (in case you ever render Recharts/SVGs here)
  const srcSvgs = node.querySelectorAll("svg");
  const dstSvgs = clone.querySelectorAll("svg");
  srcSvgs.forEach((s, i) => {
    const rect = s.getBoundingClientRect();
    if (rect.width < 5 || rect.height < 5) return;
    const xml = new XMLSerializer().serializeToString(s);
    const b64 = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
    const img = document.createElement("img");
    img.src = b64;
    img.style.display = "block";
    img.style.width = rect.width + "px";
    img.style.height = rect.height + "px";
    dstSvgs[i]?.replaceWith(img);
  });

  return clone;
};


  const dateFa = analyzedAt
    ? new Date(analyzedAt).toLocaleDateString("fa-IR", {
        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—";

  // ===== Theme vars (dark/light aware) =====
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

  // ===== Canonical order & sides =====
  const ORDER = ["EI", "SN", "TF", "JP"];
  const SIDES = {
    EI: ["E", "I"],
    SN: ["S", "N"],
    TF: ["T", "F"],
    JP: ["J", "P"],
  };

  // names for sides from dimensions.scores if available
  const sideName = (dim, side) => {
    const row = dimensions.find((d) => d.dimension === dim);
    return row?.scores?.[side]?.name || side;
  };

  // ===== Stable dims list =====
  const dims = useMemo(() => {
    const set = new Set([
      ...Object.keys(normalizedScores || {}),
      ...Object.keys(rawScores || {}),
      ...dimensions.map((d) => d.dimension),
      ...ORDER,
    ]);
    return ORDER.filter((d) => set.has(d)); // keep canonical order
  }, [normalizedScores, rawScores, dimensions]);

  // ===== Helpers =====
  const getNorm = (dim, side) =>
    Number(normalizedScores?.[dim]?.[side] ?? 0);
  const getRaw = (dim, side) =>
    Number(rawScores?.[dim]?.[side] ?? 0);

  const fmtPct = (v) =>
    v === null || v === undefined || Number.isNaN(Number(v))
      ? "—"
      : `${Math.round(Number(v))}%`;

  // ===== KPI (strongest/weakest preference, balance, per-dim diff) =====
  const differences = useMemo(() => {
    // abs difference per dimension (0..100)
    return dims.map((dim) => {
      const [a, b] = SIDES[dim];
      const diff = Math.abs(getNorm(dim, a) - getNorm(dim, b));
      return { dim, diff, a, b };
    });
  }, [dims, normalizedScores]);

  const strongest = useMemo(() => {
    if (!differences.length) return null;
    return [...differences].sort((x, y) => y.diff - x.diff)[0];
  }, [differences]);

  const weakest = useMemo(() => {
    if (!differences.length) return null;
    return [...differences].sort((x, y) => x.diff - y.diff)[0];
  }, [differences]);

  const balanceTag = useMemo(() => {
    // lower average diff => more balanced
    if (!differences.length) return "—";
    const avg = differences.reduce((s, r) => s + r.diff, 0) / differences.length;
    if (avg < 20) return "متعادل";
    if (avg < 40) return "نیمه‌متعادل";
    return "ترجیحات قوی/غیرمتعادل";
    // (thresholds heuristic)
  }, [differences]);

  // ===== Diverging bar (two-sided) =====
  const divergingLabels = useMemo(
    () => dims.map((dim) => `${sideName(dim, SIDES[dim][0])} ↔ ${sideName(dim, SIDES[dim][1])}`),
    [dims, dimensions]
  );

  const userLeftVals = useMemo(
    () => dims.map((dim) => getNorm(dim, SIDES[dim][0])), // positive
    [dims, normalizedScores]
  );
  const userRightVals = useMemo(
    () => dims.map((dim) => -getNorm(dim, SIDES[dim][1])), // negative
    [dims, normalizedScores]
  );
  const benchLeftVals = useMemo(
    () => dims.map((dim) => Number(benchmark?.normalizedScores?.[dim]?.[SIDES[dim][0]] ?? 0)),
    [dims, benchmark]
  );
  const benchRightVals = useMemo(
    () => dims.map((dim) => -Number(benchmark?.normalizedScores?.[dim]?.[SIDES[dim][1]] ?? 0)),
    [dims, benchmark]
  );

  const barData = useMemo(() => {
    // prefer provided chartData for backward compatibility
    if (chartData) return chartData;
    const datasets = [
      {
        label: "سمت ۱ (کاربر)",
        data: userLeftVals,
        backgroundColor: "rgba(37,99,235,.7)",
        borderColor: "#2563eb",
        borderWidth: 1,
        borderRadius: 8,
        barPercentage: 0.8,
        categoryPercentage: 0.9,
        stack: "user",
      },
      {
        label: "سمت ۲ (کاربر)",
        data: userRightVals,
        backgroundColor: "rgba(239,68,68,.7)",
        borderColor: "#ef4444",
        borderWidth: 1,
        borderRadius: 8,
        barPercentage: 0.8,
        categoryPercentage: 0.9,
        stack: "user",
      },
    ];
    if (mode === "compare" && benchmark) {
      datasets.push(
        {
          label: "سمت ۱ (میانگین)",
          data: benchLeftVals,
          backgroundColor: "rgba(148,163,184,.45)",
          borderColor: "rgba(148,163,184,.75)",
          borderWidth: 1,
          borderRadius: 8,
          barPercentage: 0.8,
          categoryPercentage: 0.9,
          stack: "bench",
        },
        {
          label: "سمت ۲ (میانگین)",
          data: benchRightVals,
          backgroundColor: "rgba(203,213,225,.45)",
          borderColor: "rgba(148,163,184,.75)",
          borderWidth: 1,
          borderRadius: 8,
          barPercentage: 0.8,
          categoryPercentage: 0.9,
          stack: "bench",
        }
      );
    }
    return { labels: divergingLabels, datasets };
  }, [chartData, divergingLabels, userLeftVals, userRightVals, benchLeftVals, benchRightVals, mode, benchmark]);

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      scales: {
        x: {
          min: -100,
          max: 100,
          stacked: true,
          ticks: {
            color: axisColor,
            callback: (v) => `${Math.abs(v)}%`,
            stepSize: 20,
          },
          grid: { color: gridColor },
        },
        y: {
          stacked: true,
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
            label: (ctx) => {
              const v = Math.abs(ctx.parsed.x);
              return `${ctx.dataset.label}: ${Math.round(v)}%`;
            },
          },
        },
      },
    }),
    [axisColor, gridColor, tooltipBg, tooltipBorder, textColor]
  );

  // ===== Radar: preference strength per dimension (abs diff) =====
  const radarLabels = useMemo(
    () => dims.map((dim) => {
      const [a, b] = SIDES[dim];
      return `${sideName(dim, a)} / ${sideName(dim, b)}`;
    }),
    [dims, dimensions]
  );

  const userDiffs = useMemo(
    () => dims.map((dim) => {
      const [a, b] = SIDES[dim];
      return Math.abs(getNorm(dim, a) - getNorm(dim, b));
    }),
    [dims, normalizedScores]
  );

  const benchDiffs = useMemo(
    () => dims.map((dim) => {
      if (!benchmark) return 0;
      const [a, b] = SIDES[dim];
      const A = Number(benchmark?.normalizedScores?.[dim]?.[a] ?? 0);
      const B = Number(benchmark?.normalizedScores?.[dim]?.[b] ?? 0);
      return Math.abs(A - B);
    }),
    [dims, benchmark]
  );

  const radarData = useMemo(
    () => ({
      labels: radarLabels,
      datasets: [
        {
          label: userInfo?.fullName ? `پروفایل ${userInfo.fullName}` : "پروفایل فردی",
          data: userDiffs,
          backgroundColor: "rgba(37,99,235,.18)",
          borderColor: "#2563eb",
          pointBackgroundColor: "#2563eb",
          pointBorderColor: "#fff",
          fill: true,
        },
        ...(mode === "compare" && benchmark
          ? [{
              label: benchmark.label || "میانگین گروه",
              data: benchDiffs,
              backgroundColor: "rgba(148,163,184,.18)",
              borderColor: "rgba(148,163,184,.8)",
              pointBackgroundColor: "rgba(148,163,184,.8)",
              pointBorderColor: "#fff",
              fill: true,
            }]
          : []),
      ],
    }),
    [radarLabels, userDiffs, benchDiffs, userInfo, mode, benchmark]
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

  // ===== Actions =====
  const activeChartRef = () => (mode === "radar" ? radarRef.current : barRef.current);

  const handleDownloadPNG = () => {
    const chart = activeChartRef();
    if (!chart) return;
    const url = chart.toBase64Image?.() || chart.canvas?.toDataURL?.("image/png");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `mbti_${mode}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportCSV = () => {
    const rows = [["dimension", "side1", "raw1", "norm1(%)", "side2", "raw2", "norm2(%)", "yourSide", "difference"]];
    dims.forEach((dim) => {
      const [a, b] = SIDES[dim];
      const yourSide = dimensions.find((d) => d.dimension === dim)?.yourSide || (
        getNorm(dim, a) >= getNorm(dim, b) ? a : b
      );
      const diff = Math.abs(getNorm(dim, a) - getNorm(dim, b));
      rows.push([
        dim,
        sideName(dim, a),
        getRaw(dim, a),
        getNorm(dim, a),
        sideName(dim, b),
        getRaw(dim, b),
        getNorm(dim, b),
        yourSide,
        Math.round(diff),
      ]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mbti_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = async () => {
  if (!containerRef.current) return;

  // 1) Make a print-ready clone with canvases rasterized
  const clone = await rasterizeForPrint(containerRef.current);

  // 2) Basic print CSS (your original, unchanged)
  const css = `
    @page { size: A4; margin: 14mm; }
    body { direction: rtl; font-family: -apple-system, Segoe UI, Roboto, "Vazirmatn", Arial, sans-serif; color: #111; }
    .muted { color: #555; }
    table { width:100%; border-collapse: collapse; font-size: 11pt; }
    th, td { border:1px solid #e5e7eb; padding:8px; text-align:center; }
    thead th { background: rgba(37,99,235,.08); }
    .top-theme-row { background: rgba(245,158,11,.12); }
    /* ensure images (rasterized charts) scale correctly */
    img { max-width: 100%; height: auto; display:block; }
  `;

  // 3) Open print window and inject the *clone*’s HTML
  const win = window.open("", "", "width=1024,height=720");
  if (!win) return;
  win.document.write(`
    <html lang="fa" dir="rtl">
      <head><meta charset="UTF-8"/><title>گزارش MBTI</title><style>${css}</style></head>
      <body>${clone.innerHTML}</body>
    </html>
  `);
  win.document.close();

  // 4) Nudge layout and print
  try { win.focus(); } catch {}
  // give images a tick to load
  setTimeout(() => {
    win.print();
    win.onafterprint = () => { try { win.close(); } catch {} };
  }, 60);
};


  // ===== Suggestions library (per side) =====
  const suggestLib = {
    E: ["فعالیت‌های گروهی برنامه‌ریزی کن", "ارائه‌ی ایده‌ها در جمع را تمرین کن", "شبکه‌سازی هدفمند ماهانه"],
    I: ["زمان بازیابی انرژی را در تقویم ثبت کن", "نظراتت را مکتوب و سپس ارائه کن", "جلسات 1:1 را جایگزین گروهی کن"],
    S: ["جزئیات را چک‌لیست کن", "از مثال‌های ملموس در تصمیم‌گیری استفاده کن", "بازبینی واقعیت‌ها قبل از اجرا"],
    N: ["برای ایده‌ها محدودیت زمانی بگذار", "فرضیات را با داده‌های واقعی اعتبارسنجی کن", "یک MVP سریع بساز"],
    T: ["معیارهای تصمیم را از قبل تعریف کن", "بازخورد را بدون قضاوت شخصی بده", "احساسات ذینفعان را هم بسنج"],
    F: ["در تصمیم‌ها اثر انسانی را بسنج", "گفت‌وگوی همدلانه هفتگی", "بازخوردها را با مثال‌های مثبت شروع کن"],
    J: ["بلوک‌های زمانی ثابت بساز", "تعریف خروجی قابل تحویل قبل از شروع", "مرور هفتگی برنامه/تعهدات"],
    P: ["فضای انعطاف را حفظ کن اما ددلاین نرم تعیین کن", "از کانبان برای اولویت‌بندی استفاده کن", "زمان‌بندی‌های کوتاه و قابل بازنگری"],
  };

  const suggestions = useMemo(() => {
    return dims.map((dim) => {
      const [a, b] = SIDES[dim];
      const your = dimensions.find((d) => d.dimension === dim)?.yourSide ||
                   (getNorm(dim, a) >= getNorm(dim, b) ? a : b);
      return {
        dim,
        your,
        items: suggestLib[your] || [],
      };
    });
  }, [dims, dimensions, normalizedScores]);

  // ===== Render =====
  return (
    <section className="mbti-analysis-container card" ref={containerRef} dir="rtl">
      <header className="mbti-head">
        <div>
          <h2 className="title ignorePrint">تحلیل آزمون MBTI</h2>
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

      {/* Summary & badges */}
      <section className="summary-section">
        <div className="badges">
          <span className="badge primary">
            نوع شما: <span className="mbti-type">{mbtiType}</span>{summary ? ` ${summary}` : ""}
          </span>
          {functions && (
            <span className="badge info">
              کارکردها: {[
                functions.dominant && `Dominant: ${functions.dominant}`,
                functions.auxiliary && `Aux: ${functions.auxiliary}`,
                functions.tertiary && `Ter: ${functions.tertiary}`,
                functions.inferior && `Inf: ${functions.inferior}`,
              ].filter(Boolean).join(" | ")}
            </span>
          )}
        </div>
      </section>

      {/* KPI */}
      <section className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">قوی‌ترین ترجیح</div>
          <div className="kpi-value">
            {strongest
              ? `${sideName(strongest.dim, strongest.a)}/${sideName(strongest.dim, strongest.b)} (${fmtPct(strongest.diff)})`
              : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">ضعیف‌ترین ترجیح</div>
          <div className="kpi-value">
            {weakest
              ? `${sideName(weakest.dim, weakest.a)}/${sideName(weakest.dim, weakest.b)} (${fmtPct(weakest.diff)})`
              : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">تعادل کلی</div>
          <div className="kpi-value">{balanceTag}</div>
        </div>
      </section>

      {/* Table */}
      <section className="scores-section">
        <h3>نمرات خام و نرمال‌شده</h3>
        <div className="table-wrap">
          <table className="scores-table">
            <thead>
              <tr>
                <th>بُعد</th>
                <th>سمت ۱</th>
                <th>نمره خام</th>
                <th>نمره نرمال‌شده (%)</th>
                <th>سمت ۲</th>
                <th>نمره خام</th>
                <th>نمره نرمال‌شده (%)</th>
                <th>سمت غالب</th>
                <th>تفاوت</th>
              </tr>
            </thead>
            <tbody>
              {dims.map((dim) => {
                const [a, b] = SIDES[dim];
                const your = dimensions.find((d) => d.dimension === dim)?.yourSide ||
                             (getNorm(dim, a) >= getNorm(dim, b) ? a : b);
                const diff = Math.abs(getNorm(dim, a) - getNorm(dim, b));
                return (
                  <tr key={dim}>
                    <td>{dim}</td>
                    <td>{sideName(dim, a)}</td>
                    <td>{getRaw(dim, a)}</td>
                    <td>{fmtPct(getNorm(dim, a))}</td>
                    <td>{sideName(dim, b)}</td>
                    <td>{getRaw(dim, b)}</td>
                    <td>{fmtPct(getNorm(dim, b))}</td>
                    <td>{your}</td>
                    <td>{fmtPct(diff)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dimension descriptions (if provided) */}
      {dataForUI.dimensions?.length > 0 && (
        <section className="dimensions-section">
          <h3>توضیحات ابعاد شخصیتی</h3>
          <div className="dimensions-list">
            {dataForUI?.dimensions.map(({ dimension, yourSide, difference, description }) => (
              <article key={dimension} className="dimension-card">
                <h4>
                  بعد {dimension}: سمت غالب شما <span className="your-side">{yourSide}</span>
                </h4>
                <div style={{ display: "flex" }}>
                {description && <p className="desc">{description}</p>} __
                {difference !== undefined && (
                  <p className="muted small"><strong>تفاوت نمرات:</strong> {fmtPct(difference)}</p>
                )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Suggestions */}
      <section className="suggest-section">
        <h3>پیشنهادهای رشد</h3>
        <div className="suggest-grid">
          {suggestions.map(({ dim, your, items }) => (
            <div className="suggest-card" key={dim}>
              <h4>{dim} — تمرکز روی {your}</h4>
              {items.length > 0 ? (
                <ul>{items.map((s, i) => <li key={i}>{s}</li>)}</ul>
              ) : <p className="muted small">—</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Charts */}
      <section className="chart-section">
        <div className="segmented">
          <button className={`seg-btn ${mode === "diverging" ? "active" : ""}`} onClick={() => setMode("diverging")}>میله‌ای دو‌سویه</button>
          <button className={`seg-btn ${mode === "radar" ? "active" : ""}`} onClick={() => setMode("radar")}>رادار ترجیح</button>
          {benchmark && (
            <button className={`seg-btn ${mode === "compare" ? "active" : ""}`} onClick={() => setMode("compare")}>مقایسه با میانگین</button>
          )}
        </div>

        <div className="chart-wrap" ref={MbtichartWrapRef} aria-live="polite">
          {(mode === "diverging" || mode === "compare") && (
  <Bar ref={barRef} data={barData} options={barOptions} />
)}
{mode === "radar" && (
  <Radar ref={radarRef} data={radarData} options={radarOptions} />
)}
        </div>
        <p className="muted small">راهنما: در نمودار دو‌سویه، مقادیر سمت دوم با علامت منفی نمایش داده می‌شوند تا تقارن حول صفر حفظ شود (مقیاس ۰ تا ۱۰۰).</p>
      </section>
    </section>
  );
};

export default MbtiAnalysis;
