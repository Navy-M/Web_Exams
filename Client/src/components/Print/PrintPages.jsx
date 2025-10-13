// src/components/Print/PrintPage.jsx
import React from "react";
import ShowAnalysis from "../Common/ShowAnalysis";

/* =============== Basic styles for on-screen report =============== */
const RP_CSS = `
.rp-root { direction: rtl; font-family: "Vazirmatn", -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#0f172a; }
.rp-grid { display:grid; gap:12px; }
.rp-card { border:1px solid #e5e7eb; border-radius:10px; padding:12px; background:#fff; }
.rp-muted { color:#64748b; }
.rp-row3 { display:grid; grid-template-columns: repeat(3, 1fr); gap:8px 16px; }
.rp-ul { margin:6px 0 0 18px; }
table { width:100%; border-collapse: collapse; border:1px solid #e5e7eb; background:#fff; }
th, td { padding:6px 8px; border-bottom:1px solid #eef2f7; text-align:center; }
th { background:#f8fafc; }
`;

/* =============== Persian helpers =============== */
const toFa = (v) => {
  const n = typeof v === "number" ? v : Number(v || 0);
  return Number.isFinite(n) ? n.toLocaleString("fa-IR") : String(v ?? "—");
};
const toFaPercent = (v) => `${toFa(Math.round(Number(v || 0)))}٪`;

/* =============== Label maps (Persian) =============== */
const TEST_NAME_FA = {
  DISC: "DISC (دیِسک)",
  HOLLAND: "هالند (RIASEC)",
  MBTI: "MBTI (مایرز-بریگز)",
  GARDNER: "گاردنر (هوش‌های چندگانه)",
  CLIFTON: "کلیفتون (نقاط قوت)",
  GHQ: "GHQ (سلامت عمومی)",
  PERSONAL_FAVORITES: "ترجیحات شخصی",
  FAVORITES_PERSONAL: "ترجیحات شخصی",
};
const faTestName = (type = "") => {
  const key = String(type || "").toUpperCase();
  const hit = Object.keys(TEST_NAME_FA).find((k) => key.includes(k));
  return hit ? TEST_NAME_FA[hit] : type || "آزمون";
};

const AXIS_FA = {
  DISC: { D: "سلطه‌گری (D)", I: "تأثیرگذاری (I)", S: "ثبات (S)", C: "وظیفه‌شناسی (C)" },
  HOLLAND: {
    R: "واقع‌گرا (R)", I: "پژوهشی (I)", A: "هنری (A)",
    S: "اجتماعی (S)", E: "متهور (E)", C: "قراردادی (C)"
  },
  MBTI: {
    EI: "برون‌گرایی / درون‌گرایی",
    SN: "حسی / شهودی",
    TF: "فکری / احساسی",
    JP: "داوری / ادراک",
    E: "برون‌گرا (E)", I: "درون‌گرا (I)",
    S: "حسی (S)", N: "شهودی (N)",
    T: "فکری (T)", F: "احساسی (F)",
    J: "داور (J)", P: "ادراکی (P)",
  },
  GARDNER: {
    L: "زبانی", LM: "منطقی‌ـ‌ریاضی", LOGICAL: "منطقی‌ـ‌ریاضی", MATH: "منطقی‌ـ‌ریاضی",
    M: "موسیقایی", MU: "موسیقایی", S: "فضایی‌ـ‌دیداری", B: "بدنی‌ـ‌جنبشی",
    I: "بین‌فردی", IN: "درون‌فردی", N: "طبیعت‌گرا",
  },
};

function flattenNormalizedScores(norm) {
  const out = {};
  Object.entries(norm || {}).forEach(([k, v]) => {
    if (v == null) return;
    if (typeof v === "number") { out[k] = v; return; }
    if (typeof v === "object") {
      if (typeof v.percent === "number") { out[k] = v.percent; return; }
      if (typeof v.score   === "number") { out[k] = v.score;   return; }
      const pairs = Object.entries(v).filter(([, n]) => typeof n === "number");
      if (pairs.length === 2) { out[k] = Math.max(pairs[0][1], pairs[1][1]); return; }
      if (pairs.length) {
        const sum = pairs.reduce((s, [, n]) => s + n, 0);
        out[k] = sum / pairs.length; return;
      }
    }
    out[k] = Number(v) || 0;
  });
  return out;
}

function mapKeysToFaByTest(testType = "", obj = {}) {
  const key = String(testType || "").toUpperCase();
  const dict =
    key.includes("DISC") ? AXIS_FA.DISC :
    key.includes("HOLLAND") ? AXIS_FA.HOLLAND :
    key.includes("MBTI") ? AXIS_FA.MBTI :
    key.includes("GARDNER") ? AXIS_FA.GARDNER :
    null;
  if (!dict) return obj;
  const up = Object.fromEntries(Object.entries(obj).map(([k, v]) => [String(k).toUpperCase(), v]));
  const out = {};
  Object.entries(up).forEach(([k, v]) => {
    const fa = dict[k] || dict[k.replace(/\s+/g, "")] || dict[k.replace(/[()]/g, "")] || k;
    out[fa] = v;
  });
  return out;
}

