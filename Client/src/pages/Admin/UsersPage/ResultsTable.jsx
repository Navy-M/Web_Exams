import React from "react";

const ResultsTable = ({
  results,
  formatDate,
  onDelete,
  onSelectResult,
  onAnalyze,
  selectedResultId,
}) => {
  return (
    <section className="results-section card">
      <h3>لیست نتایج ارسال شده</h3>

      {results?.length ? (
        <div className="table-wrap">
          <table className="results-table">
            <thead>
              <tr>
                <th>نام تست</th>
                <th>تاریخ انجام</th>
                <th>مدت زمان</th>
                <th>بازخورد</th>
                <th>اقدامات</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const disabled = !!selectedResultId;
                return (
                  <tr key={r._id || r.resultId}>
                    <td>{r.testType}</td>
                    <td>{r.completedAt ? formatDate(r.completedAt) : "—"}</td>
                    <td>{r.duration || "--"} ثانیه</td>
                    <td>{r.adminFeedback || "بدون بازخورد"}</td>
                    <td className="actions">
                      <button
                        className="btn danger"
                        disabled={disabled}
                        onClick={() => onDelete(r.resultId || r._id)}
                      >
                        حذف آزمون
                      </button>

                      {!r?.adminFeedback && (
                        <button
                          className="btn ghost"
                          disabled={disabled}
                          onClick={() => onSelectResult(r.resultId)}
                        >
                          ثبت بازخورد
                        </button>
                      )}

                      {!r?.analyzedAt ? (
                        <button
                          className="btn outline"
                          disabled={disabled}
                          onClick={() => onAnalyze(r)}
                        >
                          تصحیح
                        </button>
                      ) : (
                        <button
                          className="btn outline"
                          disabled={disabled}
                          onClick={() => onSelectResult(r.resultId)}
                        >
                          مشاهده نتایج
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">نتیجه‌ای برای نمایش وجود ندارد</p>
      )}
    </section>
  );
};

export default ResultsTable;
