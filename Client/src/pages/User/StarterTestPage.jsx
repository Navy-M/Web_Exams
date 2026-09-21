import React, { useEffect, useMemo, useState } from "react";
import { Test_Cards } from "../../services/dummyData";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useI18n } from "../../i18n";
import LoadingSpinner from "../../components/Common/LoadingSpinner";
import "../../styles/starterTestPage.css";
import { FaClock, FaQuestionCircle, FaLightbulb, FaArrowLeft, FaCheckCircle } from "react-icons/fa";

import DiscTest from "../../components/Tests/DISCTest";
import HollandTest from "../../components/Tests/HollandTest";
import GardnerTest from "../../components/Tests/GardnerTest";
import MBTITest from "../../components/Tests/MBTITest";
import CliftonTest from "../../components/Tests/CliftonTest";
import GHQTest from "../../components/Tests/GHQTest";
import PersonalFavoritesTest from "../../components/Tests/PersonalFavoritesTest";
import { getExamSession, getTestQuestions, startExamSession } from "../../services/api";

const StarterTestPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { testId } = useParams();

  const [currentTest, setCurrentTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [examSession, setExamSession] = useState(null);
  const [starting, setStarting] = useState(false);

  const completedTests = useMemo(() => user?.testsAssigned ?? [], [user?.testsAssigned]);
  const isCompleted = useMemo(
    () => completedTests.some((item) => item?.testType === testId),
    [completedTests, testId]
  );

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const foundTest = Test_Cards.find((t) => t.id === testId);
        setCurrentTest(foundTest || null);
        if (!foundTest) {
          setQuestions([]);
          return;
        }
        const qs = await getTestQuestions(foundTest.id);
        setQuestions(qs.questions || []);
        const sessionResponse = await getExamSession(foundTest.id);
        const activeSession = sessionResponse?.session;
        if (activeSession && !activeSession.submittedAt) {
          setExamSession(activeSession);
          setStarted(true);
        }
      } catch (err) {
        setError(t("starterTest.loadError"));
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchTests();
  }, [user?.id, testId, t]);

  const handleStart = async () => {
    if (isCompleted) return;
    try {
      setStarting(true);
      setError("");
      const response = await startExamSession(testId);
      setExamSession(response.session);
      setStarted(true);
    } catch (err) {
      setError(err?.message || "شروع آزمون امکان‌پذیر نیست.");
    } finally {
      setStarting(false);
    }
  };
  const handleBackDash = () => navigate("/dashboard");

  const formatDuration = () => {
    if (!currentTest?.duration?.from || !currentTest?.duration?.to) {
      return t("starterTest.durationUnknown");
    }
    return t("starterTest.durationRange", {
      range: `${currentTest.duration.from}-${currentTest.duration.to}`,
    });
  };

  const formatName = (keySuffix) => {
    if (!currentTest) return "";
    const key = `tests.catalog.${currentTest.id}.${keySuffix}`;
    const translated = t(key);
    return translated === key ? currentTest[keySuffix] : translated;
  };

  if (loading) return <div className="loading-screen"><LoadingSpinner label={t("starterTest.loading")} page /></div>;
  if (error) return <div className="error-screen">{error}</div>;
  if (!currentTest) return <div className="loading-screen">{t("starterTest.notFound")}</div>;

    const translatedCompletedTitle = t("starterTest.completedTitle");
  const translatedCompletedDesc = t("starterTest.completedDescription");
  const translatedCompletedAction = t("starterTest.completedAction");

  const completedTitle =
    translatedCompletedTitle === "starterTest.completedTitle"
      ? "این آزمون قبلاً انجام شده است."
      : translatedCompletedTitle;

  const completedDescription =
    translatedCompletedDesc === "starterTest.completedDescription"
      ? "می‌توانید از داشبورد نتایج و تحلیل را مشاهده کنید."
      : translatedCompletedDesc;

  const completedActionLabel =
    translatedCompletedAction === "starterTest.completedAction"
      ? "آزمون انجام شده"
      : translatedCompletedAction;

  const completedNotice = (
    <div className="completed-notice card">
      <FaCheckCircle className="icon" />
      <div>
        <h2>{completedTitle}</h2>
        <p>{completedDescription}</p>
      </div>
    </div>
  );

  return (
    <div className="starter-test-modern">
      {!started ? (
        <div className="test-card">
          <img
            src={currentTest.icon || "https://via.placeholder.com/150"}
            alt={formatName("name")}
            className="test-image"
          />
          <h1 className="test-title">{formatName("name")}</h1>
          <p className="test-description">{formatName("description")}</p>

          {isCompleted && completedNotice}

          <div className="test-info">
            <p>
              <FaQuestionCircle className="icon" />
              {t("starterTest.questionCount", { count: questions.length })}
            </p>
            <p>
              <FaClock className="icon" />
              {formatDuration()}
            </p>
          </div>

          <p className="test-hint">
            <FaLightbulb className="icon" />
            {t("starterTest.hint")}
          </p>

          <div className="button-container">
            <button className="back-button" onClick={handleBackDash}>
              <FaArrowLeft /> {t("starterTest.back")}
            </button>
            <button
              className="start-button"
              onClick={handleStart}
              disabled={isCompleted || starting}
            >
              {isCompleted ? completedActionLabel : starting ? "در حال شروع..." : t("starterTest.start")}
            </button>
          </div>
        </div>
      ) : (
        <div className="test-interface">
          <div className="test-header">
            <h2>{formatName("name")}</h2>
          </div>

          {testId === "MBTI" && <MBTITest questions={questions} duration={currentTest.duration?.to} session={examSession} />}
          {testId === "DISC" && <DiscTest questions={questions} duration={currentTest.duration?.to} session={examSession} />}
          {testId === "HOLLAND" && <HollandTest questions={questions} duration={currentTest.duration?.to} session={examSession} />}
          {testId === "GARDNER" && <GardnerTest questions={questions} duration={currentTest.duration?.to} session={examSession} />}
          {testId === "CLIFTON" && <CliftonTest questions={questions} duration={currentTest.duration?.to} session={examSession} />}
          {testId === "GHQ" && <GHQTest questions={questions} duration={currentTest.duration?.to} session={examSession} />}
          {testId === "PERSONAL_FAVORITES" && (
            <PersonalFavoritesTest questions={questions} duration={currentTest.duration?.to} session={examSession} />
          )}
        </div>
      )}
    </div>
  );
};

export default StarterTestPage;

