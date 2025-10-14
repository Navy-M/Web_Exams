// utils/jobRanking.ts
type Analysis = any;

/* ===================== Types ===================== */
export type DiscSpec = {
  require?: string[];          // مثل ["High D"]
  prefer?: string[];           // مثل ["High C","High D"] یا ["C","D"]
  thresholds?: { high?: number }; // آستانهٔ High (پیش‌فرض 65)
};
export type MbtiSpec = { prefer?: string[] }; // ["INTJ","ENTJ"] یا جزئی مثل "NT"
export type HollandSpec = { top3?: string[]; prefer?: string[] }; // مثال: { top3:["I","C","E"] }
export type GardnerSpec = { prefer?: string[] }; // ["S","M","L"] (فضایی/منطقی/کلامی؛ نگاشت می‌خورد)
export type CliftonSpec = {
  domainsPrefer?: string[];    // ["Executing","Influencing","Strategic"...]
  themesPrefer?: string[];     // ["Responsibility","Command",...]
  themesAvoid?: string[];      // ["Harmony",...]
};
export type PfSpec = { itemIdsPrefer?: (string|number)[]; keywords?: string[] };

export type Weights = {
  disc?: number; mbti?: number; holland?: number; gardner?: number; clifton?: number; pf?: number;
};

export type JobRequirementRich = {
  summary?: string;
  education?: string[];        // رشته‌های ترجیحی (فارسی)
  disc?: DiscSpec;
  mbti?: MbtiSpec;
  holland?: HollandSpec;
  gardner?: GardnerSpec;
  clifton?: CliftonSpec;
  pf?: PfSpec;
  weights?: Weights;
  benchmark?: any;
};
export type JobRequirementsRich = Record<string, JobRequirementRich>;

/* ===================== Defaults ===================== */
export const DEFAULT_WEIGHTS: Weights = { disc: 1, mbti: 1, holland: 1, gardner: 1, clifton: 1, pf: 1 };
export const DISC_THRESHOLDS = { high: 65 };
const DEFAULT_DISC_HIGH = 65;

/* ===================== Utils ===================== */
const NK = (s: any) => String(s || "").trim().toLowerCase().replace(/\s+|[-_]/g, "");
const faNorm = (s: any) =>
  String(s ?? "")
    .replace(/\u200c/g, " ")     // ZWNJ → space
    .replace(/[يی]/g, "ی")       // Arabic/Persian Yeh → ی
    .replace(/[كک]/g, "ک")       // Arabic/Persian Kaf → ک
    .replace(/\s+/g, " ")
    .trim();
const NKFA = (s: any) => NK(faNorm(s));

function avg(nums: number[]) {
  const a = nums.filter((x) => typeof x === "number" && !isNaN(x));
  return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
}

function normalizeScoreMap(raw: Record<string, number> | undefined) {
  const map: Record<string, number> = {};
  if (!raw) return map;
  const values = Object.values(raw).map(Number).filter(v => !isNaN(v));
  const fracScale = values.length ? (values.filter(v => v <= 1).length / values.length) >= 0.7 : false;
  const scale = fracScale ? 100 : 1;
  for (const [k, v0] of Object.entries(raw)) {
    const v = Number(v0); if (isNaN(v)) continue;
    map[NK(k)] = Math.max(0, Math.min(100, v * scale));
  }
  return map;
}

