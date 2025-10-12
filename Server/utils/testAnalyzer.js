// Server/utils/testAnalyzer.js
// ============================================================================
// ماژول یکپارچه تحلیل آزمون‌ها (MBTI, DISC, HOLLAND, GARDNER, CLIFTON, GHQ, PERSONAL_FAVORITES)
// - ریجن‌بندی کامل
// - JSDoc فارسی
// - خروجی استاندارد + dataForUI مطابق کامپوننت‌های شما
// - مدیریت Tie، تقسیم بر صفر، نرمال‌سازی 0..100
// - بدون وابستگی به محیط (لاگ‌ها فقط در dev)
// ============================================================================

import * as Dummy from "../config/dummyData.js";

// ============================================================================
// #region Utilities (ثابت‌ها، توابع کمکی)
// ============================================================================

/** clamp مقدار به بازه 0..100 */
const clampPct = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));

/** گرفتن عدد امن از هر ورودی */
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** درصد از حداکثر */
const toPct = (num, max) => clampPct((Number(num || 0) / Math.max(1, Number(max || 1))) * 100);

/** مرتب‌سازی نزولی [key, value] براساس value */
const sortDescPairs = (entries) => [...entries].sort((a, b) => Number(b[1]) - Number(a[1]));

/** نام تیپ MBTI (نمایشی) */
function getMBTITypeName(type = "") {
  // می‌تونی در آینده کامل‌ترش کنی
  // نمونه‌های رایج:
  const map = {
    INTJ: "معمار",
    INTP: "منطق‌گرا",
    ENTJ: "فرمانده",
    ENTP: "مناظره‌گر",
    INFJ: "مدافع",
    INFP: "میانجی",
    ENFJ: "بازیگر نقش اصلی",
    ENFP: "قهرمان",
    ISTJ: "لجستیک‌دان",
    ISFJ: "مدافع",
    ESTJ: "مدیر",
    ESFJ: "کنسول",
    ISTP: "Virtuoso",
    ISFP: "ماجراجو",
    ESTP: "کارآفرین",
    ESFP: "Entertainer",
  };
  return map[type] || "";
}

/** لاگ فقط در توسعه */
const devLog = (...args) => {
  if (process.env.NODE_ENV !== "production") console.log(...args);
};

// قالب استاندارد خروجی
/**
 * @typedef {Object} AnalyzeOutput
 * @property {number=} score
 * @property {Object<string,number>=} rawScores
 * @property {Object<string,number|Object<string,number>>=} normalizedScores
 * @property {string=} summary
 * @property {any=} dataForUI
 */

// ============================================================================
// #endregion Utilities
// ============================================================================



// ============================================================================
// #region MBTI
// ============================================================================

/**
 * تحلیل پاسخ‌های آزمون MBTI و تعیین تیپ شخصیتی
 * ورودی answers باید آرایه‌ای از {questionId:number, value:1..5}
 * Dummy.Mbti_Test باید شامل فیلدهای: { id, trait:'EI'|'SN'|'TF'|'JP', direction:'E'|... }
 * @param {Array} answers
 * @param {Array} [questions]
 * @returns {AnalyzeOutput & { mbtiType:string, typeName:string, rawScores:any, normalizedScores:any, dimensions:any }}
 */
export function analyzeMBTI(answers = [], questions = Dummy.Mbti_Test) {
  const traitPairs = { EI: ["E", "I"], SN: ["S", "N"], TF: ["T", "F"], JP: ["J", "P"] };
  const ORDER = ["EI", "SN", "TF", "JP"];

  const traitScores = { EI: { E: 0, I: 0 }, SN: { S: 0, N: 0 }, TF: { T: 0, F: 0 }, JP: { J: 0, P: 0 } };
  const traitCounts = { EI: 0, SN: 0, TF: 0, JP: 0 };

  devLog("[MBTI] answers:", answers);

  answers.forEach(({ questionId, value }) => {
    const qid = toNum(questionId);
    const val = toNum(value);
    if (qid == null || val == null) return;

    const q = questions?.find?.((qq) => toNum(qq.id) === qid);
    if (!q || !traitPairs[q.trait]) return;

    const [sideA, sideB] = traitPairs[q.trait];
    const dir = q.direction; // سمت نمره‌دهی مستقیم
    const opp = dir === sideA ? sideB : sideA;

    // Likert 1..5 → سمت مستقیم مقدار val می‌گیرد، سمت مقابل 6-val
    traitScores[q.trait][dir] += val;
    traitScores[q.trait][opp] += 6 - val;
    traitCounts[q.trait] += 1;
  });

  const mbtiType = ORDER.map((trait) => {
    const [a, b] = traitPairs[trait];
    // در تساوی سمت اول برنده است تا خروجی پایدار باشد
    return traitScores[trait][a] >= traitScores[trait][b] ? a : b;
  }).join("");

  // بیشینه‌ی هر بعد = تعداد سوال × 5
  const maxPerTrait = Object.fromEntries(Object.entries(traitCounts).map(([t, c]) => [t, Math.max(1, c) * 5]));

  // نرمال‌سازی 0..100
  const normalized = Object.fromEntries(
    Object.entries(traitScores).map(([t, scores]) => [
      t,
      Object.fromEntries(Object.entries(scores).map(([side, sc]) => [side, toPct(sc, maxPerTrait[t])])),
    ])
  );

  // ابعاد برای UI
  const traitDescriptions = {
    E: { name: "برون‌گرا" },
    I: { name: "درون‌گرا" },
    S: { name: "حسی" },
    N: { name: "شهودی" },
    T: { name: "تفکری" },
    F: { name: "احساسی" },
    J: { name: "قضاوتی" },
    P: { name: "ادراکی" },
  };

  const dimensions = ORDER.map((t, i) => {
    const [a, b] = traitPairs[t];
    const yourSide = mbtiType[i];
    const diff = Math.abs(normalized[t][a] - normalized[t][b]);
    return {
      dimension: t,
      yourSide,
      difference: diff,
      scores: {
        [a]: { name: traitDescriptions[a]?.name || a },
        [b]: { name: traitDescriptions[b]?.name || b },
      },
      description: `تمایل بیشتر به ${traitDescriptions[yourSide]?.name || yourSide}`,
    };
  });

  const typeName = getMBTITypeName(mbtiType);

  const dataForUI = {
    mbtiType,
    typeName,
    normalizedScores: normalized,
    dimensions,
    summary: `تیپ شخصیتی شما ${mbtiType}${typeName ? ` (${typeName})` : ""} است.`,
  };

  return {
    mbtiType,
    typeName,
    rawScores: traitScores,
    normalizedScores: normalized,
    dimensions,
    summary: dataForUI.summary,
    dataForUI,
  };
}

