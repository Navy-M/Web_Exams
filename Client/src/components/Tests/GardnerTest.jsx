import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import "../../styles/GardnerTest.css";
import "./shared.css";
import { useAuth } from "../../context/AuthContext";
import { submitResult } from "../../services/api";
import { useNavigate } from "react-router-dom";
import TopbarStatus from "./TopbarStatus";

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const SCORE_MAP = {
  "خیلی کم": 1,
  "کمی": 2,
  "تاحدی": 3,
  "زیاد": 4,
  "خیلی زیاد": 5,
};

export default function GardnerTest({ questions, duration = 10 }) {
  const { user } = useAuth() || {};
  const navigate = useNavigate();
  const startTimeRef = useRef(Date.now());

  const Gardner_Test = useMemo(() => (Array.isArray(questions) ? questions : []), [questions]);
  const total = Gardner_Test.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  // جواب‌ها به‌صورت map نگه می‌داریم: { [questionId]: number }
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [started, setStarted] = useState(false);

  const currentQuestion = Gardner_Test[currentIndex];
  const progressPercent = total ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  // تایمر کل آزمون
  useEffect(() => {
    if (!started) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const t = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, timeLeft]);

  // انتخاب گزینه
  const handleSelect = useCallback(
    (choice) => {
      const qid = currentQuestion?.id ?? `q_${currentIndex}`;
      const numeric =
        SCORE_MAP[choice] ??
        (Number.isFinite(Number(choice)) ? Number(choice) : 0);

      setAnswers((prev) => ({ ...prev, [qid]: numeric }));

      setTimeout(() => {
        if (currentIndex + 1 < total) {
          setCurrentIndex((i) => i + 1);
        } else {
          handleSubmit();
        }
      }, 180);
    },
    [currentIndex, currentQuestion?.id, total]
  );

  // ارسال نهایی
  const handleSubmit = useCallback(async () => {
    const formattedAnswers = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value,
    }));

    const resultData = {
      user: user?.id || user?._id || null,
      testType: "GARDNER",
      answers: formattedAnswers,
      score: 0,
      analysis: {},
      adminFeedback: "",
      startedAt: new Date(startTimeRef.current),
      submittedAt: new Date(),
    };

    try {
      const result = await submitResult(resultData);
      if (result?.user || result?._id || result?.id) {
        alert("🎉 آزمون گاردنر با موفقیت ثبت شد!");
        navigate("/");
        location.reload();

      } else {
        alert("❌ ذخیره‌سازی نتایج انجام نشد!");
      }
    } catch (err) {
      console.error("Gardner submission error:", err);
      alert("⚠️ ارسال نتایج با خطا مواجه شد.");
    }
  }, [answers, navigate, user?.id, user?._id]);

  if (!total) {
    return (
      <div className="gardner-test">
        <div className="intro-box">
          <h2>آزمون گاردنر</h2>
          <p>سوالی برای نمایش وجود ندارد.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gardner-test" role="main" aria-live="polite">
      {!started ? (
        <div className="intro-box">
          <p>این آزمون به شما کمک می‌کند توانایی‌های مختلف خود را شناسایی کنید</p>
          <h2>🧠</h2>
          <h4>
            میانگین برای هر سؤال:{" "}
            {Math.max(5, Math.round((duration * 60) / total))} ثانیه
          </h4>
          <button className="start-btn" onClick={() => setStarted(true)}>
            شروع آزمون
          </button>
        </div>
      ) : (
        <div className="question-box">
          <div className="top-bar">
            <TopbarStatus
              timeLeft={timeLeft}
              timeText={formatTime(timeLeft)}
              progressPercent={progressPercent}
              currentIndex={currentIndex}
              totalQuestions={total}
              onSubmit={handleSubmit}
            />
          </div>

          <div className="question-card" key={currentQuestion?.id ?? currentIndex}>
            <h3 className="question-text">{currentQuestion?.text ?? "سؤال"}</h3>

            <div className="options-grid" role="listbox" aria-label="گزینه‌ها">
              {(currentQuestion?.options || []).map((option, idx) => {
                const qid = currentQuestion?.id ?? `q_${currentIndex}`;
                const optVal =
                  SCORE_MAP[option] ??
                  (Number.isFinite(Number(option)) ? Number(option) : null);
                const selected = optVal != null && answers[qid] === optVal;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`option-button ${selected ? "selected" : ""}`}
                    onClick={() => handleSelect(option)}
                    aria-pressed={selected}
                    title={`کلید ${idx + 1}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="progress-count">
            سؤال {currentIndex + 1} از {total}
          </p>

          <div className="nav-actions">
              <button
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="nav-btn"
                aria-label="سوال قبلی"
              >
                ← قبلی
              </button>

              <button
                onClick={() => currentIndex + 1 < total && setCurrentIndex((i) => i + 1)}
                disabled={currentIndex + 1 >= total}
                className="nav-btn"
                aria-label="سوال بعدی"
              >
                بعدی →
              </button>
              {/* <button
                onClick={() => window.confirm("ارسال آزمون؟") && handleSubmit()}
                className="submit-btn"
                disabled={submitting}
              >
                {submitting ? "در حال ارسال..." : "ارسال نهایی"}
              </button> */}
            </div>
        </div>
      )}
    </div>
  );
}