/* ===================== Aliases ===================== */
const HOLLAND_ALIAS: Record<string, string> = {
  realistic: "R","واقعگرا":"R","واقع‌گرا":"R","واقعگرا(realistic)":"R", r:"R",
  investigative:"I","پژوهشی":"I", i:"I",
  artistic:"A","هنری":"A", a:"A",
  social:"S","اجتماعی":"S", s:"S",
  enterprising:"E","پیشروکارآفرین":"E","کارآفرین":"E","پیشرو":"E", e:"E",
  conventional:"C","قراردادیاداری":"C","اداری":"C","قراردادی":"C", c:"C",
};
const DISC_ALIAS: Record<string, string> = {
  dominance:"D","سلطهگری":"D","سلطه‌گری":"D","سلطه":"D", d:"D",
  influence:"I","تاثیرگذاری":"I","تأثیرگذاری":"I", i:"I",
  steadiness:"S","ثبات":"S", s:"S",
  conscientiousness:"C","وظیفهشناسی":"C","وظیفه‌شناسی":"C", c:"C",
};
const GARDNER_ALIAS: Record<string, string> = {
  intrapersonal:"intrapersonal","درونفردی":"intrapersonal","درون‌فردی":"intrapersonal",
  interpersonal:"interpersonal","میانفردی":"interpersonal","میان‌فردی":"interpersonal",
  logicalmathematical:"logicalmathematical","منطقیریاضی":"logicalmathematical","منطقی-ریاضی":"logicalmathematical",
  linguistic:"linguistic","کلامیزبانی":"linguistic","کلامی-زبانی":"linguistic",
  spatial:"spatial","فضایی":"spatial",
  bodilykinesthetic:"bodilykinesthetic","بدنیجنبشی":"bodilykinesthetic","بدنی-جنبشی":"bodilykinesthetic",
  musical:"musical","موسیقایی":"musical",
  naturalist:"naturalist","طبیعتگرا":"naturalist","طبیعت‌گرا":"naturalist",
};
const CLIFTON_DOMAIN_KEYS: Record<string, string> = {
  executing:"executing", execute:"executing", execution:"executing",
  influencing:"influencing", influence:"influencing",
  relationshipbuilding:"relationship", relationship:"relationship", relationships:"relationship",
  strategicthinking:"strategic", strategic:"strategic", strategy:"strategic",
};

/* ===================== Education Matching ===================== */
const EDUCATION_SYNONYMS: Record<string, string> = {
  "فنیحرفهای":"فنی حرفه ای","فنی‌حرفهای":"فنی حرفه ای","فنیحرفه":"فنی حرفه ای","فنی":"فنی حرفه ای",
  "ریاضیفیزیک":"ریاضی","ریاضی-فیزیک":"ریاضی",
  "علومتجربی":"تجربی","علومانسانی":"انسانی","ادبیاتانسانی":"انسانی",
  "برقصنعتی":"فنی حرفه ای","الکترونیک":"فنی حرفه ای","مکانیک":"فنی حرفه ای","معماری":"فنی حرفه ای",
  "کامپیوتر":"فنی حرفه ای","هنرستان":"فنی حرفه ای",
};
function canonicalEduKey(raw: any) {
  const base = faNorm(raw);
  const syn = EDUCATION_SYNONYMS[NK(base)];
  return NK(syn || base);
}
function jaccard(a: Set<string>, b: Set<string>) {
  const inter = new Set([...a].filter((x) => b.has(x))).size;
  const uni = new Set([...a, ...b]).size || 1;
  return inter / uni;
}
function tokenizeFa(s: string) {
  return faNorm(s).split(" ").map((x) => NK(x)).filter(Boolean);
}
function eduMatchScore(userField?: string, jobEduList?: string[]) {
  if (!userField || !jobEduList || !jobEduList.length) return { score: 0, matchKey: "" };
  const uCanon = canonicalEduKey(userField);
  const uTokens = new Set(tokenizeFa(userField));
  let best = 0, bestKey = "";
  for (const edu of jobEduList) {
    const eCanon = canonicalEduKey(edu);
    if (uCanon && eCanon && uCanon === eCanon) return { score: 1, matchKey: edu };
    const eTokens = new Set(tokenizeFa(edu));
    const sim = jaccard(uTokens, eTokens);
    if (sim > best) { best = sim; bestKey = edu; }
  }
  return { score: best, matchKey: bestKey };
}

/* ===================== Safe score read ===================== */
function safeNormScoreByKind(
  map: Record<string, number> | undefined,
  key: string,
  kind: "disc"|"holland"|"gardner"|"clifton"|"pf"="pf"
) {
  if (!map) return 0;
  const k0 = NK(key);
  let c = k0;
  if (kind==="holland" && HOLLAND_ALIAS[k0]) c = NK(HOLLAND_ALIAS[k0]);
  if (kind==="disc"    && DISC_ALIAS[k0])    c = NK(DISC_ALIAS[k0]);
  if (kind==="gardner" && GARDNER_ALIAS[k0]) c = NK(GARDNER_ALIAS[k0]);
  if (c in map) return Number(map[c])||0;

  if (kind==="holland") {
    const letter = (HOLLAND_ALIAS[k0] || key).toString().toUpperCase();
    for (const [mk, mv] of Object.entries(map)) {
      if ((HOLLAND_ALIAS[mk] || mk.toUpperCase()) === letter) return Number(mv)||0;
    }
  }
  return 0;
}