// ============================================================================
// #endregion MBTI
// ============================================================================



// ============================================================================
// #region DISC
// ============================================================================
// این نسخه طوری طراحی شده که خروجی‌اش دقیقاً با DiscAnalysis.jsx سازگار باشد
/**
 * DISC
 * - questions: هر سوال best/worst دارد.
 * - answers: [{ questionId, selectedTrait, type:'best'|'worst' }] یا فقط selectedTrait و از روی سوال type خوانده شود.
 */
export function analyzeDISC(
  answers = [],
  questions = Dummy.Disc_Test,
  opts = {}
) {
  // 1) آماده‌سازی
  const KEYS = ["D", "I", "S", "C"];
  const NAMES = { D: "سلطه‌گری", I: "تأثیرگذاری", S: "ثبات", C: "وظیفه‌شناسی" };

  // نمرات خام: شروع از صفر
  const raw = Object.fromEntries(KEYS.map((k) => [k, 0]));

  // تبدیل answers به حالت امن (uppercase و ...)
  const safeAnswers = (answers || []).map((a) => ({
    questionId: toNum(a?.questionId, null),
    selectedTrait: String(a?.selectedTrait || "").trim().toUpperCase(),
    type: a?.type ? String(a.type).toLowerCase() : null, // 'best'|'worst' یا null
  }));

  // نگاشت سریع سؤال‌ها برای کاهش هزینه‌ی find()
  const qById = new Map(
    (questions || []).map((q) => [toNum(q?.id), q])
  );

  // 2) امتیازدهی: best=+1 ، worst=-1
  // اگر type در پاسخ نبود، از سوال بخوان
  for (const ans of safeAnswers) {
    if (!KEYS.includes(ans.selectedTrait)) continue;
    const q = ans.questionId != null ? qById.get(ans.questionId) : null;
    const effectiveType = ans.type || q?.type; // 'best'|'worst'
    if (effectiveType === "best") raw[ans.selectedTrait] += 1;
    else if (effectiveType === "worst") raw[ans.selectedTrait] -= 1;
    // در غیر این صورت، پاسخ قابل نمره‌دهی نیست و نادیده گرفته می‌شود
  }

  // 3) نرمال‌سازی به درصد 0..100 بر اساس بازه‌ی مشاهده‌شده
  // min = - (#worst) ، max = (#best)
  const bestCount = safeAnswers.filter((a) => {
    if (a.type) return a.type === "best";
    const q = a.questionId != null ? qById.get(a.questionId) : null;
    return q?.type === "best";
  }).length;

  const worstCount = safeAnswers.filter((a) => {
    if (a.type) return a.type === "worst";
    const q = a.questionId != null ? qById.get(a.questionId) : null;
    return q?.type === "worst";
  }).length;

  const min = -worstCount;
  const max = bestCount;
  const range = Math.max(1, max - min); // هرگز صفر نشود
  const normalized = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, clampPct(((v - min) / range) * 100)])
  );

  // 4) تعیین تیپ/غالب‌ها
  const sorted = sortDescPairs(Object.entries(normalized));
  const topScore = sorted[0]?.[1] ?? 0;
  const dominantTraits = sorted.filter(([, s]) => s === topScore).map(([k]) => k);
  const primaryTrait = dominantTraits[0] || null;
  const secondaryTrait = sorted[1]?.[0] || null;

  // 5) traits با نام فارسی برای UI (در صورت نیاز می‌تونی strengths/risks/advice هم اضافه کنی)
  const traits = Object.fromEntries(
    KEYS.map((k) => [
      k,
      {
        name: NAMES[k],
        // اختیاری: اگر خواستی، اطلاعات بیشتر بده
        // description: "",
        score: raw[k],           // نمره خام
        percentile: normalized[k] // درصد نرمال‌شده
      }
    ])
  );

  // 6) خلاصه + زمان تحلیل + userInfo
  const analyzedAt = new Date().toISOString();
  const summary = primaryTrait
    ? `تمایل قوی به ${NAMES[primaryTrait]}`
    : "پروفایل متعادل";

  const userInfo = opts?.userInfo && typeof opts.userInfo === "object"
    ? opts.userInfo
    : undefined;

  // 7) خروجی **دقیقاً** مطابق انتظار DiscAnalysis.jsx
  const out = {
    test: "DISC",
    rawScores: raw,                 // برای جدول
    normalizedScores: normalized,   // برای نمودارها و KPI
    dominantTraits,                 // برای بَج «ویژگی‌های غالب»
    primaryTrait,                   // برای بَج «تیپ اصلی»
    secondaryTrait,                 // برای بَج «تیپ ثانویه»
    traits,                         // برای کارت‌های توضیح
    summary,                        // برای خلاصه تحلیل
    analyzedAt,                     // برای نمایش زمان تحلیل
    ...(userInfo ? { userInfo } : {}),
    // متای دیباگ (اختیاری—در UI استفاده نمی‌شود)
    _debug: {
      counts: { bestCount, worstCount },
      range: { min, max, range },
      answered: safeAnswers.length,
    },
  };

  return out;
}

// ============================================================================
// #endregion DISC
// ============================================================================



// ============================================================================
// #region HOLLAND (RIASEC)
// ============================================================================

// ============================================================================
// HOLLAND (RIASEC) – robust & backward-compatible analyzer
// - چندین استراتژی برای تشخیص بُعد (R/I/A/S/E/C) حتی بدون match شدن با بانک سوال
// - پشتیبانی از بله/خیر، true/false، 0/1، لیکرت 1..5/1..7، value رشته‌ای عددی
// - qMax از: q.max → q.scale.max → بیشینه‌ی options[*].value → حدس از مقدار → پیش‌فرض 5
// - reverse و weight از هرکدام از جواب/سوال خوانده می‌شود
// - خروجی: کاملاً منطبق با HollandAnalysis.jsx + داده‌های دیباگ
// ============================================================================

