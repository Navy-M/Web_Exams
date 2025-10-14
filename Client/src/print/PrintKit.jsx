// src/print/PrintKit.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import ShowAnalysis from "../components/Common/ShowAnalysis";
import { rankJobsForUserRich, renderJobPriorityTableHTML } from "../utils/jobRanking";
import { jobRequirements } from "../services/dummyData";

/* ========= Global Print CSS ========= */
const PRINT_CSS = `
:root{
  --ink:#0f172a; --muted:#64748b; --Lmuted:#14253d; --sub:#475569;
  --line:#e5e7eb; --line-2:#d9e1ea; --soft:#f8fafc; --soft-2:#eef2f7;
  --chip:#f1f5f9; --chip-b:#e2e8f0; --brand:#2563eb; --accent:#22c55e;
  --grad-a:#38bdf8; --grad-b:#22c55e;
}
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  direction: rtl; background:#fff; color:var(--ink);
  font-family:"Vazirmatn",-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  line-height:1.7; font-size:12.25pt; letter-spacing:.1px;
}

.container { display:grid; gap:16px; max-width: 100%; padding:16px 0; justify-content: center; }
.card { background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px; }
.muted { color:var(--muted); }
.full { grid-column:1 / -1; }
.grid-3 { display:grid; grid-template-columns: repeat(3, 1fr); gap:12px 20px; }
.avoid-break { break-inside: avoid; page-break-inside: avoid; }



/* Compact analysis (بدون حذف نمودارها) */
.analysis-compact{ --gap:10px; }
.analysis-compact *{ box-sizing:border-box; }
.analysis-compact ul, .analysis-compact ol{
  list-style:none; padding:0; margin:8px 0 0 0;
  display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:var(--gap);
}
@media screen and (min-width: 992px), print {
  .analysis-compact ul, .analysis-compact ol{ grid-template-columns:repeat(3,minmax(0,1fr)); }
}
.analysis-compact li{
  background:#fff; border:1px solid var(--line); border-radius:12px;
  padding:10px 12px; color:var(--ink); line-height:1.5; min-height:42px;
  display:flex; align-items:center; justify-content:space-between; gap:8px;
}
.analysis-compact li .k{ color:#334155; font-weight:700; }
.analysis-compact li .v{ font-variant-numeric:tabular-nums; color:#0b1324; font-weight:700; }
.analysis-compact h4, .analysis-compact h5{ margin:10px 0 6px; font-weight:800; }
.analysis-compact p{ margin:6px 0; color:var(--ink); }
.analysis-compact table{
  width:100%; border-collapse:separate; border-spacing:0;
  border:1px solid var(--line-2); border-radius:12px; overflow:hidden; background:#fff;
  font-size:11.5pt; margin-top:8px;
}
.analysis-compact thead th{
  background:var(--soft-2); color:var(--ink); text-align:center;
  padding:8px 10px; border-bottom:1px solid var(--line-2); font-weight:900;
}
.analysis-compact tbody td{ padding:8px 10px; border-bottom:1px solid #edf2f7; line-height:1.55; }
.analysis-compact tbody tr:nth-child(even) td { background:#fafbfc; }
.analysis-compact tbody tr:last-child td { border-bottom:none; }
.analysis-compact .num{ font-variant-numeric:tabular-nums; text-align:center; }
.analysis-compact .chip{
  display:inline-block; padding:2px 8px; border-radius:999px;
  background:#f1f5f9; border:1px solid #e2e8f0; color:#0f172a; font-weight:700; font-size:10.5pt;
}
.analysis-compact .card-row{ display:grid; gap:var(--gap); grid-template-columns:repeat(2,minmax(0,1fr)); }
@media screen and (min-width: 992px), print { .analysis-compact .card-row{ grid-template-columns:repeat(3,minmax(0,1fr)); } }
.analysis-compact .mini-card{ background:#fff; border:1px solid var(--line); border-radius:12px; padding:10px 12px; }
.analysis-compact .mini-card .mini-title{ font-weight:800; margin:0 0 6px 0; color:#0f172a; }

/* Header */
.doc-header .title { margin:0 0 4px; font-size:22pt; font-weight:800; letter-spacing:-.2px; }
.doc-header .subtitle { margin:0; font-weight:700; font-size:13.25pt; }
.meta { display:flex; gap:12px; align-items:center; color:var(--sub); font-size:11.25pt; }
.meta .dot{ width:4px; height:4px; border-radius:50%; background:#cbd5e1; display:inline-block; }

/* Section title */
.section-title{ display:flex; align-items:center; gap:10px; margin:0 0 10px; }
.section-title .pill{
  background:var(--chip); color:var(--ink); border:1px solid var(--chip-b);
  border-radius:999px; padding:4px 12px; font-size:10.75pt; font-weight:700;
}
.section-title h3{ margin:0; font-size:15pt; font-weight:800; letter-spacing:-.1px; }

/* KV rows */
.kv{ display:flex; gap:6px 8px; flex-wrap:wrap; }
.kv .k{ color:#334155; font-weight:800; }
.kv .v{ color:var(--ink); }

.tests-status{
    display: flex !important;
    justify-content: space-between;
    // background-color:var(--muted);
    padding: 0.2rem 2rem;
}

/* Table */
.table{
  width:100%; border-collapse:separate; border-spacing:0; border:1px solid var(--line-2);
  border-radius:14px; overflow:hidden; background:#fff; font-size:12pt;
}
.table thead th{ background:var(--soft-2); color:var(--ink); text-align:right;
  padding:10px 12px; border-bottom:1px solid var(--line-2); font-weight:900; }
.table tbody td{ padding:10px 12px; border-bottom:1px solid #edf2f7; line-height:1.6; }
.table tbody tr:nth-child(even) td{ background:#fafbfc; }
.table tbody tr:last-child td{ border-bottom:none; }
.table caption{ caption-side:top; text-align:right; padding:6px 0 10px; color:var(--sub); font-size:11pt; }
.table .num{ font-variant-numeric:tabular-nums; text-align:center; }
.table .t-left{ text-align:right; } .table .t-right{ text-align:left; }
.table tbody tr{ break-inside:avoid; page-break-inside:avoid; }
.table.jobs colgroup col:nth-child(1){ width:48px; }
.table.jobs colgroup col:nth-child(2){ width:auto; }
.table.jobs colgroup col:nth-child(3){ width:170px; }
.table.jobs colgroup col:nth-child(4){ width:50%; }

/* Progress */
.cell-bar{ position:relative; min-width:140px; display:flex; align-items:center; gap:10px; }
.cell-bar .val{ font-variant-numeric:tabular-nums; font-weight:800; min-width:44px; text-align:center; color:#0b1324; }
.cell-bar .bar{
  --w:0%; position:relative; flex:1 1 auto; height:9px; border-radius:999px;
  background:#e2e8f0; box-shadow:inset 0 0 0 1px rgba(0,0,0,.025);
}
.cell-bar .bar::after{
  content:""; position:absolute; inset:0; width:var(--w); height:100%;
  background:linear-gradient(90deg,var(--grad-a),var(--grad-b)); border-radius:999px;
}

/* Badges & notes */
.badge{ display:inline-block; padding:3px 10px; border-radius:999px; background:#ecfeff; color:#155e75; border:1px solid #cffafe; font-weight:800; font-size:10.75pt; }
.note{ background:var(--soft); border:1px dashed #cbd5e1; color:#334155; border-radius:12px; padding:12px 14px; font-size:11pt; }

/* Media (charts & images) */
.card img, .card canvas, .card svg{ display:block; max-width:100%; height:auto; margin:0 auto; }
.chart-hint{ margin-top:8px; color:var(--muted); font-size:10.75pt; }
.chart-wrap{ min-height:280px; }
.chart-wrap canvas{ width:100% !important; height:280px !important; display:block; }

/* Footer */
.footer{ position:fixed; left:0; right:0; bottom:8mm; text-align:center; color:#94a3b8; font-size:10.75pt; }
.footer .pageno::after{ counter-increment:page; content:counter(page); }

/* Utilities */
.mt-8{ margin-top:8px } .mt-12{ margin-top:12px } .mb-8{ margin-bottom:8px } .mb-12{ margin-bottom:12px }

/* Sanitize interactive */
.print-sanitize button, .print-sanitize .btn, .print-sanitize [role="button"],
.print-sanitize .ant-btn, .print-sanitize .ant-space, .print-sanitize .ant-tooltip,
.print-sanitize a[data-print="hide"], .print-sanitize .action-bar, .print-sanitize .controls,
.print-sanitize .toolbar, .print-sanitize .download, .print-sanitize .csv,
.print-sanitize .print, .print-sanitize .share, .print-sanitize input,
.print-sanitize select, .print-sanitize textarea { display:none !important; }
.print-sanitize a{ color:inherit; text-decoration:none; }
.print-sanitize .recharts-responsive-container{ min-height:260px; }


.ignorePrint{
  display: none !important;
}

/* ========== Layout: center on page & no overflow ========== */
/* کل سند وسط صفحه بیاد و پهنا امن A4 (داخل حاشیه‌ها) باشه */
.print-sanitize, .print-sanitize * { box-sizing: border-box; }
.page{
  /* پهنای داخلی امن (A4 - 2×14mm margin ≈ 182mm) */
  width: 182mm;
  max-width: 100%;
  margin-left: auto;
  margin-right: auto;
  /* هیچ فاصله‌ی عمودی بین صفحات/آزمون‌ها */
  margin-top: 0;
  margin-bottom: 0;
  /* جلوگیری از بیرون‌زدن محتوا */
  overflow: hidden;
}

/* کارت‌ها و کانتینر هم وسط باشند و بیرون نزنند */
.container{
  justify-items: stretch;    /* کارت‌ها تمام عرض امن را بگیرند */
}
.card{
  max-width: 100%;
  overflow-wrap: anywhere;   /* کلمات بلند نشکنند بیرون */
}

/* نمودارها/تصاویر هرگز از عرض صفحه خارج نشوند */
.card img, .card canvas, .card svg{
  display: block;
  max-width: 100%;
  height: auto;
}

/* ظرف نمودار دقیقاً وسط و داخل عرض امن */
.chart-wrap{
  width: 100%;
  max-width: 100%;
  min-height: 280px;
  margin-left: auto;
  margin-right: auto;
  overflow: hidden;          /* جلوگیری از اسکرول/بیرون‌زدگی افقی */
}
.chart-wrap canvas{
  width: 100% !important;
  height: 280px !important;
  display: block;
}


/* Screen polish */
@media screen {
  body { background:#f6f7fb; }
  .page { box-shadow:0 12px 40px rgba(2,6,23,.06), 0 2px 10px rgba(2,6,23,.04); border-radius:16px; }
  .card { border-color:#e6ebf2; }
}


/* Summary */
.kpi-grid{
  margin: 10px 0 14px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--soft);
  break-inside: avoid; page-break-inside: avoid;
}
.kpi{
display:flex;
justify-content:center;

  }
.kpi-lable{
  display: flex; flex-wrap: wrap; gap: 8px 10px;
}
.kpi-value{
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 999px;
  background: var(--chip); border: 1px solid var(--chip-b);
  color: var(--ink); font-weight: 800; font-size: 10.75pt;
  margin: 0.4rem 2rem; 
}
.kpi-grid .mbti-type{ color: var(--brand); font-weight: 900; }

/* Shared section titles */
.kpi-grid h3,
.dimensions-section h3,
.dimentions-section h3{ /* alias for misspelling */
  margin: 0 0 10px;
  font-size: 14.5pt; font-weight: 900; letter-spacing: -.1px; color: var(--ink);
  break-after: avoid-page; /* don’t leave titles orphaned */
}

/* Dimensions wrapper */
.dimensions-section,
.dimentions-section{
  margin: 14px 0;
  break-inside: avoid; page-break-inside: avoid;
}

.dimensions-section .dimensions-list,
.dimentions-section .dimensions-list{
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 10px 12px;
}

/* Each card */
.dimensions-section .dimension-card,
.dimentions-section .dimension-card{
  border: 1px solid var(--line);
  border-radius: 12px;
  background: #fff;
  padding: 10px 12px;
  break-inside: avoid; page-break-inside: avoid;
}

.dimensions-section .dimension-card h4,
.dimentions-section .dimension-card h4{
  margin: 0 0 6px;
  font-size: 12.75pt; font-weight: 800; color: var(--ink);
}
.dimensions-section .dimension-card .your-side,
.dimentions-section .dimension-card .your-side{
  color: var(--brand); font-weight: 900;
}
.dimensions-section .dimension-card .desc,
.dimentions-section .dimension-card .desc{
  margin: 6px 0 0; line-height: 1.6; color: var(--sub); font-size: 11.25pt;
}
.dimensions-section .dimension-card .muted.small,
.dimentions-section .dimension-card .muted.small{
  margin-top: 6px; color: var(--muted); font-size: 10.75pt;
}

/* Print behavior: prevent splits; fallback to 1 column if needed */
@media print{
  .kpi-grid,
  .dimensions-section,
  .dimentions-section,
  .dimensions-section .dimension-card,
  .dimentions-section .dimension-card{
    break-inside: avoid; page-break-inside: avoid;
  }
  /* If your content is tight and breaks, force single column on print */
  .dimensions-section .dimensions-list,
  .dimentions-section .dimensions-list{
    grid-template-columns: 1fr;
  }
}

/* Optional screen preview niceties */
@media screen{
  .kpi-section{ box-shadow: 0 2px 10px rgba(2,6,23,.05); }
  .dimensions-section .dimension-card,
  .dimentions-section .dimension-card{
    box-shadow: 0 1px 6px rgba(2,6,23,.04);
  }
}
`;

