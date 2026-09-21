import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useNotification } from "../../../context/NotificationContext";

const FACTORS = [
  { key: "MBTI", label: "MBTI", kind: "test" },
  { key: "DISC", label: "DISC", kind: "test" },
  { key: "HOLLAND", label: "هالند", kind: "test" },
  { key: "GARDNER", label: "گاردنر", kind: "test" },
  { key: "CLIFTON", label: "کلیفتون", kind: "test" },
  { key: "PERSONAL_FAVORITES", label: "علایق شخصی", kind: "test" },
  { key: "academic", label: "معدل دیپلم", kind: "profile" },
  { key: "field", label: "رشته تحصیلی", kind: "profile" },
];

const PRESETS = {
  balanced: Object.fromEntries(FACTORS.map(({ key }) => [key, 50])),
  academic: { MBTI: 20, DISC: 30, HOLLAND: 45, GARDNER: 35, CLIFTON: 30, PERSONAL_FAVORITES: 20, academic: 100, field: 100 },
  personality: { MBTI: 75, DISC: 100, HOLLAND: 75, GARDNER: 55, CLIFTON: 100, PERSONAL_FAVORITES: 45, academic: 20, field: 35 },
};

const aliases = {
  MBTI: ["MBTI", "mbti"], DISC: ["DISC", "disc"], HOLLAND: ["HOLLAND", "holland"],
  GARDNER: ["GARDNER", "gardner"], CLIFTON: ["CLIFTON", "clifton"],
  PERSONAL_FAVORITES: ["PERSONAL_FAVORITES", "personalFavorites", "personal_favorites", "PF", "pf"],
};

const hasRequirement = (job = {}, type) => aliases[type]?.some((key) => {
  const value = job[key];
  return Array.isArray(value) ? value.length > 0 : value && typeof value === "object" ? Object.keys(value).length > 0 : Boolean(value);
});

function buildInventory(tests) {
  const available = new Set((tests || []).map((test) => String(test?.id || test?.key || "").toUpperCase()));
  return Object.fromEntries(FACTORS.filter(({ kind }) => kind === "test").map(({ key }) => [key, !available.size || available.has(key)]));
}

