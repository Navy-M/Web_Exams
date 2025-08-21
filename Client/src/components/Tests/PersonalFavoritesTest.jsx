import { useState, useRef } from 'react';
import '../../styles/test.css';
import { useAuth } from '../../context/AuthContext';
import { submitResult } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const PersonalFavoritesTest = ({questions}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const startTimeRef = useRef(Date.now());
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});

  const PersonalFavorites_Test = questions;

  const handleSelect = (questionId, answer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer })); // String values for multiple-choice

    // Delay to show selection before moving to next
    setTimeout(() => {
      if (currentQuestion + 1 < PersonalFavorites_Test.length) {
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
      testType: 'PERSONAL_FAVORITES',
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
        console.log('Personal Favorites Result saved:', result);
        alert('آزمون اولویت‌های شخصی تمام شد!');
        navigate('/');
      }
    } catch (err) {
      console.error('Submission error:', err);
      alert('خطا در ارسال نتایج آزمون');
    }
  };

  return (
    <div className="test-container">
      <h2>آزمون اولویت‌های شخصی</h2>

      {currentQuestion < PersonalFavorites_Test.length ? (
        <div className="question-container">
          <p>سوال {currentQuestion + 1} از {PersonalFavorites_Test.length}</p>
          <h3>{PersonalFavorites_Test[currentQuestion].text}</h3>

          <div className="options-grid">
            {PersonalFavorites_Test[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                className={`option-button ${
                  answers[PersonalFavorites_Test[currentQuestion].id] === option.value ? 'selected' : ''
                }`}
                onClick={() => handleSelect(PersonalFavorites_Test[currentQuestion].id, option.value)}
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

export default PersonalFavoritesTest;