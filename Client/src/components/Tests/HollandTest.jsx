import React, { useState, useRef } from "react";
import "../../styles/halandTest.css";
import { useAuth } from "../../context/AuthContext";
import { submitResult } from "../../services/api";
import {useNavigate} from "react-router-dom";


const HalandTest = ({questions}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const startTimeRef = useRef(Date.now());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);

  const Holland_Test = questions;
  const currentQuestion = Holland_Test[currentIndex];

  const handleSelect = async (choice) => {
    const updatedAnswers = [
      ...answers,
      {
        questionId: currentQuestion.id,
        answer: choice,
      },
    ];
    setAnswers(updatedAnswers);

    if (currentIndex + 1 < Holland_Test.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const resultData = {
        user: user.id,
        testType: "HOLLAND",
        answers: updatedAnswers,
        score:  0,
        analysis: {},
        adminFeedback: "",
        startedAt: new Date(startTimeRef.current),
        submittedAt: new Date(),
      };

      try {
        const result = await submitResult(resultData);
        if (result?.user) {
          console.log("HOLLAND Result saved:", result);
          alert("آزمون هالند با موفقیت ثبت شد!");
          navigate("/");

        }
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
              onClick={() => handleSelect(option)}
            >
              {option}
            </button>
          ))}
        </div>
        <p className="progress">
          سؤال {currentIndex + 1} از {Holland_Test.length}
        </p>
      </div>
    </div>
  );
};

export default HalandTest;