function massageAnalysisForFA(testType, analysis = {}) {
  const a = { ...(analysis || {}) };

  // remove suggestions
  delete a.recommendations;
  delete a.suggestions;
  delete a.careerSuggestions;
  delete a.tips;

  // normalized scores → flatten → Farsi keys
  let norm =
    a.normalizedScores ||
    a.dataForUI?.normalizedScores ||
    (a.dataForUI?.chartData?.labels
      ? Object.fromEntries(
          (a.dataForUI.chartData.labels || []).map((lbl, i) => [
            lbl,
            Number(a.dataForUI.chartData.datasets?.[0]?.data?.[i] ?? 0),
          ])
        )
      : null);

  if (norm) {
    norm = flattenNormalizedScores(norm);
    norm = mapKeysToFaByTest(testType, norm);
  }

  if (!a.dataForUI) a.dataForUI = {};
  if (norm) {
    a.normalizedScores = norm;
    a.dataForUI.normalizedScores = norm;

    if (!a.dataForUI.chartData) {
      const labels = Object.keys(norm);
      const data = labels.map((k) => Number(norm[k] ?? 0));
      a.dataForUI.chartData = {
        labels,
        datasets: [{ label: "نمره نرمال‌شده", data }],
      };
    } else {
      a.dataForUI.chartData = {
        ...a.dataForUI.chartData,
        labels: (a.dataForUI.chartData.labels || []).map((k) =>
          mapKeysToFaByTest(testType, { [k]: 0 }) && Object.keys(mapKeysToFaByTest(testType, { [k]: 0 }))[0]
        ),
      };
    }
  }

  // fallback strengths/weaknesses
  if ((!a.strengths || !a.strengths.length) && norm) {
    a.strengths = Object.entries(norm).sort((x,y)=>y[1]-x[1]).slice(0,3).map(([k])=>`قوت در «${k}»`);
  }
  if ((!a.weaknesses || !a.weaknesses.length) && norm) {
    a.weaknesses = Object.entries(norm).sort((x,y)=>x[1]-y[1]).slice(0,3).map(([k])=>`نیاز به بهبود در «${k}»`);
  }

  // give viewers some friendly metadata
  a.testDisplayNameFa = faTestName(testType);
  if (!a.rawScores && norm) a.rawScores = norm;

  return a;
}

/* =============== Simple job priority if no external ranking is provided =============== */
// If you have your own ranker, pass jobRequirements in props and ignore this fallback.
const DEFAULT_JOBS = [
  { title: "ناوبری و فرماندهی کشتی", tags: ["دریایی","واقع‌گرا","ثبات","مسئولیت‌پذیری"] },
  { title: "مهندسی مکانیک و موتور دریایی", tags: ["دریایی","منطقی‌ـ‌ریاضی","فنی","تحلیلی"] },
  { title: "مهندسی برق و الکترونیک دریایی", tags: ["دریایی","تحلیلی","فنی","جزئیات"] },
  { title: "تفنگدار دریایی", tags: ["دریایی","متهور","سلطه‌گری","انضباط"] },
  { title: "کمیسر دریایی", tags: ["دریایی","ارتباط","قانون","هماهنگی"] },
];

function deriveTraitsFromResults(results = []) {
  const traits = new Set();
  results.forEach(r => {
    const a = massageAnalysisForFA(r.testType, r.analysis || {});
    const norm = a.normalizedScores || {};
    Object.entries(norm)
      .sort((x,y)=>y[1]-x[1])
      .slice(0,4)
      .forEach(([k]) => traits.add(String(k).toLowerCase()));
  });
  return Array.from(traits);
}

function rankJobs(jobRequirements, results) {
  const jobs = (jobRequirements && jobRequirements.length) ? jobRequirements : DEFAULT_JOBS;
  const traits = deriveTraitsFromResults(results);
  const scored = jobs.map((j, idx) => {
    const tags = (j.tags || []).map(t => String(t).toLowerCase());
    const matches = traits.filter(t => tags.includes(t) || String(j.title).toLowerCase().includes(t));
    const score = Math.min(100, 50 + matches.length * 12); // simple heuristic
    const reasons = matches.map(m => `هم‌خوانی با «${m}»`);
    return { rank: idx + 1, title: j.title, score, reasons };
  }).sort((a,b)=>b.score - a.score);
  return scored.slice(0, 12);
}

/* =============== Pick viewer component =============== */
function pickViewComponent(testViews = {}, testType = "", fallback = null) {
  const key = String(testType || "").toUpperCase();
  const hit = Object.keys(testViews || {}).find(k => key.includes(k));
  return hit ? testViews[hit] : fallback;
}

