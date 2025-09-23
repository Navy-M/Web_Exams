import React from "react";

const FeedbackPanel = ({ show, value, onChange, onSubmit, onCancel }) => {
  if (!show) return (
    <div className="feedback-readonly muted">
      بازخورد ثبت شده است یا قابل ثبت نیست.
    </div>
  );

  return (
    <div className="feedback-panel">
      <h4>ثبت بازخورد</h4>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="متن بازخورد..."
        rows={4}
      />
      <div className="form-actions">
        <button className="btn primary" onClick={onSubmit}>ثبت نهایی</button>
        <button className="btn ghost" onClick={onCancel}>انصراف</button>
      </div>
    </div>
  );
};

export default FeedbackPanel;
