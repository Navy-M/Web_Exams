import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import "../../styles/cliftonTest.css";
import { useAuth } from "../../context/AuthContext";
import { submitResult } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../../context/NotificationContext";
import { setItemWithExpiry, getItemWithExpiry, removeItem, scopedStorageKey } from "../../services/storage";
import TopbarStatus from "./TopbarStatus";
import { useReliableExamTimer } from "../../hooks/useReliableExamTimer";
import { useExamDraft } from "../../hooks/useExamDraft";

const STORAGE_KEY = "clifton_test_progress_v1";
const DONE_KEY = "cliftonTestDone";

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function CliftonTest({ questions, duration = 10, session }) {
  const { user } = useAuth() || {};
  const navigate = useNavigate();
  const { notify } = useNotification();
  const startTimeRef = useRef(new Date(session?.startedAt || Date.now()).getTime());
  const userId = user?.id || user?._id;
  const doneKey = scopedStorageKey(DONE_KEY, userId, "CLIFTON");
  const storageKey = scopedStorageKey(STORAGE_KEY, userId, "CLIFTON");

  const Clifton_Test = useMemo(() => (Array.isArray(questions) ? questions : []), [questions]);
  const total = Clifton_Test.length;

  const [currentIndex, setCurrentIndex] = useState(session?.currentIndex || 0);
  const [answers, setAnswers] = useState(() => Object.fromEntries((session?.answersDraft || []).map((item) => [item.questionId, item.choice])));
  const [started, setStarted] = useState(Boolean(session));
  const [blocked, setBlocked] = useState(() => !!getItemWithExpiry(doneKey));
  const submittingRef = useRef(false);
  const submitHandlerRef = useRef(null);
  const { remainingSeconds: timeLeft, tone } = useReliableExamTimer({ session, enabled: started && !blocked, onExpireRef: submitHandlerRef });
  const draftAnswers = useMemo(() => Object.entries(answers).map(([questionId, choice]) => ({ questionId: isNaN(Number(questionId)) ? questionId : Number(questionId), choice })), [answers]);
  useExamDraft({ sessionId: session?.sessionId, answers: draftAnswers, currentIndex, enabled: started && !blocked });

  const currentQ = Clifton_Test[currentIndex];
  const progressPercent = total ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  useEffect(() => {
    setBlocked(!!getItemWithExpiry(doneKey));
  }, [doneKey]);

  useEffect(() => {
    if (!blocked) return;
    notify("شما قبلاً این آزمون را انجام داده‌اید.", { type: "warning" });
    navigate("/dashboard");
  }, [blocked, navigate, notify]);

  // try resume
  useEffect(() => {
    if (blocked) return;
    const saved = getItemWithExpiry(storageKey);
    if (saved && saved.questionsHash === total) {
      if (window.confirm("پیش‌نویس آزمون کلیفتون پیدا شد. ادامه می‌دهید؟")) {
        setAnswers(saved.answers || {});
        setCurrentIndex(saved.currentIndex || 0);
        setStarted(saved.started || false);
        startTimeRef.current = new Date(session?.startedAt || saved.startedAt || Date.now()).getTime();
      } else {
        removeItem(storageKey);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

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
          questionsHash: total,
          savedAt: Date.now(),
        },
        6 * 60 * 60 * 1000 // 6h
      );
    }, 2000);
    return () => clearTimeout(id);
  }, [answers, blocked, currentIndex, started, storageKey, total]);

  const handleSelect = useCallback(
    (theme) => {
      const qid = currentQ?.id ?? `q_${currentIndex}`;
      setAnswers((prev) => ({ ...prev, [qid]: theme }));
      setTimeout(() => {
        if (currentIndex + 1 < total) setCurrentIndex((i) => i + 1);
        else submitHandlerRef.current?.();
      }, 180);
    },
    [currentIndex, currentQ?.id, total]
  );

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    const formattedAnswers = draftAnswers;

    const resultData = {
      user: user?.id || user?._id || null,
      testType: "CLIFTON",
      answers: formattedAnswers,
      score: 0,
      analysis: {},
      adminFeedback: "",
      startedAt: new Date(session?.startedAt || startTimeRef.current),
      submittedAt: new Date(),
      sessionId: session?.sessionId,
    };

    try {
      const result = await submitResult(resultData);
      if (result?.user || result?._id || result?.id) {
        notify("آزمون کلیفتون با موفقیت ثبت شد.", { type: "success" });
        setItemWithExpiry(doneKey, true, 24 * 60 * 60 * 1000); // 24h
        setBlocked(true);
        removeItem(storageKey);
        navigate("/dashboard");

      } else {
        notify("ذخیره‌سازی نتیجه انجام نشد.", { type: "error" });
        submittingRef.current = false;
      }
    } catch (error) {
      console.error("Clifton submission error:", error);
      notify("ارسال نتیجه با خطا مواجه شد.", { type: "error" });
      submittingRef.current = false;
    }
  }, [doneKey, draftAnswers, navigate, notify, session?.sessionId, session?.startedAt, storageKey, user?.id, user?._id]);
  submitHandlerRef.current = handleSubmit;

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
              startTimeRef.current = new Date(session?.startedAt || Date.now()).getTime();
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
              timerTone={tone}
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