/* ========= Helpers ========= */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));




async function waitForImages(docOrNode) {
  const root = docOrNode.querySelector ? docOrNode : docOrNode.documentElement;
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(imgs.map((img) =>
    img.complete ? Promise.resolve() :
    new Promise((res) => { img.addEventListener("load", res, { once:true }); img.addEventListener("error", res, { once:true }); })
  ));
  await Promise.all(imgs.map((img) => (img.decode ? img.decode().catch(()=>{}) : Promise.resolve())));
}
async function waitForStableLayout(node, frames = 6) {
  let stable = 0, last = node.scrollHeight;
  while (stable < frames) {
    await new Promise((r) => requestAnimationFrame(r));
    const cur = node.scrollHeight;
    stable = cur === last ? stable + 1 : 0;
    last = cur;
  }
}
async function waitForReady(doc, mountEl) {
  if (doc.fonts?.ready) await doc.fonts.ready;
  await waitForImages(mountEl || doc);
  await waitForStableLayout(mountEl || doc.body, 6);
  await sleep(120);
}

/* ========= CHART RASTERIZER (Canvas + SVG → PNG) ========= */
function dataUrlFromCanvas(canvas) {
  try { return canvas.toDataURL("image/png"); } catch { return null; }
}
function serializeSvg(svg) {
  const clone = svg.cloneNode(true);
  // ensure xmlns
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const xml = new XMLSerializer().serializeToString(clone);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
}
async function svgToPngDataUrl(svg, w, h) {
  return new Promise((resolve) => {
    const svgUrl = serializeSvg(svg);
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(w));
        c.height = Math.max(1, Math.round(h));
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/png"));
      } catch {
        resolve(svgUrl); // fallback: keep SVG dataURL (html2canvas can handle many cases)
      }
    };
    img.onerror = () => resolve(svgUrl);
    img.src = svgUrl;
  });
}

