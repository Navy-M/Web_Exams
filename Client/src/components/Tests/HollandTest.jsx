import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import "../../styles/halandTest.css"; // ← همون فایلی که خودت داری
import { useAuth } from "../../context/AuthContext";
import { submitResult } from "../../services/api";
import { useNavigate } from "react-router-dom";
import TopbarStatus from "./TopbarStatus";
import { getItemWithExpiry, setItemWithExpiry } from "../../services/storage";

const DONE_KEY = "hollandTestDone";

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const HalandTest = ({ questions, duration = 8 }) => {
  const { user } = useAuth() || {};
  const navigate = useNavigate();
  const startTimeRef = useRef(Date.now());

  const Holland_Test = useMemo(() => (Array.isArray(questions) ? questions : []), [questions]);
  const total = Holland_Test.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  // ✅ جواب‌ها را مثل MBTI به‌صورت map نگه می‌داریم: { [questionId]: answerString }
  const [answers, setAnswers] = useState({});
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [blocked, setBlocked] = useState(() => !!getItemWithExpiry(DONE_KEY));
  const submittingRef = useRef(false);

  const currentQuestion = Holland_Test[currentIndex];
  useEffect(() => {
    if (!blocked) return;
    alert("You have already completed this test. Please try again in 24 hours.");
    navigate("/");
  }, [blocked, navigate]);

  const progressPercent = total ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  // Timer (کل آزمون)
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
    (choice) => {
      const qid = currentQuestion?.id ?? `q_${currentIndex}`;
      setAnswers((prev) => ({ ...prev, [qid]: choice }));

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

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    // تبدیل map به آرایه مثل قبل
    const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));

    const resultData = {
      user: user?.id || user?._id || null,
      testType: "HOLLAND",
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
        alert("🎉 آزمون هالند با موفقیت ثبت شد!");
        setItemWithExpiry(DONE_KEY, true, 24 * 60 * 60 * 1000);
        setBlocked(true);
        navigate("/");
        location.reload();

      } else {
        alert("❌ ذخیره‌سازی نتایج انجام نشد!");
        submittingRef.current = false;
      }
    } catch (err) {
      console.error("Holland submission error:", err);
      alert("⚠️ ارسال نتایج با خطا مواجه شد.");
      submittingRef.current = false;
    }
  }, [answers, navigate, user?.id, user?._id]);

  if (blocked) {
    return null;
  }

  if (!total) {
    return (
      <div className="holland-test">
        <div className="intro-box">
          <h2>آزمون هالند</h2>
          <p>سوالی برای نمایش وجود ندارد.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="holland-test" role="main" aria-live="polite">
      {!started ? (
        <div className="intro-box">
          <p>این آزمون کمک می‌کند علاقه و گرایش شغلی خود را بشناسید</p>
          <h2>🎯</h2>
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
            <h3 className="question-text">{currentQuestion?.text ?? "سوال"}</h3>

            <div className="options-grid" role="listbox" aria-label="گزینه‌ها">
              {(currentQuestion?.options || []).map((option, idx) => {
                const qid = currentQuestion?.id ?? `q_${currentIndex}`;
                const selected = answers[qid] === option; // گزینه‌ها رشته هستند
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
};

export default HalandTest;

