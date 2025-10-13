// UsersPage.jsx — Final Professional Version with Robust Print & PDF (Farsi + Charts)
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  getUsers,
  deleteUser,
  getUserResults,
  submitTestFeedback,
  createUser,
  getTestResults,
  deleteResult,
  analyzeTests,
  clearResultAnalysis,
} from "../../services/api";
import { useI18n } from "../../i18n";
import PrintChoiceModal from "../../components/User/PrintChoiceModal";

import ShowAnalysis from "../../components/Common/ShowAnalysis";
import SearchBar from "./UsersPage/SearchBar";
import UsersTable from "./UsersPage/UsersTable";
import UserProfileCard from "./UsersPage/UserProfileCard";
import ResultsTable from "./UsersPage/ResultsTable";
import FeedbackPanel from "./UsersPage/FeedbackPanel";

// Keep these if you use the jobs table on the cover; otherwise you can remove.
import { rankJobsForUser, renderJobPriorityTableHTML } from "../../utils/jobRanking";
import { jobRequirements } from "../../services/dummyData.js";

import "./UsersPage/usersPage.css";

/* ----------------------------------------------------------
   Helper Utilities (Fonts, Images, Next Paint, etc.)
---------------------------------------------------------- */
const nextPaint = (ms = 0) =>
  new Promise((r) => requestAnimationFrame(() => setTimeout(r, ms)));

async function waitForFonts(doc = document) {
  try {
    if (doc.fonts?.ready) await doc.fonts.ready;
  } catch {}
}

async function waitForImages(rootEl) {
  const imgs = Array.from(rootEl.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete) return;
      return new Promise((res) => {
        img.onload = img.onerror = () => res();
      });
    })
  );
}

/* ----------------------------------------------------------
   Small helpers (RTL-aware dates, safe HTML, clamping)
---------------------------------------------------------- */
const MAX_LIST_ITEMS = 8;   // هر لیست در یک صفحه جا شود
const MAX_TABLE_ROWS = 12;  // هر جدول در یک صفحه جا شود

const clampList = (arr = [], n = MAX_LIST_ITEMS) => {
  if (!Array.isArray(arr)) return [];
  return arr.length <= n ? arr : [...arr.slice(0, n), "…"];
};
const clampTablePairs = (obj = {}, n = MAX_TABLE_ROWS) => {
  const entries = Object.entries(obj || {});
  if (entries.length <= n) return entries;
  return [...entries.slice(0, n), ["…", "…"]];
};

const escapeHTML = (str = "") =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

// Persian number/percent format
const toFa = (v) => {
  const n = typeof v === "number" ? v : Number(v || 0);
  return Number.isFinite(n) ? n.toLocaleString("fa-IR") : String(v ?? "—");
};
const toFaPercent = (v) => `${toFa(Math.round(Number(v || 0)))}٪`;

// Flatten {E:60,I:40} / {percent:63} / {score:63} → single number
function flattenNormalizedScores(norm) {
  const out = {};
  Object.entries(norm || {}).forEach(([k, v]) => {
    if (v == null) return;

    if (typeof v === "number") { out[k] = v; return; }

    if (typeof v === "object") {
      if (typeof v.percent === "number") { out[k] = v.percent; return; }
      if (typeof v.score   === "number") { out[k] = v.score;   return; }

      const pairs = Object.entries(v).filter(([, n]) => typeof n === "number");
      if (pairs.length === 2) {
        out[k] = Math.max(pairs[0][1], pairs[1][1]); // MBTI-like dominant side
        return;
      } else if (pairs.length) {
        const sum = pairs.reduce((s, [, n]) => s + n, 0);
        out[k] = sum / pairs.length;
        return;
      }
    }

    out[k] = Number(v) || 0;
  });
  return out;
}

// Gardner code → Persian label
function mapGardnerLabel(code) {
  const key = String(code || "").toLowerCase();
  const map = {
    l: "زبانی (Linguistic)",
    lm: "منطقی‌ـ‌ریاضی (Logical)",
    logical: "منطقی‌ـ‌ریاضی (Logical)",
    math: "منطقی‌ـ‌ریاضی (Logical)",
    m: "موسیقایی (Musical)",
    mu: "موسیقایی (Musical)",
    s: "فضایی‌ـ‌دیداری (Spatial)",
    b: "بدنی‌ـ‌جنبشی (Bodily-Kinesthetic)",
    i: "بین‌فردی (Interpersonal)",
    in: "درون‌فردی (Intrapersonal)",
    n: "طبیعت‌گرا (Naturalistic)"
  };
  return map[key] || code;
}

