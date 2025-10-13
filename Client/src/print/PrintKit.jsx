// src/print/PrintKit.jsx
import React, { useRef } from "react";
import { createRoot } from "react-dom/client";
import ShowAnalysis from "../components/Common/ShowAnalysis";
import { rankJobsForUser, renderJobPriorityTableHTML } from "../utils/jobRanking";
import { jobRequirements } from "../services/dummyData";

/* ===================== Global Print CSS ===================== */
const PRINT_CSS = `
@page { size: A4; margin: 14mm; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { direction: rtl; background:#fff; color:#0f172a;
  font-family:"Vazirmatn",-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  line-height:1.6; font-size:12.25pt;
}

/* Layout */
.page { page-break-after: always; }
.page:last-child { page-break-after: auto; }
.container { display:grid; gap:14px; }
.card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:14px; }
.muted { color:#64748b; }
.grid-3 { display:grid; grid-template-columns: repeat(3, 1fr); gap:10px 18px; }
.full { grid-column:1/-1; }
.avoid-break { break-inside: avoid; page-break-inside: avoid; }

/* Headings */
.doc-header .title { margin:0 0 6px; font-size:22pt; font-weight:800; letter-spacing:-0.2px; }
.doc-header .subtitle { margin:0; font-weight:500; font-size:12.5pt; }
.meta { display:flex; gap:12px; align-items:center; color:#475569; font-size:11pt; }
.meta .dot { width:4px; height:4px; border-radius:50%; background:#cbd5e1; display:inline-block; }

.section-title { display:flex; align-items:center; gap:8px; margin:0 0 8px; }
.section-title .pill {
  background:#f1f5f9; color:#0f172a; border:1px solid #e2e8f0;
  border-radius:999px; padding:4px 10px; font-size:10.5pt; font-weight:600;
}
.section-title h3 { margin:0; font-size:14.5pt; }

/* Key–Value */
.kv { display:flex; gap:6px 8px; flex-wrap:wrap; }
.kv .k { color:#334155; font-weight:700; }
.kv .v { color:#0f172a; }

/* Tables */
.table {
  width:100%; border-collapse:separate; border-spacing:0;
  border:1px solid #e5e7eb; border-radius:10px; overflow:hidden; background:#fff;
  font-size:11.5pt;
}
.table thead th {
  background:#f8fafc; color:#0f172a; text-align:center; padding:8px 10px;
  border-bottom:1px solid #e5e7eb; font-weight:700;
}
.table tbody td {
  padding:8px 10px; text-align:center; border-bottom:1px solid #eef2f7;
}
.table tbody tr:nth-child(even) td { background:#fafafa; }
.table .num { font-variant-numeric: tabular-nums; }

/* Jobs table columns */
.table.jobs colgroup col:nth-child(1){ width:40px; }
.table.jobs colgroup col:nth-child(2){ width:auto; }
.table.jobs colgroup col:nth-child(3){ width:120px; }
.table.jobs colgroup col:nth-child(4){ width:45%; }

/* Badges */
.badge {
  display:inline-block; padding:3px 8px; border-radius:999px;
  background:#ecfeff; color:#155e75; border:1px solid #cffafe; font-weight:600; font-size:10.5pt;
}

/* Notes */
.note {
  background:#f8fafc; border:1px dashed #cbd5e1; color:#334155;
  border-radius:10px; padding:10px 12px; font-size:10.75pt;
}

/* Media scaling */
.card img, .card canvas, .card svg { max-width:100%; height:auto; }
.chart-hint { margin-top:8px; color:#64748b; font-size:10.75pt; }

/* Footer page number */
.footer {
  position: fixed; left:0; right:0; bottom:8mm; text-align:center; color:#94a3b8; font-size:10.5pt;
}
.footer .pageno::after { counter-increment: page; content: counter(page); }

/* Spacing utils */
.mt-8{ margin-top:8px } .mt-12{ margin-top:12px } .mb-8{ margin-bottom:8px } .mb-12{ margin-bottom:12px }

/* =================== SANITIZE FOR PRINT =================== */
/* ۱) هر چیزی که clickable/غیرضروریه در چاپ پنهان شه */
.print-sanitize button,
.print-sanitize .btn,
.print-sanitize [role="button"],
.print-sanitize .ant-btn,
.print-sanitize .ant-space,
.print-sanitize .ant-tooltip,
.print-sanitize a[data-print="hide"],
.print-sanitize .action-bar,
.print-sanitize .controls,
.print-sanitize .toolbar,
.print-sanitize .download,
.print-sanitize .csv,
.print-sanitize .print,
.print-sanitize .share,
.print-sanitize input,
.print-sanitize select,
.print-sanitize textarea { display:none !important; }

/* ۲) لینک‌های معمولی به متن ساده تبدیل شن */
.print-sanitize a { color: inherit; text-decoration: none; }

/* ۳) چارت‌های Recharts معمولاً height می‌خوان */
.print-sanitize .recharts-responsive-container { min-height: 240px; }
`;

