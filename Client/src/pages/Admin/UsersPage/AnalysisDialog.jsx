import { useEffect, useState } from "react";
import { Printer, RefreshCw, Trash2, X } from "lucide-react";
import ShowAnalysis from "../../../components/Common/ShowAnalysis";
import FeedbackPanel from "./FeedbackPanel";

const tabs = [
  ["summary", "خلاصه"], ["charts", "نمودارها"], ["analysis", "تحلیل کامل"],
  ["answers", "پاسخ‌ها"], ["feedback", "بازخورد ادمین"],
];

export default function AnalysisDialog({ result, busy, feedback, onFeedbackChange, onFeedbackSubmit, onAnalyze, onClear, onClose }) {
  const [tab, setTab] = useState("summary");
  useEffect(() => {
    if (!result) return undefined;
    const onKey = (event) => event.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose, result]);
  if (!result) return null;
  const analysis = result.analysis || {};
  const traits = analysis.traits || analysis.dominantTraits || analysis.strengths || [];
  return <div className="analysis-dialog-backdrop" role="dialog" aria-modal="true" aria-label={`تحلیل ${result.testType}`}>
    <div className="analysis-dialog">
      <header className="analysis-dialog-header"><div><h2>{result.testType}</h2><p>{analysis.summary || "خلاصه تحلیل هنوز ثبت نشده است."}</p></div><button className="icon-btn" type="button" aria-label="بستن" onClick={onClose}><X /></button></header>
      <div className="analysis-dialog-actions">
        <button className="btn outline" type="button" disabled={busy} onClick={() => onAnalyze(result)}><RefreshCw size={15} /> تحلیل مجدد</button>
        <button className="btn warning" type="button" disabled={busy} onClick={() => onClear(result._id || result.resultId)}><Trash2 size={15} /> پاک‌کردن تحلیل</button>
        <button className="btn ghost" type="button" onClick={() => window.print()}><Printer size={15} /> چاپ</button>
      </div>
      <nav className="analysis-dialog-tabs" aria-label="بخش‌های تحلیل">{tabs.map(([key, label]) => <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}</nav>
      <div className="analysis-dialog-content">
        {tab === "summary" && <div className="analysis-summary"><div><span>نوع آزمون</span><strong>{result.testType}</strong></div><div><span>امتیاز</span><strong>{Number.isFinite(Number(result.score)) ? result.score : "-"}</strong></div><div className="analysis-summary-wide"><span>ویژگی‌های اصلی</span><p>{Array.isArray(traits) && traits.length ? traits.slice(0, 5).map((item) => typeof item === "string" ? item : item.name || item.label).filter(Boolean).join("، ") : "داده‌ای ثبت نشده است."}</p></div></div>}
        {tab === "charts" && <ShowAnalysis testType={result.testType} analysisData={analysis} />}
        {tab === "analysis" && <div className="analysis-text"><p>{analysis.summary || "تحلیل متنی موجود نیست."}</p>{Array.isArray(analysis.recommendations) && <ul>{analysis.recommendations.map((item, index) => <li key={index}>{typeof item === "string" ? item : item.text || item.title}</li>)}</ul>}</div>}
        {tab === "answers" && <div className="answer-list">{(result.answers || []).map((answer, index) => <div key={index}><strong>{answer.questionId ?? index + 1}</strong><span>{String(answer.value ?? answer.answer ?? answer.choice ?? answer.selectedTrait ?? "-")}</span></div>)}</div>}
        {tab === "feedback" && <FeedbackPanel show={!result.adminFeedback} value={feedback} onChange={onFeedbackChange} onSubmit={onFeedbackSubmit} onCancel={onClose} />}
      </div>
    </div>
  </div>;
}
