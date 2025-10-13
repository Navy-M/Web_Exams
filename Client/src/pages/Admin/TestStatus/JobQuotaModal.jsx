import React, { useEffect, useMemo, useState } from "react";

/**
 * Props:
 * - open: boolean
 * - quotas: Record<string, { name: string, tableCount: number }>
 * - onChange: (key, value:number) => void
 * - onSubmit: (payload: {
 *     jobKey: string,
 *     quotas,
 *     criteria,              // نهایی‌شده (با enabled و weight)
 *     normalizedWeights,     // جمع 100 برای معیارهای فعال
 *     unavailableCriteria    // لیست معیارهایی که به‌خاطر نبود آزمون غیرفعال ماندند
 *   }) => void
 * - onClose: () => void
 * - jobRequirements: Record<string, any>   // مثل نمونه‌هایی که فرستادی (یا نسخه ارتقایافته)
 * - tests: Array<{ id, name, type, questionFormat?, ... }>   // همان Test_Cards
 */

const TEST_TYPE_KEYS = {
  MBTI: "MBTI",
  DISC: "DISC",
  HOLLAND: "HOLLAND",
  GARDNER: "GARDNER",
  CLIFTON: "CLIFTON",
  PERSONAL_FAVORITES: "PERSONAL_FAVORITES",
};

// نگاشت نام دامنه‌ها به فارسی برای نمایش
const DOMAIN_LABELS_FA = {
  Executing: "اجرایی",
  Influencing: "تأثیرگذاری",
  Relationship: "رابطه‌سازی",
  Strategic: "تفکر راهبردی",
};

const WEIGHT_SUM_OK_RANGE = [95, 105];

// ابزارک کوچک
function rid() { return Math.random().toString(36).slice(2, 9); }
function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** از لیست آزمون‌ها موجودی می‌سازد */
function buildTestsInventory(tests = []) {
  const has = new Set((tests || []).map(t => (t?.type || "").toUpperCase()));
  return {
    hasMBTI: has.has(TEST_TYPE_KEYS.MBTI),
    hasDISC: has.has(TEST_TYPE_KEYS.DISC),
    hasHOLLAND: has.has(TEST_TYPE_KEYS.HOLLAND),
    hasGARDNER: has.has(TEST_TYPE_KEYS.GARDNER),
    hasCLIFTON: has.has(TEST_TYPE_KEYS.CLIFTON),
    hasPF: has.has(TEST_TYPE_KEYS.PERSONAL_FAVORITES),
  };
}

