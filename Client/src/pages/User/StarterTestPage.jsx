import React, { useEffect, useState } from "react";
import { Test_Cards } from "../../services/dummyData";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/starterTestPage.css";

// Icons
import { FaClock, FaQuestionCircle, FaLightbulb, FaArrowLeft } from "react-icons/fa";

import DiscTest from "../../components/Tests/DISCTest";
import HollandTest from "../../components/Tests/HollandTest";
import GardnerTest from "../../components/Tests/GardnerTest";
import MBTITest from "../../components/Tests/MBTITest";
import CliftonTest from "../../components/Tests/CliftonTest";
import GHQTest from "../../components/Tests/GHQTest";
import PersonalFavoritesTest from "../../components/Tests/PersonalFavoritesTest";
import { getTestQuestions } from "../../services/api";

const StarterTestPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { testId } = useParams();

  const [currentTest, setCurrentTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const foundTest = Test_Cards.find((t) => t.id === testId);
        setCurrentTest(foundTest);
        const qs = await getTestQuestions(foundTest.id);
        setQuestions(qs.questions || []);
      } catch (err) {
        setError("خطا در بارگذاری تست‌ها.");
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchTests();
  }, [user?.id, testId]);

  const handleStart = () => setStarted(true);
  const handleBackDash = () => navigate("/users/dashboard");

  if (loading) return <div className="loading-screen">در حال بارگذاری...</div>;
  if (error) return <div className="error-screen">{error}</div>;
  if (!currentTest) return <div className="loading-screen">تست پیدا نشد.</div>;

  return (
    <div className="starter-test-modern">
      {!started ? (
        <div className="test-card">
          <img
            src={currentTest.icon || "https://via.placeholder.com/150"}
            alt="Test icon"
            className="test-image"
          />
          <h1 className="test-title">{currentTest.name}</h1>
          <p className="test-description">{currentTest.description}</p>

          <div className="test-info">
            <p><FaQuestionCircle className="icon"/> تعداد سوالات: {questions.length}</p>
            <p><FaClock className="icon"/> زمان تقریبی: {currentTest.duration?.from && currentTest.duration?.to ? `${currentTest.duration.from}-${currentTest.duration.to} دقیقه` : "مشخص نشده"}</p>
          </div>

          <p className="test-hint"><FaLightbulb className="icon"/> قبل از شروع تست، محیط آرام داشته باشید و تمرکز کنید.</p>

          <div className="button-container">
            <button className="back-button" onClick={handleBackDash}><FaArrowLeft/> بازگشت</button>
            <button className="start-button" onClick={handleStart}>حاظرم</button>
          </div>
        </div>
      ) : (
        <div className="test-interface">
          <div className="test-header">
            <h2>{currentTest.name}</h2>
            <div className="progress-bar">
              <div className="progress-filled" style={{ width: `${(progress / questions.length) * 100}%` }} />
            </div>
          </div>

          {testId === "MBTI" && <MBTITest questions={questions}/>}
          {testId === "DISC" && <DiscTest questions={questions} duration={currentTest.duration.to }/>}
          {testId === "HOLLAND" && <HollandTest questions={questions}/>}
          {testId === "GARDNER" && <GardnerTest questions={questions}/>}
          {testId === "CLIFTON" && <CliftonTest questions={questions}/>}
          {testId === "GHQ" && <GHQTest questions={questions}/>}
          {testId === "PERSONAL_FAVORITES" && <PersonalFavoritesTest questions={questions}/>}
        </div>
      )}
    </div>
  );
};

export default StarterTestPage;
