import React, { useState, useRef, useEffect } from "react";
import "../../styles/HalandTest.css";
import "./shared.css";
import { useAuth } from "../../context/AuthContext";
import { submitResult } from "../../services/api";
import { useNavigate } from "react-router-dom";
import TopbarStatus from "./TopbarStatus";

const HalandTest = ({ questions, duration = 8 }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const startTimeRef = useRef(Date.now());

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration * 60);

  const Holland_Test = questions;
  const currentQuestion = Holland_Test[currentIndex];

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
      { questionId: currentQuestion.id, answer: choice }
    ];
    setAnswers(updatedAnswers);

    setTimeout(() => {
      if (currentIndex + 1 < Holland_Test.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        handleSubmit(updatedAnswers);
      }
    }, 200);
  };

  const handleSubmit = async (finalAnswers = answers) => {
    const resultData = {
      user: user.id,
      testType: "HOLLAND",
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
        alert("🎉 آزمون هالند با موفقیت ثبت شد!");
        navigate("/");
      } else {
        alert("❌ ذخیره‌سازی نتایج انجام نشد!");
      }
    } catch (err) {
      console.error("Holland submission error:", err);
      alert("⚠️ ارسال نتایج با خطا مواجه شد.");
    }
  };


  return (
    <div className="haland-test">
      {!started ? (
        <div className="intro-box">
          <h2>به آزمون هالند خوش آمدید 🎯</h2>
          <p>این آزمون کمک می‌کند علاقه و گرایش شغلی خود را بشناسید.</p>
          <h4>مدت زمان تقریبی پاسخ به هر سوال: {((duration / Holland_Test.length) * 60).toFixed(0)} ثانیه</h4>
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
              totalQuestions={Holland_Test.length}
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
                    answers[currentQuestion.id]?.answer === option ? "selected" : ""
                  }`}
                  onClick={() => handleSelect(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <p className="progress-count">
            سؤال {currentIndex + 1} از {Holland_Test.length}
          </p>
        </div>
      )}
    </div>
  );
};

export default HalandTest;