/** اگر jobReq.criteria نباشد، از فیلدهای کلاسیک، معیارها را می‌سازد */
function deriveCriteriaFromClassic(jobReq = {}) {
  /** وزن‌های پیشنهادی پیش‌فرض (قابل‌دستکاری توسط کاربر با slider) */
  const DEFAULT_W = {
    BENCHMARK_DISTANCE: 25,
    CLIFTON_DOMAIN_MATCH: 20,
    HOLLAND_TOP3: 15,
    MBTI_PREF: 10,
    DISC_PATTERN: 15,
    GARDNER_TOP: 10,
    PF_KEYS: 5,
  };

  /** اگر خود jobReq.weightsDefault داشت، جایگزین می‌کنیم */
  const W = { ...DEFAULT_W, ...(jobReq?.weightsDefault || {}) };

  /** معیارها را از محتوا می‌سازیم */
  const out = [];

  // 1) اگر بنچمارک/پروفایل مرجع وجود دارد
  if (jobReq?.benchmark || jobReq?.benchmarkNormalized) {
    out.push({
      id: rid(),
      key: "BENCHMARK_DISTANCE",
      title: "فاصله تا بنچمارک شغل",
      enabled: true,
      weight: W.BENCHMARK_DISTANCE,
      method: "distance",
      args: { norm: "min" },
      sourceTest: null, // سراسری
    });
  }

  // 2) CLIFTON
  if (Array.isArray(jobReq?.clifton) && jobReq.clifton.length) {
    const domains = jobReq.clifton.filter((x) =>
      ["Executing","Influencing","Relationship","Strategic"].includes(x)
    );
    if (domains.length) {
      out.push({
        id: rid(),
        key: "CLIFTON_DOMAIN_MATCH",
        title: "هم‌خوانی دامنه‌های کلیفتون",
        enabled: true,
        weight: W.CLIFTON_DOMAIN_MATCH,
        method: "score",
        args: { domains },
        sourceTest: TEST_TYPE_KEYS.CLIFTON,
      });
    } else {
      // اگر تم‌های خاص نوشته شده (غیردامنه)
      out.push({
        id: rid(),
        key: "CLIFTON_THEME_MATCH",
        title: "انطباق تم‌های کلیفتون",
        enabled: true,
        weight: W.CLIFTON_DOMAIN_MATCH,
        method: "score",
        args: { themes: jobReq.clifton },
        sourceTest: TEST_TYPE_KEYS.CLIFTON,
      });
    }
  }

  // 3) HOLLAND
  if (Array.isArray(jobReq?.holland) && jobReq.holland.length) {
    out.push({
      id: rid(),
      key: "HOLLAND_TOP3",
      title: "انطباق Holland (Top-3)",
      enabled: true,
      weight: W.HOLLAND_TOP3,
      method: "score",
      args: { allowed: jobReq.holland },
      sourceTest: TEST_TYPE_KEYS.HOLLAND,
    });
  }

  // 4) MBTI
  if (Array.isArray(jobReq?.mbti) && jobReq.mbti.length) {
    out.push({
      id: rid(),
      key: "MBTI_PREF",
      title: "سازگاری MBTI با شغل",
      enabled: true,
      weight: W.MBTI_PREF,
      method: "boolean",
      args: { allow: jobReq.mbti },
      sourceTest: TEST_TYPE_KEYS.MBTI,
    });
  }

  // 5) DISC
  if (Array.isArray(jobReq?.disc) && jobReq.disc.length) {
    // نمونه‌ی ساده: اگر "High D", "High C" در لیست بود، آن‌ها را high در نظر بگیر
    const requireHigh = jobReq.disc
      .map(s => String(s || "").toUpperCase())
      .filter(s => s.includes("HIGH"))
      .map(s => s.replace("HIGH","").trim())
      .filter(Boolean); // ["D","C"]
    out.push({
      id: rid(),
      key: "DISC_PATTERN",
      title: "الگوی DISC موردنیاز",
      enabled: true,
      weight: W.DISC_PATTERN,
      method: "boolean",
      args: { requireHigh, minHigh: 65 },
      sourceTest: TEST_TYPE_KEYS.DISC,
    });
  }

  // 6) GARDNER
  if (Array.isArray(jobReq?.gardner) && jobReq.gardner.length) {
    out.push({
      id: rid(),
      key: "GARDNER_TOP",
      title: "هوش‌های برتر گاردنر",
      enabled: true,
      weight: W.GARDNER_TOP,
      method: "score",
      args: { allowed: jobReq.gardner },
      sourceTest: TEST_TYPE_KEYS.GARDNER,
    });
  }

  // 7) PF (Personal Favorites)
  if (Array.isArray(jobReq?.PF) && jobReq.PF.length) {
    out.push({
      id: rid(),
      key: "PF_KEYS",
      title: "ترجیحات شخصی (PF)",
      enabled: true,
      weight: W.PF_KEYS,
      method: "score",
      args: { keys: jobReq.PF },
      sourceTest: TEST_TYPE_KEYS.PERSONAL_FAVORITES,
    });
  }

  return out;
}

/** معیارها را از jobReq می‌سازد: اگر jobReq.criteria داشت از همان استفاده می‌کند، وگرنه derive */
function buildCriteriaFromJob(jobReq = {}) {
  if (Array.isArray(jobReq?.criteria) && jobReq.criteria.length) {
    // اگر وزن/روش/args نیامده باشد، مقادیر پیش‌فرض معقول بدهیم
    return jobReq.criteria.map((c) => ({
      id: c.id || rid(),
      key: c.key,
      title: c.title || c.key,
      enabled: c.enabled !== false,
      weight: Number.isFinite(c.weight) ? c.weight : 10,
      method: c.method || "score",
      args: c.args || {},
      sourceTest: c.sourceTest || guessSourceByKey(c.key),
    }));
  }
  return deriveCriteriaFromClassic(jobReq);
}

/** حدس می‌زند هر criterion به کدام آزمون وصل است (اگر در criteria نیامده باشد) */
function guessSourceByKey(key = "") {
  const k = String(key).toUpperCase();
  if (k.includes("MBTI")) return TEST_TYPE_KEYS.MBTI;
  if (k.includes("DISC")) return TEST_TYPE_KEYS.DISC;
  if (k.includes("HOLLAND")) return TEST_TYPE_KEYS.HOLLAND;
  if (k.includes("GARDNER")) return TEST_TYPE_KEYS.GARDNER;
  if (k.includes("CLIFTON")) return TEST_TYPE_KEYS.CLIFTON;
  if (k.includes("PF")) return TEST_TYPE_KEYS.PERSONAL_FAVORITES;
  return null; // عمومی/تجمیعی
}

