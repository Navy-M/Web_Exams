import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Sun, Moon, LogOut, Award, ListChecks, Sparkles } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { getTestResults, getUserById } from "../../services/api";
import { Test_Cards } from "../../services/dummyData";

import TestCard from "../../components/User/TestCard";
import TestResultCardGrid from "../../components/Common/TestResultCardGrid";
import ShowAnalysis from "../../components/Common/ShowAnalysis";
import {LoadingSpinner} from "../../components/Common/LoadingSpinner";

import "../../styles/user-dashboard.css";

const UserDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [allTests, setAllTests] = useState(Test_Cards ?? []);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCompletedTest, setSelectedCompletedTest] = useState(null);

  // ---- data fetching (fresh user every mount) ----
  useEffect(() => {
    let ignore = false;

    const run = async () => {
      try {
        setLoading(true);
        setError("");

        const fresh = user?.id
    ? await getUserById(user.id).then((r) => r.data) // <= .data if your API returns {data}
    : null;

        setAllTests(Test_Cards ?? []);
        setCompleted(fresh?.testsAssigned ?? user?.testsAssigned ?? []);
      } catch (e) {
        // 404 or network → fallback to context data so UI keeps working
        setAllTests(Test_Cards ?? []);
        setCompleted(user?.testsAssigned ?? []);
        setError(""); // hide error if you prefer silent fallback
      } finally {
        setLoading(false);
      }
    };

    run();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ---- helpers ----
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleStartTest = useCallback(
    (testId) => navigate(`/users/starttest/${testId}`),
    [navigate]
  );

  const handleSelectCompletedResult = useCallback(async (id) => {
    try {
      const res = await getTestResults(id);
      if (res?.data) setSelectedCompletedTest(res.data);
    } catch (e) {
      console.error("❌ Error Select Result:", e);
    }
  }, []);

  const getStatus = useCallback(
    (test) => {
      if (completed.some((c) => c.testType === test.id)) return "Completed";
      if (test?.deadline && new Date(test.deadline) < new Date()) return "Expired";
      return "Pending";
    },
    [completed]
  );

  const scoreSummary = useMemo(() => {
    const total = completed.reduce((acc, t) => acc + (t.score ?? 0), 0);
    const doneCount = Math.min(completed.length, 7); // preserves your cap rule
    return { total, doneCount, allCount: allTests.length };
  }, [completed, allTests.length]);

  const pendingTests = useMemo(
    () => allTests.filter((t) => getStatus(t) === "Pending"),
    [allTests, getStatus]
  );

  const scoreTrend = useMemo(
    () =>
      completed
        .slice()
        .filter((t) => typeof t.score === "number")
        .sort(
          (a, b) =>
            new Date(a.completedAt ?? 0).getTime() -
            new Date(b.completedAt ?? 0).getTime()
        )
        .map((t, idx) => ({
          idx,
          name: t.name ?? t.testType,
          score: t.score ?? 0,
        })),
    [completed]
  );

  const hasProfile = !!user?.profile?.age && !!user?.profile?.gender && !!user?.profile?.education;

  return (
    <div className="user-dashboard" dir="rtl" data-theme={isDark ? "dark" : "light"}>
      <header className="dashboard-header">
        <div className="header-top">
          <button
            onClick={toggleTheme}
            className="ui-btn outline"
            aria-label={isDark ? "تغییر به حالت روشن" : "تغییر به حالت تیره"}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            <span>{isDark ? "حالت روشن" : "حالت تیره"}</span>
          </button>

          <button onClick={handleLogout} className="ui-btn danger" aria-label="خروج">
            <LogOut size={18} />
            <span>خروج</span>
          </button>
        </div>

        {!user?.profile?.age || !user?.profile?.gender ? (
          <div className="complete-user-profile card surface-warning">
            <div className="cup-content">
              <div className="cup-text">
                <h3>ابتدا پروفایل را تکمیل کنید</h3>
                <p>برای پیشنهاد دقیق تست‌ها، سن و جنسیت لازم است.</p>
              </div>
              <button
                type="button"
                className="ui-btn primary"
                onClick={() => navigate("/users/completeProfile")}
              >
                تکمیل اطلاعات
              </button>
            </div>
          </div>
        ) : (
          <div className="User_Header_Info">
            <div className="stats">
              <div className="stat-item card">
                <div className="stat-icon">
                  <Award size={18} />
                </div>
                {/* <h3>{scoreSummary.total}</h3> */}
                {/* <p>مجموع امتیازات</p>
                 */}
                 <h1 className="user-email">
                   {user?.username} <span className="sep">|</span> {user?.profile?.fullName}
                 </h1>
              </div>


              <div className="stat-item card">
                <div className="stat-icon">
                  <ListChecks size={18} />
                </div>
                <h3>{scoreSummary.allCount}</h3>
                <p>کل تست‌ها</p>
              </div>


              <div className="stat-item card">
                <div className="stat-icon">
                  <Sparkles size={18} />
                </div>
                <h3>{scoreSummary.doneCount}</h3>
                <p>انجام‌شده</p>
              </div>

            </div>

            
          </div>
        )}
      </header>

      {loading ? (
        <div className="skeleton-wrap">
          <LoadingSpinner />
          <div className="skeleton-row" />
          <div className="skeleton-grid">
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        </div>
      ) : error ? (
        <div className="error-state card">
          <p>{error}</p>
          <button className="ui-btn" onClick={() => window.location.reload()}>
            تلاش مجدد
          </button>
        </div>
      ) : (
        <>
          {!!user?.testsAssigned && user.testsAssigned.length > 6 && (
            <div className="notice card">.تمام آزمایش‌ها انجام شد. لطفاً منتظر تحلیل‌ها باشید</div>
          )}

          {user?.profile?.age && pendingTests.length > 0 && (
            <section className="recommended-tests">
              <div className="section-head">
                <h2>تست‌های پیشنهادی</h2>
                {/* <span className="hint">{pendingTests.length} مورد آماده شروع</span> */}
              </div>

              <div className="tests-grid">
                {pendingTests.map((test) => (
                  <TestCard key={test.id} test={test} onStart={() => handleStartTest(test.id)} />
                ))}
              </div>
            </section>
          )}

          {scoreTrend.length > 0 && (
            <section className="score-graph">
              <h2>روند امتیازها</h2>
              <div className="chart-card card">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={scoreTrend}>
                    <defs>
                      <linearGradient id="line" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="var(--primary-color)" />
                        <stop offset="100%" stopColor="var(--secondary-color)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="url(#line)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {hasProfile && (
            <section className="completed-tests">
              <h2>تست‌های انجام‌شده</h2>

              {completed.length > 0 ? (
                <>
                  <div className="tests-grid">
                    <TestResultCardGrid onSelectTest={handleSelectCompletedResult} />
                  </div>

                  {selectedCompletedTest && (
                    <div className="analysis-wrap card">
                      <ShowAnalysis testType={selectedCompletedTest.testType} analysisData={selectedCompletedTest.analysis} />
                    </div>
                  )}
                </>
              ) : (
                <div className="empty card">
                  <p>جداول نتایج شما پس از بررسی در دسترس خواهد بود…</p>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default UserDashboard;