// ===============================================
// HOLLAND Scoring (Display-friendly, robust)
// ورودی answers: [{questionId, answer? , value?}, ...]
// ورودی questions: همان Holland_Test با فیلد type برای هر سؤال
// ===============================================
// 1) مپ‌بندی نوع هر سؤال بر اساس id (بدون تغییر options)
const HOLLAND_TYPE_MAP = (() => {
  const set = (arr, t) => arr.forEach((id) => (map[id] = t));
  const map = {};

  // Realistic (R)
  set([
    1,2,3,4,5,6,7,8,9,10,11, // علاقه‌مندی‌های فنی/عملی
    52,56,                    // موارد بله/خیر مرتبط با فنی
  ], "R");

  // Investigative (I)
  set([
    12,13,14,15,16,17,18,19,20,21,22, // علمی/پژوهشی
    49,53,57,                         // کامپیوتر/تحقیق/آزمایشگاه
  ], "I");

  // Artistic (A)
  set([
    23,24,25,26,27,28,29,30,31,32,33, // هنری/خلاق
    51,55,                            // طراحی/هنر
  ], "A");

  // Social (S)
  set([
    34,35,36,37,38,39,40,41,42, // اجتماعی/یاری‌رسان
    50,54,                       // مطالعه رفتار/کمک به افراد
  ], "S");

  // Enterprising (E)
  set([
    43,44,45,46,47,48, // رهبری/فروش/نفوذ/اداره
  ], "E");

  // Likert (توانایی/مهارت‌ها) — نگاشت به ابعاد
  set([58,64], "R"); // توانایی مکانیکی/مهارت دستی
  set([59,65], "I"); // توانایی علمی/محاسباتی
  set([60,66], "A"); // توانایی هنری/موسیقی
  set([61,67], "S"); // توانایی ارتباط/تدریس
  set([62,68], "E"); // توانایی رهبری/فروش
  set([63,69], "C"); // توانایی اداری/منشی‌گری

  return map;
})();

