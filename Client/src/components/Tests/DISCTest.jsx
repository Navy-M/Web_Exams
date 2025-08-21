// components/DiscTest.jsx
import React, { useState, useRef } from "react";
import "../../styles/DiscTest.css";
import { useAuth } from "../../context/AuthContext";
import { submitResult } from '../../services/api';
import {useNavigate} from "react-router-dom";

const DiscTest = ({questions}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const startTimeRef = useRef(Date.now());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);

  const Disc_Test = questions;

  const currentQuestion = Disc_Test[currentIndex];

  const handleSelect = async (trait) => {
    const updatedAnswers = [...answers, {
      questionId: currentQuestion.id,
      selectedTrait: trait,
    }];
    setAnswers(updatedAnswers);

    if (currentIndex + 1 < Disc_Test.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const resultData = {
        user: user.id,
        testType: 'DISC',
        answers: updatedAnswers,
        score:  0,
        analysis: {},
        adminFeedback: '',
        startedAt: new Date(startTimeRef.current),
        submittedAt: new Date()
      };

      try {
        
        const result = await submitResult(resultData);
        if (result?.user) {
          console.log("DISC Result saved:", result);
          alert("آزمون تمام شد!");
          navigate("/");
        } else {
          alert(" تغیرات کاربری انجام نشد!")
        }
      } catch (err) {
        alert("ارسال نتایج با خطا مواجه شد.");
      }
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
          سؤال {currentIndex + 1} از {Disc_Test.length}
        </p>
      </div>
    </div>
  );
};

export default DiscTest;
