import { useState, useRef, useEffect } from 'react';
import '../../styles/GHQTest.css';
import "./shared.css";
import { useAuth } from '../../context/AuthContext';
import { submitResult } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import TopbarStatus from './TopbarStatus';  

const GHQTest = ({ questions, duration = 8 }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const startTimeRef = useRef(Date.now());

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration * 60);

  const Ghq_Test = questions;
  const currentQuestion = Ghq_Test[currentIndex];

  // Timer countdown
  useEffect(() => {
    if (!started) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, started]);

  const handleSelect = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: parseInt(value) }));

    // Small delay for selection animation
    setTimeout(() => {
      if (currentIndex + 1 < Ghq_Test.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        handleSubmit();
      }
    }, 200);
  };

  const handleSubmit = async () => {
    const formattedAnswers = Object.entries(answers).map(([questionId, value]) => ({
      questionId: parseInt(questionId),
      value
    }));

    const resultData = {
      user: user.id,
      testType: 'GHQ',
      answers: formattedAnswers,
      score: 0,
      analysis: {},
      adminFeedback: '',
      startedAt: new Date(startTimeRef.current),
      submittedAt: new Date()
    };

    try {
      const result = await submitResult(resultData);
      if (result?.user) {
        alert('🎉 آزمون سلامت عمومی (GHQ) با موفقیت ثبت شد!');
        navigate('/');
      } else {
        alert('❌ ذخیره‌سازی نتایج انجام نشد!');
      }
    } catch (err) {
      console.error('GHQ submission error:', err);
      alert('⚠️ ارسال نتایج با خطا مواجه شد.');
    }
  };

  const progressPercent = Math.round(((currentIndex + 1) / Ghq_Test.length) * 100);

  return (
    <div className="ghq-test">
      {!started ? (
        <div className="intro-box">
          <h2>به آزمون سلامت عمومی (GHQ) خوش آمدید 🧠</h2>
          <p>این آزمون کمک می‌کند سطح سلامت روانی خود را بسنجید.</p>
          <h4>مدت زمان تقریبی پاسخ به هر سوال: {((duration / Ghq_Test.length) * 60).toFixed(0)} ثانیه</h4>
          <button className="start-btn" onClick={() => setStarted(true)}>
            شروع آزمون
          </button>
        </div>
      ) : (
        <div className="question-box">
          <div className="top-bar">
          <TopbarStatus
              duration={duration}
              started={started}
              currentIndex={currentIndex}
              totalQuestions={Ghq_Test.length}
              handleSubmit={handleSubmit}
            />
          </div>

          <div className="question-card">
            <h3>{currentQuestion.text}</h3>
            <div className="options-grid">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  className={`option-button ${
                    answers[currentQuestion.id] === option.value ? 'selected' : ''
                  }`}
                  onClick={() => handleSelect(currentQuestion.id, option.value)}
                >
                  {option.text}
                </button>
              ))}
            </div>
          </div>

          <p className="progress-count">
            سؤال {currentIndex + 1} از {Ghq_Test.length}
          </p>
        </div>
      )}
    </div>
  );
};

export default GHQTest;
