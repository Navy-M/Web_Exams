import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import "../../../styles/neomarine.css";

const TEST_TYPES = [
  { key: "MBTI", label: "MBTI" },
  { key: "DISC", label: "DISC" },
  { key: "HOLLAND", label: "Holland / RIASEC" },
  { key: "GARDNER", label: "Gardner" },
  { key: "CLIFTON", label: "CliftonStrengths" },
  { key: "PERSONAL_FAVORITES", label: "علایق شخصی" },
];

const aliases = {
  MBTI: ["MBTI", "mbti"],
  DISC: ["DISC", "disc"],
  HOLLAND: ["HOLLAND", "holland"],
  GARDNER: ["GARDNER", "gardner"],
  CLIFTON: ["CLIFTON", "clifton"],
  PERSONAL_FAVORITES: ["PERSONAL_FAVORITES", "personalFavorites", "personal_favorites", "PF", "pf"],
};

const hasRequirement = (jobReq = {}, testType) =>
  aliases[testType].some((key) => {
    const value = jobReq?.[key];
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return Object.keys(value).length > 0;
    return Boolean(value);
  });

const buildTestsInventory = (tests = []) => {
  const available = new Set((tests || []).map((test) => String(test?.type || test?.key || "").toUpperCase()));
  return Object.fromEntries(TEST_TYPES.map(({ key }) => [key, available.size === 0 || available.has(key)]));
};

