import { useMemo } from "react";
import { useI18n } from "../../i18n";
import "../../styles/test-Card.css";

const TestCard = ({ test, onStart }) => {
  const { t } = useI18n();

  const formatDate = (time) =>
    new Date(time).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const nameKey = `tests.catalog.${test.id}.name`;
  const descriptionKey = `tests.catalog.${test.id}.description`;

  const name = useMemo(() => {
    const translated = t(nameKey);
    return translated === nameKey ? test.name : translated;
  }, [t, nameKey, test.name]);

  const description = useMemo(() => {
    const translated = t(descriptionKey);
    return translated === descriptionKey ? test.description : translated;
  }, [t, descriptionKey, test.description]);

  const deadlineLabel = test.deadline
    ? t("tests.card.deadline", { date: formatDate(test.deadline) })
    : "";

  const durationLabel =
    test.duration?.from && test.duration?.to
      ? t("tests.card.duration", { from: test.duration.from, to: test.duration.to })
      : t("starterTest.durationUnknown");

  return (
    <div className="test-card">
      <h3>{name}</h3>
      <p className="test-description">{description}</p>
      <div className="test-meta">
        {deadlineLabel && <span className="deadline">{deadlineLabel}</span>}
        <span className="duration">{durationLabel}</span>
      </div>
      <div className="test-actions">
        <button onClick={onStart} className="start-button">
          {t("tests.card.start")}
        </button>
      </div>
    </div>
  );
};

export default TestCard;
