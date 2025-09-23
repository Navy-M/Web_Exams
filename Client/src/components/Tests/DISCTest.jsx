// components/DiscTest.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import "../../styles/DiscTest.css";
import "./shared.css";
import { useAuth } from "../../context/AuthContext";
import { submitResult } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { setItemWithExpiry, getItemWithExpiry, removeItem } from "../../services/storage";
import TopbarStatus from "./TopbarStatus";

const STORAGE_KEY = "disc_test_progress_v1";
const DONE_KEY = "discTestDone";

const DiscTest = ({ questions = [], duration = 8 /* minutes total default */ }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // start time for entire test
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const startTimeRef = useRef(startedAt);

  // UI state
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]); // { questionId, selectedTrait, answeredAt }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [perQuestionRemaining, setPerQuestionRemaining] = useState(null); // seconds
  const [overallRemaining, setOverallRemaining] = useState(duration * 60); // total seconds

  // derived
  const totalQuestions = questions.length;
  const perQuestionTime = Math.max(5, Math.floor((duration * 60) / Math.max(1, totalQuestions)));

  // refs
  const timerRef = useRef(null);
  const overallTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  const justAnsweredRef = useRef(false);

  // load saved progress if exists
  useEffect(() => {
    isMountedRef.current = true;
    const saved = getItemWithExpiry(STORAGE_KEY);
    const done = getItemWithExpiry(DONE_KEY);
    if (done) {
      // user already did test recently
      alert("شما قبلاً این آزمون را انجام داده‌اید.");
      navigate("/");
      return;
    }

    if (saved && saved.questionsHash === questions.length) {
      // prompt resume
      if (window.confirm("پیش‌نویس آزمون پیدا شد. آیا می‌خواهید ادامه دهید؟")) {
        setAnswers(saved.answers || []);
        setCurrentIndex(saved.currentIndex || 0);
        setStarted(saved.started || false);
        setStartedAt(saved.startedAt || Date.now());
        setOverallRemaining(saved.overallRemaining ?? duration * 60);
      } else {
        removeItem(STORAGE_KEY);
      }
    }

    return () => {
      isMountedRef.current = false;
      clearInterval(timerRef.current);
      clearInterval(overallTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length]);

  // start per-question timer when question changes and test started
  useEffect(() => {
    if (!started) return;

    // initialize timers
    setPerQuestionRemaining(perQuestionTime);

    // per-question count down
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setPerQuestionRemaining((t) => {
        if (t <= 1) {
          // auto move to next (save unanswered as null)
          handleAutoAdvance();
          return perQuestionTime;
        }
        return t - 1;
      });
    }, 1000);

    // overall timer
    clearInterval(overallTimerRef.current);
    overallTimerRef.current = setInterval(() => {
      setOverallRemaining((t) => {
        if (t <= 1) {
          // time up -> submit
          handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(overallTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, started]);

  // autosave progress to storage
  useEffect(() => {
    if (!started) return;
    const payload = {
      answers,
      currentIndex,
      started: true,
      startedAt,
      overallRemaining,
      questionsHash: questions.length,
      savedAt: Date.now(),
    };
    // save every 2s (debounced)
    const id = setTimeout(() => {
      setItemWithExpiry(STORAGE_KEY, payload, 1000 * 60 * 60 * 6); // 6 hours expiry
    }, 1000 * 2);

    return () => clearTimeout(id);
  }, [answers, currentIndex, started, startedAt, overallRemaining, questions.length]);

  // accessibility: keyboard navigation (1-4 keys) to select option & left/right to change
  useEffect(() => {
    const handleKey = (e) => {
      if (!started) return;
      const key = e.key;
      if (/^[1-9]$/.test(key)) {
        const index = parseInt(key, 10) - 1;
        const opts = questions[currentIndex]?.options || [];
        if (opts[index]) {
          handleSelect(opts[index].trait);
        }
      }
      if (key === "ArrowRight") {
        // move next if possible (doesn't answer)
        setCurrentIndex((i) => Math.min(totalQuestions - 1, i + 1));
      }
      if (key === "ArrowLeft") {
        setCurrentIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, currentIndex, questions]);

  const currentQuestion = questions[currentIndex];

  // mark auto-advance unanswered
  const handleAutoAdvance = useCallback(() => {
    justAnsweredRef.current = false;
    // push an unanswered marker
    setAnswers((prev) => {
      const exists = prev.find((a) => a.questionId === currentQuestion?.id);
      if (exists) return prev; // already answered
      return [...prev, { questionId: currentQuestion?.id, selectedTrait: null, answeredAt: new Date() }];
    });

    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex((i) => i + 1);
    } else {
      // last question -> submit
      handleSubmit();
    }
  }, [currentIndex, currentQuestion, totalQuestions]);

  // select handler
  const handleSelect = async (trait) => {
    if (submitting) return;
    // record answer (replace if exists)
    setAnswers((prev) => {
      const filtered = prev.filter((p) => p.questionId !== currentQuestion.id);
      return [...filtered, { questionId: currentQuestion.id, selectedTrait: trait, answeredAt: new Date() }];
    });

    justAnsweredRef.current = true;

    // small delay to show selection then advance
    setTimeout(() => {
      if (currentIndex + 1 < totalQuestions) {
        setCurrentIndex((i) => i + 1);
      } else {
        handleSubmit();
      }
    }, 220);
  };

  // final submit
  const handleSubmit = useCallback(
    async (finalAnswers = null) => {
      if (submitting) return;
      setSubmitting(true);
      setError("");

      // collect final answers from state if not provided
      const payloadAnswers = (finalAnswers || answers).map((a) => ({
        questionId: a.questionId,
        selectedTrait: a.selectedTrait,
        answeredAt: a.answeredAt || new Date(),
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
          // mark done for 5 hours (or 30 seconds for quick dev)
          setItemWithExpiry(DONE_KEY, true, 5 * 60 * 60 * 1000);
          removeItem(STORAGE_KEY); // clear draft
          alert("🎉 آزمون با موفقیت ثبت شد!");
          navigate("/");
        } else {
          setError("ذخیره‌سازی نتایج انجام نشد. دوباره تلاش کنید.");
        }
      } catch (err) {
        console.error("submit error:", err);
        setError("⚠️ ارسال نتایج با خطا مواجه شد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.");
      } finally {
        if (isMountedRef.current) setSubmitting(false);
      }
    },
    [answers, navigate, submitting, user]
  );

  // start test
  const handleStart = () => {
    setStarted(true);
    setStartedAt(Date.now());
    startTimeRef.current = Date.now();
    setPerQuestionRemaining(perQuestionTime);
    setOverallRemaining(duration * 60);
  };

  // helper: format seconds as mm:ss
  const formatTime = (sec) => {
    if (sec == null) return "--:--";
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  // prevent starting test if already did it
  useEffect(() => {
    const done = getItemWithExpiry(DONE_KEY);
    if (done) {
      alert("شما قبلاً این آزمون را انجام داده‌اید.");
      navigate("/");
    }
  }, [navigate]);

  // small UI: progress percent
  const answeredCount = answers.length;
  const progressPercent = Math.round((answeredCount / Math.max(1, totalQuestions)) * 100);

  return (
    <div className="disc-test" dir="rtl" aria-live="polite">
      {!started ? (
        <div className="intro-box">
          <h2>به آزمون شخصیت‌شناسی دیسک خوش آمدید 🎯</h2>
          <p>این آزمون یک ارزیابی سریع است و برای درک ترجیحات رفتاری شما طراحی شده است.</p>
          <ul className="intro-list">
            <li>تعداد سوالات: {totalQuestions}</li>
            <li>زمان تقریبی کل: {duration} دقیقه</li>
            <li>زمان پیشنهادی برای هر سوال: {perQuestionTime} ثانیه</li>
          </ul>

          <div className="intro-actions">
            <button className="start-btn" onClick={handleStart}>شروع آزمون</button>
            <button
              className="cancel-btn"
              onClick={() => {
                navigate("/");
              }}
            >
              بازگشت
            </button>
          </div>
        </div>
      ) : (
        <div className="question-box">
          <div className="top-bar">
            <TopbarStatus
              duration={duration}
              started={started}
              currentIndex={currentIndex}
              totalQuestions={totalQuestions}
              handleSubmit={() => handleSubmit()}
              overallRemaining={overallRemaining}
              perQuestionRemaining={perQuestionRemaining}
              progressPercent={progressPercent}
            />
          </div>

          {error && <div className="error-banner" role="alert">{error}</div>}

          <div className="question-area" tabIndex={0}>
            <h3 className="question-text">{currentQuestion?.question || "سوال نامشخص"}</h3>

            <div className="timers">
              <div className="per-question-time">
                <div className="label">زمان سوال:</div>
                <div className="time">{formatTime(perQuestionRemaining)}</div>
                <div className="small muted">({perQuestionTime} ثانیه)</div>
              </div>

              <div className="overall-time">
                <div className="label">زمان باقیمانده کل:</div>
                <div className="time">{formatTime(overallRemaining)}</div>
              </div>
            </div>

            <div className="progress-bar-outer" aria-hidden>
              <div
                className="progress-bar-inner"
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>

            <div className="options" role="list" aria-label={`گزینه‌های سوال ${currentIndex + 1}`}>
              {currentQuestion?.options?.map((option, idx) => {
                // check if this question already answered
                const answeredForThis = answers.find((a) => a.questionId === currentQuestion.id);
                const isAnswered = !!answeredForThis;
                const selected = answeredForThis?.selectedTrait === option.trait;

                return (
                  <button
                    key={option.trait + idx}
                    className={`option-button ${selected ? "selected" : ""}`}
                    onClick={() => handleSelect(option.trait)}
                    disabled={submitting || isAnswered}
                    role="listitem"
                    aria-pressed={selected}
                    aria-disabled={submitting || isAnswered}
                    title={`کلید ${idx + 1}`}
                  >
                    <span className="option-index">{idx + 1}.</span>
                    <span className="option-text">{option.text}</span>
                  </button>
                );
              })}
            </div>

            <p className="progress-count">سؤال {currentIndex + 1} از {totalQuestions} — پاسخ داده شده: {answeredCount}</p>

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
                onClick={() => {
                  if (currentIndex + 1 < totalQuestions) setCurrentIndex((i) => i + 1);
                }}
                disabled={currentIndex + 1 >= totalQuestions}
                className="nav-btn"
                aria-label="سوال بعدی"
              >
                بعدی →
              </button>

              <button
                onClick={() => {
                  if (window.confirm("آیا می‌خواهید آزمون را ارسال کنید؟")) handleSubmit();
                }}
                className="submit-btn"
                disabled={submitting}
              >
                {submitting ? "در حال ارسال..." : "ارسال نهایی"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscTest;