// 2) غنی‌ساز: به هر سؤالِ ورودی type/scale/weight می‌دهد، اما options دست‌نخورده می‌ماند
export function enrichHollandQuestions(questions = []) {
  const asNum = (x) => {
    const m = { "۰":0,"۱":1,"۲":2,"۳":3,"۴":4,"۵":5,"۶":6,"۷":7,"۸":8,"۹":9 };
    const s = String(x ?? "").replace(/[۰-۹]/g, (d) => String(m[d]));
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  return (questions || []).map((q) => {
    const type = q?.type || HOLLAND_TYPE_MAP[q?.id];
    const weight = q?.weight ?? 1;

    // تشخیص بازه از روی options: اگر گزینه‌ها عددی باشند → min..max  (برای 1..7)
    let min = 0, max = 1; // پیش‌فرض برای بله/خیر
    if (Array.isArray(q?.options) && q.options.length) {
      const nums = q.options
        .map((o) => (typeof o === "object" ? asNum(o?.value) : asNum(o)))
        .filter((v) => v != null);
      if (nums.length) {
        min = Math.min(...nums);
        max = Math.max(...nums);
      }
    }

    return {
      ...q,
      type,                          // R/I/A/S/E/C
      weight,
      scale: { min, max },           // برای کلمپ و نرمال‌سازی
      max: q?.max ?? max,            // سازگاری با کدهایی که max می‌خوانند
      // description/careers را اگر بعداً خواستی اضافه کن
    };
  });
}

// 3) تصحیح — نسخه‌ی حرفه‌ای و هماهنگ با HollandAnalysis.jsx
export function analyzeHolland(answers = [], questions = []) {
  // --- helpers ---
  const KEYS = ["R","I","A","S","E","C"];
  const NAMES = {
    R: "واقع‌گرا (Realistic)",
    I: "پژوهشی (Investigative)",
    A: "هنری (Artistic)",
    S: "اجتماعی (Social)",
    E: "پیشرو/کارآفرین (Enterprising)",
    C: "قراردادی/اداری (Conventional)",
  };
  const persianDigitsMap = { "۰":0,"۱":1,"۲":2,"۳":3,"۴":4,"۵":5,"۶":6,"۷":7,"۸":8,"۹":9 };
  const normalizeDigits = (s) =>
    String(s ?? "").replace(/[۰-۹]/g, (d) => String(persianDigitsMap[d])).trim();
  const toNum = (v) => {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (v == null) return null;
    const n = Number(normalizeDigits(v));
    return Number.isFinite(n) ? n : null;
  };
  const clampPct = (v) => Math.max(0, Math.min(100, Math.round(v)));
  const toPct = (sum, max) => {
    const s = Number(sum) || 0;
    const m = Number(max) || 0;
    if (m <= 0) return 0;
    return clampPct((s / m) * 100);
  };
  const sortDescPairs = (entries) => [...entries].sort((a, b) => Number(b[1]) - Number(a[1]));
  const YES = new Set(["بله","بلی","آره","yes","y","true","1","✓"].map(normalizeDigits));
  const NO  = new Set(["خیر","نه","no","n","false","0"].map(normalizeDigits));

  const qIndex = new Map((questions || []).map((q) => [String(q?.id), q]));

  const raw   = Object.fromEntries(KEYS.map((k) => [k, 0]));
  const maxPer= Object.fromEntries(KEYS.map((k) => [k, 0]));

  const meta = {
    testType: "HOLLAND",
    total: Array.isArray(answers) ? answers.length : 0,
    used: 0,
    ignored: 0,
    byType: Object.fromEntries(KEYS.map((k) => [k, { count: 0, sum: 0, max: 0 }])),
    reasonsIgnored: [],
  };

  // نگاشت پاسخ متنی به مقدار عددی با توجه به options
  const pickOptionValue = (q, answerText) => {
    if (!q || !Array.isArray(q.options)) return null;
    const ans = normalizeDigits(answerText);

    if (q.options.length && typeof q.options[0] === "object") {
      const byLabel = q.options.find((o) => normalizeDigits(o?.label) === ans);
      if (byLabel?.value != null) {
        const n = toNum(byLabel.value);
        return n != null ? n : null;
      }
      const byValue = q.options.find((o) => normalizeDigits(o?.value) === ans);
      if (byValue?.value != null) {
        const n = toNum(byValue.value);
        return n != null ? n : null;
      }
    } else {
      const hit = q.options.find((opt) => normalizeDigits(opt) === ans);
      if (hit != null) {
        const asNum = toNum(hit);
        if (asNum != null) return asNum; // برای 1..7
        if (YES.has(ans)) return 1;
        if (NO.has(ans))  return 0;
        return null;
      }
    }
    if (YES.has(ans)) return 1;
    if (NO.has(ans))  return 0;
    return null;
  };

  for (const item of answers || []) {
    const q = qIndex.get(String(item?.questionId));
    const t = q?.type;
    if (!q || !KEYS.includes(t)) {
      meta.ignored++;
      meta.reasonsIgnored.push({ id: item?.questionId, reason: "NO_MATCHING_QUESTION_OR_TYPE" });
      continue;
    }
    meta.byType[t].count++;

    const weight = toNum(q?.weight) ?? 1;
    const reverse = !!q?.reverse;

    // بازه معتبر از scale یا از max/min استخراج‌شده
    const vMin = toNum(q?.scale?.min) ?? 0;
    const vMax = toNum(q?.scale?.max) ?? (toNum(q?.max) ?? 1);

    // value → answer
    let v = toNum(item?.value);
    if (v == null && item?.answer != null) v = pickOptionValue(q, item.answer);
    if (v == null) {
      meta.ignored++;
      meta.reasonsIgnored.push({ id: item?.questionId, reason: "NO_USABLE_RESPONSE" });
      continue;
    }

    // کلمپ
    if (v < vMin) v = vMin;
    if (v > vMax) v = vMax;

    // reverse در صورت نیاز
    if (reverse) v = vMax === 1 ? 1 - v : (vMax - (v - vMin));

    // انباشت
    raw[t]    += v * weight;
    maxPer[t] += vMax * weight;
    meta.used++;
    meta.byType[t].sum += v * weight;
    meta.byType[t].max += vMax * weight;
  }

  meta.ignored = meta.total - meta.used;

  // نرمال‌سازی
  const normalized = Object.fromEntries(
    KEYS.map((k) => [k, toPct(raw[k], Math.max(1, maxPer[k]))])
  );

  // کد هالند و غالب‌ها
  const sortedAll = sortDescPairs(Object.entries(normalized));
  const top3 = sortedAll.slice(0, 3).map(([k]) => k);
  const code = top3.join("");
  const topScore = sortedAll[0]?.[1] ?? 0;
  const dominantTraits = sortedAll.filter(([, v]) => v === topScore).map(([k]) => k);

  // traits برای UI
  const traits = Object.fromEntries(
    KEYS.map((k) => {
      const firstQ = (questions || []).find((qq) => qq?.type === k);
      const description = typeof firstQ?.description === "string" ? firstQ.description : null;
      const careers = Array.isArray(firstQ?.careers) ? firstQ.careers : [];
      return [
        k,
        {
          name: NAMES[k],
          description,
          careers,
          score: raw[k],
          percentage: normalized[k],
          isDominant: dominantTraits.includes(k) || top3.includes(k),
        },
      ];
    })
  );

  // چارت اختیاری برای UI
  const chartData = {
    labels: KEYS.map((k) => NAMES[k]),
    datasets: [
      {
        label: "پروفایل فردی",
        data: KEYS.map((k) => normalized[k]),
        backgroundColor: "rgba(37,99,235,.65)",
        borderColor: "#2563eb",
        borderWidth: 1,
        borderRadius: 8,
      },
    ],
  };

  const summary = code
    ? `کد هالند شما ${code} (${code.split("").map((k) => NAMES[k]).join("/")}) است.`
    : "کد هالند قابل تعیین نیست.";

  const analyzedAt = new Date().toISOString();
  const dataForUI = {
    hollandCode: code,
    dominantTraits,
    rawScores: { ...raw },
    normalizedScores: { ...normalized },
    traits,
    summary,
    analyzedAt,
    chartData,
  };

  const overall =
    Math.round( KEYS.reduce((s, k) => s + (Number(normalized[k]) || 0), 0) / KEYS.length );

  return {
    test: "HOLLAND",
    scores: { ...raw },
    normalizedScores: { ...normalized },
    traits,
    summary,
    meta,
    analyzedAt,
    hollandCode: code,
    dominantTraits,
    dataForUI,
    overall,
  };
}

// ============================================================================
// #endregion HOLLAND
// ============================================================================



// ============================================================================
// #region GARDNER
// ============================================================================

/**
 * نگاشت پیشنهادی «id → نوع هوش»
 * اگر بانک سؤال‌هات شناسه‌های متفاوتی داره، فقط آرایه‌ها رو با شناسه‌های خودت پر کن.
 * کدها:
 * L=کلامی-زبانی, M=منطقی-ریاضی, S=فضایی, B=بدنی-جنبشی,
 * Mu=موسیقایی, I=میان‌فردی, In=درون‌فردی, N=طبیعت‌گرا
 */
// ======================= Gardner helpers =======================

// 1) نگاشت نوع سؤال بر اساس شناسه‌ها (هر بُعد = 10 سؤال → مجموعاً 80)
const GARDNER_TYPE_MAP = (() => {
  const map = {};
  const set = (ids, t) => ids.forEach((id) => (map[id] = t));

  // L (کلامی-زبانی)
  set([1,9,17,24,34,41,49,57,65,73], "L");
  // M (منطقی-ریاضی)
  set([2,10,16,18,35,42,50,58,66,74], "M");
  // S (فضایی/دیداری)
  set([3,11,19,30,36,43,51,59,67,75], "S");
  // B (بدنی-جنبشی)
  set([4,12,20,25,29,44,52,60,68,76], "B");
  // I (میان‌فردی)
  set([5,13,21,26,31,37,45,53,61,69], "I");
  // In (درون‌فردی)
  set([6,14,22,27,32,38,46,54,62,70,78], "In"); // 78 هم درون‌فردی است
  // Mu (موسیقایی)
  set([7,15,23,28,40,47,55,63,71,79], "Mu");
  // N (طبیعت‌گرا)
  set([8,33,39,48,56,64,72,80], "N");

  return map;
})();

// 2) برچسب‌های رایج لیکرت فارسی → مقدار عددی 1..5
const LIKERT_FA_TO_NUM = {
  "خیلی کم": 1,
  "کم": 2,
  "کمی": 2,           // اگر جایی «کم» نباشد و «کمی» باشد
  "تاحدی": 3,
  "تا حدی": 3,
  "زیاد": 4,
  "خیلی زیاد": 5,
};

// 3) یکنواخت‌کننده‌ی ارقام فارسی
const persianDigitsMap = { "۰":0,"۱":1,"۲":2,"۳":3,"۴":4,"۵":5,"۶":6,"۷":7,"۸":8,"۹":9 };
const normalizeDigits = (s) =>
  String(s ?? "").replace(/[۰-۹]/g, (d) => String(persianDigitsMap[d])).trim();

const toNumSafe = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v == null) return null;
  const n = Number(normalizeDigits(v));
  return Number.isFinite(n) ? n : null;
};