/* =============== Main component =============== */
export default function PrintPages({
  user,
  results,
  formatDate = (t) => new Date(t).toLocaleString("fa-IR"),
  testViews = {},           // { DISC: DiscView, MBTI: MbtiView, ...}
  fallbackView = ShowAnalysis,
  jobRequirements,          // optional external ranking dataset
  hideAdminFeedback = false,
}) {
  const p = user?.profile || {};
  const fullName   = p.fullName || user?.username || "—";
  const nowStr     = formatDate(Date.now());

  // personal info
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
  const rankedJobs  = rankJobs(jobRequirements, safeResults);

  const Card = ({ title, children }) => (
    <div className="rp-card">
      {title ? <h3>{title}</h3> : null}
      {children}
    </div>
  );

  return (
    <div className="rp-root" dir="rtl">
      <style>{RP_CSS}</style>

      <section className="rp-grid" style={{marginBottom: 16}}>
        <div>
          <span className="rp-muted">گزارش</span>
          <h1>{fullName}</h1>
          <div style={{fontSize:12, color:"#475569"}}><span>تاریخ تولید:</span> {nowStr}</div>
        </div>

        <Card title="اطلاعات فردی">
          <div className="rp-row3">
            <div><strong>نام و نام خانوادگی:</strong> {fullName}</div>
            <div><strong>سن:</strong> {toFa(age)}</div>
            <div><strong>کد ملی:</strong> {nationalId}</div>

            <div><strong>تلفن:</strong> {phone}</div>
            <div><strong>وضعیت تأهل:</strong> {marital}</div>
            <div><strong>شغل پدر:</strong> {fathersJob}</div>

            <div><strong>تحصیلات:</strong> {education}</div>
            <div><strong>معدل دیپلم:</strong> {String(diplomaAvg)}</div>
            <div><strong>رشته تحصیلی:</strong> {field}</div>

            <div><strong>دوره:</strong> {String(period)}</div>
            <div><strong>استان:</strong> {province}</div>
            <div><strong>شهر:</strong> {city}</div>

            <div style={{gridColumn:"1 / -1"}}>
              <strong>تاریخ عضویت کاربر:</strong> {createdAt}
            </div>
          </div>
        </Card>

        <Card title="اولویت‌های پیشنهادی شغلی">
          {rankedJobs.length ? (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>عنوان شغل</th>
                  <th>امتیاز تطابق</th>
                  <th>دلایل کلیدی</th>
                </tr>
              </thead>
              <tbody>
                {rankedJobs.slice(0, 10).map((j, i) => (
                  <tr key={i}>
                    <td>{toFa(i + 1)}</td>
                    <td style={{textAlign:"right"}}>{j.title}</td>
                    <td>{toFaPercent(j.score)}</td>
                    <td style={{textAlign:"right"}}>
                      {j.reasons && j.reasons.length ? j.reasons.join("، ") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="rp-muted">—</p>}
        </Card>

        <Card title="نمای کلی آزمون‌ها">
          {safeResults.length ? (
            <ul className="rp-ul">
              {safeResults.map((r, i) => {
                const tt = faTestName(r?.testType);
                const dt = r?.createdAt
                  ? formatDate(r.createdAt)
                  : r?.completedAt
                  ? formatDate(r.completedAt)
                  : "—";
                return <li key={i}><strong>{tt}</strong> • {dt}</li>;
              })}
            </ul>
          ) : <p className="rp-muted">—</p>}
        </Card>
      </section>

      {/* Per-test sections (use your own viewers; fallback to ShowAnalysis) */}
      <section className="rp-grid">
        {safeResults.map((r, i) => {
          const when = r?.createdAt
            ? formatDate(r.createdAt)
            : r?.completedAt
            ? formatDate(r.completedAt)
            : "—";
          const View = pickViewComponent(testViews, r.testType, fallbackView);
          const faAnalysis = massageAnalysisForFA(r.testType, r.analysis || {});
          return (
            <div key={r._id || r.resultId || i} className="rp-card">
              <div style={{display:"flex", gap:12, alignItems:"baseline", marginBottom:8, fontSize:12, color:"#475569"}}>
                <h2 style={{margin:"0 0 4px auto"}}>{faTestName(r.testType)}</h2>
                <div>تاریخ: {when}</div>
              </div>

              <View
                testType={r.testType}
                analysisData={faAnalysis}
                locale="fa-IR"
                dir="rtl"
              />

              {!hideAdminFeedback && r?.adminFeedback ? (
                <>
                  <h3 style={{marginTop:16}}>بازخورد ادمین</h3>
                  <p>{r.adminFeedback}</p>
                </>
              ) : null}
            </div>
          );
        })}
      </section>
    </div>
  );
}
