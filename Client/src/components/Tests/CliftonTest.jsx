import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import "../../styles/cliftonTest.css";
import { useAuth } from "../../context/AuthContext";
import { submitResult } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { setItemWithExpiry, getItemWithExpiry, removeItem, scopedStorageKey } from "../../services/storage";
import TopbarStatus from "./TopbarStatus";

const STORAGE_KEY = "clifton_test_progress_v1";
const DONE_KEY = "cliftonTestDone";

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function CliftonTest({ questions, duration = 10 }) {
  const { user } = useAuth() || {};
  const navigate = useNavigate();
  const startTimeRef = useRef(Date.now());
  const userId = user?.id || user?._id;
  const doneKey = scopedStorageKey(DONE_KEY, userId, "CLIFTON");
  const storageKey = scopedStorageKey(STORAGE_KEY, userId, "CLIFTON");

  const Clifton_Test = useMemo(() => (Array.isArray(questions) ? questions : []), [questions]);
  const total = Clifton_Test.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [qid]: theme }
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [blocked, setBlocked] = useState(() => !!getItemWithExpiry(doneKey));
  const submittingRef = useRef(false);

  const currentQ = Clifton_Test[currentIndex];
  const progressPercent = total ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  useEffect(() => {
    setBlocked(!!getItemWithExpiry(doneKey));
  }, [doneKey]);

  useEffect(() => {
    if (!blocked) return;
    alert("You have already completed this test. Please try again in 24 hours.");
    navigate("/dashboard");
  }, [blocked, navigate]);

  // try resume
  useEffect(() => {
    if (blocked) return;
    const saved = getItemWithExpiry(storageKey);
    if (saved && saved.questionsHash === total) {
      if (window.confirm("پیش‌نویس آزمون کلیفتون پیدا شد. ادامه می‌دهید؟")) {
        setAnswers(saved.answers || {});
        setCurrentIndex(saved.currentIndex || 0);
        setStarted(saved.started || false);
        setTimeLeft(saved.timeLeft ?? duration * 60);
        startTimeRef.current = saved.startedAt || Date.now();
      } else {
        removeItem(storageKey);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

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

  // autosave (debounced)
  useEffect(() => {
    if (blocked || !started) return;
    const id = setTimeout(() => {
      setItemWithExpiry(
        storageKey,
        {
          answers,
          currentIndex,
          started: true,
          startedAt: startTimeRef.current,
          timeLeft,
          questionsHash: total,
          savedAt: Date.now(),
        },
        6 * 60 * 60 * 1000 // 6h
      );
    }, 2000);
    return () => clearTimeout(id);
  }, [answers, currentIndex, started, timeLeft, total]);

  const handleSelect = useCallback(
    (theme) => {
      const qid = currentQ?.id ?? `q_${currentIndex}`;
      setAnswers((prev) => ({ ...prev, [qid]: theme }));
      setTimeout(() => {
        if (currentIndex + 1 < total) setCurrentIndex((i) => i + 1);
        else handleSubmit();
      }, 180);
    },
    [currentIndex, currentQ?.id, total]
  );

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    const formattedAnswers = Object.entries(answers).map(([questionId, choice]) => ({
      questionId: isNaN(Number(questionId)) ? questionId : Number(questionId),
      choice,
    }));

    const resultData = {
      user: user?.id || user?._id || null,
      testType: "CLIFTON",
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
        alert("🎉 آزمون کلیفتون با موفقیت ثبت شد!");
        setItemWithExpiry(doneKey, true, 24 * 60 * 60 * 1000); // 24h
        setBlocked(true);
        removeItem(storageKey);
        navigate("/dashboard");

      } else {
        alert("❌ ذخیره‌سازی نتایج انجام نشد!");
        submittingRef.current = false;
      }
    } catch (error) {
      console.error("Clifton submission error:", error);
      alert("⚠️ ارسال نتایج با خطا مواجه شد.");
      submittingRef.current = false;
    }
  }, [answers, doneKey, navigate, storageKey, user?.id, user?._id]);

  if (blocked) {
    return null;
  }

  if (!total) {
    return (
      <div className="clifton-test">
        <div className="intro-box">
          <h2>آزمون کلیفتون</h2>
          <p>سوالی برای نمایش وجود ندارد.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="clifton-test" role="main" aria-live="polite">
      {!started ? (
        <div className="intro-box">
          <p>این آزمون به شما کمک می‌کند توانایی‌ها و علایق شغلی خود را بهتر بشناسید</p>
          <h2>💼</h2>
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

          <div className="question-card" key={currentQ?.id ?? currentIndex}>
            {/* <h3 className="question-text">{currentQ?.question || currentQ?.text || "سؤال"}</h3> */}

            <div className="options-grid two-col" role="listbox" aria-label="گزینه‌ها">
              <button
                type="button"
                className={`option-button ${answers[currentQ?.id] === currentQ?.theme_a ? "selected" : ""}`}
                onClick={() => handleSelect(currentQ?.theme_a)}
                aria-pressed={answers[currentQ?.id] === currentQ?.theme_a}
                title="کلید 1"
              >
                {currentQ?.statement_a}
              </button>
              <button
                type="button"
                className={`option-button ${answers[currentQ?.id] === currentQ?.theme_b ? "selected" : ""}`}
                onClick={() => handleSelect(currentQ?.theme_b)}
                aria-pressed={answers[currentQ?.id] === currentQ?.theme_b}
                title="کلید 2"
              >
                {currentQ?.statement_b}
              </button>
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
