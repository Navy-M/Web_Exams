import React, { useState, useRef } from "react";
import { Gardner_Test } from "../../services/dummyData";
import "../../styles/GardnerTest.css";
import { useAuth } from "../../context/AuthContext";
import { submitResult } from "../../services/api";

const GardnerTest = () => {
  const { user } = useAuth();
  const startTimeRef = useRef(Date.now());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);

  const currentQuestion = Gardner_Test[currentIndex];

  const scoreMap = {
    "خیلی کم": 1,
    "کمی": 2,
    "تاحدی": 3,
    "زیاد": 4,
    "خیلی زیاد": 5,
  };

const handleAnswer = async (choice) => {
  const updatedAnswers = [
    ...answers,
    {
      questionId: currentQuestion.id,
      selectedOption: choice,
      score: scoreMap[choice] || 0,
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
      otherResult: [],
      adminFeedback: "",
      startedAt: new Date(startTimeRef.current),
      submittedAt: new Date(),
    };

    try {
      const result = await submitResult(resultData);
      console.log("Gardner Test Result saved:", result);
      alert("آزمون گاردنر با موفقیت ثبت شد!");
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
