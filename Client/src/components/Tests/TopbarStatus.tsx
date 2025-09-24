import React from 'react';
import './shared.css';

// src/components/tests/TopbarStatus.jsx
export default function TopbarStatus({
  timeLeft,
  timeText,
  progressPercent,
  currentIndex,
  totalQuestions,
  onSubmit,
}) {
  return (
    <div className="status-wrap" role="region" aria-label="وضعیت آزمون">
      <div className="status-inner">
        {/* تایمر دایره‌ای با متن داخل */}
        <div className="timer-wrap" aria-live="polite">
          <div className="timer-circle" title="زمان باقی‌مانده">
            <span className="timer-text">{timeText}</span>
          </div>
          {/* <div className="counter">
            <span>سؤال</span>
            <strong>{currentIndex + 1}</strong>
            <span className="sep">/</span>
            <span>{totalQuestions}</span>
          </div> */}
        </div>

        {/* نوار پیشرفت — در موبایل میره زیر تایمر */}
        <div className="progress-wrap" aria-label="پیشرفت">
          <div className="progress-bar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent} role="progressbar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="progress-meta">
            <span>{progressPercent}% تکمیل</span>
            <button type="button" className="finish-btn" onClick={onSubmit}>اتمام</button>
          </div>
        </div>
      </div>
    </div>
  );
}
