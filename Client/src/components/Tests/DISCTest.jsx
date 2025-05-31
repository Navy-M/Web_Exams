// components/DiscTest.jsx
import React, { useState } from "react";
import { Disc_Test } from "../../services/dummyData";
import "../../styles/DiscTest.css";

const DiscTest = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);

  const currentQuestion = discQuestions[currentIndex];

  const handleSelect = (trait) => {
    setAnswers([...answers, { id: currentQuestion.id, trait }]);

    if (currentIndex + 1 < discQuestions.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Finished all questions
      console.log("DISC Answers:", answers);
      alert("آزمون تمام شد!");
    }
  };

  return (
    <div className="disc-test">
      <div className="question-box">
        <h2>{currentQuestion.question}</h2>
        <div className="options">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              className="option-button"
              onClick={() => handleSelect(option.trait)}
            >
              {option.text}
            </button>
          ))}
        </div>
        <p className="progress">
          سؤال {currentIndex + 1} از {discQuestions.length}
        </p>
      </div>
    </div>
  );
};

export default DiscTest;
