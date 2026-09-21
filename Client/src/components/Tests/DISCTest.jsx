import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import "../../styles/DiscTest.css";
import { useAuth } from "../../context/AuthContext";
import { submitResult } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../../context/NotificationContext";
import { setItemWithExpiry, getItemWithExpiry, removeItem, scopedStorageKey } from "../../services/storage";
import TopbarStatus from "./TopbarStatus";
import { useReliableExamTimer } from "../../hooks/useReliableExamTimer";
import { useExamDraft } from "../../hooks/useExamDraft";

const STORAGE_KEY = "disc_test_progress_v1";
const DONE_KEY = "discTestDone";

function fmt(sec) {
  if (sec == null) return "--:--";
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function DiscTest({ questions = [], duration = 8, session }) {
  const { user } = useAuth() || {};
  const navigate = useNavigate();
  const { notify } = useNotification();
  const userId = user?.id || user?._id;
  const doneKey = scopedStorageKey(DONE_KEY, userId, "DISC");
  const storageKey = scopedStorageKey(STORAGE_KEY, userId, "DISC");

  // derived
  const total = questions.length;
  const perQuestionTime = useMemo(
    () => Math.max(5, Math.floor((duration * 60) / Math.max(1, total))),
    [duration, total]
  );

  // refs/state
  const startTimeRef = useRef(new Date(session?.startedAt || Date.now()).getTime());
  const perQTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const [started, setStarted] = useState(Boolean(session));
  const [startedAt, setStartedAt] = useState(() => new Date(session?.startedAt || Date.now()).getTime());
  const [currentIndex, setCurrentIndex] = useState(session?.currentIndex || 0);
  const [answers, setAnswers] = useState(() => session?.answersDraft || []);
  const [perQuestionRemaining, setPerQuestionRemaining] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submitHandlerRef = useRef(null);
  const { remainingSeconds: overallRemaining, tone } = useReliableExamTimer({ session, enabled: started, onExpireRef: submitHandlerRef });
  useExamDraft({ sessionId: session?.sessionId, answers, currentIndex, enabled: started });

  const currentQuestion = questions[currentIndex];

  // resume / done checks
  useEffect(() => {
    mountedRef.current = true;

    const done = getItemWithExpiry(doneKey);
    if (done) {
      notify("شما قبلاً این آزمون را انجام داده‌اید.", { type: "warning" });
      navigate("/dashboard");
      return;
    }

    const saved = getItemWithExpiry(storageKey);
    if (saved && saved.questionsHash === questions.length) {
      if (window.confirm("پیش‌نویس آزمون پیدا شد. ادامه می‌دهید؟")) {
        setAnswers(saved.answers || []);
        setCurrentIndex(saved.currentIndex || 0);
        setStarted(saved.started || false);
        setStartedAt(saved.startedAt || Date.now());
        setPerQuestionRemaining(saved.perQuestionRemaining ?? perQuestionTime);
      } else {
        removeItem(storageKey);
      }
    }

    return () => {
      mountedRef.current = false;
      clearInterval(perQTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneKey, duration, navigate, perQuestionTime, questions.length, storageKey]);

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

    return () => {
      clearInterval(perQTimerRef.current);
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
      perQuestionRemaining,
      questionsHash: questions.length,
      savedAt: Date.now(),
    };
    const id = setTimeout(() => {
      setItemWithExpiry(storageKey, payload, 25 * 60 * 60 * 1000); // 25h
    }, 2000);
    return () => clearTimeout(id);
  }, [answers, currentIndex, started, startedAt, perQuestionRemaining, questions.length, storageKey]);

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
  };

  const handleSelect = (trait) => {
    if (submitting) return;
    setAnswers((prev) => {
      const filtered = prev.filter((p) => p.questionId !== currentQuestion.id);
      return [...filtered, { questionId: currentQuestion.id, selectedTrait: trait, answeredAt: new Date() }];
    });
    setTimeout(() => {
      if (currentIndex + 1 < total) setCurrentIndex((i) => i + 1);
      else submitHandlerRef.current?.();
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
      sessionId: session?.sessionId,
    };

    try {
      const result = await submitResult(resultData);
      if (result && (result.user || result._id || result.id)) {
        setItemWithExpiry(doneKey, true, 24 * 60 * 60 * 1000); // 24h
        removeItem(storageKey);
        notify("آزمون DISC با موفقیت ثبت شد.", { type: "success" });
        navigate("/dashboard");

      } else {
        setError("ذخیره‌سازی نتایج انجام نشد. دوباره تلاش کنید.");
      }
    } catch (err) {
      console.error("submit error:", err);
      setError("⚠️ ارسال نتایج با خطا مواجه شد. اتصال اینترنت را بررسی کنید.");
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }, [answers, doneKey, navigate, notify, session?.sessionId, storageKey, submitting, user]);
  submitHandlerRef.current = handleSubmit;

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
              timerTone={tone}
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
