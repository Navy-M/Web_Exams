// components/HalandTest.jsx
import React, { useState } from "react";
import { Haland_Test } from "../../services/dummyData";
import "../../styles/halandTest.css";

const HalandTest = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);

  const currentQuestion = Haland_Test[currentIndex];

  const handleAnswer = (choice) => {
    setAnswers([...answers, { id: currentQuestion.id, answer: choice }]);

    if (currentIndex + 1 < Haland_Test.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      console.log("Haland Test Answers:", answers);
      alert("آزمون هالند تمام شد!");
      // You could navigate to a results page or show results here
    }
  };

  return (
    <div className="haland-test">
      <div className="question-card">
        <h2>{currentQuestion.text}</h2>
        <div className="options">
          {currentQuestion.options.map((option, idx) => (
            <button
              key={idx}
              className="option-button"
              onClick={() => handleAnswer(option)}
            >
              {option}
            </button>
          ))}
        </div>
        <p className="progress">
          سؤال {currentIndex + 1} از {Haland_Test.length}
        </p>
      </div>
    </div>
  );
};

export default HalandTest;
