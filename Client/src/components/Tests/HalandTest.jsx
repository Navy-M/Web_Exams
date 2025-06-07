import React, { useState, useRef } from "react";
import { Haland_Test } from "../../services/dummyData";
import "../../styles/halandTest.css";
import { useAuth } from "../../context/AuthContext";
import { submitResult } from "../../services/api";

const HalandTest = () => {
  const { user } = useAuth();
  const startTimeRef = useRef(Date.now());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);

  const currentQuestion = Haland_Test[currentIndex];

  const handleAnswer = async (choice) => {
    const updatedAnswers = [
      ...answers,
      {
        questionId: currentQuestion.id,
        selectedOption: choice,
        score: 1, // Customize scoring if needed
      },
    ];
    setAnswers(updatedAnswers);

    if (currentIndex + 1 < Haland_Test.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const resultData = {
        user: user.id,
        testType: "HALAND",
        answers: updatedAnswers,
        otherResult: [],
        adminFeedback: "",
        startedAt: new Date(startTimeRef.current),
        submittedAt: new Date(),
      };

      try {
        const result = await submitResult(resultData);
        console.log("Haland Test Result saved:", result);
        alert("آزمون هالند با موفقیت ثبت شد!");
      } catch (err) {
        console.error("Submission error:", err);
        alert("خطا در ثبت نتیجه آزمون هالند");
      }
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
