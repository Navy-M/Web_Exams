import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calculateRemainingSeconds, calculateServerOffset, createExpiryGuard, timerTone } from "../utils/examTimer";

export function useReliableExamTimer({ session, enabled = true, onExpireRef }) {
  const offset = useMemo(
    () => calculateServerOffset(session?.serverTime),
    [session?.serverTime]
  );
  const calculate = useCallback(
    () => calculateRemainingSeconds(session?.deadlineAt, offset),
    [offset, session?.deadlineAt]
  );
  const [remainingSeconds, setRemainingSeconds] = useState(calculate);
  const expiryGuard = useRef(createExpiryGuard(() => onExpireRef?.current?.()));

  useEffect(() => {
    expiryGuard.current.reset();
    setRemainingSeconds(calculate());
  }, [calculate, session?.sessionId]);

  useEffect(() => {
    if (!enabled || !session?.deadlineAt) return undefined;
    const refresh = () => {
      const next = calculate();
      setRemainingSeconds(next);
      if (next === 0) expiryGuard.current.trigger(session.sessionId);
    };
    refresh();
    const timer = window.setInterval(refresh, 500);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [calculate, enabled, session?.deadlineAt, session?.sessionId]);

  return {
    remainingSeconds,
    tone: timerTone(remainingSeconds, session?.durationLimitSeconds || 0),
    expired: remainingSeconds === 0,
  };
}