/**
 * Rasterize all Chart.js canvases and Recharts SVGs under `root`.
 * Returns a restore() function to revert DOM afterwards.
 */
async function rasterizeCharts(root) {
  const replacements = [];

  // 1) Chart.js canvases
  const canvases = Array.from(root.querySelectorAll("canvas"));
  for (const c of canvases) {
    const rect = c.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue; // invisible
    const url = dataUrlFromCanvas(c);
    if (!url) continue;
    const img = document.createElement("img");
    img.src = url;
    img.style.width = `${rect.width}px`;
    img.style.height = `${rect.height}px`;
    img.style.display = "block";
    c.parentNode.insertBefore(img, c);
    c.style.display = "none";
    replacements.push(() => {
      try { c.style.display = ""; img.remove(); } catch {}
    });
  }

  // 2) Recharts SVGs
  const svgs = Array.from(root.querySelectorAll("svg.recharts-surface, .recharts-wrapper svg"));
  for (const s of svgs) {
    const rect = s.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    const pngUrl = await svgToPngDataUrl(s, rect.width, rect.height);
    const img = document.createElement("img");
    img.src = pngUrl;
    img.style.width = `${rect.width}px`;
    img.style.height = `${rect.height}px`;
    img.style.display = "block";
    s.parentNode.insertBefore(img, s);
    s.style.display = "none";
    replacements.push(() => {
      try { s.style.display = ""; img.remove(); } catch {}
    });
  }

  return () => { for (const undo of replacements) undo(); };
}

