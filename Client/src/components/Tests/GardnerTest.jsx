import React, { useState, useRef, useEffect } from "react";
import "../../styles/GardnerTest.css";
import "./shared.css";
import { useAuth } from "../../context/AuthContext";
import { submitResult } from "../../services/api";
import { useNavigate } from "react-router-dom";
import TopbarStatus from "./TopbarStatus";

const GardnerTest = ({ questions, duration = 10 }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const startTimeRef = useRef(Date.now());

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [started, setStarted] = useState(false);

  const Gardner_Test = questions;
  const currentQuestion = Gardner_Test[currentIndex];

  const scoreMap = {
    "خیلی کم": 1,
    "کمی": 2,
    "تاحدی": 3,
    "زیاد": 4,
    "خیلی زیاد": 5,
  };

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

  const handleSelect = (choice) => {
    const updatedAnswers = [
      ...answers,
      { questionId: currentQuestion.id, value: scoreMap[choice] || 0 },
    ];
    setAnswers(updatedAnswers);

    if (currentIndex + 1 < Gardner_Test.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleSubmit(updatedAnswers);
    }
  };

  const handleSubmit = async (finalAnswers = answers) => {
    const resultData = {
      user: user.id,
      testType: "GARDNER",
      answers: finalAnswers,
      score: 0,
      analysis: {},
      adminFeedback: "",
      startedAt: new Date(startTimeRef.current),
      submittedAt: new Date(),
    };

    try {
      const result = await submitResult(resultData);
      if (result?.user) {
        alert("🎉 آزمون گاردنر با موفقیت ثبت شد!");
        navigate("/");
      } else {
        alert("❌ ذخیره‌سازی نتایج انجام نشد!");
      }
    } catch (err) {
      console.error(err);
      alert("⚠️ ارسال نتایج با خطا مواجه شد.");
    }
  };

  const progressPercent = Math.round(((currentIndex + 1) / Gardner_Test.length) * 100);

  return (
    <div className="gardner-test">
      {!started ? (
        <div className="intro-box">
          <h2>به آزمون هوش گاردنر خوش آمدید 🧠</h2>
          <p>این آزمون به شما کمک می‌کند توانایی‌های مختلف خود را شناسایی کنید.</p>
          <h4>مدت زمان تقریبی پاسخ‌گویی به هر سوال: {((duration / Gardner_Test.length) * 60).toFixed(0)} ثانیه</h4>
          <button className="start-btn" onClick={() => setStarted(true)}>شروع آزمون</button>
        </div>
      ) : (
        <div className="question-box">
          <div className="top-bar">
            <TopbarStatus
              duration={duration}
              started={started}
              currentIndex={currentIndex}
              totalQuestions={Gardner_Test.length}
              handleSubmit={handleSubmit}
            />
          </div>

          <h2 className="question-text">{currentQuestion.text}</h2>

          <div className="options">
            {currentQuestion.options.map((option, idx) => (
              <button key={idx} className="option-button" onClick={() => handleSelect(option)}>
                {option}
              </button>
            ))}
          </div>

          <p className="progress-count">
            سؤال {currentIndex + 1} از {Gardner_Test.length}
          </p>
        </div>
      )}
    </div>
  );
};

export default GardnerTest;
