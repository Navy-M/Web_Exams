import { CalendarDays, CheckCircle2, Clock3, Eye } from "lucide-react";
import { Test_Cards } from "../../services/dummyData";
import "../../styles/TestCardGrid.css";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../i18n";

export default function TestResultCardGrid({ onSelectTest, results }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const tests = Array.isArray(results) ? results : user?.testsAssigned || [];
  const formatDate = (time) => time ? new Date(time).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" }) : "-";

  return <div className="test-card-grid">
    {tests.map((test) => {
      const id = test.testType;
      const catalog = Test_Cards.find((item) => item.id === id);
      const nameKey = `tests.catalog.${id}.name`;
      const translated = t(nameKey);
      const name = translated === nameKey ? catalog?.name || id : translated;
      const analyzed = Boolean(test.analyzedAt || test.score != null);
      const published = test.isPublic === true;
      const status = published ? "منتشرشده" : analyzed ? "در انتظار انتشار" : "در انتظار تحلیل";
      const resultId = test.resultId || test._id;
      return <article key={resultId} className="test-card user-history-card">
        <header><h3>{name}</h3><span className={`history-status ${published ? "published" : analyzed ? "analyzed" : "pending"}`}>{status}</span></header>
        <div className="history-card-meta"><span><CalendarDays size={15} />{formatDate(test.completedAt || test.submittedAt)}</span><span><Clock3 size={15} />{test.duration ? `${Math.floor(test.duration / 60)} دقیقه` : "-"}</span>{analyzed && <span><CheckCircle2 size={15} />امتیاز: {test.score ?? "-"}</span>}</div>
        <button type="button" className="ui-btn outline" disabled={!published || !resultId} onClick={() => published && onSelectTest(resultId)}><Eye size={16} />{published ? "مشاهده تحلیل" : "تحلیل هنوز منتشر نشده"}</button>
      </article>;
    })}
  </div>;
}
