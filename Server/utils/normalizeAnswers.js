// Server/utils/normalizeAnswers.js
// ============================================================================
// نرمال‌ساز پاسخ‌ها برای تمام تست‌ها (MBTI, DISC, HOLLAND, GARDNER, CLIFTON, GHQ, PERSONAL_FAVORITES)
// - سازگار با ماژول تحلیل ارائه‌شده
// - ایمن، توسعه‌پذیر، با گزارش هشدارهای داده‌ای اختیاری
// ============================================================================

/** @typedef {{ id:number, trait?:string, type?:string, direction?:'Positive'|'Negative', max?:number, options?:Array<{label:string,value:string|number}> }} Question */

const isFiniteNum = (v) => Number.isFinite(Number(v));
const toNum = (v) => (isFiniteNum(v) ? Number(v) : v);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const trimStr = (s) => (typeof s === "string" ? s.trim() : s);

const YES_WORDS = new Set(["yes", "true", "1", "y", "بله"]);
const NO_WORDS  = new Set(["no", "false", "0", "n", "خیر", "نه"]);

const DISC_KEYS = new Set(["D", "I", "S", "C"]);
const MBTI_SIDES = {
  EI: new Set(["E", "I"]),
  SN: new Set(["S", "N"]),
  TF: new Set(["T", "F"]),
  JP: new Set(["J", "P"]),
};

/**
 * تلاش برای یِس/نو کردن ورودی متنی/عددی
 * @param {any} v
 * @returns {boolean|null}
 */
function parseYesNo(v) {
  if (v === true) return true;
  if (v === false) return false;
  const s = String(v ?? "").trim().toLowerCase();
  if (YES_WORDS.has(s)) return true;
  if (NO_WORDS.has(s)) return false;
  return null;
}

/**
 * بازیابی سوال از لیست براساس questionId (اگر داده شد)
 * @param {Array<Question>=} questions
 * @param {any} qid
 */
function findQ(questions, qid) {
  if (!questions || !Array.isArray(questions)) return null;
  const id = Number(qid);
  if (!Number.isFinite(id)) return null;
  return questions.find((q) => Number(q?.id) === id) || null;
}

/**
 * برگرداندن 'best' | 'worst' برای DISC (از خود پاسخ یا از سوال)
 */
function inferDiscType(answer, q) {
  if (answer?.type) {
    const t = String(answer.type).toLowerCase();
    if (t === "best" || t === "worst") return t;
  }
  if (q?.type) {
    const t = String(q.type).toLowerCase();
    if (t === "best" || t === "worst") return t;
  }
  return null;
}

/**
 * کلمپ کردن مقیاس لیکرت 1..5 (در صورت نیاز 7 تایی را هم پشتیبانی می‌کند)
 */
function coerceLikert(value, max = 5) {
  if (!isFiniteNum(value)) return value;
  const n = Number(value);
  const m = Number(max) || 5;
  return clamp(Math.round(n), 1, m);
}

/**
 * مقادیر options را با value سینک می‌کند (برای PERSONAL_FAVORITES و مشابه)
 * @returns {{value:number|string, label?:string}}
 */
function matchOptionByValue(value, q) {
  if (!q?.options || !Array.isArray(q.options)) return { value };
  const opt = q.options.find((o) => String(o.value) === String(value));
  if (opt) return { value: opt.value, label: opt.label };
  return { value };
}

/**
 * نرمال‌سازی پاسخ‌ها (سازگار با آنالایزر)
 * @param {"MBTI"|"DISC"|"HOLLAND"|"GARDNER"|"CLIFTON"|"GHQ"|"PERSONAL_FAVORITES"} testType
 * @param {Array<any>} answers
 * @param {{ questions?: Array<Question>, strict?: boolean, likertMax?: number }} [opts]
 *   - questions: برای پر کردن/اعتبارسنجی فیلدهای کمبود
 *   - strict: اگر true باشد موارد نامعتبر حذف می‌شوند (به‌جای عبور با هشدار)
 *   - likertMax: حداکثر لیکرت پیش‌فرض (۵). برای برخی آزمون‌ها ۷ هم ممکن است
 * @returns {Array<any>} آرایه نهایی پاسخ‌های نرمال‌شده
 */
export function normalizeAnswers(testType, answers = [], opts = {}) {
  const { questions, strict = false, likertMax = 5 } = opts || {};
  const { answers: out } = normalizeAnswersWithReport(testType, answers, { questions, strict, likertMax });
  return out;
}

/**
 * نسخه با گزارش هشدار
 * @returns {{answers: Array<any>, warnings: string[]}}
 */
