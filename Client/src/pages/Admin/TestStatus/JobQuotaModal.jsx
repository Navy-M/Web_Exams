// src/pages/Admin/TestStatus/JobQuotaModal.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";

/* ===================== ثابت‌ها ===================== */
const TEST_TYPE_KEYS = {
  MBTI: "MBTI",
  DISC: "DISC",
  HOLLAND: "HOLLAND",
  GARDNER: "GARDNER",
  CLIFTON: "CLIFTON",
  PERSONAL_FAVORITES: "PERSONAL_FAVORITES",
};

const WEIGHT_SUM_OK_RANGE = [95, 105];

/* ===================== ابزارها ===================== */
const rid = () => Math.random().toString(36).slice(2, 9);
const clamp01 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
};

function guessSourceByKey(key = "") {
  const k = String(key).toUpperCase();
  if (k.includes("MBTI")) return TEST_TYPE_KEYS.MBTI;
  if (k.includes("DISC")) return TEST_TYPE_KEYS.DISC;
  if (k.includes("HOLLAND")) return TEST_TYPE_KEYS.HOLLAND;
  if (k.includes("GARDNER")) return TEST_TYPE_KEYS.GARDNER;
  if (k.includes("CLIFTON")) return TEST_TYPE_KEYS.CLIFTON;
  if (k.includes("PF")) return TEST_TYPE_KEYS.PERSONAL_FAVORITES;
  return null;
}

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

/** inventory از لیست آزمون‌های فعال سیستم (اختیاری) */
function buildTestsInventory(tests = []) {
  const has = new Set((tests || []).map((t) => (t?.type || "").toUpperCase()));
  return {
    MBTI: has.has(TEST_TYPE_KEYS.MBTI),
    DISC: has.has(TEST_TYPE_KEYS.DISC),
    HOLLAND: has.has(TEST_TYPE_KEYS.HOLLAND),
    GARDNER: has.has(TEST_TYPE_KEYS.GARDNER),
    CLIFTON: has.has(TEST_TYPE_KEYS.CLIFTON),
    PERSONAL_FAVORITES: has.has(TEST_TYPE_KEYS.PERSONAL_FAVORITES),
  };
}

/** اگر jobReq.criteria نباشد، از فیلدهای کلاسیک معیار می‌سازیم */
function deriveCriteriaFromClassic(jobReq = {}) {
  const DEFAULT_W = {
    BENCHMARK_DISTANCE: 25,
    CLIFTON_DOMAIN_MATCH: 20,
    HOLLAND_TOP3: 15,
    MBTI_PREF: 10,
    DISC_PATTERN: 15,
    GARDNER_TOP: 10,
    PF_KEYS: 5,
  };
  const W = { ...DEFAULT_W, ...(jobReq?.weightsDefault || {}) };

  const out = [];
  if (jobReq?.benchmark || jobReq?.benchmarkNormalized) {
    out.push({
      id: rid(),
      key: "BENCHMARK_DISTANCE",
      title: "فاصله تا بنچمارک شغل",
      enabled: true,
      weight: W.BENCHMARK_DISTANCE,
      method: "distance",
      args: { norm: "min" },
      sourceTest: null,
    });
  }
  if (jobReq?.clifton?.domainsPrefer || jobReq?.clifton?.themesPrefer || Array.isArray(jobReq?.clifton)) {
    const prefers = jobReq?.clifton?.domainsPrefer || jobReq?.clifton?.themesPrefer || jobReq?.clifton || [];
    out.push({
      id: rid(),
      key: "CLIFTON_DOMAIN_MATCH",
      title: "هم‌خوانی دامنه/تم‌های کلیفتون",
      enabled: true,
      weight: W.CLIFTON_DOMAIN_MATCH,
      method: "score",
      args: { prefers },
      sourceTest: TEST_TYPE_KEYS.CLIFTON,
    });
  }
  if (jobReq?.holland?.top3 || Array.isArray(jobReq?.holland)) {
    const allowed = jobReq?.holland?.top3 || jobReq?.holland || [];
    out.push({
      id: rid(),
      key: "HOLLAND_TOP3",
      title: "انطباق Holland (Top-3)",
      enabled: true,
      weight: W.HOLLAND_TOP3,
      method: "score",
      args: { allowed },
      sourceTest: TEST_TYPE_KEYS.HOLLAND,
    });
  }
  if (jobReq?.mbti?.prefer || Array.isArray(jobReq?.mbti)) {
    const allow = jobReq?.mbti?.prefer || jobReq?.mbti || [];
    out.push({
      id: rid(),
      key: "MBTI_PREF",
      title: "سازگاری MBTI با شغل",
      enabled: true,
      weight: W.MBTI_PREF,
      method: "boolean",
      args: { allow },
      sourceTest: TEST_TYPE_KEYS.MBTI,
    });
  }
  if (jobReq?.disc?.require || Array.isArray(jobReq?.disc)) {
    const raw = jobReq?.disc?.require || jobReq?.disc || [];
    const requireHigh = raw
      .map((s) => String(s || "").toUpperCase())
      .filter((s) => s.includes("HIGH"))
      .map((s) => s.replace("HIGH", "").trim())
      .filter(Boolean);
    out.push({
      id: rid(),
      key: "DISC_PATTERN",
      title: "الگوی DISC موردنیاز",
      enabled: true,
      weight: W.DISC_PATTERN,
      method: "boolean",
      args: { requireHigh, minHigh: (jobReq?.disc?.thresholds?.high ?? 65) },
      sourceTest: TEST_TYPE_KEYS.DISC,
    });
  }
  if (jobReq?.gardner?.prefer || Array.isArray(jobReq?.gardner)) {
    const allowed = jobReq?.gardner?.prefer || jobReq?.gardner || [];
    out.push({
      id: rid(),
      key: "GARDNER_TOP",
      title: "هوش‌های برتر گاردنر",
      enabled: true,
      weight: W.GARDNER_TOP,
      method: "score",
      args: { allowed },
      sourceTest: TEST_TYPE_KEYS.GARDNER,
    });
  }
  if (jobReq?.pf?.itemIdsPrefer || jobReq?.pf?.keywords || jobReq?.PF) {
    const keys = jobReq?.pf?.keywords || jobReq?.PF || [];
    out.push({
      id: rid(),
      key: "PF_KEYS",
      title: "ترجیحات شخصی (PF)",
      enabled: true,
      weight: W.PF_KEYS,
      method: "score",
      args: { keys },
      sourceTest: TEST_TYPE_KEYS.PERSONAL_FAVORITES,
    });
  }
  return out;
}

