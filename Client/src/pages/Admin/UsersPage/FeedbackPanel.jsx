import React from "react";
import { useI18n } from "../../../i18n";

const FeedbackPanel = ({ show, value, onChange, onSubmit, onCancel }) => {
  const { t } = useI18n();

  if (!show) {
    return (
      <div className="feedback-readonly muted">
        {t("usersPage.feedback.readonly")}
      </div>
    );
  }

  return (
    <div className="feedback-panel">
      <h4>{t("usersPage.feedback.title")}</h4>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("usersPage.feedback.placeholder")}
        rows={4}
      />
      <div className="form-actions">
        <button className="btn primary" onClick={onSubmit}>
          {t("usersPage.feedback.submit")}
        </button>
        <button className="btn ghost" onClick={onCancel}>
          {t("usersPage.feedback.cancel")}
        </button>
      </div>
    </div>
  );
};

export default FeedbackPanel;