// 4) غنی‌ساز سؤال‌ها: type/scale/weight اضافه می‌شود (بدون تغییر options)
export function enrichGardnerQuestions(questions = []) {
  const withMeta = (questions || []).map((q) => {
    const type = q?.type || GARDNER_TYPE_MAP[q?.id] || null;
    const weight = q?.weight ?? 1;

    // scale از روی گزینه‌ها: اگر گزینه‌ها قابل تبدیل به عدد باشند → min..max
    // اگر نه، چون لیکرت ۵تاییه → 1..5
    let min = 1, max = 5;
    if (Array.isArray(q?.options) && q.options.length) {
      const numericOpts = q.options
        .map((o) => (typeof o === "object" ? toNumSafe(o?.value) : toNumSafe(o)))
        .filter((n) => n != null);
      if (numericOpts.length) {
        min = Math.min(...numericOpts);
        max = Math.max(...numericOpts);
      } else {
        // اگر برچسب فارسی باشد و مقدار عددی نداشته باشد، همان 1..5 می‌ماند
        min = 1; max = 5;
      }
    }

    return {
      ...q,
      type,
      weight,
      scale: { min, max },
      max: q?.max ?? max,      // برای سازگاری با کدهایی که از max استفاده می‌کنند
      reverse: !!q?.reverse,   // در صورت نیاز آینده
    };
  });

  return withMeta;
}

// 5) نگاشت پاسخ کاربر به عدد (با توجه به options و برچسب‌های فارسی)
function pickOptionValueGardner(q, ans) {
  if (!q || ans == null) return null;
  const text = normalizeDigits(ans);

  // اگر options شیء باشند {label, value}
  if (Array.isArray(q.options) && q.options.length && typeof q.options[0] === "object") {
    const byLabel = q.options.find((o) => normalizeDigits(o?.label) === text);
    if (byLabel?.value != null) {
      const n = toNumSafe(byLabel.value);
      if (n != null) return n;
    }
    const byValue = q.options.find((o) => normalizeDigits(o?.value) === text);
    if (byValue?.value != null) {
      const n = toNumSafe(byValue.value);
      if (n != null) return n;
    }
  }

  // اگر options رشته‌ای باشند
  if (Array.isArray(q.options)) {
    // تطابق دقیق با گزینه
    const hit = q.options.find((opt) => normalizeDigits(opt) === text);
    if (hit != null) {
      // اگر خود گزینه عددی باشد
      const asNum = toNumSafe(hit);
      if (asNum != null) return asNum;
      // برچسب فارسی
      if (LIKERT_FA_TO_NUM[hit] != null) return LIKERT_FA_TO_NUM[hit];
    }
  }

  // تلاش برای تبدیل مستقیم ans به عدد
  const n = toNumSafe(text);
  if (n != null) return n;

  // برچسب فارسی در متن پاسخ
  if (LIKERT_FA_TO_NUM[text] != null) return LIKERT_FA_TO_NUM[text];

  return null;
}

// 6) تحلیل مقاوم گاردنر (Drop-in جایگزین قبلی)
export function analyzeGardner(answers = [], questions = []) {
  // اگر سوالات خام هستند، enrich کن
  const qs = enrichGardnerQuestions(questions);

  const KEYS = ["L","M","S","B","Mu","I","In","N"];
  const NAMES = {
    L: "کلامی-زبانی",
    M: "منطقی-ریاضی",
    S: "فضایی",
    B: "بدنی-جنبشی",
    Mu: "موسیقایی",
    I: "میان‌فردی",
    In: "درون‌فردی",
    N: "طبیعت‌گرا",
  };

  const raw   = Object.fromEntries(KEYS.map((k) => [k, 0]));
  const maxPer= Object.fromEntries(KEYS.map((k) => [k, 0]));
  const qIndex= new Map(qs.map((q) => [String(q.id), q]));

  for (const a of (answers || [])) {
    const q = qIndex.get(String(a?.questionId));
    const t = q?.type;
    if (!q || !KEYS.includes(t)) continue;

    // مقدار پاسخ
    let v = toNumSafe(a?.value);
    if (v == null && a?.answer != null) v = pickOptionValueGardner(q, a.answer);
    if (v == null) continue;

    // کلمپ به scale
    const vMin = toNumSafe(q?.scale?.min) ?? 1;
    const vMax = toNumSafe(q?.scale?.max) ?? 5;
    if (v < vMin) v = vMin;
    if (v > vMax) v = vMax;

    // reverse اگر بود (در این نسخه نیازی نیست، ولی آماده است)
    if (q?.reverse) v = vMax - (v - vMin);

    const w = toNumSafe(q?.weight) ?? 1;
    raw[t]    += v * w;
    maxPer[t] += vMax * w;
  }

  // نرمال‌سازی 0..100
  const clampPct = (x) => Math.max(0, Math.min(100, Math.round(x)));
  const toPct = (sum, max) => clampPct(((Number(sum)||0) / Math.max(1, Number(max)||1)) * 100);

  const normalized = Object.fromEntries(
    KEYS.map((k) => [k, toPct(raw[k], maxPer[k])])
  );

  // برترین‌ها
  const entries = Object.entries(normalized).sort((a,b) => b[1]-a[1]);
  const topVal = entries[0]?.[1] ?? 0;
  const top = entries.filter(([,v]) => v === topVal).map(([k]) => k);

  // پروفایل‌ها برای UI
  const intelligenceProfiles = Object.fromEntries(
    KEYS.map((k) => [
      k,
      { code: k, name: NAMES[k], score: raw[k], percentage: normalized[k], isTop: top.includes(k) }
    ])
  );

  // چارت اختیاری
  const chartData = {
    labels: KEYS.map((k) => NAMES[k]),
    datasets: [{
      label: "پروفایل فردی",
      data: KEYS.map((k) => normalized[k]),
      backgroundColor: "rgba(37,99,235,.65)",
      borderColor: "#2563eb",
      borderWidth: 1,
      borderRadius: 8,
    }],
  };

  const summary = `هوش‌های برتر: ${
    top.length ? top.map((k) => NAMES[k]).join("، ") : "نامشخص"
  }`;

  const analyzedAt = new Date().toISOString();

  const dataForUI = {
    topIntelligences: top,
    primaryIntelligence: top[0] || null,
    rawScores: raw,
    normalizedScores: normalized,
    intelligenceProfiles,
    chartData,
    summary,
    analyzedAt,
  };

  return {
    test: "GARDNER",
    scores: raw,
    normalizedScores: normalized,
    intelligenceProfiles,
    topIntelligences: top,
    primaryIntelligence: top[0] || null,
    summary,
    analyzedAt,
    dataForUI,
  };
}

