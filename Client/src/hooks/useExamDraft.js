import { useEffect } from "react";
import { saveExamDraft } from "../services/api";

export function useExamDraft({ sessionId, answers, currentIndex, enabled = true }) {
  useEffect(() => {
    if (!enabled || !sessionId) return undefined;
    const timer = window.setTimeout(() => {
      saveExamDraft(sessionId, answers, currentIndex).catch(() => {
        // Local draft remains available; the next answer change retries the server save.
      });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [answers, currentIndex, enabled, sessionId]);
}
