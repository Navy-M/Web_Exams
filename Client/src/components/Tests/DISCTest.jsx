import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import "../../styles/DiscTest.css";
import { useAuth } from "../../context/AuthContext";
import { submitResult } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { setItemWithExpiry, getItemWithExpiry, removeItem } from "../../services/storage";
import TopbarStatus from "./TopbarStatus";

const STORAGE_KEY = "disc_test_progress_v1";
const DONE_KEY = "discTestDone";

function fmt(sec) {
  if (sec == null) return "--:--";
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function DiscTest({ questions = [], duration = 8 }) {
  const { user } = useAuth() || {};
  const navigate = useNavigate();

  // derived
  const total = questions.length;
  const perQuestionTime = useMemo(
    () => Math.max(5, Math.floor((duration * 60) / Math.max(1, total))),
    [duration, total]
  );

  // refs/state
  const startTimeRef = useRef(Date.now());
  const perQTimerRef = useRef(null);
  const overallTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const [started, setStarted] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]); // { questionId, selectedTrait, answeredAt }
  const [perQuestionRemaining, setPerQuestionRemaining] = useState(null);
  const [overallRemaining, setOverallRemaining] = useState(duration * 60);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentQuestion = questions[currentIndex];

  // resume / done checks
  useEffect(() => {
    mountedRef.current = true;

    const done = getItemWithExpiry(DONE_KEY);
    if (done) {
      alert("شما قبلاً این آزمون را انجام داده‌اید.");
      navigate("/");
      return;
    }

    const saved = getItemWithExpiry(STORAGE_KEY);
    if (saved && saved.questionsHash === questions.length) {
      if (window.confirm("پیش‌نویس آزمون پیدا شد. ادامه می‌دهید؟")) {
        setAnswers(saved.answers || []);
        setCurrentIndex(saved.currentIndex || 0);
        setStarted(saved.started || false);
        setStartedAt(saved.startedAt || Date.now());
        setOverallRemaining(saved.overallRemaining ?? duration * 60);
        setPerQuestionRemaining(saved.perQuestionRemaining ?? perQuestionTime);
      } else {
        removeItem(STORAGE_KEY);
      }
    }

    return () => {
      mountedRef.current = false;
      clearInterval(perQTimerRef.current);
      clearInterval(overallTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length]);

  // timers
  useEffect(() => {
    if (!started) return;

    // reset per-question timer
    setPerQuestionRemaining(perQuestionTime);
    clearInterval(perQTimerRef.current);
    perQTimerRef.current = setInterval(() => {
      setPerQuestionRemaining((t) => {
        if (t <= 1) {
          // handleAutoAdvance();
          return perQuestionTime;
        }
        return t - 1;
      });
    }, 1000);

    // (re)start overall timer
    clearInterval(overallTimerRef.current);
    overallTimerRef.current = setInterval(() => {
      setOverallRemaining((t) => {
        if (t <= 1) {
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      clearInterval(perQTimerRef.current);
      clearInterval(overallTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, started, perQuestionTime]);

  // autosave (debounced)
  useEffect(() => {
    if (!started) return;
    const payload = {
      answers,
      currentIndex,
      started: true,
      startedAt,
      overallRemaining,
      perQuestionRemaining,
      questionsHash: questions.length,
      savedAt: Date.now(),
    };
    const id = setTimeout(() => {
      setItemWithExpiry(STORAGE_KEY, payload, 6 * 60 * 60 * 1000); // 6h
    }, 2000);
    return () => clearTimeout(id);
  }, [answers, currentIndex, started, startedAt, overallRemaining, perQuestionRemaining, questions.length]);

  // keyboard shortcuts (1..9, arrows)
  useEffect(() => {
    const onKey = (e) => {
      if (!started) return;
      const key = e.key;
      if (/^[1-9]$/.test(key)) {
        const idx = parseInt(key, 10) - 1;
        const opts = questions[currentIndex]?.options || [];
        if (opts[idx]) handleSelect(opts[idx].trait);
      }
      if (key === "ArrowRight") setCurrentIndex((i) => Math.min(total - 1, i + 1));
      if (key === "ArrowLeft") setCurrentIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, currentIndex, questions, total]);

  const handleStart = () => {
    setStarted(true);
    setStartedAt(Date.now());
    startTimeRef.current = Date.now();
    setPerQuestionRemaining(perQuestionTime);
    setOverallRemaining(duration * 60);
  };

  const handleAutoAdvance = useCallback(() => {
    setAnswers((prev) => {
      const exists = prev.find((a) => a.questionId === currentQuestion?.id);
      if (exists) return prev;
      return [...prev, { questionId: currentQuestion?.id, selectedTrait: null, answeredAt: new Date() }];
    });
    if (currentIndex + 1 < total) setCurrentIndex((i) => i + 1);
    else handleSubmit();
  }, [currentIndex, currentQuestion, total]);

  const handleSelect = (trait) => {
    if (submitting) return;
    setAnswers((prev) => {
      const filtered = prev.filter((p) => p.questionId !== currentQuestion.id);
      return [...filtered, { questionId: currentQuestion.id, selectedTrait: trait, answeredAt: new Date() }];
    });
    setTimeout(() => {
      if (currentIndex + 1 < total) setCurrentIndex((i) => i + 1);
      else handleSubmit();
    }, 220);
  };

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");

    const payloadAnswers = answers.map((a) => ({
      questionId: a.questionId,
      selectedTrait: a.selectedTrait,
      // answeredAt: a.answeredAt || new Date(),
    }));

    const resultData = {
      user: user?.id || user?._id || null,
      testType: "DISC",
      answers: payloadAnswers,
      score: 0,
      analysis: {},
      adminFeedback: "",
      startedAt: new Date(startTimeRef.current || Date.now()),
      submittedAt: new Date(),
    };

    try {
      const result = await submitResult(resultData);
      if (result && (result.user || result._id || result.id)) {
        setItemWithExpiry(DONE_KEY, true, 5 * 60 * 60 * 1000); // 5h
        removeItem(STORAGE_KEY);
        alert("🎉 آزمون با موفقیت ثبت شد!");
        navigate("/");
        location.reload();

      } else {
        setError("ذخیره‌سازی نتایج انجام نشد. دوباره تلاش کنید.");
      }
    } catch (err) {
      console.error("submit error:", err);
      setError("⚠️ ارسال نتایج با خطا مواجه شد. اتصال اینترنت را بررسی کنید.");
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }, [answers, navigate, submitting, user]);

  // درصد پیشرفت بر اساس موقعیت (برای هماهنگی با MBTI/TopbarStatus)
  const progressPercent = total ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  return (
    <div className="disc-test" dir="rtl" aria-live="polite">
      {!started ? (
        <div className="intro-box">
          <p>یک ارزیابی سریع برای درک ترجیحات رفتاری شما.</p>
          <h2>🎯</h2>
   
          <ul className="intro-list">
            <li>تعداد سوالات: {total}</li>
            <li>زمان کل: {duration} دقیقه</li>
            <li>میانگین هر سؤال: {perQuestionTime} ثانیه</li>
          </ul>
          <div className="intro-actions">
            <button className="start-btn" onClick={handleStart}>شروع آزمون</button>
          </div>
        </div>
      ) : (
        <div className="question-box">
          <div className="top-bar">
            <TopbarStatus
              timeLeft={overallRemaining}
              timeText={fmt(overallRemaining)}
              progressPercent={progressPercent}
              currentIndex={currentIndex}
              totalQuestions={total}
              onSubmit={handleSubmit}
            />
          </div>

          {error && <div className="error-banner" role="alert">{error}</div>}

          <div className="question-card" key={currentQuestion?.id ?? currentIndex}>
            <h3 className="question-text">{currentQuestion?.question || "سوال نامشخص"}</h3>

            {/* می‌تونی اگر خواستی، تایمر سوالی رو هم به صورت متن ساده نشون بدی: */}
            {/* <div className="progress-count">زمان سوال: {fmt(perQuestionRemaining)} (پیشنهادی: {perQuestionTime}s)</div> */}

            <div className="options-grid" role="listbox" aria-label="گزینه‌ها">
              {currentQuestion?.options?.map((option, idx) => {
                const answeredForThis = answers.find((a) => a.questionId === currentQuestion.id);
                const isAnswered = !!answeredForThis;
                const selected = answeredForThis?.selectedTrait === option.trait;
                return (
                  <button
                    key={option.trait + idx}
                    type="button"
                    className={`option-button ${selected ? "selected" : ""}`}
                    onClick={() => handleSelect(option.trait)}
                    disabled={submitting || isAnswered}
                    role="option"
                    aria-pressed={selected}
                    aria-disabled={submitting || isAnswered}
                    title={`کلید ${idx + 1}`}
                  >
                    {option.text}
                  </button>
                );
              })}
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
        </div>
      )}
    </div>
  );
}