// ============================================================================
// #endregion GARDNER
// ============================================================================



// ============================================================================
// #region CLIFTON
// ============================================================================

export function analyzeClifton(answers = [], questions = Dummy.Clifton_Test) {
  // نگاشت نمونه از فارسی به کلید انگلیسی (قابل تکمیل)
  const mapFaToKey = (txt = "") => {
    const t = String(txt).trim();
    const dict = {
      "آینده‌گرا": "Futuristic",
      "آینده نگر": "Futuristic",
      "زمینه‌گرا": "Context",
      "زمینه": "Context",
      "توسعه‌دهنده": "Developer",
      "توسعه دهنده": "Developer",
      "مثبت‌اندیش": "Positivity",
      "مثبت اندیشی": "Positivity",
      "رابطه‌گر": "Relator",
      "رابطه ساز": "Relator",
      "پیوندگرا": "Connectedness",
      "منصف": "Consistency",
      "خودباور": "SelfAssurance",
      "تحلیلی": "Analytical",
      "اندیشمند": "Intellection",
      "یادگیرنده": "Learner",
      "ایده‌پردازی": "Ideation",
      "ایده پردازی": "Ideation",
      "استراتژیک": "Strategic",
      "رقابت": "Competition",
      "باور": "Belief",
      "تمرکز": "Focus",
      "اهمیت": "Significance",
      "فعال‌کننده": "Activator",
      "سازگاری": "Adaptability",
      "تنظیم‌کننده": "Arranger",
      "فردگرایی": "Individualization",
      "ورودی": "Input",
      "خرد": "Deliberative",
      "فراگیری": "Includer",
      "فراگیر بودن": "Includer",
      "دوست داشتن": "Woo",
      "دستور دادن": "Command",
      "موفق": "Achiever",
      "تجدیدکننده": "Restorative",
      "همدلی": "Empathy",
    };
    return dict[t] || t.replace(/\s+/g, "_");
  };

  const raw = {};
  const inc = (k) => (raw[k] = (raw[k] || 0) + 1);

  answers.forEach(({ questionId, choice }) => {
    const qid = toNum(questionId);
    const q = questions?.find?.((qq) => toNum(qq.id) === qid);
    if (choice) {
      inc(mapFaToKey(choice));
      return;
    }
    if (!q) return;
    if (q.theme_a && choice === "A") inc(q.theme_a);
    if (q.theme_b && choice === "B") inc(q.theme_b);
  });

  const total = Object.values(raw).reduce((s, v) => s + v, 0) || 1;
  const normalized = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, clampPct((v / total) * 100)]));
  const ranked = sortDescPairs(Object.entries(normalized));
  const topVal = ranked[0]?.[1] ?? 0;
  const topThemes = ranked.filter(([, v]) => v === topVal).map(([k]) => k);

  const dataForUI = {
    topThemes,
    signatureTheme: topThemes[0] || null,
    rawScores: raw,
    normalizedScores: normalized,
    summary: `نقاط قوت برتر: ${topThemes.join("، ") || "نامشخص"}`,
  };

  return {
    topThemes,
    signatureTheme: dataForUI.signatureTheme,
    rawScores: raw,
    normalizedScores: normalized,
    summary: dataForUI.summary,
    dataForUI,
  };
}

// ============================================================================
// #endregion CLIFTON
// ============================================================================



// ============================================================================
// #region GHQ
// ============================================================================

export function analyzeGHQ(answers = [], questions = Dummy.Ghq_Test) {
  const KEYS = ["Stress", "Mood", "Function", "Social"];
  const raw = Object.fromEntries(KEYS.map((k) => [k, 0]));
  const maxPer = Object.fromEntries(KEYS.map((k) => [k, 0]));

  answers.forEach(({ questionId, value }) => {
    const qid = toNum(questionId);
    const val = toNum(value);
    if (qid == null || val == null) return;
    const q = questions?.find?.((qq) => toNum(qq.id) === qid);
    if (!q || !(q.trait in raw)) return;

    // Positive: مستقیم | Negative: معکوس (Likert 1..5)
    const scored = q.direction === "Positive" ? val : 6 - val;
    raw[q.trait] += scored;
    maxPer[q.trait] += 5;
  });

  const normalized = Object.fromEntries(KEYS.map((k) => [k, toPct(raw[k], maxPer[k])]));
  const totalScore = Object.values(raw).reduce((s, v) => s + v, 0);
  const totalMax = Object.values(maxPer).reduce((s, v) => s + v, 0) || 1;
  const normalizedTotal = clampPct((totalScore / totalMax) * 100);

  // آستانه‌ها را با نسخه‌ی پرسشنامه‌تان تنظیم کنید
  const riskLevel = totalScore >= totalMax * 0.7 ? "High" : totalScore >= totalMax * 0.5 ? "Moderate" : "Low";

  const traits = {
    Stress: { name: "استرس", score: normalized.Stress, percentage: normalized.Stress },
    Mood: { name: "خلق", score: normalized.Mood, percentage: normalized.Mood },
    Function: { name: "عملکرد", score: normalized.Function, percentage: normalized.Function },
    Social: { name: "اجتماعی", score: normalized.Social, percentage: normalized.Social },
  };

  const dataForUI = {
    totalScore,
    normalizedTotal,
    riskLevel,
    rawScores: raw,
    normalizedScores: normalized,
    traits,
    summary: `سطح خطر: ${riskLevel === "High" ? "بالا (نیاز به توجه)" : riskLevel === "Moderate" ? "متوسط" : "پایین (خوب)"}`,
  };

  return {
    rawScores: raw,
    normalizedScores: normalized,
    totalScore,
    normalizedTotal,
    riskLevel,
    traits,
    summary: dataForUI.summary,
    dataForUI,
  };
}

// ============================================================================
// #endregion GHQ
// ============================================================================



// ============================================================================
// #region PERSONAL_FAVORITES
// ============================================================================

