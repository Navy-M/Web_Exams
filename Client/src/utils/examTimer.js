export function calculateRemainingSeconds(deadlineAt, serverOffsetMs = 0, clientNow = Date.now()) {
  const deadline = new Date(deadlineAt).getTime();
  if (!Number.isFinite(deadline)) return 0;
  return Math.max(0, Math.ceil((deadline - (clientNow + serverOffsetMs)) / 1000));
}

export function calculateServerOffset(serverTime, clientNow = Date.now()) {
  const serverNow = new Date(serverTime).getTime();
  return Number.isFinite(serverNow) ? serverNow - clientNow : 0;
}

export function timerTone(remainingSeconds, durationLimitSeconds) {
  const ratio = durationLimitSeconds > 0 ? remainingSeconds / durationLimitSeconds : 0;
  if (ratio <= 0.05) return "critical";
  if (ratio <= 0.2) return "warning";
  return "normal";
}

export function createExpiryGuard(callback) {
  let handledSessionId = null;
  return {
    trigger(sessionId) {
      if (!sessionId || handledSessionId === sessionId) return false;
      handledSessionId = sessionId;
      callback();
      return true;
    },
    reset() {
      handledSessionId = null;
    },
  };
}
