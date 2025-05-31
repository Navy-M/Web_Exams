import React from "react";
import { Test_Cards } from "../../services/dummyData"; // Adjust path as needed
import "../../styles/TestCardGrid.css"; // Optional for styling

const TestCardGrid = ({ onSelectTest }) => {
  return (
    <div className="test-card-grid">
      {Test_Cards.map((test) => (
        <div key={test.id} className="test-card" onClick={() => onSelectTest(test.id)}>
          <h3>{test.name}</h3>
          <p>{test.description}</p>
          <span className="tag">{test.type}</span>
        </div>
      ))}
    </div>
  );
};

export default TestCardGrid;
