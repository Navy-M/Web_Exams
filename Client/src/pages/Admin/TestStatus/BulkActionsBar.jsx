import React from "react";

const BulkActionsBar = ({ count, onStartPrioritization, onDeleteFromView }) => {
  return (
    <div className="ts-bulk card" role="region" aria-live="polite">
      <div className="ts-bulk-info">{count} کاربر انتخاب شده</div>
      <div className="ts-bulk-actions">
        <button className="btn primary" onClick={onStartPrioritization}>
          شروع اولویت‌بندی
        </button>
        <button className="btn danger" onClick={onDeleteFromView}>
          حذف از لیست
        </button>
      </div>
    </div>
  );
};

export default BulkActionsBar;