/* ===================== Helpers for readiness ===================== */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForImages(docOrNode) {
  const root = docOrNode.querySelector ? docOrNode : docOrNode.documentElement;
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((res) => {
        img.addEventListener("load", res, { once: true });
        img.addEventListener("error", res, { once: true });
      });
    })
  );
  await Promise.all(imgs.map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve())));
}

async function waitForStableLayout(node, frames = 6) {
  let stableCount = 0;
  let last = node.scrollHeight;
  while (stableCount < frames) {
    await new Promise((r) => requestAnimationFrame(r));
    const cur = node.scrollHeight;
    stableCount = cur === last ? stableCount + 1 : 0;
    last = cur;
  }
}

async function waitForReady(doc, mountEl) {
  if (doc.fonts?.ready) await doc.fonts.ready;
  await waitForImages(mountEl || doc);
  await waitForStableLayout(mountEl || doc.body, 6);
  await sleep(120);
}

/* ===================== Public utils ===================== */
export const buildJobsHTML = (results) => {
  const ranked = rankJobsForUser(jobRequirements, results);
  return renderJobPriorityTableHTML(ranked);
};

/* ===================== Core Document ===================== */
export function PrintDocument({ user, results = [], formatDate, jobsHTML }) {
  const p = user?.profile || {};
  const fullName = p.fullName || user?.username || "—";
  const nowStr = formatDate?.(Date.now()) || "";

  const overview = (results || []).map((r, i) => {
    const when = r?.createdAt
      ? formatDate(r.createdAt)
      : r?.completedAt
      ? formatDate(r.completedAt)
      : "—";
    return { key: r._id || r.resultId || i, label: r?.testType || `Test #${i + 1}`, date: when };
  });

  return (
    <div className="print-sanitize">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      {/* ===== Cover ===== */}
      <section className="page">
        <div className="container">
          <header className="doc-header card avoid-break">
            <div className="title">گزارش</div>
            <div className="subtitle">{fullName}</div>
            <div className="meta mt-8">
              <span>تاریخ تولید:</span>
              <span className="dot" />
              <span>{nowStr}</span>
            </div>
          </header>

          {/* Personal info */}
          <section className="card avoid-break">
            <div className="section-title">
              <span className="pill">اطلاعات فردی</span>
              <h3>پروفایل</h3>
            </div>
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

          {/* Jobs (already clean HTML table from your util) */}
          {jobsHTML && (
            <section
              className="card avoid-break"
              dangerouslySetInnerHTML={{ __html: jobsHTML }}
            />
          )}

          {/* Overview */}
          <section className="card avoid-break">
            <div className="section-title">
              <span className="pill">نمای کلی آزمون‌ها</span>
              <h3>برگه مسیر</h3>
            </div>
            {overview.map((it) => (
              <div className="kv" key={it.key}>
                <span className="badge">{it.label}</span>
                <span className="v">• {it.date}</span>
              </div>
            ))}
          </section>
        </div>
      </section>

      {/* ===== Details: each analysis on its own page ===== */}
      {(results || []).map((r, i) => {
        const when = r?.createdAt
          ? formatDate(r.createdAt)
          : r?.completedAt
          ? formatDate(r.completedAt)
          : "—";
        return (
          <section className="page" key={r._id || r.resultId || i}>
            <div className="container">
              <section className="card avoid-break">
                <div className="section-title">
                  <span className="pill">{r?.testType || "آزمون"}</span>
                  <h3>تحلیل {r?.testType || "آزمون"}</h3>
                </div>

                <div className="meta mb-8">
                  <span>تاریخ: {when}</span>
                  <span className="dot" />
                  <span>کاربر: {fullName}</span>
                </div>

                {/* ShowAnalysis: internal buttons/toolbars will be hidden by .print-sanitize rules */}
                <div className="avoid-break">
                  {r?.analysis ? (
                    <ShowAnalysis testType={r.testType} analysisData={r.analysis} />
                  ) : (
                    <p className="muted">برای این آزمون هنوز آنالیز ثبت نشده است.</p>
                  )}
                </div>

                {r?.adminFeedback && (
                  <div className="card mt-12 avoid-break">
                    <h4>بازخورد ادمین</h4>
                    <p>{r.adminFeedback}</p>
                  </div>
                )}
              </section>
            </div>
          </section>
        );
      })}

      {/* Footer (page numbers) */}
      <div className="footer">
        صفحه <span className="pageno"></span>
      </div>
    </div>
  );
}