function buildCriteriaFromJob(jobReq = {}) {
  if (Array.isArray(jobReq?.criteria) && jobReq.criteria.length) {
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

/* ===================== Component ===================== */
const JobQuotaModal = ({
  open,
  quotas = {},                     // { job1:{name, tableCount}, ... }
  onChange,                        // (key, nextNumber)
  onSubmit,                        // (payload) => void
  onClose,
  jobRequirements = {},            // { "ناوبری و ...": {...}, ... }
  tests = [],                      // لیست آزمون‌های موجود سیستم (اختیاری)
}) => {
  if (!open) return null;

  /* ---------- Job selector ---------- */
  const jobKeys = useMemo(() => Object.keys(jobRequirements), [jobRequirements]);
  const [jobKey, setJobKey] = useState(jobKeys[0] || "");

  // فقط وقتی open شد یا لیست شغل‌ها عوض شد و jobKey فعلی نامعتبر است
  useEffect(() => {
    if (!jobKey || !jobKeys.includes(jobKey)) {
      setJobKey(jobKeys[0] || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, jobKeys]);

  /* ---------- Tests inventory ---------- */
  const inv = useMemo(() => buildTestsInventory(tests), [tests]);

  /* ---------- Criteria: فقط هنگام تغییر jobKey محاسبه/ست می‌شود ---------- */
  const baseCriteria = useMemo(() => {
    const req = jobRequirements[jobKey] || {};
    return buildCriteriaFromJob(req);
    // وابسته فقط به jobKey و jobRequirements
  }, [jobKey, jobRequirements]);

  // به availability وصل می‌کنیم (بدون ایجاد لوپ)
  const criteriaWithAvailability = useMemo(() => {
    const availability = (c) => {
      const st = c.sourceTest;
      if (!st) return true;
      return !!inv[st];
    };
    return baseCriteria.map((c) => ({ ...c, available: availability(c) }));
  }, [baseCriteria, inv]);

  const [localCriteria, setLocalCriteria] = useState(criteriaWithAvailability);
  // وقتی jobKey عوض شد، یکبار localCriteria ست می‌شود
  useEffect(() => {
    setLocalCriteria(criteriaWithAvailability);
  }, [criteriaWithAvailability]);

  const handleToggle = useCallback((id, enabled) => {
    setLocalCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, enabled } : c)));
  }, []);
  const handleWeight = useCallback((id, weight) => {
    setLocalCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, weight: clamp01(weight) } : c)));
  }, []);

  const { finalSum, finalNorm } = useMemo(() => {
    const enabled = localCriteria.filter((c) => c.enabled && c.available);
    const sum = enabled.reduce((s, c) => s + (Number(c.weight) || 0), 0);
    const norm = Object.fromEntries(
      localCriteria.map((c) => [
        c.key,
        c.enabled && c.available && sum > 0 ? +(100 * (Number(c.weight) || 0) / sum).toFixed(2) : 0,
      ])
    );
    return { finalSum: Math.round(sum), finalNorm: norm };
  }, [localCriteria]);

  /* ---------- انتخاب آزمون‌ها + معدل/رشته ---------- */
  const [testToggles, setTestToggles] = useState({
    MBTI: true, DISC: true, HOLLAND: true, GARDNER: true, CLIFTON: true, PERSONAL_FAVORITES: true,
  });

  // اگر آزمونی موجود نیست، یکبار خاموشش کنیم (فقط وقتی open یا inv تغییر کرد)
  useEffect(() => {
    setTestToggles((prev) => {
      const next = { ...prev };
      Object.keys(TEST_TYPE_KEYS).forEach((k) => {
        if (inv[k] === false && prev[k] === true) next[k] = false;
      });
      return next;
    });
  }, [open, inv]);

  const toggleTest = useCallback((key, val) => {
    setTestToggles((p) => ({ ...p, [key]: val }));
  }, []);

  // معدل
  const [useGPA, setUseGPA] = useState(false);
  const [gpaWeight, setGpaWeight] = useState(10);
  const [gpaScale, setGpaScale] = useState("0-20");

  // رشته
  const [useMajor, setUseMajor] = useState(false);
  const [majorWeight, setMajorWeight] = useState(15);
  const [majorMode, setMajorMode] = useState("family"); // family | exact

  /* ---------- Quotas → capacities برای سرور ---------- */
  const capacities = useMemo(() => {
    // سرور شما انتظار دارد: { "نام شغل": capacityNumber }
    const map = {};
    Object.values(quotas || {}).forEach((q) => {
      const cap = Number(q?.tableCount || 0);
      if (q?.name && cap > 0) map[q.name] = cap;
    });
    return map;
  }, [quotas]);

  /* ---------- Weights ساده برای سرور ---------- */
  const serverWeights = useMemo(() => {
    // فقط همان تست‌هایی که روشن شدند، وزن برابر می‌گیرند (سرور خودش نرمال می‌کند)
    const on = Object.entries(testToggles).filter(([, v]) => !!v).map(([k]) => k);
    if (!on.length) return {};
    const w = 1; // همه برابر؛ اگر خواستید UI وزن‌دهی جدا اضافه کنید
    return Object.fromEntries(on.map((k) => [k, w]));
  }, [testToggles]);

  /* ---------- ارسال ---------- */
  const submit = useCallback(() => {
    onSubmit?.({
      jobKey,
      quotas,                        // برای گزارش/فالبک
      capacities,                    // برای API (server)
      criteria: localCriteria,       // برای فالبک (و شفافیت)
      normalizedWeights: finalNorm,  // برای فالبک/شفافیت
      unavailableCriteria: localCriteria.filter((c) => !c.available).map((c) => ({ key: c.key, title: c.title })),
      selectedTests: { ...testToggles },
      education: {
        useGPA, gpaWeight, gpaScale,
        useMajor, majorWeight, majorMode,
      },
      serverWeights,                 // برای API
    });
  }, [
    jobKey, quotas, capacities,
    localCriteria, finalNorm,
    testToggles, useGPA, gpaWeight, gpaScale, useMajor, majorWeight, majorMode,
    serverWeights, onSubmit
  ]);

  /* ===================== UI ===================== */
  return (
    <div className="ts-modal-overlay" role="dialog" aria-modal="true">
      <div className="ts-modal card" dir="rtl">
        <h3>تنظیمات تخصیص و اولویت‌بندی</h3>

        {/* انتخاب شغل */}
        <section className="ts-modal-block">
          <div className="row gap8 align-center">
            <label htmlFor="jobKey"><b>شغل/رسته:</b></label>
            <select
              id="jobKey"
              value={jobKey}
              onChange={(e) => setJobKey(e.target.value)}
            >
              {jobKeys.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
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
          {/* نمایش capacities برای شفافیت */}
          <div className="row gap12" style={{ marginTop: 8 }}>
            <span className="badge">رسته‌های با ظرفیت: {Object.keys(capacities).length}</span>
          </div>
        </section>

        {/* معیارهای خودکار از نیازمندی شغل */}
        <section className="ts-modal-block">
          <h4>۲) مولفه‌های مؤثر (اتوماتیک از نیازمندی‌های شغل)</h4>

          <div className="criteria-table-wrap">
            <table className="criteria-table">
              <thead>
                <tr>
                  <th>فعال</th>
                  <th>عنوان معیار</th>
                  <th>منبع آزمون</th>
                  <th>وضعیت آزمون</th>
                  <th style={{ minWidth: 160 }}>وزن</th>
                </tr>
              </thead>
              <tbody key={jobKey /* جلوگیری از حفظ رندر قبلی */}>
                {localCriteria.map((c) => {
                  const isAvailable = c.available !== false;
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
                      <td>{sourceTestFa(c.sourceTest)}</td>
                      <td>
                        {isAvailable
                          ? <span className="badge ok">آزمون موجود</span>
                          : <span className="badge warn">آزمون موجود نیست</span>}
                      </td>
                      <td>
                        <div className="row gap8">
                          <input
                            type="range" min="0" max="100"
                            value={c.weight ?? 0}
                            onChange={(e) => handleWeight(c.id, e.target.value)}
                            disabled={!isAvailable || !c.enabled}
                          />
                          <span style={{ width: 40, textAlign: "center" }}>{c.weight ?? 0}%</span>
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

          <div className="row gap12 align-center" style={{ marginTop: 8 }}>
            <span className={`badge ${finalSum >= WEIGHT_SUM_OK_RANGE[0] && finalSum <= WEIGHT_SUM_OK_RANGE[1] ? "ok" : "warn"}`}>
              جمع وزن معیارهای فعال: {finalSum}%
            </span>
            {Math.abs(finalSum - 100) > 5 && (
              <span className="muted small">پیشنهاد: مجموع به ۱۰۰% نزدیک باشد.</span>
            )}
          </div>
        </section>

        {/* انتخاب منابع ارزیابی */}
        <section className="ts-modal-block">
          <h4>۳) انتخاب منابع ارزیابی برای گروه</h4>

          <div className="ts-modal-grid">
            {Object.keys(TEST_TYPE_KEYS).map((key) => {
              const available = inv[key] !== false; // اگر tests خالی باشد، همه قابل انتخاب‌اند
              return (
                <div key={key} className="row gap8">
                  <label style={{ minWidth: 180 }}>{sourceTestFa(key)}</label>
                  <input
                    type="checkbox"
                    checked={!!testToggles[key]}
                    onChange={(e) => toggleTest(key, e.target.checked)}
                    disabled={!available}
                    title={!available ? "آزمون در سیستم موجود نیست" : ""}
                  />
                  <span className={`badge ${available ? "ok" : "warn"}`}>
                    {available ? "فعال" : "ناموجود"}
                  </span>
                </div>
              );
            })}
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "10px 0" }} />

          {/* معدل */}
          <div className="row gap12" style={{ flexWrap: "wrap" }}>
            <div className="row gap8">
              <label style={{ minWidth: 120 }}>معدل لحاظ شود؟</label>
              <input type="checkbox" checked={useGPA} onChange={(e) => setUseGPA(e.target.checked)} />
            </div>

            <div className="row gap8">
              <label>مقیاس معدل</label>
              <select value={gpaScale} onChange={(e) => setGpaScale(e.target.value)} disabled={!useGPA}>
                <option value="0-20">۰–۲۰</option>
                <option value="0-4">۰–۴</option>
              </select>
            </div>

            <div className="row gap8">
              <label>وزن معدل</label>
              <input
                type="range" min="0" max="100"
                value={gpaWeight}
                onChange={(e) => setGpaWeight(clamp01(e.target.value))}
                disabled={!useGPA}
              />
              <span style={{ width: 40, textAlign: "center" }}>{useGPA ? gpaWeight : 0}%</span>
            </div>
          </div>

          {/* رشته */}
          <div className="row gap12" style={{ flexWrap: "wrap", marginTop: 8 }}>
            <div className="row gap8">
              <label style={{ minWidth: 120 }}>رشته تحصیلی لحاظ شود؟</label>
              <input type="checkbox" checked={useMajor} onChange={(e) => setUseMajor(e.target.checked)} />
            </div>

            <div className="row gap8">
              <label>روش تطبیق</label>
              <select value={majorMode} onChange={(e) => setMajorMode(e.target.value)} disabled={!useMajor}>
                <option value="exact">دقیقا مطابق لیست شغل</option>
                <option value="family">خانواده‌ی رشته (نزدیک)</option>
              </select>
            </div>

            <div className="row gap8">
              <label>وزن رشته</label>
              <input
                type="range" min="0" max="100"
                value={majorWeight}
                onChange={(e) => setMajorWeight(clamp01(e.target.value))}
                disabled={!useMajor}
              />
              <span style={{ width: 40, textAlign: "center" }}>{useMajor ? majorWeight : 0}%</span>
            </div>
          </div>

          <p className="muted small" style={{ marginTop: 6 }}>
            نکته: لیست رشته‌های قابل‌قبول برای هر شغل از <code>education</code> داخل <code>jobRequirements</code> خوانده می‌شود.
          </p>
        </section>

        {/* اکشن‌ها */}
        <div className="ts-modal-actions">
          <button className="btn primary" onClick={submit}>شروع اولویت‌بندی</button>
          <button className="btn ghost" onClick={onClose}>انصراف</button>
        </div>
      </div>
    </div>
  );
};

export default JobQuotaModal;