const renderBullets = (list) => {
  const arr = clampList(Array.isArray(list) ? list : []);
  if (!arr.length) return `<p class="muted">—</p>`;
  return `<ul>${arr.map((x) => `<li>${escapeHTML(String(x))}</li>`).join("")}</ul>`;
};

const tableFromPairs = (pairs, keyTitle, valTitle) => {
  if (!pairs?.length) return `<p class="muted">—</p>`;
  const rows = pairs
    .map(([k, v]) => {
      const val = typeof v === "number" ? toFaPercent(v) : escapeHTML(String(v));
      return `<tr><td>${escapeHTML(String(k))}</td><td>${val}</td></tr>`;
    })
    .join("");
  return `<table class="scores"><thead><tr><th>${escapeHTML(
    keyTitle
  )}</th><th>${escapeHTML(valTitle)}</th></tr></thead><tbody>${rows}</tbody></table>`;
};

/* --------------------------------------------------------
   Normalize each test result for the printable report
   (فقط از آنالیز نتایج؛ بدون نمرات خام) + chart payload
---------------------------------------------------------*/
function normalizeResultForReport(result = {}) {
  const a  = result.analysis || {};
  const df = a.dataForUI || {};
  const title = result.testType || a.test || "آزمون";
  const createdAt =
    result.createdAt || a.analyzedAt || df.analyzedAt || result.completedAt;

  const summary =
    a.summary || a.overall || a.overview || df.summary || a.takeaways || a.highlights || "";

  // Base normalized scores
  let norm = a.normalizedScores || df.normalizedScores || null;

  // Fallback to chartData
  if (!norm && df.chartData?.labels && df.chartData?.datasets?.[0]?.data?.length) {
    const labels = df.chartData.labels;
    const data = df.chartData.datasets[0].data;
    const tmp = {};
    labels.forEach((name, i) => (tmp[name] = Number(data[i] ?? 0)));
    norm = tmp;
  }

  // Flatten objects like {E:60, I:40}
  if (norm) norm = flattenNormalizedScores(norm);

  const strengths = a.strengths || [];
  const weaknesses = a.weaknesses || a.challenges || [];
  const recommendations = a.recommendations || a.suggestions || a.tips || [];

  // Special sections
  const kindU = String(title).toUpperCase();
  const special = {};
  if (kindU.includes("GARDNER")) {
    special.kind = "GARDNER";
    const topRaw = a.topIntelligences || df.topIntelligences || [];
    special.top = (Array.isArray(topRaw) ? topRaw : [topRaw]).map(mapGardnerLabel);
  } else if (kindU.includes("CLIFTON")) {
    special.kind = "CLIFTON";
    special.top = a.topThemes || df.topThemes || [];
    special.signature = a.signatureTheme || df.signatureTheme || "";
  }

  // Chart data
  let chart = null;
  if (norm && Object.keys(norm).length) {
    const labels = Object.keys(norm);
    const data = labels.map((k) => Number(norm[k] ?? 0));
    const type = labels.length > 5 ? "radar" : "bar";
    chart = { type, labels, datasets: [{ label: "نمره نرمال‌شده", data }] };
  }

  return { title, createdAt, summary, norm, strengths, weaknesses, recommendations, special, chart };
}