/* ===================== Print & PDF actions (robust) ===================== */
export function usePrintActions() {
  // Open popup synchronously, then render & wait
  const renderToNewWindowAndPrint = async (makeNode /* () => ReactNode */) => {
    const w = window.open("", "_blank");
    if (!w) throw new Error("Popup blocked");

    w.document.write(`<!doctype html><html lang="fa" dir="rtl"><head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Report</title>
    </head><body><div id="root"></div></body></html>`);
    w.document.close();

    const node = await Promise.resolve(typeof makeNode === "function" ? makeNode() : makeNode);
    const mount = w.document.getElementById("root");
    const root = createRoot(mount);
    root.render(node);

    await waitForReady(w.document, mount);
    await new Promise((r) => requestAnimationFrame(() => r()));
    try { w.focus(); } catch {}
    w.print();
    w.onafterprint = () => { try { w.close(); } catch {} };
  };

  // PDF with measurable host width for charts
  const renderHiddenAndSavePdf = async (makeNode /* () => ReactNode */, filename = "report.pdf") => {
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.top = "0";
    host.style.left = "0";
    host.style.width = "794px";  // ~A4 @96dpi
    host.style.zIndex = "-1";
    host.style.opacity = "0";    // invisible but measurable
    host.style.background = "#fff";
    document.body.appendChild(host);

    const node = await Promise.resolve(typeof makeNode === "function" ? makeNode() : makeNode);
    const root = createRoot(host);
    root.render(node);

    await waitForReady(document, host);

    let html2pdf = window.html2pdf;
    if (!html2pdf) {
      const mod = await import("html2pdf.js");
      html2pdf = mod?.default || mod;
      window.html2pdf = html2pdf;
    }
    const opt = {
      margin: 0,
      filename,
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        windowWidth: 794,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    };

    await html2pdf().set(opt).from(host).save();
    root.unmount();
    host.remove();
  };

  return { renderToNewWindowAndPrint, renderHiddenAndSavePdf };
}

/* ===================== Optional inline controls (dev/use) ===================== */
export function PrintControls({ user, results, formatDate }) {
  const { renderToNewWindowAndPrint, renderHiddenAndSavePdf } = usePrintActions();
  const isBusy = useRef(false);

  const handlePrint = async () => {
    if (isBusy.current) return; isBusy.current = true;
    try {
      await renderToNewWindowAndPrint(async () => {
        const jobsHTML = renderJobPriorityTableHTML(
          rankJobsForUser(jobRequirements, results)
        );
        return <PrintDocument user={user} results={results} formatDate={formatDate} jobsHTML={jobsHTML} />;
      });
    } finally { isBusy.current = false; }
  };

  const handleDownload = async () => {
    if (isBusy.current) return; isBusy.current = true;
    try {
      const file = `${(user?.profile?.fullName || "report").replace(/\s+/g,"_")}.pdf`;
      await renderHiddenAndSavePdf(async () => {
        const jobsHTML = renderJobPriorityTableHTML(
          rankJobsForUser(jobRequirements, results)
        );
        return <PrintDocument user={user} results={results} formatDate={formatDate} jobsHTML={jobsHTML} />;
      }, file);
    } finally { isBusy.current = false; }
  };

  return (
    <div style={{ display:"flex", gap:8 }}>
      <button className="btn primary" onClick={handlePrint}>چاپ</button>
      <button className="btn" onClick={handleDownload}>دانلود PDF</button>
    </div>
  );
}
