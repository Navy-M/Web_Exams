import { useState, useRef, useEffect } from 'react';
import '../../styles/mbtiTest.css';
import "./shared.css";
import { useAuth } from '../../context/AuthContext';
import { submitResult } from '../../services/api';
import { useNavigate } from "react-router-dom";
import TopbarStatus from './TopbarStatus';

const MBTITest = ({ questions, duration = 8 }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const startTimeRef = useRef(Date.now());

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration * 60);

  const Mbti_Test = questions;
  const currentQuestion = Mbti_Test[currentIndex];

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
    setAnswers(prev => ({ ...prev, [questionId]: value }));

    setTimeout(() => {
      if (currentIndex + 1 < Mbti_Test.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        handleSubmit();
      }
    }, 200);
  };

  const handleSubmit = async () => {
    const formattedAnswers = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value
    }));

    const resultData = {
      user: user.id,
      testType: 'MBTI',
      answers: formattedAnswers,
      score: 0,
      analysis: {},
      adminFeedback: '',
      startedAt: new Date(startTimeRef.current),
      submittedAt: new Date(),
    };

    try {
      const result = await submitResult(resultData);
      if (result?.user) {
        alert("🎉 آزمون MBTI با موفقیت ثبت شد!");
        navigate("/");
      }
    } catch (err) {
      console.error("MBTI submission error:", err);
      alert("⚠️ ارسال نتایج با خطا مواجه شد.");
    }
  };

  const progressPercent = Math.round(((currentIndex + 1) / Mbti_Test.length) * 100);

  return (
    <div className="mbti-test">
      {!started ? (
        <div className="intro-box">
          <h2>به آزمون MBTI خوش آمدید 🧩</h2>
          <p>این آزمون کمک می‌کند تیپ شخصیتی خود را بهتر بشناسید.</p>
          <h4>مدت زمان تقریبی پاسخ به هر سوال: {((duration / Mbti_Test.length) * 60).toFixed(0)} ثانیه</h4>
          <button className="start-btn" onClick={() => setStarted(true)}>شروع آزمون</button>
        </div>
      ) : (
        <div className="question-box">
          <div className="top-bar">
            <TopbarStatus
              duration={duration}
              started={started}
              currentIndex={currentIndex}
              totalQuestions={Mbti_Test.length}
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
            سوال {currentIndex + 1} از {Mbti_Test.length}
          </p>
        </div>
      )}
    </div>
  );
};

export default MBTITest;
