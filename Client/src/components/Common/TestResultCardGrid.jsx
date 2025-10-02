import React from "react";
import { Test_Cards } from "../../services/dummyData";
import "../../styles/TestCardGrid.css";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../i18n";

const TestResultCardGrid = ({ onSelectTest }) => {
  const { user } = useAuth();
  const { t } = useI18n();

  const formatDate = (time) =>
    new Date(time).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="test-card-grid">
      {user?.testsAssigned?.map((test) => {
        const id = test.testType;
        const testCard = Test_Cards.find((tc) => tc.id === id);

        const nameKey = `tests.catalog.${id}.name`;
        const typeKey = `tests.catalog.${id}.type`;

        const translatedName = t(nameKey);
        const name = translatedName === nameKey
          ? testCard?.name || t("tests.card.unknownName")
          : translatedName;

        const translatedType = t(typeKey);
        const type = translatedType === typeKey
          ? testCard?.type || t("tests.card.unknownType")
          : translatedType;

        return (
          <div
            key={test._id || test.resultId}
            className="test-card"
            onClick={() => onSelectTest(test.resultId || test._id)}
          >
            <h3>{name}</h3>
            <p>
              {test.completedAt
                ? t("tests.results.completedAt", { date: formatDate(test.completedAt) })
                : t("tests.results.pending")}
            </p>
            <span className="tag">{type}</span>
          </div>
        );
      })}
    </div>
  );
};

export default TestResultCardGrid;
