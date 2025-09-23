import React from "react";

const JobQuotaModal = ({ open, quotas, onChange, onSubmit, onClose }) => {
  if (!open) return null;

  return (
    <div className="ts-modal-overlay" role="dialog" aria-modal="true">
      <div className="ts-modal card">
        <h3>تعداد افراد مورد نیاز برای هر رسته</h3>

        <div className="ts-modal-grid">
          {Object.keys(quotas).map((key) => (
            <div className="quota-row" key={key}>
              <label htmlFor={`quota-${key}`}>{quotas[key].name}</label>
              <input
                id={`quota-${key}`}
                type="number"
                min="0"
                value={quotas[key].tableCount}
                onChange={(e) => onChange(key, parseInt(e.target.value || "0", 10))}
              />
            </div>
          ))}
        </div>

        <div className="ts-modal-actions">
          <button className="btn primary" onClick={onSubmit}>شروع</button>
          <button className="btn ghost" onClick={onClose}>انصراف</button>
        </div>
      </div>
    </div>
  );
};

export default JobQuotaModal;
