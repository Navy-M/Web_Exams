import React from "react";
import { useI18n } from "../../../i18n";

const ResultsTable = ({
  results,
  formatDate,
  onDelete,
  onSelectResult,
  onAnalyze,
  selectedResultId,
}) => {
  const { t } = useI18n();

  return (
    <section className="results-section card">
      <h3>{t("usersPage.results.title")}</h3>

      {results?.length ? (
        <div className="table-wrap">
          <table className="results-table">
            <thead>
              <tr>
                <th>{t("usersPage.results.headers.testType")}</th>
                <th>{t("usersPage.results.headers.completedAt")}</th>
                <th>{t("usersPage.results.headers.duration")}</th>
                <th>{t("usersPage.results.headers.feedback")}</th>
                <th>{t("usersPage.results.headers.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const disabled = !!selectedResultId;
                const duration = r.duration
                  ? `${r.duration} ${t("usersPage.results.durationUnit")}`
                  : "--";

                return (
                  <tr key={r._id || r.resultId}>
                    <td>{r.testType}</td>
                    <td>{r.completedAt ? formatDate(r.completedAt) : t("usersPage.profile.missing")}</td>
                    <td>{duration}</td>
                    <td>{r.adminFeedback || t("usersPage.results.noFeedback")}</td>
                    <td className="actions">
                      <button
                        className="btn danger"
                        style={{color: "red"}}

                        disabled={disabled}
                        onClick={() => onDelete(r.resultId || r._id)}
                      >
                        {t("usersPage.results.delete")}
                      </button>

                      {!r?.adminFeedback && (
                        <button
                        style={{color: "var(--text)"}}
                          className="btn ghost"
                          disabled={disabled}
                          onClick={() => onSelectResult(r.resultId || r._id)}
                        >
                          {t("usersPage.results.feedback")}
                        </button>
                      )}

                      {!r?.analyzedAt ? (
                        <button
                          className="btn outline"
                          disabled={disabled}
                          onClick={() => onAnalyze(r)}
                        >
                          {t("usersPage.results.analyze")}
                        </button>
                      ) : (
                        <button
                        style={{color: "var(--text)"}}
                          className="btn outline"
                          disabled={disabled}
                          onClick={() => onSelectResult(r.resultId || r._id)}
                        >
                          {t("usersPage.results.viewAnalysis")}
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
        <p className="muted">{t("usersPage.results.noData")}</p>
      )}
    </section>
  );
};

export default ResultsTable;