/* ===================== Feature Extraction ===================== */
export function buildUserFeatures(results: Array<{ testType: string; analysis?: Analysis; createdAt?: any; completedAt?: any }>) {
  const sorted = [...(results||[])].sort((a,b) =>
    new Date(b.createdAt||b.completedAt||0).getTime() - new Date(a.createdAt||a.completedAt||0).getTime()
  );

  const out: any = {
    disc: { top: [] as string[], normalized: {} as Record<string, number> },
    mbti: { type: "", letters: {} as Record<string, number> },
    holland: { top: [] as string[], normalized: {} as Record<string, number> },
    gardner: { top: [] as string[], normalized: {} as Record<string, number> },
    clifton: { top: [] as string[], signature: "", normalized: {} as Record<string, number>, domains: {} as Record<string, number> },
    pf: { top: [] as (string|number)[], normalized: {} as Record<string, number> },
  };

  for (const r of sorted) {
    const a = r?.analysis || {};
    const ui = a?.dataForUI || {};
    const type = (r?.testType || a?.test || "").toUpperCase();

    if (type.includes("DISC")) {
      const norm = normalizeScoreMap(a.normalizedScores || ui.normalizedScores || {});
      out.disc.normalized = { ...out.disc.normalized, ...norm };
      if (!out.disc.top.length) {
        const pairs = Object.entries(norm).sort((x:any,y:any)=>y[1]-x[1]);
        out.disc.top = pairs.slice(0,2).map(([k])=>k.toUpperCase());
      }
    }
    if (type.includes("MBTI")) {
      const t = (a.type || a.resultType || ui.type || "").toUpperCase();
      if (t) { out.mbti.type = t; if (t.length===4) t.split("").forEach((ch:any) => out.mbti.letters[ch]=1); }
    }
    if (type.includes("HOLLAND")) {
      const norm = normalizeScoreMap(a.normalizedScores || ui.normalizedScores || {});
      out.holland.normalized = { ...out.holland.normalized, ...norm };
      if (!out.holland.top.length) {
        const top = Object.entries(norm).sort((x:any,y:any)=>y[1]-x[1])
          .slice(0,3).map(([k]) => (HOLLAND_ALIAS[k]||k).toUpperCase());
        out.holland.top = top;
      }
    }
    if (type.includes("GARDNER")) {
      const norm = normalizeScoreMap(a.normalizedScores || ui.normalizedScores || {});
      out.gardner.normalized = { ...out.gardner.normalized, ...norm };
      const top = a.topIntelligences || ui.topIntelligences || [];
      if (!out.gardner.top.length && Array.isArray(top)) out.gardner.top = top;
    }
    if (type.includes("CLIFTON")) {
      const norm = normalizeScoreMap(a.normalizedScores || ui.normalizedScores || {});
      out.clifton.normalized = { ...out.clifton.normalized, ...norm };
      out.clifton.signature ||= (a.signatureTheme || ui.signatureTheme || "");
      const top = a.topThemes || ui.topThemes || [];
      if (!out.clifton.top.length && Array.isArray(top)) out.clifton.top = top;
      for (const [k,v] of Object.entries(norm)) {
        const dom = CLIFTON_DOMAIN_KEYS[NK(k)];
        if (dom) out.clifton.domains[dom] = Math.max(out.clifton.domains[dom]||0, Number(v)||0);
      }
    }
    if (type.includes("PERSONAL") || type.includes("FAVORITES") || type.includes("PF")) {
      const norm = normalizeScoreMap(a.normalizedScores || ui.normalizedScores || {});
      out.pf.normalized = { ...out.pf.normalized, ...norm };
      const top = ui.topPreferences ? Object.keys(ui.topPreferences) : a.traits || [];
      if (!out.pf.top.length && Array.isArray(top)) out.pf.top = top;
    }
  }
  return out;
}

/* ===================== Scorers ===================== */
type SubScore = { score: number; matches: string[]; failedRequired?: boolean };

