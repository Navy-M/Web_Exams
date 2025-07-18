import React from "react";
import { Test_Cards } from "../../services/dummyData"; // Adjust path as needed
import "../../styles/TestCardGrid.css"; // Optional for styling
import { useAuth } from "../../context/AuthContext";




const TestResultCardGrid = ({ onSelectTest }) => {
  const {user} = useAuth();

  return (
    <div className="test-card-grid">
      {user.testsAssigned.map((test) => (
        <div key={test._id} className="test-card" 
        onClick={() => onSelectTest(test.resultId)}
        >
          <h3>{Test_Cards.find(tc => tc.id === test.testType).name}</h3>
          <p>{new Date(test.completedAt).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <span className="tag">{Test_Cards.find(tc => tc.id === test.testType).type}</span>
        </div>
      ))}
    </div>
  );
};

export default TestResultCardGrid;
