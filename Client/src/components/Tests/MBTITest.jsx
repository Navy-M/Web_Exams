import { useState, useRef } from 'react';
import '../../styles/test.css';
import { Mbti_Test } from '../../services/dummyData';
import { useAuth } from '../../context/AuthContext';
import { submitResult } from '../../services/api';
import {useNavigate} from "react-router-dom";


const MBTITest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const startTimeRef = useRef(Date.now());
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});

  const handleSelect = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));

    // Delay to show selection before moving to next
    setTimeout(() => {
      if (currentQuestion + 1 < Mbti_Test.length) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        handleSubmit();
      }
    }, 200); // Optional delay
  };

  const handleSubmit = async () => {
    // Convert answers object to array format for backend
    const formattedAnswers = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value
    }));

    const resultData = {
      user: user.id,
      testType: 'MBTI',
      answers: formattedAnswers,
      score:  0,
      analysis: {},
      adminFeedback: '',
      startedAt: new Date(startTimeRef.current),
      submittedAt: new Date(),
    };

    try {
      const result = await submitResult(resultData);

      if (result?.user) {
        console.log("MBTI Result saved:", result);
        alert("آزمون MBTI تمام شد!");
        navigate("/");
      }
    } catch (err) {
      console.error("Submission error:", err);
      alert("خطا در ارسال نتایج آزمون");
    }
  };

  return (
    <div className="test-container">
      <h2>
            تست MBTI - تست شخصیت شناسی مایرز بریگز
        </h2>

      {currentQuestion < Mbti_Test.length ? (
        <div className="question-container">
          <h3>{Mbti_Test[currentQuestion].text}</h3>

          <div className="options-grid">
            {Mbti_Test[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                className={`option-button ${
                  answers[Mbti_Test[currentQuestion].id] === option.value ? 'selected' : ''
                }`}
                onClick={() => handleSelect(Mbti_Test[currentQuestion].id, option.value)}
              >
                {option.text}
              </button>
            ))}
          </div>

          <p>سوال {currentQuestion + 1} از {Mbti_Test.length}</p>

        </div>
      ) : (
        <p className="completion-message">در حال ارسال نتیجه...</p>
      )}
    </div>
  );
};

export default MBTITest;
