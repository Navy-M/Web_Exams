import React from "react";
import { useI18n } from "../../../i18n";

const ResultsTable = ({
  results,
  formatDate,
  onDelete,
  onSelectResult,
  onAnalyze,
  onRemoveAnalysis,
  selectedResultId,
}) => {
  const { t } = useI18n();

  const resolveLabel = (key, params, fallbackText) => {
    const value = t(key, params);
    if (!value || value === key) return fallbackText;
    return value;
  };

  const total = results?.length || 0;
  const analyzedCount = (results || []).filter((r) => !!r?.analyzedAt).length;
  const feedbackCount = (results || []).filter((r) => !!r?.adminFeedback).length;
  const pendingCount = total - analyzedCount;

  const statusLabels = {
    pending: resolveLabel(
      "usersPage.results.status.pending",
      undefined,
      "Pending analysis"
    ),
    analysisReady: resolveLabel(
      "usersPage.results.status.analysisReady",
      undefined,
      "Analysis ready"
    ),
    feedbackSent: resolveLabel(
      "usersPage.results.status.feedbackSent",
      undefined,
      "Feedback shared"
    ),
  };

  const metaLabels = {
    total: resolveLabel(
      "usersPage.results.meta.total",
      { count: total },
      `${total} results`
    ),
    analyzed: resolveLabel(
      "usersPage.results.meta.analyzed",
      { count: analyzedCount },
      `${analyzedCount} analyzed`
    ),
    pending: resolveLabel(
      "usersPage.results.meta.pending",
      { count: pendingCount },
      `${pendingCount} pending`
    ),
    feedback: resolveLabel(
      "usersPage.results.meta.feedback",
      { count: feedbackCount },
      `${feedbackCount} with feedback`
    ),
  };

  return (
    <section className="results-section card">
      <div className="results-header">
        <h3>{t("usersPage.results.title")}</h3>
        {total > 0 && (
          <div className="results-meta">
            <span className="results-meta__item total">{metaLabels.total}</span>
            <span className="results-meta__item analyzed">
              {metaLabels.analyzed}
            </span>
            <span className="results-meta__item pending">
              {metaLabels.pending}
            </span>
            <span className="results-meta__item feedback">
              {metaLabels.feedback}
            </span>
          </div>
        )}
      </div>

      {total ? (
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
              {results.map((r, index) => {
                const rowId = r.resultId || r._id;
                const rowKey = rowId || index;
                const isSelected = selectedResultId === rowId;
                const hasId = Boolean(rowId);
                const lockOthers = !!selectedResultId && !isSelected;
                const disabled = !hasId || lockOthers;
                const durationSeconds = Number(r.duration);
                const hasAnalysis =
                  !!r?.analyzedAt ||
                  (r?.analysis &&
                    typeof r.analysis === "object" &&
                    Object.keys(r.analysis).length > 0);
                const hasFeedback = !!r?.adminFeedback;
                const statusKey = hasAnalysis
                  ? hasFeedback
                    ? "feedbackSent"
                    : "analysisReady"
                  : "pending";
                const statusClass = `status-pill ${statusKey}`;
                const statusLabel = statusLabels[statusKey];
                const duration =
                  Number.isFinite(durationSeconds) && durationSeconds > 0
                    ? `${Math.round(durationSeconds / 60)} ${
                        resolveLabel(
                          "usersPage.results.durationUnitMinutes",
                          undefined,
                          resolveLabel(
                            "usersPage.results.durationUnit",
                            undefined,
                            "mins"
                          )
                        )
                      }`
                    : "--";

                return (
                  <tr key={rowKey} className={isSelected ? "selected" : ""}>
                    <td data-label={t("usersPage.results.headers.testType")}>
                      <div className="result-test">
                        <span className="result-test__name">{r.testType}</span>
                      </div>
                    </td>
                    <td data-label={t("usersPage.results.headers.completedAt")}>
                      {r.completedAt
                        ? formatDate(r.completedAt)
                        : t("usersPage.profile.missing")}
                    </td>
                    <td data-label={t("usersPage.results.headers.duration")}>
                      {duration}
                    </td>
                    <td data-label={t("usersPage.results.headers.feedback")}>
                      <div className="result-status">
                        <span className={statusClass}>{statusLabel}</span>
                        <span className="feedback-text">
                          {r.adminFeedback || t("usersPage.results.noFeedback")}
                        </span>
                      </div>
                    </td>
                    <td
                      className="actions"
                      data-label={t("usersPage.results.headers.actions")}
                    >
                      <div className="results-actions">
                        {!hasAnalysis && (
                          <button
                            className="btn outline"
                            disabled={!hasId || lockOthers}
                            onClick={() => onAnalyze(r)}
                          >
                            {t("usersPage.results.analyze")}
                          </button>
                        )}

                        {hasAnalysis && (
                          <>
                            <button
                              className="btn warning"
                              disabled={disabled}
                              onClick={() => hasId && onRemoveAnalysis?.(rowId)}
                            >
                              {t("usersPage.results.deleteAnalysis")}
                            </button>

                            <button
                              className="btn outline"
                              style={{ color: "var(--text)" }}
                              disabled={disabled}
                              onClick={() => hasId && onSelectResult(rowId)}
                            >
                              {t("usersPage.results.viewAnalysis")}
                            </button>
                          </>
                        )}

                        {!hasFeedback && (
                          <button
                            className="btn ghost"
                            style={{ color: "var(--text)" }}
                            disabled={disabled}
                            onClick={() => hasId && onSelectResult(rowId)}
                          >
                            {t("usersPage.results.feedback")}
                          </button>
                        )}

                        <button
                          className="btn danger"
                          style={{ color: "red" }}
                          disabled={disabled}
                          onClick={() => hasId && onDelete(rowId)}
                        >
                          {t("usersPage.results.delete")}
                        </button>
                      </div>
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