/* ========= Hidden host helpers for PDF ========= */
function mountHiddenHost() {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.width = "794px";
  host.style.background = "#fff";
  host.style.zIndex = "-1";
  // stage-1: onscreen (nearly invisible)
  host.dataset.stage = "onscreen";
  host.style.top = "0";
  host.style.left = "0";
  host.style.opacity = "0.01";
  host.style.pointerEvents = "none";
  document.body.appendChild(host);
  return host;
}
function moveHostOffscreen(host) {
  host.dataset.stage = "offscreen";
  host.style.opacity = "";
  host.style.pointerEvents = "";
  host.style.left = "-99999px";
  host.style.top = "0";
}

/* ========= Public util: buildJobsHTML ========= */
export const buildJobsHTML = (results, user) => {
  const ranked = rankJobsForUserRich(jobRequirements, results, user?.profile?.field);
  return renderJobPriorityTableHTML(ranked);
};

/* ========= Core document ========= */
export function PrintDocument({ user, results = [], formatDate, jobsHTML }) {
  const p = user?.profile || {};
  const fullName = p.fullName || user?.username || "—";
  const nowStr = formatDate?.(Date.now()) || "";

  const overview = (results || []).map((r, i) => {
    const when = r?.createdAt ? formatDate(r.createdAt) : r?.completedAt ? formatDate(r.completedAt) : "—";
    return { key: r._id || r.resultId || i, label: r?.testType || `Test #${i + 1}`, date: when };
  });

  return (
    <div className="print-sanitize">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      {/* Cover */}
      <section className="page">
        <div className="container">
          <header className="doc-header card avoid-break">
            <div className="title">گزارش</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div className="subtitle">{fullName}</div>
              <div className="meta mt-8"><span>تاریخ تولید:</span><span className="dot" /><span>{nowStr}</span></div>
            </div>
          </header>

          {/* Personal info */}
          <section className="card avoid-break">
            <div className="section-title"><span className="pill">اطلاعات فردی</span><h3>پروفایل</h3></div>
            <div className="grid-3">
              <div className="kv"><span className="k">نام و نام خانوادگی:</span><span className="v">{fullName}</span></div>
              <div className="kv"><span className="k">سن:</span><span className="v">{p.age ?? "—"}</span></div>
              <div className="kv"><span className="k">کد ملی:</span><span className="v">{p.nationalId || p.nationalCode || "—"}</span></div>
              <div className="kv"><span className="k">تلفن:</span><span className="v">{p.phone || user?.phone || "—"}</span></div>
              <div className="kv"><span className="k">وضعیت تأهل:</span><span className="v">{p.single === true ? "مجرد" : p.single === false ? "متاهل" : "—"}</span></div>
              <div className="kv"><span className="k">شغل پدر:</span><span className="v">{p.fathersJob || "—"}</span></div>
              <div className="kv"><span className="k">تحصیلات:</span><span className="v">{p.education || p.degree || "—"}</span></div>
              <div className="kv"><span className="k">معدل دیپلم:</span><span className="v">{p.diplomaAverage ?? "—"}</span></div>
              <div className="kv"><span className="k">رشته تحصیلی:</span><span className="v">{p.field || "—"}</span></div>
              <div className="kv"><span className="k">دوره:</span><span className="v">{user?.period || "—"}</span></div>
              <div className="kv"><span className="k">استان:</span><span className="v">{p.province || "—"}</span></div>
              <div className="kv"><span className="k">شهر:</span><span className="v">{p.city || "—"}</span></div>
              <div className="kv full"><span className="k">تاریخ عضویت کاربر:</span><span className="v">{user?.createdAt ? formatDate(user.createdAt) : "—"}</span></div>
            </div>
          </section>

        {/* Overview */}
          <section className="card avoid-break">
            <div className="section-title"><span className="pill">نمای کلی آزمون‌ها</span><h3>برگه مسیر</h3></div>
            {overview.map((it) => (
              <div className="kv  tests-status " key={it.key}>
                <span className="badge">{it.label}</span><span className="v">• {it.date}</span>
              </div>
            ))}
          </section>

<br />
<br />
<br />
<br />
<br />
<br />
<br />

          {/* Jobs */}
          {jobsHTML && <section className="card " dangerouslySetInnerHTML={{ __html: jobsHTML }} />}

          
        </div>
      </section>

      {/* Details (each test on its own page) */}
      {(results || []).map((r, i) => {
        const when = r?.createdAt ? formatDate(r.createdAt) : r?.completedAt ? formatDate(r.completedAt) : "—";
        return (
          <section className="page " key={r._id || r.resultId || i}>
            <div className="container">
              <section className="card ">
                <br />
<br />
                <div className="section-title"><h3>تحلیل </h3><span className="pill">{r?.testType || "آزمون"}</span></div>
                <div className="meta mb-8"><span>تاریخ: {when}</span><span className="dot" /><span>کاربر: {fullName}</span></div>

                <div className=" analysis-compact">
                  {r?.analysis ? (
                    <ShowAnalysis testType={r.testType} analysisData={r.analysis} />
                  ) : (
                    <p className="muted">برای این آزمون هنوز آنالیز ثبت نشده است.</p>
                  )}
                </div>

                {r?.adminFeedback && (
                  <div className="card mt-12 avoid-break">
                    <h4>بازخورد ادمین</h4><p>{r.adminFeedback}</p>
                  </div>
                )}
              </section>
            </div>
          </section>
        );
      })}

      {/* <div className="footer">صفحه <span className="pageno"></span></div> */}
    </div>
  );
}

