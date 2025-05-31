// components/GardnerTest.jsx
import React, { useState } from "react";
import { Gardner_Test } from "../../services/dummyData";
import "../../styles/GardnerTest.css";

const GardnerTest = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);

  const currentQuestion = Gardner_Test[currentIndex];

  const handleAnswer = (choice) => {
    setAnswers([...answers, { id: currentQuestion.id, answer: choice }]);

    if (currentIndex + 1 < Gardner_Test.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      console.log("Gardner Test Results:", answers);
      alert("آزمون گاردنر به پایان رسید!");
      // You could show detailed results here
    }
  };

  return (
    <div className="gardner-test">
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
          سؤال {currentIndex + 1} از {Gardner_Test.length}
        </p>
      </div>
    </div>
  );
};

export default GardnerTest;
