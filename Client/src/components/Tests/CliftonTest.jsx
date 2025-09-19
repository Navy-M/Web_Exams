import { useState, useRef, useEffect } from 'react';
import '../../styles/CliftonTest.css';
import "./shared.css";
import { useAuth } from '../../context/AuthContext';
import { submitResult } from '../../services/api';
import { useNavigate } from "react-router-dom";
import { setItemWithExpiry, getItemWithExpiry } from '../../services/storage';    
import TopbarStatus from './TopbarStatus';

const CliftonTest = ({ questions, duration = 10 }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const startTimeRef = useRef(Date.now());

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration * 60);

  const Clifton_Test = questions;
  const currentQ = Clifton_Test[currentIndex];

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

  const handleSelect = async (theme) => {
    const updatedAnswers = { ...answers, [currentQ.id]: theme };
    setAnswers(updatedAnswers);

    if (currentIndex + 1 < Clifton_Test.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleSubmit(updatedAnswers);
    }
  };

  const handleSubmit = async (finalAnswers = answers) => {
    const formattedAnswers = Object.entries(finalAnswers).map(([questionId, choice]) => ({
      questionId: parseInt(questionId),
      choice
    }));

    const resultData = {
      user: user.id,
      testType: 'CLIFTON',
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
        alert("🎉 آزمون کلیفتون با موفقیت ثبت شد!");
        navigate("/");
      } else {
        alert("❌ ذخیره‌سازی نتایج انجام نشد!");
      }
    } catch (error) {
      console.error(error);
      alert("⚠️ ارسال نتایج با خطا مواجه شد.");
    }
  };

  const progressPercent = Math.round(((currentIndex + 1) / Clifton_Test.length) * 100);

  return (
    <div className="clifton-test">
      {!started ? (
        <div className="intro-box">
          <h2>به آزمون Clifton خوش آمدید 💼</h2>
          <p>این آزمون به شما کمک می‌کند توانایی‌ها و علایق شغلی خود را بهتر بشناسید.</p>
          <h4>مدت زمان تقریبی پاسخ به هر سوال: {((duration / Clifton_Test.length) * 60).toFixed(0)} ثانیه</h4>
          <button className="start-btn" onClick={() => setStarted(true)}>شروع آزمون</button>
        </div>
      ) : (
        <div className="question-box">
          <div className="top-bar">
           <TopbarStatus
              duration={duration}
              started={started}
              currentIndex={currentIndex}
              totalQuestions={Clifton_Test.length}
              handleSubmit={handleSubmit}
            />
          </div>

          <div className="question-card">
            <h2>{currentQ.question || currentQ.text}</h2>
            <div className="options-grid two-col">
              <button
                className={`option-button ${answers[currentQ.id] === currentQ.theme_a ? 'selected' : ''}`}
                onClick={() => handleSelect(currentQ.theme_a)}
              >
                {currentQ.statement_a}
              </button>
              <button
                className={`option-button ${answers[currentQ.id] === currentQ.theme_b ? 'selected' : ''}`}
                onClick={() => handleSelect(currentQ.theme_b)}
              >
                {currentQ.statement_b}
              </button>
            </div>
          </div>

          <p className="progress-count">
            سؤال {currentIndex + 1} از {Clifton_Test.length}
          </p>
        </div>
      )}
    </div>
  );
};

export default CliftonTest;
