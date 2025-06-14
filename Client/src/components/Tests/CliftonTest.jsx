import { useState, useRef } from 'react';
import '../../styles/test.css';
import { Clifton_Test } from '../../services/dummyData';
import { useAuth } from '../../context/AuthContext';
import { submitResult } from '../../services/api';
import {useNavigate} from "react-router-dom";


const CliftonTest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const startTimeRef = useRef(Date.now());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  const currentQ = Clifton_Test[currentIndex];

  const handleSelect = async (theme) => {
    const updatedAnswers = { ...answers, [currentQ.id]: theme };
    setAnswers(updatedAnswers);

    if (currentIndex + 1 < Clifton_Test.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const formattedAnswers = Object.entries(updatedAnswers).map(
        ([questionId, selectedTheme]) => ({
          questionId: parseInt(questionId),
          choice: selectedTheme,
        })
      );

      const resultData = {
        user: user.id,
        testType: 'CLIFTON',
        answers: formattedAnswers,
        score:  0,
        otherResult: [],
        adminFeedback: '',
        startedAt: new Date(startTimeRef.current),
        submittedAt: new Date()
      };

      try {
        const result = await submitResult(resultData);

        if (result?.user) {
          console.log("✅ Clifton result saved:", result);
          alert("آزمون کلیفتون با موفقیت ثبت شد!");
          navigate("/");
        }
      } catch (error) {
        console.error("❌ خطا در ارسال آزمون کلیفتون:", error);
        alert("خطا در ذخیره آزمون کلیفتون");
      }
    }
  };

  return (
    <div className="test-container">
      <div className="question-container">
        <div className="options-grid two-col">
          <button
            className={`option-button ${
              answers[currentQ.id] === currentQ.theme_a ? 'selected' : ''
            }`}
            onClick={() => handleSelect(currentQ.theme_a)}
          >
            {currentQ.statement_a}
          </button>

          <button
            className={`option-button ${
              answers[currentQ.id] === currentQ.theme_b ? 'selected' : ''
            }`}
            onClick={() => handleSelect(currentQ.theme_b)}
          >
            {currentQ.statement_b}
          </button>
        </div>
      </div>
      <p>سؤال {currentIndex + 1} از {Clifton_Test.length}</p>
    </div>
  );
};

export default CliftonTest;
