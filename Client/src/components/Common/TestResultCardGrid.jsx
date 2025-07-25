import React from "react";
import { Test_Cards } from "../../services/dummyData";
import "../../styles/TestCardGrid.css";
import { useAuth } from "../../context/AuthContext";

const TestResultCardGrid = ({ onSelectTest }) => {
  const { user } = useAuth();

  return (
    <div className="test-card-grid">
      {user?.testsAssigned?.map((test) => {
        const testCard = Test_Cards.find((tc) => tc.id === test.testType);

        return (
          <div
            key={test._id}
            className="test-card"
            onClick={() => onSelectTest(test.resultId)}
          >
            <h3>{testCard?.name || "نوع ناشناخته"}</h3>
            <p>
              {test.completedAt
                ? new Date(test.completedAt).toLocaleString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "تاریخ نامشخص"}
            </p>
            <span className="tag">{testCard?.type || "بدون نوع"}</span>
          </div>
        );
      })}
    </div>
  );
};

export default TestResultCardGrid;