export default function JobQuotaModal({ open, quotas = {}, onChange, onSubmit, onClose, jobRequirements = {}, tests = [], submitting = false, selectedCount = 0, selectedUsers = [] }) {
  const { notify } = useNotification();
  const overlayRef = useRef(null);
  const inventory = useMemo(() => buildInventory(tests), [tests]);
  const [weights, setWeights] = useState(PRESETS.balanced);
  const [disabledJobs, setDisabledJobs] = useState(() => new Set());
  const [preset, setPreset] = useState("balanced");
  const [minCompleteness, setMinCompleteness] = useState(60);
  const [minMatchScore, setMinMatchScore] = useState(50);
  const [overrides, setOverrides] = useState(() => new Set());

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === "Escape" && !submitting) onClose?.(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, submitting]);

  const capacities = useMemo(() => Object.fromEntries(Object.entries(quotas).map(([key, quota]) => [
    quota.name,
    disabledJobs.has(key) ? 0 : Math.max(0, Math.trunc(Number(quota.tableCount) || 0)),
  ])), [disabledJobs, quotas]);
  const serverWeights = useMemo(() => Object.fromEntries(FACTORS.map(({ key, kind }) => [
    key,
    kind === "test" && inventory[key] === false ? 0 : Math.max(0, Math.min(100, Number(weights[key]) || 0)),
  ])), [inventory, weights]);
  const totalCapacity = Object.values(capacities).reduce((sum, value) => sum + value, 0);
  const weightSum = Object.values(serverWeights).reduce((sum, value) => sum + value, 0);
  const valid = selectedCount > 0 && totalCapacity > 0 && weightSum > 0;

  const submit = () => {
    if (submitting) return;
    if (!selectedCount) return notify("حداقل یک کاربر را انتخاب کنید.", { type: "warning" });
    if (!totalCapacity) return notify("ظرفیت حداقل یک رشته باید بیشتر از صفر باشد.", { type: "warning" });
    if (!weightSum) return notify("وزن حداقل یک معیار باید بیشتر از صفر باشد.", { type: "warning" });
    onSubmit?.({
      quotas,
      capacities,
      serverWeights,
      minCompleteness: minCompleteness / 100,
      minMatchScore,
      completenessOverrides: [...overrides],
    });
  };

  if (!open) return null;
  return (
    <div className="ts-modal-overlay" ref={overlayRef} role="dialog" aria-modal="true" aria-labelledby="quota-title" onMouseDown={(event) => event.target === overlayRef.current && !submitting && onClose?.()}>
      <div className="ts-modal ts-modal--prioritization" dir="rtl">
        <header className="ts-modal-header">
          <div><h2 id="quota-title">تنظیمات تطابق و تخصیص شغلی</h2><p>امتیاز تطابق و پیشنهادهای شخصی مستقل از ظرفیت محاسبه می‌شوند؛ ظرفیت فقط تخصیص نهایی را محدود می‌کند.</p></div>
          <button className="btn ghost" onClick={onClose} disabled={submitting} type="button">بستن</button>
        </header>
        <div className="ts-modal-content">
          <section className="ts-modal-block">
            <h3>۱. ظرفیت رشته‌ها</h3>
            <div className="capacity-list">{Object.entries(quotas).map(([key, quota]) => {
              const enabled = !disabledJobs.has(key);
              return <div className="capacity-row" key={key}>
                <input type="checkbox" checked={enabled} disabled={submitting} aria-label={`فعال بودن ${quota.name}`} onChange={(event) => setDisabledJobs((current) => { const next = new Set(current); if (event.target.checked) next.delete(key); else next.add(key); return next; })} />
                <label htmlFor={`quota-${key}`}>{quota.name}</label>
                <input id={`quota-${key}`} type="number" min="0" step="1" value={quota.tableCount} disabled={!enabled || submitting} onChange={(event) => onChange?.(key, Math.max(0, Math.trunc(Number(event.target.value) || 0)))} />
              </div>;
            })}</div>
            <div className="capacity-summary"><span>ظرفیت کل: <strong>{totalCapacity}</strong></span><span>افراد انتخاب‌شده: <strong>{selectedCount}</strong></span></div>
          </section>
          <section className="ts-modal-block">
            <div className="section-heading"><h3>۲. وزن معیارها</h3><div className="preset-control" role="group" aria-label="الگوی وزن‌دهی">
              {[["balanced", "متعادل"], ["academic", "تحصیلی"], ["personality", "شخصیتی"]].map(([key, label]) => <button key={key} type="button" className={preset === key ? "active" : ""} onClick={() => { setPreset(key); setWeights(PRESETS[key]); }}>{label}</button>)}
            </div></div>
            <div className="weight-list">{FACTORS.map(({ key, label, kind }) => {
              const available = kind === "profile" || inventory[key] !== false;
              const value = available ? serverWeights[key] : 0;
              const influence = weightSum ? Math.round((value / weightSum) * 100) : 0;
              return <label className={`weight-row${available ? "" : " is-disabled"}`} key={key}><span>{label}</span><input type="range" min="0" max="100" step="5" value={value} disabled={!available || submitting} onChange={(event) => { setPreset("custom"); setWeights((current) => ({ ...current, [key]: Number(event.target.value) })); }} /><output>{value}</output><small>{available ? `${influence}٪ تأثیر نسبی` : "آزمون در دسترس نیست"}</small></label>;
            })}</div>
          </section>
          <section className="ts-modal-block">
            <h3>۳. حداقل‌های تخصیص</h3>
            <label className="weight-row"><span>حداقل تکمیل اطلاعات</span><input type="range" min="0" max="100" step="5" value={minCompleteness} onChange={(event) => setMinCompleteness(Number(event.target.value))} /><output>{minCompleteness}٪</output><small>پیش‌فرض: ۶۰٪</small></label>
            <label className="weight-row"><span>حداقل امتیاز تطابق</span><input type="range" min="0" max="100" step="5" value={minMatchScore} onChange={(event) => setMinMatchScore(Number(event.target.value))} /><output>{minMatchScore}٪</output><small>ظرفیت این حداقل را نادیده نمی‌گیرد.</small></label>
            <div className="override-list"><strong>استثنای تکمیل اطلاعات</strong><p className="muted small">استثنا فقط حداقل تکمیل اطلاعات را نادیده می‌گیرد و در audit ثبت می‌شود.</p>{selectedUsers.map((user) => {
              const id = String(user._id || user.id);
              return <label key={id}><input type="checkbox" checked={overrides.has(id)} onChange={(event) => setOverrides((current) => { const next = new Set(current); if (event.target.checked) next.add(id); else next.delete(id); return next; })} />{user.profile?.fullName || user.username}</label>;
            })}</div>
          </section>
          <section className="ts-modal-block"><h3>۴. معیارهای رشته‌ها</h3><div className="criteria-table-wrap"><table className="criteria-table"><thead><tr><th>رشته</th><th>آزمون‌های مؤثر</th><th>رشته‌های تحصیلی مرتبط</th></tr></thead><tbody>{Object.keys(jobRequirements).map((jobName) => {
            const job = jobRequirements[jobName] || {};
            const configured = FACTORS.filter(({ key, kind }) => kind === "test" && hasRequirement(job, key)).map(({ label }) => label).join("، ");
            const fields = [...(job?.required?.fields || []), ...(job?.education || [])].join("، ");
            return <tr key={jobName}><td>{jobName}</td><td>{configured || "بدون معیار اختصاصی"}</td><td>{fields || "تعریف نشده"}</td></tr>;
          })}</tbody></table></div></section>
        </div>
        <footer className="ts-modal-footer"><button className="btn ghost" onClick={onClose} disabled={submitting} type="button">انصراف</button><button className="btn primary" onClick={submit} disabled={submitting || !valid} type="button">{submitting ? "در حال محاسبه..." : "محاسبه تطابق و تخصیص"}</button></footer>
      </div>
    </div>
  );
}

JobQuotaModal.propTypes = {
  open: PropTypes.bool, quotas: PropTypes.object, onChange: PropTypes.func, onSubmit: PropTypes.func,
  onClose: PropTypes.func, jobRequirements: PropTypes.object, tests: PropTypes.array,
  submitting: PropTypes.bool, selectedCount: PropTypes.number, selectedUsers: PropTypes.array,
};
