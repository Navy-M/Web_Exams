import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import "../../styles/GHQTest.css";
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

export default function GHQTest({ questions, duration = 8 }) {
  const { user } = useAuth() || {};
  const navigate = useNavigate();
  const startTimeRef = useRef(Date.now());

  const Ghq_Test = useMemo(() => (Array.isArray(questions) ? questions : []), [questions]);
  const total = Ghq_Test.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [qid]: number }
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration * 60);

  const currentQuestion = Ghq_Test[currentIndex];
  const progressPercent = total ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  // countdown (whole test)
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

  const handleSelect = useCallback(
    (questionId, value) => {
      const numeric = Number.isFinite(Number(value)) ? Number(value) : parseInt(value, 10) || 0;
      setAnswers((prev) => ({ ...prev, [questionId]: numeric }));

      setTimeout(() => {
        if (currentIndex + 1 < total) setCurrentIndex((i) => i + 1);
        else handleSubmit();
      }, 180);
    },
    [currentIndex, total]
  );

  const handleSubmit = useCallback(async () => {
    const formattedAnswers = Object.entries(answers).map(([questionId, value]) => ({
      questionId: isNaN(Number(questionId)) ? questionId : Number(questionId),
      value,
    }));

    const resultData = {
      user: user?.id || user?._id || null,
      testType: "GHQ",
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
        alert("🎉 آزمون سلامت عمومی (GHQ) با موفقیت ثبت شد!");
        navigate("/");
        location.reload();

      } else {
        alert("❌ ذخیره‌سازی نتایج انجام نشد!");
      }
    } catch (err) {
      console.error("GHQ submission error:", err);
      alert("⚠️ ارسال نتایج با خطا مواجه شد.");
    }
  }, [answers, navigate, user?.id, user?._id]);

  if (!total) {
    return (
      <div className="ghq-test">
        <div className="intro-box">
          <h2>آزمون GHQ</h2>
          <p>سوالی برای نمایش وجود ندارد.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ghq-test" role="main" aria-live="polite">
      {!started ? (
        <div className="intro-box">
          <p>این آزمون کمک می‌کند سطح سلامت روانی خود را بسنجید</p>
          <h2>🧠</h2>
          <h4>
            میانگین برای هر سؤال:{" "}
            {Math.max(5, Math.round((duration * 60) / total))} ثانیه
          </h4>
          <button
            className="start-btn"
            onClick={() => {
              setStarted(true);
              startTimeRef.current = Date.now();
              setTimeLeft(duration * 60);
            }}
          >
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
                const optVal = Number.isFinite(Number(option?.value))
                  ? Number(option.value)
                  : parseInt(option?.value, 10);
                const selected = answers[qid] === optVal;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`option-button ${selected ? "selected" : ""}`}
                    onClick={() => handleSelect(qid, option.value)}
                    aria-pressed={selected}
                    title={`کلید ${idx + 1}`}
                  >
                    {option?.text ?? String(option?.value)}
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