function scoreDISC_spec(spec: DiscSpec|undefined, feat: any): SubScore {
  if (!spec) return { score: 0, matches: [] };
  const high = spec.thresholds?.high ?? DEFAULT_DISC_HIGH;

  if (spec.require?.length) {
    const ok = spec.require.some(rq => {
      const m = rq.match(/high\s*([DISC])/i);
      const letter = m ? m[1] : (DISC_ALIAS[NK(rq)] || rq).toString();
      const v = safeNormScoreByKind(feat?.normalized, letter, "disc");
      return v >= high;
    });
    if (!ok) return { score: 0, matches: [], failedRequired: true };
  }

  const vals: number[] = []; const matches: string[] = [];
  for (const p of (spec.prefer || [])) {
    const m = p.match(/high\s*([DISC])/i);
    const letter = m ? m[1] : (DISC_ALIAS[NK(p)] || p).toString();
    const v = safeNormScoreByKind(feat?.normalized, letter, "disc");
    if (v >= high) matches.push(`High ${letter.toUpperCase()}`);
    vals.push(v);
  }
  return { score: vals.length ? Math.round(avg(vals)) : 0, matches };
}

function scoreMBTI_spec(spec: MbtiSpec|undefined, feat: any): SubScore {
  if (!spec?.prefer?.length) return { score: 0, matches: [] };
  const uType = String(feat?.type||"").toUpperCase();
  const letters = feat?.letters || {};
  let best = 0; let bestName = "";
  for (const target of spec.prefer) {
    const t = String(target||"").toUpperCase(); if (!t) continue;
    if (uType === t) { best = 100; bestName = t; break; }
    else if (t.length===4 && uType.length===4) {
      let local=0; for (let i=0;i<4;i++) if (uType[i]===t[i]) local+=25;
      if (local>best){ best=local; bestName=t; }
    } else {
      let local=0; for (const ch of t) if (letters[ch]) local += 100/t.length;
      if (local>best){ best=local; bestName=t; }
    }
  }
  return { score: Math.round(best), matches: bestName? [`MBTI: ${bestName}`] : [] };
}

function scoreHOLLAND_spec(spec: HollandSpec|undefined, feat: any): SubScore {
  if (!spec) return { score: 0, matches: [] };
  const vals: number[] = []; const matches: string[] = [];
  for (const code of [...(spec.top3||[]), ...(spec.prefer||[])]) {
    const key = HOLLAND_ALIAS[NK(code)] || code;
    const v = safeNormScoreByKind(feat?.normalized, key, "holland");
    if (v >= 60) matches.push(String(key).toUpperCase());
    vals.push(v);
  }
  return { score: vals.length ? Math.round(avg(vals)) : 0, matches: Array.from(new Set(matches)) };
}

function scoreGARDNER_spec(spec: GardnerSpec|undefined, feat: any): SubScore {
  if (!spec?.prefer?.length) return { score: 0, matches: [] };
  const vals:number[] = []; const matches:string[]=[];
  for (const k of spec.prefer) {
    const v = safeNormScoreByKind(feat?.normalized, k, "gardner");
    if (v >= 60) matches.push(k);
    vals.push(v);
  }
  return { score: Math.round(vals.length ? avg(vals) : 0), matches };
}

function scoreCLIFTON_spec(spec: CliftonSpec|undefined, feat: any): SubScore {
  if (!spec) return { score: 0, matches: [] };
  const vals:number[] = []; const matches:string[]=[];
  for (const k of (spec.themesPrefer || [])) {
    const v = safeNormScoreByKind(feat?.normalized, k, "clifton");
    if (v >= 55) matches.push(k);
    vals.push(v);
  }
  for (const k of (spec.domainsPrefer || [])) {
    const v = safeNormScoreByKind(feat?.domains, k, "clifton");
    if (v >= 55) matches.push(k);
    vals.push(v);
  }
  let base = vals.length ? avg(vals) : 0;
  for (const avoid of (spec.themesAvoid || [])) {
    const v = safeNormScoreByKind(feat?.normalized, avoid, "clifton");
    if (v >= 60) base *= 0.9; // 10% penalty
  }
  return { score: Math.round(base), matches: Array.from(new Set(matches)) };
}