export function normalizeAnswersWithReport(testType, answers = [], opts = {}) {
  const warnings = [];
  const { questions, strict = false, likertMax = 5 } = opts || {};

  const list = Array.isArray(answers) ? answers : [];
  const normalized = list
    .map((a, idx) => {
      const out = { ...a };
      // questionId → number (اگر شد)
      if ("questionId" in out) out.questionId = toNum(out.questionId);

      const q = findQ(questions, out.questionId);

      switch (testType) {
        // -------------------------------------------------------------------
        case "MBTI": {
          // ورودی آنالایزر: {questionId:number, value:1..5}
          if ("value" in out) {
            out.value = toNum(out.value);
            // کلمپ 1..5 (یا likertMax سفارشی)
            if (isFiniteNum(out.value)) out.value = coerceLikert(out.value, q?.max || likertMax);
          } else {
            warnings.push(`MBTI: پاسخ ${idx} فاقد value است.`);
            if (strict) return null;
          }
          return out;
        }

        // -------------------------------------------------------------------
        case "GARDNER": {
          // {questionId, value:1..5}
          if ("value" in out) {
            out.value = toNum(out.value);
            if (isFiniteNum(out.value)) out.value = coerceLikert(out.value, q?.max || likertMax);
          } else {
            warnings.push(`GARDNER: پاسخ ${idx} فاقد value است.`);
            if (strict) return null;
          }
          return out;
        }

        // -------------------------------------------------------------------
        case "GHQ": {
          // {questionId, value:1..5} | آنالایزر معکوس‌سازی را با direction انجام می‌دهد
          if ("value" in out) {
            out.value = toNum(out.value);
            if (isFiniteNum(out.value)) out.value = coerceLikert(out.value, q?.max || likertMax);
          } else {
            warnings.push(`GHQ: پاسخ ${idx} فاقد value است.`);
            if (strict) return null;
          }
          return out;
        }

        // -------------------------------------------------------------------
        case "DISC": {
          // ورودی استاندارد: {questionId, selectedTrait:'D'|'I'|'S'|'C', type:'best'|'worst'}
          // selectedTrait
          if (out.selectedTrait) {
            out.selectedTrait = String(out.selectedTrait).trim().toUpperCase();
            if (!DISC_KEYS.has(out.selectedTrait)) {
              warnings.push(`DISC: selectedTrait نامعتبر در پاسخ ${idx}: ${out.selectedTrait}`);
              if (strict) return null;
            }
          } else {
            warnings.push(`DISC: پاسخ ${idx} فاقد selectedTrait است.`);
            if (strict) return null;
          }

          // type را از پاسخ یا سوال کشف کن
          const t = inferDiscType(out, q);
          if (t) out.type = t;
          else {
            warnings.push(`DISC: type (best/worst) در پاسخ ${idx} مشخص نیست و از سوال هم یافت نشد.`);
            if (strict) return null;
          }
          return out;
        }

        // -------------------------------------------------------------------
        case "HOLLAND": {
          // دو سبک داریم:
          // 1) answer: بله/خیر (یا True/False)
          // 2) value: لیکرت 1..5
          if ("answer" in out && out.answer != null) {
            const yn = parseYesNo(out.answer);
            if (yn === null) {
              // اگر answer متنی ولی نامشخص بود، دست‌نخورده عبور ده
              out.answer = trimStr(out.answer);
            } else {
              out.answer = yn ? "بله" : "خیر"; // با آنالایزر شما سازگار است
            }
          }
          if ("value" in out && out.value != null) {
            out.value = toNum(out.value);
            if (isFiniteNum(out.value)) out.value = coerceLikert(out.value, q?.max || likertMax);
          }
          if (!("answer" in out) && !("value" in out)) {
            warnings.push(`HOLLAND: پاسخ ${idx} نه answer دارد نه value.`);
            if (strict) return null;
          }
          return out;
        }

        // -------------------------------------------------------------------
        case "CLIFTON": {
          // choice می‌تواند نام فارسی تم باشد، یا 'A' | 'B'
          if ("choice" in out && out.choice != null) {
            out.choice = trimStr(out.choice);
            // A/B را بزرگ کن
            if (/^[ab]$/i.test(out.choice)) out.choice = out.choice.toUpperCase();
            // در غیر اینصورت اسم تم/عبارت فارسی را دست‌نخورده بگذار
          } else {
            warnings.push(`CLIFTON: پاسخ ${idx} فاقد choice است.`);
            if (strict) return null;
          }
          return out;
        }

        // -------------------------------------------------------------------
        case "PERSONAL_FAVORITES": {
          // {questionId, value} + ممکن است options داشته باشد
          if ("value" in out) {
            out.value = toNum(out.value);
            // اگر سوال options دارد، label را ضمیمه کن (برای شمارش فرکانس)
            const synced = matchOptionByValue(out.value, q);
            out.value = synced.value;
            if (synced.label) out._label = synced.label; // برای دیباگ/نشانه‌گذاری
          } else {
            warnings.push(`PERSONAL_FAVORITES: پاسخ ${idx} فاقد value است.`);
            if (strict) return null;
          }
          return out;
        }

        // -------------------------------------------------------------------
        default: {
          // پاس‌ترو
          return out;
        }
      }
    })
    .filter(Boolean); // در حالت strict، nullها حذف می‌شوند

  // مرتب‌سازی اختیاری بر اساس questionId برای ثبات
  normalized.sort((a, b) => {
    const A = Number(a?.questionId);
    const B = Number(b?.questionId);
    if (Number.isFinite(A) && Number.isFinite(B)) return A - B;
    return 0;
  });

  return { answers: normalized, warnings };
}

export default normalizeAnswers;

// ============================================================================
// نمونه استفاده:
//
// const { answers: norm, warnings } = normalizeAnswersWithReport("DISC", userAnswers, { questions, strict:false });
// if (warnings.length) console.warn(warnings);
//
// یا ساده:
// const norm = normalizeAnswers("MBTI", userAnswers, { questions });
// ============================================================================