/* --------------------------------------------------------
   Build full printable HTML (جلد: اطلاعات شخصی کامل)
   و برای هر آزمون حداکثر یک A4 (به‌همراه نمودار و نمرات نرمال‌شده)
---------------------------------------------------------*/
function buildPrintableHTML({ user, results, formatDate }) {
  const p = user?.profile || {};
  const fullName   = p.fullName || user?.username || "—";
  const nowStr     = formatDate(Date.now());

  // اطلاعات شخصی کامل برای جلد
  const age        = p.age ?? "—";
  const nationalId = p.nationalId || p.nationalCode || "—";
  const phone      = p.phone || user?.phone || "—";
  const marital    = p.single === true ? "مجرد" : p.single === false ? "متاهل" : "—";
  const education  = p.education || p.degree || "—";
  const diplomaAvg = p.diplomaAverage ?? "—";
  const field      = p.field || "—";
  const fathersJob = p.fathersJob || "—";
  const period     = user?.period || "—";
  const province   = p.province || "—";
  const city       = p.city || "—";
  const createdAt  = user?.createdAt ? formatDate(user.createdAt) : "—";

  const safeResults = (results || []).filter(Boolean);

  // Optional job suggestions
  let jobsHTML = "";
  try {
    const ranked = rankJobsForUser(jobRequirements, results);
    jobsHTML = renderJobPriorityTableHTML(ranked);
  } catch {
    // ignore if utils not present
  }

  const head = `
    <head>
      <meta charset="utf-8" />
      <title>${escapeHTML(fullName)} - کارنامه‌ی کامل</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;600;700&display=swap">
      <style>
        @page { size: A4; margin: 14mm; }
        html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { direction: rtl; font-family: "Vazirmatn", -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#0f172a; }
        .page { page-break-after: always; break-after: page; }
        .card { border:1px solid #e5e7eb; border-radius:10px; padding:10px; }
        .muted { color:#64748b; }
        h1,h2,h3 { margin:0 0 8px; }
        .grid { display:grid; gap:10px; }
        .two { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .row3 { display:grid; grid-template-columns: repeat(3, 1fr); gap:8px 16px; }
        .meta { font-size:12px; color:#475569; display:flex; gap:12px; align-items:baseline; }
        ul { margin:6px 0 0 18px; }
        table.scores { width:100%; border-collapse: collapse; border:1px solid #e5e7eb; margin-top:6px; }
        table.scores th, table.scores td { padding:6px 8px; border-bottom:1px solid #eef2f7; text-align:center; }
        /* print-safety */
        .card, .grid > *, canvas, h2, h3, table, ul, .meta { break-inside: avoid; -webkit-column-break-inside: avoid; }
        table.scores thead { display: table-header-group; }
        canvas { width: 100%; height: 360px; display:block; }
      </style>
    </head>
  `;

  // Cover
  const cover = `
    <section class="page">
      <div class="grid">
        <div>
          <span class="muted">گزارش</span>
          <h1>${escapeHTML(fullName)}</h1>
          <div class="meta"><span>تاریخ تولید:</span> ${escapeHTML(nowStr)}</div>
        </div>

        <div class="card">
          <h3>اطلاعات فردی</h3>
          <div class="row3">
            <div><strong>نام و نام خانوادگی:</strong> ${escapeHTML(fullName)}</div>
            <div><strong>سن:</strong> ${escapeHTML(String(age))}</div>
            <div><strong>کد ملی:</strong> ${escapeHTML(nationalId)}</div>

            <div><strong>تلفن:</strong> ${escapeHTML(phone)}</div>
            <div><strong>وضعیت تأهل:</strong> ${escapeHTML(marital)}</div>
            <div><strong>شغل پدر:</strong> ${escapeHTML(fathersJob)}</div>

            <div><strong>تحصیلات:</strong> ${escapeHTML(education)}</div>
            <div><strong>معدل دیپلم:</strong> ${escapeHTML(String(diplomaAvg))}</div>
            <div><strong>رشته تحصیلی:</strong> ${escapeHTML(field)}</div>

            <div><strong>دوره:</strong> ${escapeHTML(period)}</div>
            <div><strong>استان:</strong> ${escapeHTML(province)}</div>
            <div><strong>شهر:</strong> ${escapeHTML(city)}</div>

            <div style="grid-column:1 / -1;">
              <strong>تاریخ عضویت کاربر:</strong> ${escapeHTML(createdAt)}
            </div>
          </div>
        </div>

        ${jobsHTML ? `<div class="card">${jobsHTML}</div>` : ""}

        <div class="card">
          <h3>نمای کلی آزمون‌ها</h3>
          ${
            safeResults.length
              ? `<ul>${safeResults
                  .map((r, i) => {
                    const tt = r?.testType || `Test #${i + 1}`;
                    const dt = r?.createdAt
                      ? formatDate(r.createdAt)
                      : r?.completedAt
                      ? formatDate(r.completedAt)
                      : "—";
                    return `<li><strong>${escapeHTML(tt)}</strong> • ${escapeHTML(dt)}</li>`;
                  })
                  .join("")}</ul>`
              : `<p class="muted">—</p>`
          }
        </div>
      </div>
    </section>
  `;

  // Tests pages
  const chartPayload = [];
  const tests = safeResults
    .map((r, idx) => {
      const n = normalizeResultForReport(r);
      const when = n.createdAt
        ? formatDate(n.createdAt)
        : r?.completedAt
        ? formatDate(r.completedAt)
        : "—";

      // Optional: prettier MBTI axis names
      const prettyAxis = (k) => ({
        EI: "برون‌گرایی/درون‌گرایی",
        SN: "حسی/شهودی",
        TF: "فکری/احساسی",
        JP: "داوری/ادراک",
      }[k] || k);

      const normPairs = n.norm
        ? clampTablePairs(
            Object.fromEntries(Object.entries(n.norm).map(([k, v]) => [prettyAxis(k), v]))
          )
        : null;
      const normTable = normPairs ? tableFromPairs(normPairs, "شاخص", "درصد") : "";

      const specialHTML =
        n.special?.kind === "GARDNER"
          ? (n.special.top?.length
              ? `<div class="card"><h3>گاردنر</h3><p><strong>هوش‌های برتر:</strong> ${escapeHTML(
                  n.special.top.join("، ")
                )}</p></div>`
              : "")
          : n.special?.kind === "CLIFTON"
          ? `<div class="card"><h3>کلیفتون</h3>${
              n.special.signature
                ? `<p><strong>تم اصلی:</strong> ${escapeHTML(n.special.signature)}</p>`
                : ""
            }${
              n.special.top?.length
                ? `<p><strong>تم‌های برتر:</strong> ${escapeHTML(n.special.top.join("، "))}</p>`
                : ""
            }</div>`
          : "";

      const chartHTML = n.chart
        ? `<div class="card">
             <h3>نمودار</h3>
             <canvas id="chart-${idx}" width="760" height="360" aria-label="نمودار ${escapeHTML(
                n.title
              )}" role="img"></canvas>
           </div>`
        : "";

      if (n.chart) {
        chartPayload.push({
          id: `chart-${idx}`,
          type: n.chart.type,
          labels: n.chart.labels,
          datasets: n.chart.datasets,
        });
      }

      return `
        <section class="page">
          <header class="meta">
            <h2 style="margin-left:auto">${escapeHTML(n.title)}</h2>
            <div>تاریخ: ${escapeHTML(when)}</div>
          </header>
          <div class="grid">
            <div class="card">
              <h3>خلاصه تحلیل</h3>
              <p>${escapeHTML(n.summary || "—")}</p>
            </div>
            ${normTable ? `<div class="card"><h3>نمرات نرمال‌شده</h3>${normTable}</div>` : ""}
            ${chartHTML}
            <div class="two">
              <div class="card"><h3>نقاط قوت</h3>${renderBullets(n.strengths)}</div>
              <div class="card"><h3>نقاط قابل بهبود</h3>${renderBullets(n.weaknesses)}</div>
            </div>
            ${specialHTML}
            ${
              r?.adminFeedback
                ? `<div class="card"><h3>بازخورد ادمین</h3><p>${escapeHTML(r.adminFeedback)}</p></div>`
                : ""
            }
          </div>
        </section>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html lang="fa" dir="rtl">
      ${head}
      <body>
        ${cover}
        ${tests}

        <!-- Chart configs for this document -->
        <script id="__chart_payload__" type="application/json">${escapeHTML(
          JSON.stringify(chartPayload)
        )}</script>

        <!-- Chart.js (CDN) + renderer (auto-RTL, fa-IR digits) -->
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
        <script>
          (function(){
            const payloadEl = document.getElementById("__chart_payload__");
            if (!payloadEl) return;
            let charts = [];
            try { charts = JSON.parse(payloadEl.textContent || "[]"); } catch(e){ charts = []; }

            const toFa = (v) => (typeof v === "number" ? v : Number(v || 0)).toLocaleString("fa-IR");

            const commonOpts = {
              responsive: true,
              animation: false,
              maintainAspectRatio: false,
              locale: "fa-IR",
              plugins: {
                legend: { display: true, rtl: true, labels: { font: { family: "Vazirmatn" } } },
                title:   { display: false }
              },
              layout: { padding: 8 },
              scales: {
                r: {
                  suggestedMin: 0, suggestedMax: 100,
                  pointLabels: { font: { family: "Vazirmatn" } },
                  ticks: { callback: (v) => toFa(v), showLabelBackdrop: false }
                },
                x: {
                  ticks: { callback: (v, i, ticks) => (ticks[i]?.label ?? ""), font: { family: "Vazirmatn" } }
                },
                y: {
                  suggestedMin: 0, suggestedMax: 100,
                  ticks: { callback: (v) => toFa(v), font: { family: "Vazirmatn" } }
                }
              }
            };

            function render() {
              charts.forEach((cfg) => {
                const el = document.getElementById(cfg.id);
                if (!el) return;
                const ctx = el.getContext("2d");
                const ds = (cfg.datasets || []).map(d => ({ ...d, borderWidth: 1 }));

                const opts = JSON.parse(JSON.stringify(commonOpts));
                const type = (cfg.type || "bar").toLowerCase();
                if (type === "radar") { delete opts.scales.x; delete opts.scales.y; } else { delete opts.scales.r; }

                new Chart(ctx, {
                  type,
                  data: { labels: cfg.labels || [], datasets: ds },
                  options: opts
                });
              });
              window.__chartsReady__ = true;
            }

            if (document.readyState === "complete" || document.readyState === "interactive") {
              setTimeout(render, 0);
            } else {
              document.addEventListener("DOMContentLoaded", render, { once:true });
            }
          })();
        </script>
      </body>
    </html>
  `;
}

/* ----------------------------------------------------------
   Fetch results with full analyses (if missing)
---------------------------------------------------------- */
async function fetchResultsWithAnalyses(list = [], getTestResultsFn) {
  const items = Array.isArray(list) ? list : [];
  const out = [];
  for (const r of items) {
    if (r?.analysis) { out.push(r); continue; }
    const id = r?.resultId || r?._id;
    if (!id) { out.push(r); continue; }
    try {
      const full = await getTestResultsFn(id);
      const data = full?.data ?? full ?? r;
      out.push({ ...r, ...data });
    } catch {
      out.push(r);
    }
  }
  return out;
}

/* ----------------------------------------------------------
   Safe file name helper
---------------------------------------------------------- */
const safeFileName = (s = "report") =>
  String(s).replace(/[\\/:*?"<>|]+/g, "_").slice(0, 100);

/* ========================================================
   Component
======================================================== */
const UsersPage = () => {
  const { t } = useI18n();

  // data
  const [users, setUsers] = useState([]);
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);

  // ui
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddRow, setShowAddRow] = useState(false);

  // bulk analyze ui
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [bulkErrors, setBulkErrors] = useState([]);

  // search
  const [search, setSearch] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  // print modal
  const [printOpen, setPrintOpen] = useState(false);
  const [printing, setPrinting] = useState(false);

  // new user form
  const [newUser, setNewUser] = useState({
    fullName: "",
    period: "",
    username: "",
    role: "user",
    password: "",
  });

  // feedback
  const [feedback, setFeedback] = useState("");

  // load users
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const list = await getUsers();
        const nonAdmin = (list || []).filter((u) => u.role !== "admin");
        if (!ignore) setUsers(nonAdmin);
      } catch {
        if (!ignore) setError(t("usersPage.loadError"));
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [t]);

  // when selecting a user, fetch results
  useEffect(() => {
    (async () => {
      if (!selectedUser) return;
      try {
        const _results =
          (await getUserResults(selectedUser._id)) ||
          selectedUser.testsAssigned ||
          [];
        setUserResults(_results);
      } catch {
        setUserResults(selectedUser.testsAssigned || []);
      }
    })();
  }, [selectedUser]);

  // helpers
  const formatDate = useCallback((time) => {
    return new Date(time).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // search
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    const pick = (v) => (v || "").toString().toLowerCase();
    return users.filter((u) => {
      switch (searchFilter) {
        case "name":
          return pick(u.profile?.fullName).includes(q);
        case "username":
          return pick(u.username).includes(q);
        case "period":
          return pick(u.period).includes(q);
        case "role":
          return pick(u.role).includes(q);
        case "job":
          return pick(u.profile?.jobPosition).includes(q);
        case "province":
          return pick(u.profile?.province).includes(q);
        default:
          return (
            pick(u.profile?.fullName).includes(q) ||
            pick(u.username).includes(q) ||
            pick(u.role).includes(q) ||
            pick(u.profile?.jobPosition).includes(q) ||
            pick(u.profile?.province).includes(q)
          );
      }
    });
  }, [users, search, searchFilter]);

  // actions
  const handleAddUser = async () => {
    try {
      const res = await createUser({
        fullName: newUser.fullName,
        username: newUser.username,
        period: newUser.period,
        password: newUser.password,
        role: newUser.role,
      });

      alert(res.message || t("usersPage.addSuccess"));
      if (res.user) setUsers((prev) => [...prev, res.user]);
      setNewUser({
        fullName: "",
        period: "",
        username: "",
        role: "user",
        password: "",
      });
      setShowAddRow(false);
    } catch (err) {
      alert(err?.response?.message || t("usersPage.addFailure"));
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm(t("usersPage.deleteUserConfirm"))) return;
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u._id !== id));
      if (selectedUser?._id === id) {
        setSelectedUser(null);
        setUserResults([]);
      }
    } catch {
      alert(t("usersPage.deleteUserFailure"));
    }
  };

  const handleSelectResult = async (resultId) => {
    try {
      const res = await getTestResults(resultId);
      const data = res?.data ?? res;
      setSelectedResult(data);
    } catch {
      alert(t("usersPage.selectResultError"));
    }
  };

  const handleDeleteUserResult = async (resultId) => {
    if (!window.confirm(t("usersPage.deleteResultConfirm"))) return;
    try {
      await deleteResult(resultId);
      setUserResults((prev) =>
        prev.filter((r) => r.resultId !== resultId && r._id !== resultId)
      );
      if (selectedResult?._id === resultId) setSelectedResult(null);
    } catch {
      alert(t("usersPage.deleteResultFailure"));
    }
  };

  const handleCheckTest = async (result) => {
    try {
      const { resultId, testType } = result;
      await analyzeTests({ resultId, testType });
      alert(t("usersPage.analyzeSuccess"));
    } catch {
      alert(t("usersPage.analyzeFailure"));
    }
  };

  const handleRemoveResultAnalysis = async (resultId) => {
    const confirmMessage =
      t("usersPage.deleteAnalysisConfirm") ||
      "Remove the analysis for this result?";
    if (!window.confirm(confirmMessage)) return;

    try {
      await clearResultAnalysis(resultId);

      setUserResults((prev) =>
        prev.map((entry) => {
          const id = entry?.resultId || entry?._id;
          if (id !== resultId) return entry;
          const next = { ...entry };
          delete next.analysis;
          delete next.analyzedAt;
          delete next.score;
          return next;
        })
      );

      setSelectedResult((prev) => {
        if (!prev) return prev;
        const id = prev._id || prev.resultId;
        if (id !== resultId) return prev;
        const next = { ...prev };
        delete next.analysis;
        delete next.analyzedAt;
        delete next.score;
        return next;
      });

      alert(t("usersPage.deleteAnalysisSuccess") || "Analysis removed.");
    } catch {
      alert(
        t("usersPage.deleteAnalysisFailure") ||
          "Unable to remove the analysis."
      );
    }
  };

  // analyze all
  const handleAnalyzeAll = async () => {
    if (!selectedUser) return;

    const items = (userResults || []).filter(
      (r) => r && (r.resultId || r._id) && r.testType
    );

    if (items.length === 0) {
      alert(t("usersPage.noResultsToAnalyze") || "No results to analyze.");
      return;
    }

    setBulkAnalyzing(true);
    setBulkErrors([]);
    setBulkProgress({ done: 0, total: items.length });

    for (let i = 0; i < items.length; i++) {
      const r = items[i];
      const resultId = r.resultId || r._id;
      try {
        await analyzeTests({ resultId, testType: r.testType });
      } catch (e) {
        const message =
          e?.response?.data?.message ||
          e?.message ||
          t("usersPage.analyzeFailure");
        setBulkErrors((prev) => [...prev, { resultId, message }]);
      } finally {
        setBulkProgress({ done: i + 1, total: items.length });
      }
    }

    try {
      const refreshed = await getUserResults(selectedUser._id);
      setUserResults(refreshed || []);
      setSelectedResult(null);
    } catch {
      // ignore
    }

    setBulkAnalyzing(false);

    if (bulkErrors.length === 0) {
      alert(t("usersPage.analyzeAllDone") || "All analyses completed.");
    } else {
      alert(
        (t("usersPage.analyzeAllDoneWithErrors") ||
          "Done with some errors.") +
          ` (${bulkErrors.length})`
      );
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim() || !selectedResult || !selectedUser) return;
    try {
      await submitTestFeedback({
        userId: selectedUser._id,
        resultId: selectedResult._id,
        feedback,
      });
      alert(t("usersPage.feedbackSuccess"));
      setFeedback("");
      setSelectedResult(null);
      const refreshed = await getUserResults(selectedUser._id);
      setUserResults(refreshed || []);
    } catch {
      alert(t("usersPage.feedbackFailure"));
    }
  };

  /* -------------------- Print / Download -------------------- */
  const openPrintDialog = () => setPrintOpen(true);
  const closePrintDialog = () => setPrintOpen(false);

  // ساخت HTML با اطمینان از اینکه آنالیزها وجود دارند
  const buildHTMLWithPrefetch = async () => {
    const resultsReady = await fetchResultsWithAnalyses(
      userResults,
      getTestResults
    );
    return buildPrintableHTML({
      user: selectedUser,
      results: resultsReady,
      formatDate,
    });
  };

  const doPrint = async () => {
  if (!selectedUser) return;
  try {
    setPrinting(true);

    // 1) Build HTML for print (your existing builder)
    const resultsReady = await fetchResultsWithAnalyses(userResults, getTestResults);
    const html = buildPrintableHTML({ user: selectedUser, results: resultsReady, formatDate });

    // 2) Create a hidden iframe (NOT display:none; it must be in the layout)
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    // 3) Write the printable HTML into the iframe doc
    const win = iframe.contentWindow;
    const doc = win.document;
    doc.open();
    doc.write(html);
    doc.close();

    // 4) Wait for fonts & charts inside the iframe (same logic as popup version)
    const waitCharts = () =>
      new Promise((res) => {
        const check = () => (win.__chartsReady__ ? res() : setTimeout(check, 80));
        check();
      });

    try { if (doc.fonts?.ready) await doc.fonts.ready; } catch {}
    await waitCharts();
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 100)));

    // 5) Focus & open native print dialog (exactly like Ctrl+P)
    win.focus();
    win.print();

    // 6) Cleanup after print
    const cleanup = () => {
      try {
        window.removeEventListener("focus", cleanup); // fallback for browsers without afterprint
        if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
      } catch {}
    };
    // Prefer afterprint if available
    if ("onafterprint" in win) {
      win.addEventListener("afterprint", cleanup, { once: true });
    } else {
      // Fallback: when tab regains focus, remove iframe
      window.addEventListener("focus", cleanup, { once: true });
    }
  } finally {
    setPrinting(false);
    closePrintDialog();
  }
};


  // --- مسیر دانلود PDF با html2pdf (المان واقعیِ متصل به DOM) — FIXED, NO BLANK PAGES
  const doDownload = async () => {
    try {
      setPrinting(true);
      const html = await buildHTMLWithPrefetch();

      // 1) Extract body & style
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const bodyInner = bodyMatch ? bodyMatch[1] : html; // fallback
      const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
      const styleText = styleMatch ? styleMatch[1] : "";

      // 2) Create host (NOT display:none)
      const host = document.createElement("div");
      host.setAttribute("dir","rtl");
      host.id = "pdf-host";
      host.style.position = "fixed";
      host.style.left = "-99999px";
      host.style.top = "0";
      host.style.background = "#fff";
      host.style.width = "794px"; // A4 ~96dpi
      host.style.boxSizing = "border-box";
      host.innerHTML = (styleText ? `<style>${styleText}</style>` : "") + bodyInner;
      document.body.appendChild(host);

      // 3) If there is chart payload inside host, render charts here
      async function loadChartJs() {
        if (window.Chart) return;
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js";
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      async function renderChartsInHost() {
        const payloadEl = host.querySelector("#__chart_payload__");
        if (!payloadEl) return;
        let charts = [];
        try { charts = JSON.parse(payloadEl.textContent || "[]"); } catch { charts = []; }
        if (!charts.length) return;

        await loadChartJs();

        const toFaLocal = (v) => (typeof v === "number" ? v : Number(v || 0)).toLocaleString("fa-IR");
        const commonOpts = {
          responsive: true,
          animation: false,
          maintainAspectRatio: false,
          locale: "fa-IR",
          plugins: {
            legend: { display: true, rtl: true, labels: { font: { family: "Vazirmatn" } } },
            title: { display: false }
          },
          layout: { padding: 8 },
          scales: {
            r: { suggestedMin: 0, suggestedMax: 100, pointLabels: { font: { family: "Vazirmatn" } }, ticks: { callback: (v)=>toFaLocal(v), showLabelBackdrop:false } },
            x: { ticks: { callback: (v,i,t)=>t[i]?.label ?? "", font: { family: "Vazirmatn" } } },
            y: { suggestedMin: 0, suggestedMax: 100, ticks: { callback: (v)=>toFaLocal(v), font: { family: "Vazirmatn" } } }
          }
        };

        charts.forEach((cfg) => {
          const el = host.querySelector(`#${CSS.escape(cfg.id)}`);
          if (!el) return;
          const ctx = el.getContext("2d");
          const ds = (cfg.datasets || []).map(d => ({ ...d, borderWidth: 1 }));
          const opts = JSON.parse(JSON.stringify(commonOpts));
          const type = (cfg.type || "bar").toLowerCase();
          if (type === "radar") { delete opts.scales.x; delete opts.scales.y; } else { delete opts.scales.r; }

          new window.Chart(ctx, { type, data: { labels: cfg.labels || [], datasets: ds }, options: opts });
        });

        await nextPaint(50);
      }

      // 4) Wait for layout, fonts, images, charts
      await nextPaint(0);
      await waitForFonts(document);
      await waitForImages(host);
      await renderChartsInHost();

      // 5) Ensure html2pdf present
      let html2pdf = window.html2pdf;
      if (!html2pdf) {
        const mod = await import("html2pdf.js");
        html2pdf = mod?.default || mod;
        window.html2pdf = html2pdf;
      }

      // 6) Export
      const opt = {
        margin: 0,
        filename: `${safeFileName(selectedUser?.profile?.fullName || "report")}.pdf`,
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: false,   // avoid tainted canvas → blank
          backgroundColor: "#ffffff",
          windowWidth: 794
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      };

      await html2pdf().set(opt).from(host).save();

      document.body.removeChild(host);
    } catch (e) {
      console.error("PDF export failed:", e);
      alert(t("usersPage.pdfExportFailed") || "خطا در ساخت PDF");
    } finally {
      setPrinting(false);
      closePrintDialog();
    }
  };

  /* -------------------- Render -------------------- */
  if (selectedUser) {
    return (
      <div className="admin-users-container">
        <div className="user-results-layout">
          <header className="user-results-header">
            <div className="user-title">
              <h2>{t("usersPage.selectedTitle")}</h2>
              <h2 className="user-name">{selectedUser?.profile?.fullName}</h2>
            </div>

            <div className="user-actions">
              <button
                style={{ background: "var(--secondary)" }}
                className="btn"
                onClick={handleAnalyzeAll}
                disabled={bulkAnalyzing}
                title={
                  bulkAnalyzing ? `${bulkProgress.done}/${bulkProgress.total}` : ""
                }
              >
                {bulkAnalyzing
                  ? `${t("usersPage.analyzing")} ${bulkProgress.done}/${bulkProgress.total}`
                  : t("usersPage.analyzeAll")}
              </button>

              <button className="btn primary" onClick={openPrintDialog}>
                {t("usersPage.printResume")}
              </button>

              <button
                style={{ color: "var(--text)" }}
                className="btn danger"
                onClick={() => setSelectedUser(null)}
              >
                {t("usersPage.back")}
              </button>
            </div>
          </header>

          <PrintChoiceModal
            open={printOpen}
            busy={printing}
            title="خروجی کارنامه"
            message="می‌خواهید گزارش چاپ شود یا به صورت PDF دانلود گردد؟"
            printLabel="چاپ"
            downloadLabel="دانلود PDF"
            cancelLabel="انصراف"
            onPrint={printing ? undefined : doPrint}
            onDownload={printing ? undefined : doDownload}
            onCancel={printing ? undefined : () => setPrintOpen(false)}
            dir="rtl"
          />

          <div className="user-results-body">
            <aside className="user-side">
              <UserProfileCard user={selectedUser} />
            </aside>

            <main className="user-main">
              <ResultsTable
                results={userResults}
                formatDate={formatDate}
                onDelete={handleDeleteUserResult}
                onSelectResult={handleSelectResult}
                onAnalyze={handleCheckTest}
                onRemoveAnalysis={handleRemoveResultAnalysis}
                selectedResultId={selectedResult?._id || selectedResult?.resultId}
              />

              {selectedResult && (
                <section className="feedback-section card">
                  {selectedResult?.analysis && (
                    <div className="analysis-wrap">
                      <h4>
                        {t("usersPage.analysisHeading", {
                          testType: selectedResult.testType,
                        })}
                      </h4>
                      <ShowAnalysis
                        testType={selectedResult.testType}
                        analysisData={selectedResult.analysis}
                      />
                    </div>
                  )}

                  <FeedbackPanel
                    show={!selectedResult?.adminFeedback}
                    value={feedback}
                    onChange={setFeedback}
                    onSubmit={handleSubmitFeedback}
                    onCancel={() => {
                      setSelectedResult(null);
                      setFeedback("");
                    }}
                  />
                </section>
              )}
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-users-container">
      <section className="admin-users-section card">
        <header className="section-head">
          <h2>{t("usersPage.title")}</h2>
        </header>

        {loading ? (
          <p>{t("usersPage.loadingList")}</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          <>
            <SearchBar
              search={search}
              setSearch={setSearch}
              searchFilter={searchFilter}
              setSearchFilter={setSearchFilter}
            />

            <UsersTable
              users={filteredUsers}
              onView={(u) => setSelectedUser(u)}
              onDelete={handleDeleteUser}
              showAddRow={showAddRow}
              setShowAddRow={setShowAddRow}
              newUser={newUser}
              setNewUser={setNewUser}
              onSubmitNew={handleAddUser}
            />
          </>
        )}
      </section>
    </div>
  );
};

export default UsersPage;
