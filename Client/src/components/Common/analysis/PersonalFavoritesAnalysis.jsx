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
import "./PersonalFavoritesAnalysis.css";

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
 * Expected data shape:
 * {
 *   frequencies: {
 *     Hobby: { "موسیقی": 4, "ورزش": 2, ... },
 *     Work: { "کار تیمی": 3, ... },
 *     Social: { ... },
 *     Lifestyle: { ... }
 *   },
 *   traits: {
 *     Hobby: { name: "سرگرمی", description?: string, topPreference?: string, frequency?: {...} },
 *     Work: { name: "کار", ... },
 *     Social: { name: "اجتماعی", ... },
 *     Lifestyle: { name: "سبک زندگی", ... },
 *   },
 *   topPreferences: { [traitKey]: { value: string, count: number } | null },
 *   summary?: string,
 *   analyzedAt?: string|number|Date,
 *   userInfo?: { fullName?: string }
 * }
 */
const PersonalFavoritesAnalysis = ({ data }) => {
  if (!data || !data.frequencies || !data.traits) {
    return <p className="muted" dir="rtl" data-testid="no-data">داده‌ای برای نمایش موجود نیست.</p>;
  }

  const {
    frequencies = {},
    traits = {},
    topPreferences = {},
    summary,
    analyzedAt,
    userInfo = {},
  } = data;

  const containerRef = useRef(null);
  const barRef = useRef(null);
  const radarRef = useRef(null);

  const [mode, setMode] = useState("stacked"); // 'stacked' | 'percent' | 'radar'

  const dateFa = analyzedAt
    ? new Date(analyzedAt).toLocaleDateString("fa-IR", {
        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—";

  // ===== Theme-aware CSS vars
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

  // ===== Canonical trait order (if present)
  const ORDER = ["Hobby", "Work", "Social", "Lifestyle"];
  const traitKeys = useMemo(() => {
    const set = new Set([...Object.keys(frequencies), ...Object.keys(traits), ...ORDER]);
    return ORDER.filter((k) => set.has(k));
  }, [frequencies, traits]);

  const traitName = (k) => traits?.[k]?.name || k;

  // ===== Unique options across all traits
  const options = useMemo(() => {
    const all = new Set();
    traitKeys.forEach((k) => {
      const freq = frequencies[k] || traits[k]?.frequency || {};
      Object.keys(freq || {}).forEach((opt) => all.add(opt));
    });
    return Array.from(all);
  }, [frequencies, traits, traitKeys]);

  // ===== Raw matrix: rows = options, cols = traits (for stacked chart)
  const matrix = useMemo(() => {
    return options.map((opt) =>
      traitKeys.map((tk) => {
        const freq = frequencies[tk] || traits[tk]?.frequency || {};
        return Number(freq?.[opt] ?? 0);
      })
    ); // [ [opt1 counts per trait...], [opt2 ...], ...]
  }, [options, traitKeys, frequencies, traits]);

  // Totals per option (for 100% stack)
  const totalsPerOption = useMemo(
    () => matrix.map((row) => row.reduce((s, v) => s + v, 0)),
    [matrix]
  );

  // Palette per trait (stable)
  const palette = [
    "#2563eb", // آبی
    "#10b981", // سبز
    "#f59e0b", // کهربایی
    "#ef4444", // قرمز
    "#8b5cf6", // بنفش
    "#14b8a6", // فیروزه‌ای
  ];

  // ===== Datasets for charts
  // Bar (stacked or percent): labels = options, datasets per trait
  const barData = useMemo(() => {
    const datasets = traitKeys.map((tk, i) => {
      // values per option for this trait:
      const raw = matrix.map((row) => row[i]); // pick column i
      const values =
        mode === "percent"
          ? raw.map((v, rIdx) => {
              const total = totalsPerOption[rIdx] || 1;
              return total ? (v / total) * 100 : 0;
            })
          : raw;

      return {
        label: traitName(tk),
        data: values,
        backgroundColor: `${palette[i % palette.length]}cc`,
        borderColor: palette[i % palette.length],
        borderWidth: 1,
        borderRadius: 8,
        barPercentage: 0.8,
        categoryPercentage: 0.9,
        stack: "favorites",
      };
    });

    return { labels: options.length ? options : ["—"], datasets };
  }, [traitKeys, matrix, options, mode, totalsPerOption]);

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y", // horizontal
      scales: {
        x: {
          beginAtZero: true,
          ...(mode === "percent" ? { max: 100 } : {}),
          ticks: {
            color: axisColor,
            callback: (v) => (mode === "percent" ? `${v}%` : v),
            stepSize: mode === "percent" ? 20 : undefined,
          },
          grid: { color: gridColor },
          stacked: true,
        },
        y: {
          ticks: { color: axisColor },
          grid: { color: "transparent" },
          stacked: true,
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
              const base = `${ctx.dataset.label}: `;
              if (mode === "percent") return base + `${Math.round(ctx.parsed.x)}%`;
              return base + `${ctx.parsed.x} بار`;
            },
          },
        },
      },
    }),
    [axisColor, gridColor, tooltipBg, tooltipBorder, textColor, mode]
  );

  // Radar: diversity per trait (share of top option) -> lower is متعادل‌تر
  const diversityPerTrait = useMemo(() => {
    return traitKeys.map((tk) => {
      const freq = frequencies[tk] || traits[tk]?.frequency || {};
      const vals = Object.values(freq || {}).map((n) => Number(n || 0));
      const sum = vals.reduce((s, v) => s + v, 0);
      if (!sum) return 0;
      const maxV = Math.max(...vals);
      const dominance = (maxV / sum) * 100; // 0..100 (بزرگ‌تر یعنی تمرکز روی یک گزینه)
      return Math.round(100 - dominance); // 0..100 (بزرگ‌تر یعنی متنوع‌تر)
    });
  }, [traitKeys, frequencies, traits]);

  const radarData = useMemo(
    () => ({
      labels: traitKeys.map((tk) => traitName(tk)),
      datasets: [
        {
          label: userInfo?.fullName ? `تنوع ترجیحات ${userInfo.fullName}` : "تنوع ترجیحات",
          data: diversityPerTrait,
          backgroundColor: "rgba(37,99,235,.18)",
          borderColor: "#2563eb",
          pointBackgroundColor: "#2563eb",
          pointBorderColor: "#fff",
          fill: true,
        },
      ],
    }),
    [traitKeys, diversityPerTrait, userInfo]
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
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.r}%`,
          },
        },
      },
    }),
    [axisColor, gridColor, tooltipBg, tooltipBorder, textColor]
  );

  // ===== KPIs
  const totalsByOption = useMemo(() => {
    // { option -> totalCount }
    const map = new Map();
    options.forEach((opt, i) => {
      const total = matrix[i].reduce((s, v) => s + v, 0);
      map.set(opt, total);
    });
    return map;
  }, [options, matrix]);

  const topOption = useMemo(() => {
    let maxOpt = null;
    let maxVal = -1;
    totalsByOption.forEach((val, opt) => {
      if (val > maxVal) {
        maxVal = val;
        maxOpt = opt;
      }
    });
    return maxOpt ? { option: maxOpt, count: maxVal } : null;
  }, [totalsByOption]);

  const variety = useMemo(() => {
    // تعداد گزینه‌هایی که حداقل یک بار انتخاب شده‌اند
    let n = 0;
    totalsByOption.forEach((val) => {
      if (val > 0) n += 1;
    });
    return n;
  }, [totalsByOption]);

  const strongestPerTrait = useMemo(() => {
    // ترجیح برتر هر بُعد
    return traitKeys.map((tk) => {
      const freq = frequencies[tk] || traits[tk]?.frequency || {};
      const entries = Object.entries(freq);
      if (!entries.length) return { traitKey: tk, name: traitName(tk), top: "—", count: 0 };
      const top = entries.sort((a, b) => b[1] - a[1])[0];
      return { traitKey: tk, name: traitName(tk), top: top[0], count: top[1] };
    });
  }, [traitKeys, frequencies, traits]);

  // ===== Actions
  const activeChartRef = () => (mode === "radar" ? radarRef.current : barRef.current);

  const handleDownloadPNG = () => {
    const chart = activeChartRef();
    if (!chart) return;
    const url = chart.toBase64Image?.() || chart.canvas?.toDataURL?.("image/png");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `favorites_${mode}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportCSV = () => {
    // rows: option, ...traits, total
    const header = ["گزینه", ...traitKeys.map(traitName), "جمع"];
    const rows = [header];
    options.forEach((opt, i) => {
      const row = [opt];
      let sum = 0;
      matrix[i].forEach((v) => { row.push(v); sum += v; });
      row.push(sum);
      rows.push(row);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
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
      thead th { background: ${headBg}; }
      .kpi-grid div { border:1px solid #ddd; border-radius: 8px; padding:6px 10px; }
    `;
    const win = window.open("", "", "width=1024,height=720");
    if (!win) return;
    win.document.write(`
      <html>
        <head><meta charset="UTF-8"/><title>گزارش اولویت‌های شخصی</title><style>${css}</style></head>
        <body>${html}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  // ===== Suggestions (from topPreferences if provided)
  const devSuggestions = useMemo(() => {
    const list = [];
    Object.entries(topPreferences || {}).forEach(([tk, pref]) => {
      if (!pref || !pref.value) return;
      list.push({
        trait: traitName(tk),
        value: pref.value,
        items: [
          `افزایش مشارکت در فعالیت‌های مرتبط با «${pref.value}»`,
          `جست‌وجوی دوره‌/گروه مرتبط برای توسعه «${traitName(tk)}»`,
          `برنامه‌ریزی برای ادغام «${pref.value}» در روال روزانه`,
        ],
      });
    });
    return list;
  }, [topPreferences, traits]);

  // ===== Render
  return (
    <section className="pf-analysis-container card" ref={containerRef} dir="rtl">
      <header className="pf-head">
        <div>
          <h2 className="title">تحلیل آزمون اولویت‌های شخصی</h2>
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

      {/* Summary */}
      <section className="summary-section">
        {summary && <p className="summary-text"><strong>خلاصه:</strong> {summary}</p>}
      </section>

      {/* KPIs */}
      <section className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">محبوب‌ترین گزینه</div>
          <div className="kpi-value">
            {topOption ? `${topOption.option} (${topOption.count} بار)` : "—"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">تعداد گزینه‌های انتخاب‌شده</div>
          <div className="kpi-value">{variety}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">ترجیح برتر هر بُعد</div>
          <div className="kpi-value small">
            {strongestPerTrait.length
              ? strongestPerTrait.map((t) => `${t.name}: ${t.top}`).join(" | ")
              : "—"}
          </div>
        </div>
      </section>

      {/* Details per trait */}
      <section className="profiles-section">
        <h3>جزئیات ترجیحات</h3>
        <div className="profiles-list">
          {traitKeys.map((tk) => {
            const prof = traits[tk] || { name: traitName(tk) };
            const freq = frequencies[tk] || prof.frequency || {};
            const isTop = (prof.topPreference && prof.topPreference !== "هیچ") || (topPreferences?.[tk]?.value);
            return (
              <article className={`profile-card ${isTop ? "top" : ""}`} key={tk}>
                <h4>
                  {prof.name}
                  {isTop && <span className="top-label">ترجیح برتر</span>}
                </h4>
                {prof.description && (
                  <p><strong>توضیح: </strong>{prof.description}</p>
                )}
                <p><strong>ترجیح برتر: </strong>{(prof.topPreference && prof.topPreference !== "هیچ") ? prof.topPreference : (topPreferences?.[tk]?.value || "—")}</p>
                <p><strong>تکرار انتخاب‌ها:</strong></p>
                {Object.keys(freq).length ? (
                  <ul>
                    {Object.entries(freq).map(([value, count]) => (
                      <li key={value}>{`${value}: ${count} بار`}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted small">هیچ انتخابی ثبت نشده</p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Suggestions */}
      <section className="development-section">
        <h3>پیشنهادات برای تقویت ترجیحات</h3>
        {devSuggestions.length ? (
          devSuggestions.map(({ trait, value, items }) => (
            <div key={trait} className="development-card">
              <h4>{trait} — تمرکز روی «{value}»</h4>
              <ul>{items.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          ))
        ) : (
          <p className="muted small">ترجیحات برتری ثبت نشده است.</p>
        )}
      </section>

      {/* Charts */}
      <section className="chart-section">
        <div className="segmented">
          <button className={`seg-btn ${mode === "stacked" ? "active" : ""}`} onClick={() => setMode("stacked")}>میله‌ای تجمیعی</button>
          <button className={`seg-btn ${mode === "percent" ? "active" : ""}`} onClick={() => setMode("percent")}>۱۰۰٪ تجمیعی</button>
          <button className={`seg-btn ${mode === "radar" ? "active" : ""}`} onClick={() => setMode("radar")}>رادار تنوع</button>
        </div>

        <div className="chart-wrap">
          {(mode === "stacked" || mode === "percent") && (
            <Bar ref={barRef} data={barData} options={barOptions} />
          )}
          {mode === "radar" && (
            <Radar ref={radarRef} data={radarData} options={radarOptions} />
          )}
        </div>
        <p className="muted small">
          نکته: در حالت «۱۰۰٪ تجمیعی»، هر ردیف به‌صورت درصدی از کل انتخاب‌ها نمایش داده می‌شود.
        </p>
      </section>
    </section>
  );
};

export default PersonalFavoritesAnalysis;