// Server/utils/personalFavoritesAnalyzer.js
// تحلیل حرفه‌ای Personal Favorites (سازگار با Unified API شما)
/**
 * answers: [{ questionId, value }...]  value در بازه 1..5
 * questions: همان PersonalFavorites_Test با { id, trait, direction:'Agreement'|'Reverse', options:[{text,value}] }
 * خروجی: { scores(raw%), normalizedScores(0..100), frequencies, topPreferences, dataForUI... }
 */
const TEXT2LIKERT = new Map([
  ["کاملاً مخالفم", 1], ["کاملا مخالفم", 1],
  ["مخالفم", 2],
  ["نظری ندارم", 3],
  ["موافقم", 4],
  ["کاملاً موافقم", 5], ["کاملا موافقم", 5],
]);

function pickOptionValue(q, answer) {
  // مستقیمِ عددی؟
  const numDirect = toNum(answer);
  if (numDirect != null) return numDirect;

  if (q && Array.isArray(q.options) && q.options.length) {
    const ans = String(answer ?? "").trim();
    const byText = q.options.find((o) => String(o?.text).trim() === ans);
    if (byText?.value != null) {
      const n = toNum(byText.value);
      if (n != null) return n;
    }
    const byValue = q.options.find((o) => String(o?.value) === ans);
    if (byValue?.value != null) {
      const n = toNum(byValue.value);
      if (n != null) return n;
    }
  }
  const fallback = TEXT2LIKERT.get(String(answer ?? "").trim());
  return fallback ?? null;
}

/**
 * آنالایزر حرفه‌ای Personal Favorites با بنچمارک داخلی
 * @param {Array<{questionId:number|string, value?:number|string, answer?:string|number}>} answers
 * @param {Array<{id:number, trait:string, direction?:"Agreement"|"Reverse", options?:Array<{text:string,value:number}>}>} questions
 * @param {{ userInfo?: { fullName?: string }, benchmark?: { label?: string, normalizedScores: Record<string, number> } }} opts
 */
export function analyzePersonalFavorites(answers = [], questions = [], opts = {}) {
  // 0) بانک سؤال: ورودی → Dummy → بانک مصنوعی
  let questionsIn = Array.isArray(questions) && questions.length
    ? questions
    : (Array.isArray(Dummy?.PersonalFavorites_Test) ? Dummy.PersonalFavorites_Test : []);

  if (!questionsIn.length) {
    // بانک مصنوعی (trait پیش‌فرض Work، مقیاس 1..5)
    const ids = Array.from(new Set((answers || []).map((a) => Number(a?.questionId)).filter(Boolean)));
    questionsIn = ids.map((id) => ({
      id,
      trait: "Work",
      direction: "Agreement",
      options: [
        { text: "۱", value: 1 }, { text: "۲", value: 2 },
        { text: "۳", value: 3 }, { text: "۴", value: 4 },
        { text: "۵", value: 5 },
      ],
    }));
  }

  const qById = new Map(questionsIn.map((q) => [String(q?.id), q]));

  // کشف خودکار ابعاد
  const TRAITS = Array.from(
    new Set(questionsIn.map((q) => String(q?.trait || "").trim()).filter(Boolean))
  );
  const traits = TRAITS.length ? TRAITS : ["Work"];
  const singleTraitFallback = traits.length === 1 ? traits[0] : null;

  // انباشت
  const raw    = Object.fromEntries(traits.map((t) => [t, 0]));
  const maxPer = Object.fromEntries(traits.map((t) => [t, 0]));
  const freq   = Object.fromEntries(traits.map((t) => [t, {}]));

  let used = 0;
  const reasonsIgnored = [];

  for (const it of (answers || [])) {
    let q = qById.get(String(it?.questionId));

    // اگر سوال پیدا نشد اما فقط یک trait داریم، روی همان trait بریز
    if (!q && singleTraitFallback) {
      q = { id: it?.questionId, trait: singleTraitFallback, direction: "Agreement", options: [] };
    }
    if (!q || !q.trait) {
      reasonsIgnored.push({ id: it?.questionId, reason: "NO_MATCHING_QUESTION_OR_TRAIT" });
      continue;
    }

    let v = toNum(it?.value);
    if (v == null && it?.answer != null) v = pickOptionValue(q, it.answer);
    if (v == null) {
      reasonsIgnored.push({ id: it?.questionId, reason: "NO_USABLE_RESPONSE" });
      continue;
    }

    // بازه معتبر از options (پیش‌فرض 1..5)
    let vMin = 1, vMax = 5;
    if (Array.isArray(q.options) && q.options.length) {
      const nums = q.options.map((o) => toNum(o?.value)).filter((x) => x != null);
      if (nums.length) {
        vMin = Math.min(...nums);
        vMax = Math.max(...nums);
      }
    }
    // کلمپ
    if (v < vMin) v = vMin;
    if (v > vMax) v = vMax;

    const direct = q.direction === "Reverse" ? (vMax + vMin - v) : v;

    raw[q.trait] += direct;
    maxPer[q.trait] += vMax;
    used++;

    const label = (() => {
      if (Array.isArray(q.options) && q.options.length) {
        const opt = q.options.find((o) => String(o?.value) === String(v));
        return opt?.text || String(v);
      }
      return it?.answer != null ? String(it.answer) : String(v);
    })();

    freq[q.trait][label] = (freq[q.trait][label] || 0) + 1;
  }

  // نرمال‌سازی 0..100
  const normalized = Object.fromEntries(traits.map((t) => [t, toPct(raw[t], maxPer[t])]));

  // KPI
  const ranked = sortDescPairs(Object.entries(normalized));
  const strongest = ranked[0] ? { trait: ranked[0][0], percentage: ranked[0][1] } : null;
  const weakest   = ranked.length ? { trait: ranked.at(-1)[0], percentage: ranked.at(-1)[1] } : null;
  const spread    = strongest && weakest ? Math.round(strongest.percentage - weakest.percentage) : 0;

  // ترجیح غالب هر بُعد
  const topPreferences = Object.fromEntries(
    traits.map((t) => {
      const entries = Object.entries(freq[t] || {});
      if (!entries.length) return [t, null];
      const [value, count] = sortDescPairs(entries)[0];
      return [t, { value, count }];
    })
  );

  // === بنچمارک (اختیاری) ===
  const benchMap = opts?.benchmark?.normalizedScores || null;
  const hasBench = benchMap && typeof benchMap === "object" && Object.keys(benchMap).length > 0;

  const benchmark = hasBench
    ? {
        label: opts?.benchmark?.label || "میانگین گروه",
        normalizedScores: { ...benchMap },
        deltas: Object.fromEntries(traits.map((t) => [t, Math.round((normalized[t] || 0) - (toNum(benchMap[t]) || 0))])),
      }
    : null;

  // داده‌ی نمودار
  const chartData = {
    labels: traits,
    datasets: [
      {
        label: opts?.userInfo?.fullName ? `پروفایل ${opts.userInfo.fullName}` : "پروفایل فردی",
        data: traits.map((t) => normalized[t]),
        backgroundColor: "rgba(37,99,235,.65)",
        borderColor: "#2563eb",
        borderWidth: 1,
        borderRadius: 8,
      },
      ...(benchmark
        ? [{
            label: benchmark.label,
            data: traits.map((t) => toNum(benchMap[t]) || 0),
            backgroundColor: "rgba(148,163,184,.35)",
            borderColor: "rgba(148,163,184,.65)",
            borderWidth: 1,
            borderRadius: 8,
          }]
        : []),
    ],
  };

  const analyzedAt = new Date().toISOString();
  const summary = strongest
    ? `غالب‌ترین حوزه: ${strongest.trait} (${strongest.percentage}%)`
    : "پروفایل نامشخص";

  const dataForUI = {
    traits,
    rawScores: { ...raw },
    normalizedScores: { ...normalized },
    frequencies: freq,
    topPreferences,
    strongest,
    weakest,
    spread,
    summary,
    analyzedAt,
    chartData,
    ...(benchmark ? { benchmark } : {}),
  };

  return {
    test: "PERSONAL_FAVORITES",
    scores: { ...raw },
    normalizedScores: { ...normalized },
    frequencies: freq,
    topPreferences,
    summary,
    dataForUI,
    meta: {
      total: answers?.length || 0,
      used,
      answered: answers?.length || 0,
      reasonsIgnored,
      completedAt: opts?.completedAt,
      durationSec: opts?.durationSec,
      testType: "PERSONAL_FAVORITES",
    },
    analyzedAt,
    ...(opts?.userInfo ? { userInfo: opts.userInfo } : {}),
  };
}