/* ========= Print & PDF actions ========= */
// src/print/PrintKit.jsx  — replace only usePrintActions() with this version
export function usePrintActions() {
  /* ---------------- helpers: layout & assets ---------------- */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitForImages(rootOrDoc) {
    const root = rootOrDoc.querySelector ? rootOrDoc : rootOrDoc.documentElement;
    const imgs = Array.from(root.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) =>
        img.complete
          ? 0
          : new Promise((res) => {
              img.addEventListener("load", res, { once: true });
              img.addEventListener("error", res, { once: true });
            })
      )
    );
    await Promise.all(imgs.map((img) => (img.decode ? img.decode().catch(() => {}) : 0)));
  }

  async function waitForStableLayout(node, frames = 6) {
    let stable = 0, last = node.scrollHeight;
    while (stable < frames) {
      await new Promise((r) => requestAnimationFrame(r));
      const cur = node.scrollHeight;
      stable = cur === last ? stable + 1 : 0;
      last = cur;
    }
  }

  async function waitForReady(doc, mountEl) {
    if (doc.fonts?.ready) { try { await doc.fonts.ready; } catch {} }
    await waitForImages(mountEl || doc);
    await waitForStableLayout(mountEl || doc.body, 6);
    await sleep(80);
  }

  /* ---------------- chart sizing & readiness ---------------- */
  // Give charts a real height if they’re responsive and currently 0×0.
  function ensureChartHeights(root, fallbackHeight = 300) {
    const nodes = root.querySelectorAll(".chart-wrap, canvas, svg");
    nodes.forEach((n) => {
      const r = n.getBoundingClientRect();
      if (r.height < 10) {
        const target = n.classList.contains("chart-wrap") ? n : n.parentElement || n;
        target.style.minHeight = `${fallbackHeight}px`;
        target.style.height = `${fallbackHeight}px`; // helps Chart.js responsive calc
      }
    });
  }

  async function waitForChartsReady(root, tries = 40, interval = 100) {
    function ok() {
      const nodes = root.querySelectorAll("canvas, svg");
      if (!nodes.length) return false;
      for (const n of nodes) {
        const r = n.getBoundingClientRect();
        if (r.width < 10 || r.height < 10) return false;
      }
      return true;
    }
    for (let i = 0; i < tries; i++) {
      ensureChartHeights(root);
      try { window.dispatchEvent(new Event("resize")); } catch {}
      await sleep(interval);
      if (ok()) return true;
    }
    return ok();
  }

  /* ---------------- rasterization (canvas/SVG → IMG) ---------------- */
  async function rasterizeCharts(root) {
    const undo = [];

    // tiny helper for tainted canvases (cross-origin images)
    async function safeCanvasToDataURL(canvas) {
      try {
        return canvas.toDataURL("image/png");
      } catch (e) {
        // fallback: render the canvas element with html2canvas
        const { default: html2canvas } = await import("html2canvas");
        const c = await html2canvas(canvas, {
          backgroundColor: null,
          scale: 2,
          useCORS: true,
          allowTaint: true,
        });
        return c.toDataURL("image/png");
      }
    }

    // Canvas (Chart.js) → IMG
    for (const c of root.querySelectorAll("canvas")) {
      const rect = c.getBoundingClientRect();
      if (rect.width < 5 || rect.height < 5) continue;

      // Make sure CSS height/width exist (so the image we insert has the same box)
      const cssW = c.style.width || rect.width + "px";
      const cssH = c.style.height || rect.height + "px";

      const dataUrl = await safeCanvasToDataURL(c);
      const img = document.createElement("img");
      img.src = dataUrl;
      img.alt = "chart";
      img.style.width = cssW;
      img.style.height = cssH;

      c.style.display = "none";
      c.parentNode.insertBefore(img, c);
      undo.push(() => { img.remove(); c.style.display = ""; });
    }

    // SVG (Recharts) → IMG
    for (const s of root.querySelectorAll("svg")) {
      const rect = s.getBoundingClientRect();
      if (rect.width < 5 || rect.height < 5) continue;

      // Inline width/height to preserve size
      const xml = new XMLSerializer().serializeToString(s);
      const b64 = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));

      const img = document.createElement("img");
      img.src = b64;
      img.alt = "chart";
      img.style.width = rect.width + "px";
      img.style.height = rect.height + "px";

      s.style.display = "none";
      s.parentNode.insertBefore(img, s);
      undo.push(() => { img.remove(); s.style.display = ""; });
    }

    return () => undo.forEach((fn) => fn());
  }

  /* ---------------- open window & print ---------------- */
  // CHANGE SIGNATURES to accept a title
