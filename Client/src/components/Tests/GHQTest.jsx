import { useState, useRef } from 'react';
import '../../styles/test.css';
import { useAuth } from '../../context/AuthContext';
import { submitResult } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const GHQTest = ({questions}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const startTimeRef = useRef(Date.now());
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});

  const Ghq_Test = questions;

  const handleSelect = (questionId, answer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: parseInt(answer) })); // Ensure numeric value

    // Delay to show selection before moving to next
    setTimeout(() => {
      if (currentQuestion + 1 < Ghq_Test.length) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        handleSubmit();
      }
    }, 200);
  };

  const handleSubmit = async () => {
    // Convert answers object to array format for backend
    const formattedAnswers = Object.entries(answers).map(([questionId, value]) => ({
      questionId: parseInt(questionId),
      value,
    }));

    const resultData = {
      user: user.id,
      testType: 'GHQ',
      answers: formattedAnswers,
      score: 0, // Initial score, updated by backend if needed
      analysis: {}, // Populated by backend analyzeResult
      adminFeedback: '',
      startedAt: new Date(startTimeRef.current),
      submittedAt: new Date(),
    };

    try {
      const result = await submitResult(resultData);
      if (result?.user) {
        console.log('GHQ Result saved:', result);
        alert('آزمون سلامت عمومی (GHQ) تمام شد!');
        navigate('/');
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('خطا در ارسال نتایج آزمون');
    }
  };

  return (
    <div className="test-container">
      {/* <h2>آزمون سلامت عمومی (GHQ)</h2> */}

      {currentQuestion < Ghq_Test.length ? (
        <div className="question-container">
          <p>سوال {currentQuestion + 1} از {Ghq_Test.length}</p>
          <h3>{Ghq_Test[currentQuestion].text}</h3>

          <div className="options-grid">
            {Ghq_Test[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                className={`option-button ${
                  answers[Ghq_Test[currentQuestion].id] === option.value ? 'selected' : ''
                }`}
                onClick={() => handleSelect(Ghq_Test[currentQuestion].id, option.value)}
              >
                {option.text}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="completion-message">در حال ارسال نتیجه...</p>
      )}
    </div>
  );
};

export default GHQTest;