const JobQuotaModal = ({
  open,
  quotas = {},
  onChange,
  onSubmit,
  onClose,
  jobRequirements = {},
  tests = [],
  submitting = false,
}) => {
  const overlayRef = useRef(null);
  const inventory = useMemo(() => buildTestsInventory(tests), [tests]);
  const jobNames = useMemo(() => Object.keys(jobRequirements || {}), [jobRequirements]);
  const [selectedTests, setSelectedTests] = useState(() =>
    Object.fromEntries(TEST_TYPES.map(({ key }) => [key, true]))
  );

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape" && !submitting) onClose?.();
    };
    const onClick = (event) => {
      if (event.target === overlayRef.current && !submitting) onClose?.();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [open, onClose, submitting]);

  useEffect(() => {
    setSelectedTests((current) => {
      const next = { ...current };
      TEST_TYPES.forEach(({ key }) => {
        if (inventory[key] === false) next[key] = false;
      });
      return next;
    });
  }, [inventory]);

  const capacities = useMemo(() => {
    const map = {};
    Object.values(quotas || {}).forEach((quota) => {
      const count = Number(quota?.tableCount || 0);
      if (quota?.name && count > 0) map[quota.name] = count;
    });
    return map;
  }, [quotas]);

  const serverWeights = useMemo(
    () =>
      Object.fromEntries(
        TEST_TYPES
          .filter(({ key }) => selectedTests[key] && inventory[key] !== false)
          .map(({ key }) => [key, 1])
      ),
    [inventory, selectedTests]
  );

  const activeJobsCount = Object.keys(capacities).length;
  const activeTestsCount = Object.keys(serverWeights).length;

  const submit = () => {
    if (submitting) return;
    if (activeJobsCount === 0) {
      alert("برای حداقل یک رسته ظرفیت بیشتر از صفر وارد کنید.");
      return;
    }
    if (activeTestsCount === 0) {
      alert("حداقل یک آزمون باید برای اولویت‌بندی فعال باشد.");
      return;
    }

    onSubmit?.({
      quotas,
      capacities,
      selectedTests,
      serverWeights,
    });
  };

  if (!open) return null;

  return (
    <div className="ts-modal-overlay" ref={overlayRef} role="dialog" aria-modal="true" aria-labelledby="quota-title">
      <div className="ts-modal" dir="rtl">
        <header className="allocation-header" style={{ marginBottom: 12 }}>
          <div>
            <h2 id="quota-title" className="allocation-title">تنظیمات اولویت‌بندی شغلی</h2>
            <div className="allocation-sub muted small">
              ظرفیت رسته‌ها و آزمون‌های مؤثر را مشخص کنید. محاسبه نهایی فقط در سرور انجام می‌شود.
            </div>
          </div>
          <div className="allocation-actions">
            <button className="btn ghost" onClick={onClose} disabled={submitting} type="button">
              بستن
            </button>
            <button className="btn primary" onClick={submit} disabled={submitting} type="button">
              {submitting ? "در حال پردازش..." : "شروع اولویت‌بندی"}
            </button>
          </div>
        </header>

        <section className="ts-modal-block">
          <h4>۱. ظرفیت هر رسته</h4>
          <div className="ts-modal-grid" role="group" aria-label="ظرفیت رسته‌ها">
            {Object.keys(quotas).map((key) => (
              <div className="quota-row" key={key}>
                <label htmlFor={`quota-${key}`}>{quotas[key].name}</label>
                <input
                  id={`quota-${key}`}
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={quotas[key].tableCount}
                  onChange={(event) => onChange?.(key, parseInt(event.target.value || "0", 10))}
                  disabled={submitting}
                />
              </div>
            ))}
            {Object.keys(quotas).length === 0 && <p className="muted">رسته‌ای تعریف نشده است.</p>}
          </div>
          <div className="row gap12" style={{ marginTop: 8 }}>
            <span className="badge">رسته‌های دارای ظرفیت: {activeJobsCount}</span>
          </div>
        </section>

        <section className="ts-modal-block">
          <h4>۲. آزمون‌های مؤثر در اولویت‌بندی</h4>
          <div className="ts-modal-grid">
            {TEST_TYPES.map(({ key, label }) => {
              const available = inventory[key] !== false;
              return (
                <div key={key} className="row gap8">
                  <label style={{ minWidth: 180 }}>{label}</label>
                  <input
                    type="checkbox"
                    checked={!!selectedTests[key]}
                    onChange={(event) =>
                      setSelectedTests((current) => ({ ...current, [key]: event.target.checked }))
                    }
                    disabled={!available || submitting}
                  />
                  <span className={`badge ${available ? "ok" : "warn"}`}>
                    {available ? "فعال" : "ناموجود"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="muted small" style={{ marginTop: 8 }}>
            آزمون GHQ در گزارش سلامت قابل مشاهده است، اما در امتیاز استخدامی، رتبه‌بندی و تخصیص شغل استفاده نمی‌شود.
          </p>
        </section>

        <section className="ts-modal-block">
          <h4>۳. معیارهای تعریف‌شده برای رسته‌ها</h4>
          <div className="criteria-table-wrap">
            <table className="criteria-table">
              <thead>
                <tr>
                  <th>رسته</th>
                  <th>آزمون‌های دارای معیار</th>
                  <th>رشته‌های ترجیحی</th>
                </tr>
              </thead>
              <tbody>
                {jobNames.map((jobName) => {
                  const jobReq = jobRequirements[jobName] || {};
                  const configuredTests = TEST_TYPES
                    .filter(({ key }) => hasRequirement(jobReq, key))
                    .map(({ label }) => label)
                    .join("، ");
                  const fields = [
                    ...(Array.isArray(jobReq?.required?.fields) ? jobReq.required.fields : []),
                    ...(Array.isArray(jobReq?.education) ? jobReq.education : []),
                  ].join("، ");

                  return (
                    <tr key={jobName}>
                      <td>{jobName}</td>
                      <td>{configuredTests || "بدون معیار اختصاصی"}</td>
                      <td>{fields || "تعریف نشده"}</td>
                    </tr>
                  );
                })}
                {jobNames.length === 0 && (
                  <tr>
                    <td colSpan="3" className="muted center">هیچ رسته‌ای تعریف نشده است.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="ts-modal-actions">
          <button className="btn ghost" onClick={onClose} disabled={submitting} type="button">
            انصراف
          </button>
          <button className="btn primary" onClick={submit} disabled={submitting} type="button">
            {submitting ? "در حال پردازش..." : "شروع اولویت‌بندی"}
          </button>
        </div>
      </div>
    </div>
  );
};

JobQuotaModal.propTypes = {
  open: PropTypes.bool,
  quotas: PropTypes.object,
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
  onClose: PropTypes.func,
  jobRequirements: PropTypes.object,
  tests: PropTypes.array,
  submitting: PropTypes.bool,
};

export default JobQuotaModal;