/* ===================== Ranker (Rich) ===================== */
export function rankJobsForUserRich(
  jobRequirements: JobRequirementsRich,
  results: Array<{ testType: string; analysis?: Analysis; createdAt?: any; completedAt?: any }>,
  userEducation?: string,
  defaultWeights: Weights = DEFAULT_WEIGHTS
) {
  const feats = buildUserFeatures(results);
  const rows = Object.entries(jobRequirements).map(([job, spec]) => {
    const disc = scoreDISC_spec(spec.disc, feats.disc);
    const mbti = scoreMBTI_spec(spec.mbti, feats.mbti);
    const hol  = scoreHOLLAND_spec(spec.holland, feats.holland);
    const gar  = scoreGARDNER_spec(spec.gardner, feats.gardner);
    const clf  = scoreCLIFTON_spec(spec.clifton, feats.clifton);

    if (disc.failedRequired) {
      return { job, score: 0, breakdown: { disc, mbti, holland: hol, gardner: gar, clifton: clf }, reasons: ["DISC: شرط الزامی محقق نشد"], failedRequired: true };
    }

    const w = { ...defaultWeights, ...(spec.weights || {}) };
    let weighted = (
      disc.score * (w.disc||0) +
      mbti.score * (w.mbti||0) +
      hol.score  * (w.holland||0) +
      gar.score  * (w.gardner||0) +
      clf.score  * (w.clifton||0)
    );
    let wsum = (w.disc||0)+(w.mbti||0)+(w.holland||0)+(w.gardner||0)+(w.clifton||0) || 1;
    let score = Math.round(weighted / wsum);

    const reasons = [
      ...disc.matches.map(m=>`DISC: ${m}`),
      ...mbti.matches,
      ...hol.matches.map(m=>`Holland: ${m}`),
      ...gar.matches.map(m=>`Gardner: ${m}`),
      ...clf.matches.map(m=>`Clifton: ${m}`),
    ];

    // Education boost/penalty
    if (userEducation && Array.isArray(spec.education) && spec.education.length) {
      const { score: eduScore, matchKey } = eduMatchScore(userEducation, spec.education);
      if (eduScore >= 0.95) {
        score = Math.min(100, Math.round(score * 1.06));
        reasons.push(`Education: رشته مطابق (${matchKey || userEducation})`);
      } else if (eduScore >= 0.6) {
        score = Math.min(100, Math.round(score * 1.03));
        reasons.push(`Education: رشته نزدیک (${matchKey || userEducation})`);
      } else {
        score = Math.max(0, Math.round(score * 0.94));
        reasons.push(`Education: رشته دور`);
      }
    }

    return { job, score, breakdown: { disc, mbti, holland: hol, gardner: gar, clifton: clf }, reasons };
  });

  rows.sort((a,b)=> b.score - a.score);
  return rows;
}

/* ===================== Print-friendly HTML ===================== */
export function renderJobPriorityTableHTML(
  ranked: Array<{ job: string; score: number; reasons?: string[] }>
) {
  const top = ranked.slice(0, 8);
  const trs = top.map((r,i)=>{
    const pct = Math.max(0, Math.min(100, r.score||0));
    const reasons = (r.reasons||[]).slice(0,3).join("، ");
    return `
      <tr>
        <td class="num">${i+1}</td>
        <td class="t-left">${escapeHtml(r.job)}</td>
        <td>
          <div class="cell-bar">
            <span class="val">${pct}%</span>
            <span class="bar" style="--w:${pct}%"></span>
          </div>
        </td>
        <td class="t-left">${escapeHtml(reasons || "—")}</td>
      </tr>
    `;
  }).join("");

  return `
    <div class="card">
      <div class="section-title">
        <span class="pill">اولویت‌های پیشنهادی شغلی</span>
        <h3>نتایج تطابق</h3>
      </div>
      <table class="table jobs">
        <colgroup><col/><col/><col/><col/></colgroup>
        <thead>
          <tr><th>#</th><th>عنوان رسته</th><th>امتیاز تطابق</th><th>دلایل کلیدی</th></tr>
        </thead>
        <tbody>
          ${trs || `<tr><td colspan="4" class="muted">داده‌ای یافت نشد</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function escapeHtml(s: any) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
