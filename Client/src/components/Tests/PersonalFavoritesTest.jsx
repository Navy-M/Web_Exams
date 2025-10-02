import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import "../../styles/personalfavoriteTest.css";
import { useAuth } from "../../context/AuthContext";
import { submitResult } from "../../services/api";
import { useNavigate } from "react-router-dom";
import TopbarStatus from "./TopbarStatus";
import { getItemWithExpiry, setItemWithExpiry } from "../../services/storage";

const DONE_KEY = "pfTestDone";

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function PersonalFavoritesTest({ questions = [], duration = 8 }) {
  const { user } = useAuth() || {};
  const navigate = useNavigate();
  const startTimeRef = useRef(Date.now());

  const PF_Test = useMemo(() => (Array.isArray(questions) ? questions : []), [questions]);
  const total = PF_Test.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: value }
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [blocked, setBlocked] = useState(() => !!getItemWithExpiry(DONE_KEY));
  const submittingRef = useRef(false);

  const currentQuestion = PF_Test[currentIndex];
  const progressPercent = total ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  useEffect(() => {
    if (!blocked) return;
    alert("You have already completed this test. Please try again in 24 hours.");
    navigate("/");
  }, [blocked, navigate]);

  // timer (whole test)
  useEffect(() => {
    if (blocked || !started) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const t = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked, started, timeLeft]);

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
    if (submittingRef.current) return;
    submittingRef.current = true;
    const formattedAnswers = Object.entries(answers).map(([questionId, value]) => ({
      questionId: isNaN(Number(questionId)) ? questionId : Number(questionId),
      value,
    }));

    const resultData = {
      user: user?.id || user?._id || null,
      testType: "PERSONAL_FAVORITES",
      answers: formattedAnswers,
      score: 0,
      analysis: {},
      adminFeedback: "",
      startedAt: new Date(startTimeRef.current),
      submittedAt: new Date(),
    };

    try {
      const res = await submitResult(resultData);
      if (res?.user || res?._id || res?.id) {
        alert("🎉 آزمون با موفقیت ثبت شد!");
        setItemWithExpiry(DONE_KEY, true, 24 * 60 * 60 * 1000);
        setBlocked(true);
        navigate("/");
        location.reload();

      } else {
        alert("❌ ذخیره‌سازی نتایج انجام نشد!");
        submittingRef.current = false;
      }
    } catch (err) {
      console.error("PF submission error:", err);
      alert("⚠️ ارسال نتایج با خطا مواجه شد.");
      submittingRef.current = false;
    }
  }, [answers, navigate, user?.id, user?._id]);

  if (blocked) {
    return null;
  }

  if (!total) {
    return (
      <div className="pf-test">
        <div className="intro-box">
          <h2>آزمون اولویت‌های شخصی</h2>
          <p>سوالی برای نمایش وجود ندارد.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pf-test" role="main" aria-live="polite">
      {!started ? (
        <div className="intro-box">
          <p>این آزمون به شما کمک می‌کند اولویت‌ها و علایق روزمره‌تان را شناسایی کنید.</p>
          <h2>🎯</h2>
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
              {(currentQuestion?.options || []).map((opt, idx) => {
                const qid = currentQuestion?.id ?? `q_${currentIndex}`;
                const chosen = answers[qid] === (Number.isFinite(Number(opt.value)) ? Number(opt.value) : parseInt(opt.value, 10));
                return (
                  <button
                    key={String(opt.value) + idx}
                    type="button"
                    className={`option-button ${chosen ? "selected" : ""}`}
                    onClick={() => handleSelect(qid, opt.value)}
                    aria-pressed={chosen}
                    title={`کلید ${idx + 1}`}
                  >
                    {opt?.text ?? String(opt?.value)}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="progress-count">سؤال {currentIndex + 1} از {total}</p>

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
