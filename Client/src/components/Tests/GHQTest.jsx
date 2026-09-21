import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import "../../styles/GHQTest.css";
import { useAuth } from "../../context/AuthContext";
import { submitResult } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../../context/NotificationContext";
import TopbarStatus from "./TopbarStatus";
import { getItemWithExpiry, scopedStorageKey, setItemWithExpiry } from "../../services/storage";
import { useReliableExamTimer } from "../../hooks/useReliableExamTimer";
import { useExamDraft } from "../../hooks/useExamDraft";

const DONE_KEY = "ghqTestDone";

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function GHQTest({ questions, duration = 8, session }) {
  const { user } = useAuth() || {};
  const navigate = useNavigate();
  const { notify } = useNotification();
  const startTimeRef = useRef(new Date(session?.startedAt || Date.now()).getTime());
  const userId = user?.id || user?._id;
  const doneKey = scopedStorageKey(DONE_KEY, userId, "GHQ");

  const Ghq_Test = useMemo(() => (Array.isArray(questions) ? questions : []), [questions]);
  const total = Ghq_Test.length;

  const [currentIndex, setCurrentIndex] = useState(session?.currentIndex || 0);
  const [answers, setAnswers] = useState(() => Object.fromEntries((session?.answersDraft || []).map((item) => [item.questionId, item.value])));
  const [started, setStarted] = useState(Boolean(session));
  const [blocked, setBlocked] = useState(() => !!getItemWithExpiry(doneKey));
  const submittingRef = useRef(false);
  const submitHandlerRef = useRef(null);
  const { remainingSeconds: timeLeft, tone } = useReliableExamTimer({ session, enabled: started && !blocked, onExpireRef: submitHandlerRef });
  const draftAnswers = useMemo(() => Object.entries(answers).map(([questionId, value]) => ({ questionId: isNaN(Number(questionId)) ? questionId : Number(questionId), value })), [answers]);
  useExamDraft({ sessionId: session?.sessionId, answers: draftAnswers, currentIndex, enabled: started && !blocked });

  const currentQuestion = Ghq_Test[currentIndex];
  const progressPercent = total ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  useEffect(() => {
    setBlocked(!!getItemWithExpiry(doneKey));
  }, [doneKey]);

  useEffect(() => {
    if (!blocked) return;
    notify("شما قبلاً این آزمون را انجام داده‌اید.", { type: "warning" });
    navigate("/dashboard");
  }, [blocked, navigate, notify]);

  const handleSelect = useCallback(
    (questionId, value) => {
      const numeric = Number.isFinite(Number(value)) ? Number(value) : parseInt(value, 10) || 0;
      setAnswers((prev) => ({ ...prev, [questionId]: numeric }));

      setTimeout(() => {
        if (currentIndex + 1 < total) setCurrentIndex((i) => i + 1);
        else submitHandlerRef.current?.();
      }, 180);
    },
    [currentIndex, total]
  );

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    const formattedAnswers = draftAnswers;

    const resultData = {
      user: user?.id || user?._id || null,
      testType: "GHQ",
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
        notify("آزمون سلامت عمومی با موفقیت ثبت شد.", { type: "success" });
        setItemWithExpiry(doneKey, true, 24 * 60 * 60 * 1000);
        setBlocked(true);
        navigate("/dashboard");

      } else {
        notify("ذخیره‌سازی نتیجه انجام نشد.", { type: "error" });
        submittingRef.current = false;
      }
    } catch (err) {
      console.error("GHQ submission error:", err);
      notify("ارسال نتیجه با خطا مواجه شد.", { type: "error" });
      submittingRef.current = false;
    }
  }, [doneKey, draftAnswers, navigate, notify, session?.sessionId, session?.startedAt, user?.id, user?._id]);
  submitHandlerRef.current = handleSubmit;

  if (blocked) {
    return null;
  }

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
          <h2>GHQ</h2>
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

