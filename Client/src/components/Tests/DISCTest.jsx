// components/DiscTest.jsx
import React, { useState, useRef, useEffect } from "react";
import "../../styles/DiscTest.css";
import "./shared.css";
import { useAuth } from "../../context/AuthContext";
import { submitResult } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { setItemWithExpiry, getItemWithExpiry } from "../../services/storage";
import TopbarStatus from "./TopbarStatus";

const DiscTest = ({ questions, duration = 8  }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const startTimeRef = useRef(Date.now());

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [started, setStarted] = useState(false);

  const Disc_Test = questions;
  const currentQuestion = Disc_Test[currentIndex];


  const handleSelect = (trait) => {
    const updatedAnswers = [
      ...answers,
      { questionId: currentQuestion.id, selectedTrait: trait },
    ];
    setAnswers(updatedAnswers);

    if (currentIndex + 1 < Disc_Test.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleSubmit(updatedAnswers);
    }
  };

  const handleSubmit = async (finalAnswers = answers) => {
    const resultData = {
      user: user.id,
      testType: "DISC",
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
        alert("🎉 آزمون با موفقیت ثبت شد!");
        
        // Save discTestDone for 5 hours
        setItemWithExpiry("discTestDone", true, 30 * 1000);
        // setItemWithExpiry("discTestDone", true, 5 * 60 * 60 * 1000);

        navigate("/");
      } else {
        alert("❌ ذخیره‌سازی نتایج انجام نشد!");
      }
    } catch (err) {
      alert("⚠️ ارسال نتایج با خطا مواجه شد.");
    }
  };

  useEffect(() => {
    const done = getItemWithExpiry("discTestDone");
    if (done) {
      alert("شما قبلاً این آزمون را انجام داده‌اید.");
      navigate("/");
    }
  }, [navigate]);


  return (
    <div className="disc-test">
      {!started ? (
        <div className="intro-box">
          <h2>به آزمون شخصیت‌شناسی دیسک خوش آمدید 🎯</h2>
          <p>
            .این آزمون تنها یک بار برای شما نمایش داده می‌شود
          </p>
          <h4>مدت زمان تقریبی پاسخ‌گویی به هر سوال: {((duration / Disc_Test.length) * 60).toFixed(0)} ثانیه</h4>
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
              totalQuestions={Disc_Test.length}
              handleSubmit={handleSubmit}

            />
          </div>

          <h2 className="question-text">{currentQuestion.question}</h2>

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

          <p className="progress-count">
            سؤال {currentIndex + 1} از {Disc_Test.length}
          </p>
        </div>
      )}
    </div>
  );
};

export default DiscTest;
