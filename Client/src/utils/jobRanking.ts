// utils/jobRanking.ts
type Analysis = any;

export type JobRequirements = Record<
  string,
  {
    disc?: string[];               // مثل ["High D","High C"]
    mbti?: string[];               // مثل ["INTJ","ENTJ","ISTJ"]
    holland?: string[];            // مثل ["R","I","C"]
    gardner?: string[];            // مثل ["M","S","L","I","B","E" ...]
    clifton?: string[];            // تم‌ها یا دامنه‌ها ("Executing","Responsibility",...)
    PF?: (string | number)[];      // کلیدها/ایندکس‌های PF
  }
>;

export type Weights = {
  disc?: number;
  mbti?: number;
  holland?: number;
  gardner?: number;
  clifton?: number;
  pf?: number;
};

const DEFAULT_WEIGHTS: Weights = {
  disc: 1,
  mbti: 1,
  holland: 1,
  gardner: 1,
  clifton: 1,
  pf: 1,
};

// --- ابزارهای کمکی ---
const lc = (s: any) => String(s || "").trim().toLowerCase();

function safeNormScore(map: Record<string, number> | undefined, key: string) {
  if (!map) return 0;
  // تلاش برای تطبیق سست: حذف فاصله/خط تیره
  const normKey = lc(key).replace(/\s+|[-_]/g, "");
  for (const k of Object.keys(map)) {
    const nk = lc(k).replace(/\s+|[-_]/g, "");
    if (nk === normKey) return Number(map[k]) || 0;
  }
  return 0;
}