function safeName(s, fallback = "report") {
  const str = (s || "").toString().trim() || fallback;
  return str.replace(/[\\/:*?"<>|]/g, "_");
}

// CHANGE SIGNATURES to accept a title
const renderToNewWindowAndPrint = async (makeNode, { title } = {}) => {
  const docTitle = safeName(title || "Report");

  const w = window.open("", "_blank");
  if (!w) throw new Error("Popup blocked");

  // use the title in the HTML AND set it again after write
  w.document.write(`<!doctype html><html lang="fa" dir="rtl">
    <head><meta charset="utf-8"/><title>${docTitle}</title></head>
    <body><div id="root" style="width:794px"></div></body></html>`);
  w.document.close();
  try { w.document.title = docTitle; } catch {}

  const node = await Promise.resolve(typeof makeNode === "function" ? makeNode() : makeNode);
  const mount = w.document.getElementById("root");
  const root = createRoot(mount);
  root.render(node);

  await waitForReady(w.document, mount);
  await waitForChartsReady(mount);
  const restore = await rasterizeCharts(mount);

  try { w.dispatchEvent(new Event("resize")); } catch {}
  await new Promise(r => setTimeout(r, 60));
  try { w.focus(); } catch {}
  w.print();

  w.onafterprint = () => {
    try { restore(); } catch {}
    try { root.unmount(); } catch {}
    try { w.close(); } catch {}
  };
};

const renderHiddenAndSavePdf = async (makeNode, { title, filename } = {}) => {
  const pdfName = filename || `${safeName(title || "Report")}.pdf`;

  const host = document.createElement("div");
  Object.assign(host.style, {
    position: "fixed", top: "0", left: "0",
    width: "794px", background: "#fff",
    opacity: "0.01", pointerEvents: "none", zIndex: "0",
  });
  document.body.appendChild(host);

  const node = await Promise.resolve(typeof makeNode === "function" ? makeNode() : makeNode);
  const root = createRoot(host);
  root.render(node);

  await waitForReady(document, host);
  await waitForChartsReady(host);
  const restore = await rasterizeCharts(host);

  let html2pdf = window.html2pdf;
  if (!html2pdf) {
    const mod = await import("html2pdf.js");
    html2pdf = mod?.default || mod;
    window.html2pdf = html2pdf;
  }

  await html2pdf().set({
    margin: 0,
    filename: pdfName, // ← use title here
    html2canvas: {
      scale: 2, useCORS: true, allowTaint: true,
      backgroundColor: "#ffffff", windowWidth: 794,
      foreignObjectRendering: true,
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"] },
  }).from(host).save();

  try { restore(); } catch {}
  try { root.unmount(); } catch {}
  host.remove();
};

  return { renderToNewWindowAndPrint, renderHiddenAndSavePdf };
}