/** بر اساس inventory، وضعیت availability برای هر criterion را تعیین می‌کند */
function attachAvailability(criteria = [], inv) {
  return (criteria || []).map((c) => {
    let available = true;
    if (c.sourceTest === TEST_TYPE_KEYS.MBTI) available = !!inv.hasMBTI;
    else if (c.sourceTest === TEST_TYPE_KEYS.DISC) available = !!inv.hasDISC;
    else if (c.sourceTest === TEST_TYPE_KEYS.HOLLAND) available = !!inv.hasHOLLAND;
    else if (c.sourceTest === TEST_TYPE_KEYS.GARDNER) available = !!inv.hasGARDNER;
    else if (c.sourceTest === TEST_TYPE_KEYS.CLIFTON) available = !!inv.hasCLIFTON;
    else if (c.sourceTest === TEST_TYPE_KEYS.PERSONAL_FAVORITES) available = !!inv.hasPF;
    // BENCHMARK_DISTANCE یا موارد سراسری → available باقی می‌ماند
    return { ...c, available };
  });
}

const JobQuotaModal = ({
  open,
  quotas = {},
  onChange,
  onSubmit,
  onClose,
  jobRequirements = {},
  tests = [],
}) => {
  if (!open) return null;

  const jobKeys = Object.keys(jobRequirements);
  const [jobKey, setJobKey] = useState(jobKeys[0] || "");

  useEffect(() => {
    if (!jobKey && jobKeys.length) setJobKey(jobKeys[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobKeys.join("|")]);

  const inv = useMemo(() => buildTestsInventory(tests), [tests]);

  // معیارها را از شغل انتخاب‌شده می‌سازیم و به inventory وصل می‌کنیم
  const { criteria, weightSum, weightOk, normalizedWeights, unavailableCriteria } = useMemo(() => {
    const req = jobRequirements[jobKey] || {};
    const base = buildCriteriaFromJob(req);
    const attached = attachAvailability(base, inv);

    const enabledOnes = attached.filter((c) => c.enabled && c.available);
    const sum = enabledOnes.reduce((s, c) => s + (Number(c.weight) || 0), 0);

    const normalized = Object.fromEntries(
      attached.map((c) => [
        c.key,
        c.enabled && c.available && sum > 0 ? +(100 * (Number(c.weight)||0) / sum).toFixed(2) : 0,
      ])
    );

    const wSum = Math.round(sum);
    const ok = wSum >= WEIGHT_SUM_OK_RANGE[0] && wSum <= WEIGHT_SUM_OK_RANGE[1];

    const unavailable = attached.filter((c) => !c.available).map((c) => ({
      key: c.key, title: c.title, sourceTest: c.sourceTest,
    }));

    return {
      criteria: attached,
      weightSum: wSum,
      weightOk: ok,
      normalizedWeights: normalized,
      unavailableCriteria: unavailable,
    };
  }, [jobRequirements, jobKey, inv]);

  // کاربر فقط تیک فعال/غیرفعال و وزن را تغییر می‌دهد (کلید/پارامتر/منبع و … قفل هستند)
  const [localCriteria, setLocalCriteria] = useState([]);
  useEffect(() => { setLocalCriteria(criteria); }, [criteria]);

  const handleToggle = (id, enabled) => {
    setLocalCriteria((prev) => prev.map(c => c.id === id ? { ...c, enabled } : c));
  };
  const handleWeight = (id, weight) => {
    setLocalCriteria((prev) => prev.map(c => c.id === id ? { ...c, weight: clamp01(weight) } : c));
  };

  // محاسبه مجدد نرمالایز براساس تغییرات کاربر
  const { finalSum, finalOk, finalNorm } = useMemo(() => {
    const enabled = localCriteria.filter(c => c.enabled && c.available);
    const sum = enabled.reduce((s, c) => s + (Number(c.weight) || 0), 0);
    const norm = Object.fromEntries(
      localCriteria.map(c => [
        c.key,
        c.enabled && c.available && sum > 0 ? +(100 * (Number(c.weight)||0) / sum).toFixed(2) : 0,
      ])
    );
    return {
      finalSum: Math.round(sum),
      finalOk: Math.round(sum) >= WEIGHT_SUM_OK_RANGE[0] && Math.round(sum) <= WEIGHT_SUM_OK_RANGE[1],
      finalNorm: norm,
    };
  }, [localCriteria]);

  const submit = () => {
    onSubmit?.({
      jobKey,
      quotas,
      criteria: localCriteria,
      normalizedWeights: finalNorm,
      unavailableCriteria,
    });
  };

  return (
    <div className="ts-modal-overlay" role="dialog" aria-modal="true">
      <div className="ts-modal card" dir="rtl">
        <h3>تنظیمات تخصیص و اولویت‌بندی</h3>

        {/* انتخاب شغل */}
        <section className="ts-modal-block">
          <div className="row gap8 align-center">
            <label htmlFor="jobKey"><b>شغل/رسته:</b></label>
            <select id="jobKey" value={jobKey} onChange={(e) => setJobKey(e.target.value)}>
              {jobKeys.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          {!jobKey && <p className="muted small">هیچ شغلی تعریف نشده است.</p>}
        </section>

        {/* سهمیه‌ها */}
        <section className="ts-modal-block">
          <h4>۱) تعداد افراد مورد نیاز برای هر رسته</h4>
          <div className="ts-modal-grid">
            {Object.keys(quotas).map((key) => (
              <div className="quota-row" key={key}>
                <label htmlFor={`quota-${key}`}>{quotas[key].name}</label>
                <input
                  id={`quota-${key}`}
                  type="number"
                  min="0"
                  value={quotas[key].tableCount}
                  onChange={(e) => onChange?.(key, parseInt(e.target.value || "0", 10))}
                />
              </div>
            ))}
            {Object.keys(quotas).length === 0 && <p className="muted">رسته‌ای تعریف نشده است.</p>}
          </div>
        </section>

        {/* معیارها - بدون ورودی دستی کلید/پارامتر؛ فقط فعال‌سازی و وزن */}
        <section className="ts-modal-block">
          <h4>۲) مولفه‌های مؤثر در اولویت‌بندی (اتوماتیک از نیازمندی‌های شغل)</h4>

          <div className="criteria-table-wrap">
            <table className="criteria-table">
              <thead>
                <tr>
                  <th>فعال</th>
                  <th>عنوان معیار</th>
                  <th>منبع آزمون</th>
                  <th>وضعیت آزمون</th>
                  <th style={{minWidth:160}}>وزن</th>
                </tr>
              </thead>
              <tbody>
                {localCriteria.map((c) => {
                  const srcFa = sourceTestFa(c.sourceTest);
                  const isAvailable = c.available;
                  return (
                    <tr key={c.id}>
                      <td className="center">
                        <input
                          type="checkbox"
                          checked={!!c.enabled}
                          onChange={(e) => handleToggle(c.id, e.target.checked)}
                          disabled={!isAvailable}
                          title={!isAvailable ? "این معیار به دلیل نبود آزمون مربوطه قابل‌فعال‌سازی نیست" : ""}
                        />
                      </td>
                      <td>{c.title}</td>
                      <td>{srcFa}</td>
                      <td>
                        {isAvailable
                          ? <span className="badge ok">آزمون موجود</span>
                          : <span className="badge warn">آزمون موجود نیست</span>}
                      </td>
                      <td>
                        <div className="row gap8">
                          <input
                            type="range"
                            min="0" max="100"
                            value={c.weight ?? 0}
                            onChange={(e) => handleWeight(c.id, e.target.value)}
                            disabled={!isAvailable || !c.enabled}
                          />
                          <span style={{width:40, textAlign:"center"}}>{c.weight ?? 0}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {localCriteria.length === 0 && (
                  <tr><td colSpan="5" className="muted center">معیاری تعریف نشده است.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="row gap12 align-center" style={{marginTop:8}}>
            <span className={`badge ${finalOk ? "ok" : "warn"}`}>جمع وزن معیارهای فعال: {finalSum}%</span>
            {!finalOk && <span className="muted small">پیشنهاد: مجموع به ۱۰۰% نزدیک باشد.</span>}
          </div>

          {unavailableCriteria.length > 0 && (
            <div className="muted small" style={{marginTop:6}}>
              برخی معیارها غیرفعال مانده‌اند چون آزمون مربوطه در موجودی شما نیست:
              {" "}
              {unavailableCriteria.map(u => u.title).join("، ")}
            </div>
          )}
        </section>

        {/* اکشن‌ها */}
        <div className="ts-modal-actions">
          <button className="btn primary" onClick={submit}>شروع</button>
          <button className="btn ghost" onClick={onClose}>انصراف</button>
        </div>
      </div>
    </div>
  );
};

export default JobQuotaModal;

/* ====== کمک‌ها ====== */

function sourceTestFa(key) {
  switch (key) {
    case "MBTI": return "MBTI";
    case "DISC": return "DISC";
    case "HOLLAND": return "Holland (RIASEC)";
    case "GARDNER": return "Gardner";
    case "CLIFTON": return "CliftonStrengths";
    case "PERSONAL_FAVORITES": return "Personal Favorites";
    case null: return "تجمیعی/بنچمارک";
    default: return key || "—";
  }
}
