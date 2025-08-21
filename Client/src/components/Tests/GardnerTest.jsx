import React, { useState, useRef } from "react";
import "../../styles/GardnerTest.css";
import { useAuth } from "../../context/AuthContext";
import { submitResult } from "../../services/api";
import {useNavigate} from "react-router-dom";


const GardnerTest = ({questions}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const startTimeRef = useRef(Date.now());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);

  const Gardner_Test = questions;
  const currentQuestion = Gardner_Test[currentIndex];

  const scoreMap = {
    "خیلی کم": 1,
    "کمی": 2,
    "تاحدی": 3,
    "زیاد": 4,
    "خیلی زیاد": 5,
  };

const handleSelect = async (choice) => {
  const updatedAnswers = [
    ...answers,
    {
      questionId: currentQuestion.id,
      value: scoreMap[choice] || 0,
    },
  ];
  setAnswers(updatedAnswers);

  if (currentIndex + 1 < Gardner_Test.length) {
    setCurrentIndex(currentIndex + 1);
  } else {
    const resultData = {
      user: user.id,
      testType: "GARDNER",
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
        console.log("GARDNER Result saved:", result);
        alert("آزمون گاردنر با موفقیت ثبت شد!");
        navigate("/");
      }
    } catch (err) {
      console.error("Error submitting Gardner test result:", err);
      alert("خطا در ثبت نتیجه آزمون گاردنر");
    }
  }
};


// useEffect(() => {
//   const shuffled = [...Gardner_Test].sort(() => Math.random() - 0.5);
//   setShuffledQuestions(shuffled);
// }, []);



  return (
    <div className="gardner-test">
      <div className="question-card">
        <h2>{currentQuestion.text}</h2>
        <div className="options">
          {currentQuestion.options.map((option, idx) => (
            <button
              key={idx}
              className="option-button"
              onClick={() => handleSelect(option)}
            >
              {option.text}
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