// ============================================================================
// #endregion PERSONAL_FAVORITES
// ============================================================================



// ============================================================================
// #region Unified API (ورودی یکپارچه + خروجی استاندارد)
// ============================================================================

/**
 * نقطه ورود یکپارچه تحلیل
 * @param {{ testType:string, answers:any[], meta?:any }} param0
 * @returns {{ analysis: any, overall: number }}
 */
export function getTestAnalysisUnified({ testType, answers, meta }) {
  /** @type {any} */
  let raw = null;
  try {
    switch (testType) {
      case "MBTI":
        raw = analyzeMBTI(answers);
        break;
      case "DISC":
        raw = analyzeDISC(answers);
        break;
      case "HOLLAND":
        raw = analyzeHolland(answers);
        {
           // ➊ غنی‌سازی بانک سؤال‌ها (type/scale/weight) بدون تغییر options
           const enriched = enrichHollandQuestions(Dummy.Holland_Test);
           // ➋ تحلیل هالند با سؤال‌های غنی‌شده
           raw = analyzeHolland(answers, enriched);
         }
        break;
      case "GARDNER":
        raw = analyzeGardner(answers);
        {
           // ➊ غنی‌سازی بانک سؤال‌ها (type/scale/weight) بدون تغییر options
           const enriched = enrichGardnerQuestions(Dummy.Gardner_Test);
           // ➋ تحلیل هالند با سؤال‌های غنی‌شده
           raw = analyzeGardner(answers, enriched);
         }
        break;
      case "CLIFTON":
        raw = analyzeClifton(answers);
        break;
      case "GHQ":
        raw = analyzeGHQ(answers);
        break;
      case "PERSONAL_FAVORITES":
        raw = analyzePersonalFavorites(answers);
        break;
      default:
        raw = null;
    }
  } catch (e) {
    devLog("[Analyzer Error]", e?.message);
    raw = null;
  }

  // fallback ساده اگر analyzer یافت نشد یا ورودی خراب بود
  if (!raw) {
    const total = Array.isArray(answers) ? answers.length : 0;
    const sum = (answers || []).reduce((s, a) => s + (Number(a?.value) || 0), 0);
    const avg = total ? sum / total : 0;
    raw = {
      test: testType,
      scores: { total, avg: Math.round(avg * 100) / 100 },
      summary: total ? "تحلیل با داده‌های محدود انجام شد." : "داده‌ای برای تحلیل موجود نیست.",
      dataForUI: {},
    };
  }

  const analysis = standardizeAnalysis(raw, { ...meta, testType });
  const overall = computeOverallScore(analysis.scores);
  return { analysis, overall };
}

/**
 * استانداردسازی خروجی تحلیل برای مصرف لایه‌های بالاتر/ذخیره در DB
 * @param {any} raw
 * @param {any} meta
 */
export function standardizeAnalysis(raw = {}, meta = {}) {
  const scores =
    raw.scores && typeof raw.scores === "object" && Object.keys(raw.scores).length
      ? raw.scores
      : raw.normalizedScores && typeof raw.normalizedScores === "object"
      ? raw.normalizedScores
      : {};

  return {
    test: raw.test || meta.testType,
    scores,
    traits: raw.traits || raw.intelligenceProfiles || raw.themeDetails || raw.dimensions || null,
    summary: typeof raw.summary === "string" ? raw.summary : "",
    dataForUI: raw.dataForUI ?? null,
    meta: { ...(raw.meta || {}), ...(meta || {}) },
  };
}

/** میانگین گرفتن از نمرات 0..100 (برای KPI کلی) */
export function computeOverallScore(scores = {}) {
  const vals = Object.values(scores)
    .map((v) => (typeof v === "number" ? v : null))
    .filter((v) => v != null);
  if (!vals.length) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return clampPct(mean);
}

// ============================================================================
// #endregion Unified API
// ============================================================================



// ============================================================================
// #region Simple Facade (سوییچر ساده در صورت نیاز قبلی)
// ============================================================================

/** سازگاری با کدهای قدیمی */
export const getTestAnalysis = (testType, answers) => {
  return getTestAnalysisUnified({ testType, answers }).analysis;
};

// ============================================================================
// #endregion Simple Facade
// ============================================================================
