import React, { useState, useRef, useEffect, useId } from "react";
import "./shared.css";

const TopbarStatus = ({
  duration = 8,              // minutes
  started = false,
  currentIndex = 0,
  totalQuestions = 1,
  handleSubmit,
}) => {
  const totalSeconds = Math.max(1, Math.floor(duration * 60));
  const safeTotal = totalQuestions > 0 ? totalQuestions : 1;
  const safeIndex = Math.min(Math.max(0, currentIndex), safeTotal - 1);

  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const timerRef = useRef(null);
  const handleSubmitRef = useRef(handleSubmit);
  const progressLabelId = useId();

  useEffect(() => { handleSubmitRef.current = handleSubmit; }, [handleSubmit]);
  useEffect(() => { setTimeLeft(totalSeconds); }, [totalSeconds]);
  useEffect(() => { if (started) setTimeLeft(totalSeconds); }, [started, totalSeconds]);

  useEffect(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (!started) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setTimeout(() => { try { handleSubmitRef.current?.(); } catch(e){ console.error(e);} }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [started, totalSeconds]);

  // circle
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const elapsed = Math.max(0, totalSeconds - timeLeft);
  const circleRatio = Math.max(0, Math.min(1, elapsed / totalSeconds));
  const circleDash = circleRatio * circumference;

  // bar
  const pct = Math.max(0, Math.min(100, Math.round(((safeIndex + 1) / safeTotal) * 100)));
  const ariaNow = Number.isFinite(pct) ? pct : 0;

  // time strings
  const mm = Math.floor(timeLeft / 60);
  const ss = (timeLeft % 60).toString().padStart(2, "0");
  const timeLabel = `${mm}:${ss}`;

  return (
    <div className="top-bar top-bar--responsive" data-state={started ? "running" : "paused"}>
      {/* TIMER */}
      <div
        className="timer-circle"
        // aria-label={`Time left ${mm} minutes ${timeLeft % 60} seconds`}
      >
        <div className="timer-svg-wrap">
          <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden="true">
            {/* optional gradient defs (uncomment if you want gradient stroke) */}
            {/* <defs>
              <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--ring-fg)" />
                <stop offset="100%" stopColor="var(--ring-fg-2)" />
              </linearGradient>
            </defs> */}
           
            <circle className="timer-bg" cx="50" cy="50" r={radius} strokeWidth="8" />
            <g className="timer-rot">
              <circle
                className="timer-progress"
                cx="50" cy="50" r={radius} strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={Math.max(0, circumference - circleDash)}
              />
            </g>
          </svg>

          {/* clock text INSIDE the circle */}
          <div className="timer-center" aria-live="polite">
            <span className="timer-mm">{mm}</span>
            <span className="timer-colon">:</span>
            <span className="timer-ss">{ss}</span>
          </div>

          <div className="timer-glow" aria-hidden="true" />
        </div>
      </div>

      {/* PROGRESS (time left label + bar) */}
      <div className="progress-block">
        {/* <span id={progressLabelId} className="sr-only">Question progress</span> */}

        <div className="progress-row">
          {/* time left to the LEFT of the bar on desktop; stacks on mobile */}
          {/* <div className="progress-timeleft" aria-hidden="true">
            <span className="progress-timeleft-label">Time left</span>
            <span className="progress-timeleft-value">{timeLabel}</span>
          </div> */}

          <div
            className="progress-track"
            role="progressbar"
            aria-labelledby={progressLabelId}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={ariaNow}
            aria-valuetext={`${safeIndex + 1} of ${safeTotal} (${ariaNow}%)`}
          >
            <div className="progress-bar" style={{ width: `${ariaNow}%` }}>
              <span className="progress-bar-label">{ariaNow}%</span>
            </div>
          </div>
        </div>

        {/* <div className="progress-meta">
          <span className="progress-counter">
            {safeIndex + 1}<span className="sep">/</span>{safeTotal}
          </span>
          <span className="progress-hint">questions</span>
        </div> */}
      </div>
    </div>
  );
};

export default TopbarStatus;
