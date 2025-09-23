import React, { useState } from "react";
import TestResultCardGrid from "../../../components/common/TestResultCardGrid";

const TestsPage = () => {
  const [selectedTestId, setSelectedTestId] = useState(null);

  const handleSelectTest = (testId) => {
    console.log("Selected Test ID:", testId);
    setSelectedTestId(testId);
    // navigate to that test screen or load questions
  };

  return (
    <div>
      {!selectedTestId ? (
        <TestResultCardGrid onSelectTest={handleSelectTest} />
      ) : (
        <div>Start Test ID: {selectedTestId}</div>
        // Load the actual test component based on selectedTestId
      )}
    </div>
  );
};

export default TestsPage;