function avg(nums: number[]) {
  const a = nums.filter((x) => typeof x === "number" && !isNaN(x));
  return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

// --- استخراج ویژگی‌های کاربر از نتایج ---
export function buildUserFeatures(results: Array<{ testType: string; analysis?: Analysis }>) {
  // ساختار خروجی:
  // {
  //   disc: { top: string[], normalized: Record<string, number> }
  //   mbti: { type: string, letters: Record<'E'|'I'|'N'|... , 0|1> }
  //   holland: { top: string[], normalized: Record<string, number> }
  //   gardner: { top: string[], normalized: Record<string, number> }
  //   clifton: { top: string[], signature?: string, normalized: Record<theme, number>, domains?: Record<dom, number> }
  //   pf: { top: Array<string|number>, normalized: Record<string, number> }
  // }
  const out: any = {
    disc: { top: [], normalized: {} },
    mbti: { type: "", letters: {} as Record<string, number> },
    holland: { top: [], normalized: {} },
    gardner: { top: [], normalized: {} },
    clifton: { top: [], signature: "", normalized: {}, domains: {} },
    pf: { top: [], normalized: {} },
  };

  for (const r of results || []) {
    const a = r?.analysis || {};
    const ui = a?.dataForUI || {};
    const type = (r?.testType || a?.test || "").toUpperCase();

    if (type.includes("DISC")) {
      // از normalizedScores مثل {D:85,I:40,...} یا نام‌های High D
      const norm = a.normalizedScores || ui.normalizedScores || {};
      out.disc.normalized = norm;
      // استنباط Top
      const pairs = Object.entries(norm).sort((x:any, y:any) => y[1] - x[1]);
      const top2 = pairs.slice(0, 2).map(([k]) => k);
      out.disc.top = top2.map((k) => (norm[k] >= 65 ? `High ${k.toUpperCase()}` : k.toUpperCase()));
    }

    if (type.includes("MBTI")) {
      // a.resultType, a.type, ui.type
      const t = a.type || a.resultType || ui.type || "";
      out.mbti.type = String(t).toUpperCase(); // مثلا ENTJ
      // حروف
      const L = out.mbti.letters;
      if (out.mbti.type.length === 4) {
        const [a1, a2, a3, a4] = out.mbti.type.split("");
        L[a1] = 1; // E یا I
        L[a2] = 1; // N یا S
        L[a3] = 1; // T یا F
        L[a4] = 1; // J یا P
      }
    }

    if (type.includes("HOLLAND")) {
      const norm = a.normalizedScores || ui.normalizedScores || {};
      out.holland.normalized = norm;
      const top = Object.entries(norm).sort((x:any, y:any) => y[1] - x[1]).slice(0, 3).map(([k]) => k.toUpperCase());
      out.holland.top = top;
    }

    if (type.includes("GARDNER")) {
      const norm = a.normalizedScores || ui.normalizedScores || {};
      out.gardner.normalized = norm;
      const top = a.topIntelligences || ui.topIntelligences || [];
      out.gardner.top = Array.isArray(top) ? top : [];
    }

    if (type.includes("CLIFTON")) {
      const norm = a.normalizedScores || ui.normalizedScores || {};
      out.clifton.normalized = norm;
      out.clifton.signature = a.signatureTheme || ui.signatureTheme || "";
      const top = a.topThemes || ui.topThemes || [];
      out.clifton.top = Array.isArray(top) ? top : [];
      // اگر نیاز دارید دامنه‌ها را بسازید می‌شود از themeDetails در UI استفاده کرد
      // اینجا ساده می‌کنیم: اگر کلید دامنه در normalizedScores بود، همان را می‌گیریم.
      for (const k of Object.keys(norm)) {
        const K = k.toLowerCase();
        if (["executing", "influencing", "relationship", "strategic"].includes(K)) {
          out.clifton.domains[k] = norm[k];
        }
      }
    }

    if (type.includes("PERSONAL") || type.includes("FAVORITES") || type.includes("PF")) {
      const norm = a.normalizedScores || ui.normalizedScores || {};
      out.pf.normalized = norm;
      const top = ui.topPreferences ? Object.keys(ui.topPreferences) : a.traits || [];
      out.pf.top = Array.isArray(top) ? top : [];
    }
  }

  return out;
}

// --- امتیازدهی هر آزمون ---
function scoreDISC(req: string[] = [], user: any) {
  if (!req.length) return { score: 0, matches: [] as string[] };
  const matches: string[] = [];
  const s: number[] = [];

  for (const need of req) {
    // "High D" یا "D"
    const m = need.match(/high\s*([DISC])/i) || need.match(/([DISC])/i);
    if (!m) continue;
    const letter = m[1].toUpperCase();
    const val = safeNormScore(user?.normalized, letter);
    const gotHigh = val >= 65;
    if (gotHigh) matches.push(`High ${letter}`);
    s.push(val); // 0..100
  }

  return { score: s.length ? avg(s) : 0, matches };
}

function scoreMBTI(req: string[] = [], user: any) {
  if (!req.length) return { score: 0, matches: [] as string[] };
  const uType = String(user?.type || "").toUpperCase();
  const letters = user?.letters || {};
  let best = 0;
  let bestName = "";

  for (const target of req) {
    const t = String(target || "").toUpperCase();
    if (!t) continue;

    if (uType === t) {
      best = 100; bestName = t; break;
    } else if (t.length === 4 && uType.length === 4) {
      // هر حرف = 25 امتیاز
      let local = 0;
      for (let i = 0; i < 4; i++) {
        if (uType[i] === t[i]) local += 25;
      }
      if (local > best) { best = local; bestName = t; }
    } else {
      // اگر مثلا فقط "NT" داده باشید، هر حرف درست 50
      let local = 0;
      for (const ch of t) {
        if (letters[ch]) local += 100 / t.length;
      }
      if (local > best) { best = local; bestName = t; }
    }
  }

  const matches = bestName ? [bestName] : [];
  return { score: best, matches };
}

function scoreHolland(req: string[] = [], user: any) {
  if (!req.length) return { score: 0, matches: [] as string[] };
  const s: number[] = [];
  const matches: string[] = [];
  for (const code of req) {
    const c = String(code).toUpperCase();
    const v = safeNormScore(user?.normalized, c);
    if (v >= 60) matches.push(c);
    s.push(v);
  }
  return { score: s.length ? avg(s) : 0, matches };
}

function scoreGardner(req: string[] = [], user: any) {
  if (!req.length) return { score: 0, matches: [] as string[] };
  const s: number[] = [];
  const matches: string[] = [];
  for (const k of req) {
    const v = safeNormScore(user?.normalized, k);
    if (v >= 60) matches.push(k);
    s.push(v);
  }
  return { score: s.length ? avg(s) : 0, matches };
}

function scoreClifton(req: string[] = [], user: any) {
  if (!req.length) return { score: 0, matches: [] as string[] };
  const s: number[] = [];
  const matches: string[] = [];
  for (const k of req) {
    const key = String(k);
    // هم تم، هم دامنه را پشتیبانی کن
    const valTheme = safeNormScore(user?.normalized, key);
    const valDomain = safeNormScore(user?.domains, key);
    const v = Math.max(valTheme, valDomain);
    if (v >= 55) matches.push(key);
    s.push(v);
  }
  return { score: s.length ? avg(s) : 0, matches };
}

function scorePF(req: Array<string | number> = [], user: any) {
  if (!req.length) return { score: 0, matches: [] as string[] };
  const s: number[] = [];
  const matches: string[] = [];
  for (const k of req) {
    const v = safeNormScore(user?.normalized, String(k));
    if (v >= 60) matches.push(String(k));
    s.push(v);
  }
  return { score: s.length ? avg(s) : 0, matches };
}

// --- تابع اصلی امتیازدهی شغل ---
export function rankJobsForUser(
  jobRequirements: JobRequirements,
  results: Array<{ testType: string; analysis?: Analysis }>,
  weights: Weights = DEFAULT_WEIGHTS
) {
    
    
  const feats = buildUserFeatures(results);

  const rows = Object.entries(jobRequirements).map(([jobName, reqs]) => {
    const part: any = {};

    const disc = scoreDISC(reqs.disc, feats.disc);
    const mbti = scoreMBTI(reqs.mbti, feats.mbti);
    const hol  = scoreHolland(reqs.holland, feats.holland);
    const gar  = scoreGardner(reqs.gardner, feats.gardner);
    const clf  = scoreClifton(reqs.clifton, feats.clifton);
    const pf   = scorePF(reqs.PF as any, feats.pf);

    part.disc = disc; part.mbti = mbti; part.holland = hol;
    part.gardner = gar; part.clifton = clf; part.pf = pf;

    const w = { ...DEFAULT_WEIGHTS, ...weights };
    const weighted =
      (disc.score * (w.disc || 0)) +
      (mbti.score * (w.mbti || 0)) +
      (hol.score  * (w.holland || 0)) +
      (gar.score  * (w.gardner || 0)) +
      (clf.score  * (w.clifton || 0)) +
      (pf.score   * (w.pf || 0));
    const wsum = (w.disc||0)+(w.mbti||0)+(w.holland||0)+(w.gardner||0)+(w.clifton||0)+(w.pf||0) || 1;

    const score = Math.round(weighted / wsum);

    const reasons: string[] = [
      ...disc.matches.map(m => `DISC: ${m}`),
      ...mbti.matches.map(m => `MBTI: ${m}`),
      ...hol.matches.map(m => `Holland: ${m}`),
      ...gar.matches.map(m => `Gardner: ${m}`),
      ...clf.matches.map(m => `Clifton: ${m}`),
      ...pf.matches.map(m => `PF: ${m}`),
    ];

    console.log({job: jobName, score, breakdown: part, reasons });
    

    return { job: jobName, score, breakdown: part, reasons };
  });

  rows.sort((a, b) => b.score - a.score);
  return rows;
}

// --- HTML کوتاه برای صفحه‌ی اول کارنامه ---
export function renderJobPriorityTableHTML(ranked: Array<{ job: string; score: number; reasons?: string[] }>) {
  const top = ranked.slice(0, 8);
  const trs = top.map((r, i) =>
    `<tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(r.job)}</td>
      <td> </td>
      <td>${escapeHtml((r.reasons || []).slice(0, 3).join("، "))}</td>
    </tr>`
  ).join("");
  return `
    <div class="card">
      <h3>اولویت‌های پیشنهادی شغلی</h3>
      <table class="scores">
        <thead><tr><th>#</th><th>عنوان شغل</th><th>امتیاز تطابق</th><th>دلایل کلیدی</th></tr></thead>
        <tbody>${trs || `<tr><td colspan="4" class="muted">داده‌ای یافت نشد</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function escapeHtml(s: any) {
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
