// src/components/tests/MBTITest.jsx
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import "../../styles/mbtiTest.css";
import "./shared.css";
import { useAuth } from "../../context/AuthContext";
import { submitResult } from "../../services/api";
import { useNavigate } from "react-router-dom";
import TopbarStatus from "./TopbarStatus";

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function MBTITest({ questions, duration = 8 }) {
  const { user } = useAuth() || {};
  const navigate = useNavigate();
  const startTimeRef = useRef(Date.now());

  const Mbti_Test = useMemo(() => Array.isArray(questions) ? questions : [], [questions]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration * 60);

  const total = Mbti_Test.length;
  const currentQuestion = Mbti_Test[currentIndex];
  const progressPercent = total ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  // Timer
  useEffect(() => {
    if (!started) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const t = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, timeLeft]);

  const handleSelect = useCallback((questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    // افکت کوتاه انتخاب و سپس رفتن به سوال بعد
    setTimeout(() => {
      setCurrentIndex((prev) => {
        if (prev + 1 < Mbti_Test.length) return prev + 1;
        // آخرین سوال
        handleSubmit();
        return prev;
      });
    }, 160);
  }, [Mbti_Test.length]);

  const handleSubmit = useCallback(async () => {
    const formattedAnswers = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value,
    }));

    const resultData = {
      user: user?.id || null,
      testType: "MBTI",
      answers: formattedAnswers,
      score: 0,
      analysis: {},
      adminFeedback: "",
      startedAt: new Date(startTimeRef.current),
      submittedAt: new Date(),
    };

    try {
      const result = await submitResult(resultData);
      if (result?.user) {
        alert("🎉 آزمون MBTI با موفقیت ثبت شد!");
        navigate("/");
        location.reload();

      }
    } catch (err) {
      console.error("MBTI submission error:", err);
      alert("⚠️ ارسال نتایج با خطا مواجه شد.");
    }
  }, [answers, navigate, user?.id]);

  if (!total) {
    return (
      <div className="mbti-test">
        <div className="intro-box">
          <h2>آزمون MBTI</h2>
          <p>سوالی برای نمایش وجود ندارد.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mbti-test" role="main" aria-live="polite">
      {!started ? (
        <div className="intro-box">
          <p>این آزمون کمک می‌کند تیپ شخصیتی خود را بهتر بشناسید</p>
          <h2>🧩</h2>
          <h4>
              میانگین برای هر سؤال:{" "}
            {Math.max(5, Math.round((duration * 60) / total))} ثانیه•
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
            <h3 className="question-text">{currentQuestion.text}</h3>

            <div className="options-grid" role="listbox" aria-label="گزینه‌ها">
              {currentQuestion.options.map((option, idx) => {
                const selected = answers[currentQuestion.id] === option.value;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`option-button ${selected ? "selected" : ""}`}
                    onClick={() => handleSelect(currentQuestion.id, option.value)}
                    aria-pressed={selected}
                  >
                    {option.text}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="progress-count">
            سؤال {currentIndex + 1} از {total}
          </p>
        </div>
      )}
    </div>
  );
}
