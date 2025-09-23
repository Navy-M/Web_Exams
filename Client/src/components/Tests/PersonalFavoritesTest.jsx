// components/PersonalFavoritesTest.jsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import "../../styles/personalfavoriteTest.css";
import "./shared.css";
import { useAuth } from "../../context/AuthContext";
import { submitResult } from "../../services/api";
import { useNavigate } from "react-router-dom";
import TopbarStatus from "./TopbarStatus";
import { setItemWithExpiry, getItemWithExpiry, removeItem } from "../../services/storage";

/**
 * Props:
 * - questions: array of question objects (id, text, trait, direction, options)
 *   For Likert questions options should have .value numeric 1..5
 * - duration: minutes for whole test
 */
const STORAGE_KEY = "pf_test_progress_v1";
const DONE_KEY = "pf_test_done_v1";

const PersonalFavoritesTest = ({ questions = [], duration = 8 }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // state
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: value }
  const [timeLeft, setTimeLeft] = useState(duration * 60); // seconds
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const autosaveRef = useRef(null);
  const mountedRef = useRef(true);

  // derived
  const totalQuestions = questions.length;
  const progressPercent = Math.round(((Object.keys(answers).length) / Math.max(1, totalQuestions)) * 100);

  // resume logic
  useEffect(() => {
    mountedRef.current = true;
    const done = getItemWithExpiry(DONE_KEY);
    if (done) {
      alert("شما قبلاً این آزمون را انجام داده‌اید.");
      navigate("/");
      return;
    }

    const saved = getItemWithExpiry(STORAGE_KEY);
    if (saved && saved.questionsHash === totalQuestions) {
      const resume = window.confirm("پیش‌نویس آزمون پیدا شد. آیا می‌خواهید ادامه دهید؟");
      if (resume) {
        setAnswers(saved.answers || {});
        setCurrentIndex(saved.currentIndex || 0);
        setTimeLeft(saved.timeLeft ?? duration * 60);
        setStarted(saved.started || false);
      } else {
        removeItem(STORAGE_KEY);
      }
    }

    return () => { mountedRef.current = false; clearInterval(autosaveRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalQuestions]);

  // overall timer
  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          handleSubmit(); // time up -> submit
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  // autosave every 2 seconds (debounced)
  useEffect(() => {
    if (!started) return;
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      setItemWithExpiry(STORAGE_KEY, {
        answers,
        currentIndex,
        timeLeft,
        started,
        savedAt: Date.now(),
        questionsHash: totalQuestions,
      }, 1000 * 60 * 60 * 6); // 6 hours
    }, 1200);

    return () => clearTimeout(autosaveRef.current);
  }, [answers, currentIndex, started, timeLeft, totalQuestions]);

  // keyboard nav: 1..5 select, arrows navigate
  useEffect(() => {
    const onKey = (e) => {
      if (!started) return;
      const key = e.key;
      if (/^[1-9]$/.test(key)) {
        const idx = Number(key) - 1;
        const opts = questions[currentIndex]?.options || [];
        if (opts[idx]) {
          handleSelect(questions[currentIndex].id, opts[idx].value);
        }
      }
      if (key === "ArrowRight") {
        setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1));
      }
      if (key === "ArrowLeft") {
        setCurrentIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, currentIndex, questions]);

  // helpers
  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const handleSelect = useCallback((questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    // small delay then advance
    setTimeout(() => {
      setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1));
    }, 200);
  }, [totalQuestions]);

  const handleSubmit = useCallback(async (skipConfirm = false) => {
    if (submitting) return;
    // require confirmation if not enough answers
    const answeredCount = Object.keys(answers).length;
    if (!skipConfirm && answeredCount < totalQuestions) {
      const ok = window.confirm(`شما ${answeredCount} از ${totalQuestions} سوال را پاسخ داده‌اید. آیا می‌خواهید در همین حالت ارسال کنید؟`);
      if (!ok) return;
    }

    setSubmitting(true);
    setError("");

    // transform to array of { questionId, value }
    const formattedAnswers = questions.map(q => ({
      questionId: q.id,
      value: answers[q.id] ?? null
    }));

    const resultData = {
      user: user?.id || user?._id || null,
      testType: "PERSONAL_FAVORITES",
      answers: formattedAnswers,
      score: 0,
      analysis: {},
      adminFeedback: "",
      startedAt: new Date(Date.now() - (duration * 60 - timeLeft) * 1000),
      submittedAt: new Date(),
    };

    try {
      const res = await submitResult(resultData);
      // handle response shape flexibly
      if (res && (res.user || res._id || res.id)) {
        // mark done for 5 hours
        setItemWithExpiry(DONE_KEY, true, 5 * 60 * 60 * 1000);
        removeItem(STORAGE_KEY);
        alert("🎉 آزمون با موفقیت ثبت شد!");
        navigate("/");
      } else {
        setError("ارسال موفق نبود — لطفاً دوباره تلاش کنید.");
      }
    } catch (err) {
      console.error("submit error:", err);
      setError("خطا در ارسال نتایج — اتصال اینترنت را بررسی کنید.");
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, duration, questions, timeLeft, submitting, totalQuestions, user]);

  // start function
  const handleStart = () => {
    setStarted(true);
    setCurrentIndex(0);
    setTimeLeft(duration * 60);
  };

  // UI pieces
  const currentQuestion = questions[currentIndex];

  return (
    <div className="pf-test-container" dir="rtl" aria-live="polite">
      {!started ? (
        <div className="pf-intro card">
          <h2>آزمون اولویت‌های شخصی 🎯</h2>
          <p>این آزمون به شما کمک می‌کند اولویت‌ها و علایق روزمره‌تان را شناسایی کنید.</p>

          <div className="pf-meta">
            <div>تعداد سوال: <strong>{totalQuestions}</strong></div>
            <div>حدود زمان: <strong>{duration} دقیقه</strong></div>
            <div>تایمر: <strong>{formatTime(duration * 60)}</strong></div>
          </div>

          <div className="pf-actions">
            <button className="btn primary" onClick={handleStart}>شروع آزمون</button>
            <button className="btn outline" onClick={() => navigate("/")}>بازگشت</button>
          </div>
        </div>
      ) : (
        <div className="pf-body card">
          <div className="pf-topbar">
            <TopbarStatus
              duration={duration}
              started={started}
              currentIndex={currentIndex}
              totalQuestions={totalQuestions}
              handleSubmit={() => handleSubmit(true)}
              overallRemaining={timeLeft}
              progressPercent={progressPercent}
            />
          </div>

          {error && <div className="pf-error">{error}</div>}

          <section className="pf-question-card">
            <div className="pf-question-header">
              <h3 className="pf-question-text">{currentQuestion?.text || "سوال نامشخص"}</h3>
              <div className="pf-timer">زمان باقیمانده: <strong>{formatTime(timeLeft)}</strong></div>
            </div>

            <div className="pf-progress">
              <div className="pf-progress-bar">
                <div className="pf-progress-inner" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="pf-progress-label">پاسخ داده شده: {Object.keys(answers).length}/{totalQuestions}</div>
            </div>

            <div className="pf-options-grid" role="radiogroup" aria-label={`گزینه‌های سوال ${currentIndex + 1}`}>
              {/* Likert 1..5 left-to-right visually but whole UI is RTL; we display 1 (کاملاً مخالفم) on left */}
              {currentQuestion?.options?.map((opt, idx) => {
                const selected = answers[currentQuestion.id] === opt.value;
                return (
                  <button
                    key={String(opt.value) + idx}
                    role="radio"
                    aria-checked={selected}
                    className={`pf-option ${selected ? "selected" : ""}`}
                    onClick={() => handleSelect(currentQuestion.id, opt.value)}
                    disabled={submitting}
                    title={`کلید ${idx + 1}`}
                  >
                    <span className="pf-option-value">{opt.value}</span>
                    <span className="pf-option-text">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            <div className="pf-nav">
              <button
                className="btn outline"
                onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
              >
                ← قبلی
              </button>

              <button
                className="btn outline"
                onClick={() => setCurrentIndex(i => Math.min(totalQuestions - 1, i + 1))}
                disabled={currentIndex + 1 >= totalQuestions}
              >
                بعدی →
              </button>

              <button
                className="btn primary"
                onClick={() => handleSubmit(false)}
                disabled={submitting}
              >
                {submitting ? "در حال ارسال..." : "ارسال نهایی"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default PersonalFavoritesTest;
