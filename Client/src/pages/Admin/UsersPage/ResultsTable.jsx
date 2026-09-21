import { BarChart3, CalendarDays, Clock3, Eye, MessageSquareText, Trash2 } from "lucide-react";

function formatDuration(result) {
  const seconds = Number(result.durationInSeconds ?? result.duration ?? 0);
  if (!Number.isFinite(seconds) || seconds <= 0) return "-";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export default function ResultsTable({ results = [], formatDate, onDelete, onSelectResult, onAnalyze, onRemoveAnalysis, selectedResultId, busy = false }) {
  const analyzed = results.filter((item) => item.analyzedAt || Object.keys(item.analysis || {}).length).length;
  const published = results.filter((item) => item.isPublic).length;

  return (
    <section className="results-section card" dir="rtl">
      <div className="results-header">
        <h3>سوابق آزمون‌ها</h3>
        <div className="results-meta">
          <span className="results-meta__item total">{results.length} آزمون</span>
          <span className="results-meta__item analyzed">{analyzed} تحلیل‌شده</span>
          <span className="results-meta__item feedback">{published} منتشرشده</span>
        </div>
      </div>
      {results.length ? <div className="result-history-grid">
        {results.map((result, index) => {
          const id = result.resultId || result._id;
          const hasAnalysis = Boolean(result.analyzedAt || Object.keys(result.analysis || {}).length);
          const hasFeedback = Boolean(result.adminFeedback);
          const selected = String(selectedResultId || "") === String(id || "");
          const status = result.isPublic ? "منتشرشده" : hasAnalysis ? "تحلیل‌شده" : "در انتظار تحلیل";
          return <article className={`result-history-card${selected ? " selected" : ""}`} key={id || index}>
            <header><div><strong>{result.testType}</strong><span>تلاش {index + 1}</span></div><span className={`status-pill ${result.isPublic ? "feedbackSent" : hasAnalysis ? "analysisReady" : "pending"}`}>{status}</span></header>
            <div className="result-history-facts">
              <span><CalendarDays size={15} />{formatDate(result.submittedAt || result.completedAt || result.createdAt)}</span>
              <span><Clock3 size={15} />{formatDuration(result)}</span>
              <span><BarChart3 size={15} />امتیاز: {Number.isFinite(Number(result.score)) ? Math.round(Number(result.score) * 100) / 100 : "-"}</span>
              <span><MessageSquareText size={15} />{hasFeedback ? "دارای بازخورد" : "بدون بازخورد"}</span>
            </div>
            <div className="results-actions">
              {!hasAnalysis && <button className="btn primary" type="button" disabled={busy || !id} onClick={() => onAnalyze(result)}>تحلیل</button>}
              {hasAnalysis && <button className="btn outline" type="button" disabled={busy || !id} onClick={() => onSelectResult(id)}><Eye size={15} /> مشاهده تحلیل</button>}
              {hasAnalysis && <button className="btn warning" type="button" disabled={busy || !id} onClick={() => onRemoveAnalysis(id)}>حذف تحلیل</button>}
              {!hasFeedback && <button className="btn ghost" type="button" disabled={busy || !id} onClick={() => onSelectResult(id)}><MessageSquareText size={15} /> بازخورد</button>}
              <button className="btn danger" type="button" aria-label="حذف نتیجه" disabled={busy || !id} onClick={() => onDelete(id)}><Trash2 size={15} /></button>
            </div>
          </article>;
        })}
      </div> : <p className="muted">سابقه آزمونی ثبت نشده است.</p>}
    </section>
  );
}
