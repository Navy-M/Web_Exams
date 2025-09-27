import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  getUsers,
  deleteUser,
  getUserResults,
  submitTestFeedback,
  createUser,
  getTestResults,
  deleteResult,
  analyzeTests,
} from "../../services/api";

import ShowAnalysis from "../../components/Common/ShowAnalysis";
import SearchBar from "./UsersPage/SearchBar";
import UsersTable from "./UsersPage/UsersTable";
import UserProfileCard from "./UsersPage/UserProfileCard";
import ResultsTable from "./UsersPage/ResultsTable";
import FeedbackPanel from "./UsersPage/FeedbackPanel";
import { printUserReport } from "./UsersPage/printUserReport.js";

import "./UsersPage/usersPage.css";

const UsersPage = () => {
  // data
  const [users, setUsers] = useState([]);
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);

  // ui
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddRow, setShowAddRow] = useState(false);

  // search
  const [search, setSearch] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  // new user form
  const [newUser, setNewUser] = useState({
    fullName: "",
    period: "",
    username: "",
    role: "user",
    password: "",
  });

  // feedback text
  const [feedback, setFeedback] = useState("");

  // load users
  useEffect(() => {
    let ignore = false;
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const list = await getUsers();
        const nonAdmin = (list || []).filter((u) => u.role !== "admin");
        if (!ignore) setUsers(nonAdmin);
      } catch (e) {
        if (!ignore) setError("خطا در دریافت کاربران");
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    run();
    return () => {
      ignore = true;
    };
  }, []);

  // when selecting a user, fetch results (or use embedded)
  useEffect(() => {
    const run = async () => {
      if (!selectedUser) return;
      try {
        // prefer API if available, else from user object
        const results =
          (await getUserResults(selectedUser._id)) ||
          selectedUser.testsAssigned ||
          [];
        setUserResults(results);
      } catch {
        setUserResults(selectedUser.testsAssigned || []);
      }
    };
    run();
  }, [selectedUser]);

  // helpers
  const formatDate = useCallback((time) => {
    return new Date(time).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // search
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    const pick = (v) => (v || "").toString().toLowerCase();
    return users.filter((u) => {
      switch (searchFilter) {
        case "name":
          return pick(u.profile?.fullName).includes(q);
        case "username":
          return pick(u.username).includes(q);
        case "period":
          return pick(u.period).includes(q);
        case "role":
          return pick(u.role).includes(q);
        case "job":
          return pick(u.profile?.jobPosition).includes(q);
        case "province":
          return pick(u.profile?.province).includes(q);
        default:
          return (
            pick(u.profile?.fullName).includes(q) ||
            pick(u.username).includes(q) ||
            pick(u.role).includes(q) ||
            pick(u.profile?.jobPosition).includes(q) ||
            pick(u.profile?.province).includes(q)
          );
        }
    });
  }, [users, search, searchFilter]);

  // actions
  const handleAddUser = async () => {
    try {
      const res = await createUser({
        fullName: newUser.fullName,
        username: newUser.username,
        period: newUser.period,
        password: newUser.password,
        role: newUser.role,
      });

      alert(res.message || "کاربر اضافه شد");
      if (res.user) setUsers((prev) => [...prev, res.user]);
      setNewUser({ fullName: "", period: "", username: "", role: "user", password: "" });
      setShowAddRow(false);
    } catch (err) {
      alert(err?.response?.message || "خطا در افزودن کاربر");
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("آیا از حذف کاربر مطمئن هستید؟")) return;
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u._id !== id));
      if (selectedUser?._id === id) {
        setSelectedUser(null);
        setUserResults([]);
      }
    } catch {
      alert("خطا در حذف کاربر");
    }
  };

  const handleSelectResult = async (resultId) => {
    try {
      const res = await getTestResults(resultId);
      const data = res?.data ?? res;
      setSelectedResult(data);
    } catch {
      alert("خطا در دریافت نتایج");
    }
  };

  const handleDeleteUserResult = async (resultId) => {
    if (!window.confirm("آیا از حذف آزمون مطمئن هستید؟")) return;
    try {
      await deleteResult(resultId);
      setUserResults((prev) => prev.filter((r) => r.resultId !== resultId && r._id !== resultId));
      if (selectedResult?._id === resultId) setSelectedResult(null);
    } catch {
      alert("خطا در حذف آزمون");
    }
  };

  const handleCheckTest = async (result) => {
    try {
      const { resultId, testType } = result;
      const response = await analyzeTests({ resultId, testType });
      console.log("✅ Analyzed Result:", response?.data || response);
      alert("تحلیل با موفقیت انجام شد ✅");
    } catch {
      alert("خطایی در تحلیل تست رخ داد");
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim() || !selectedResult || !selectedUser) return;
    try {
      await submitTestFeedback({
        userId: selectedUser._id,
        resultId: selectedResult._id,
        feedback,
      });
      alert("بازخورد با موفقیت ثبت شد");
      setFeedback("");
      setSelectedResult(null);
      // refresh results
      const refreshed = await getUserResults(selectedUser._id);
      setUserResults(refreshed || []);
    } catch {
      alert("خطا در ثبت بازخورد");
    }
  };

  const handlePrintUserResume = () => {
    if (!selectedUser) return;
    if (!selectedUser?.profile?.age) {
      alert(`کاربر ${selectedUser?.profile?.fullName || ""} هنوز اطلاعات فردی را کامل نکرده است!`);
      return;
    }
    if (!window.confirm("آیا از چاپ کارنامه کاربر مطمئن هستید؟")) return;
    const html = printUserReport({ user: selectedUser, results: userResults, formatDate });
    const w = window.open("", "_blank");
    if (!w) return alert("خطا در باز کردن پنجره چاپ");
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  // render
  if (selectedUser) {
    return (
      <div className="admin-users-container">
        <div className="user-results-layout">
          <header className="user-results-header">
            <div className="user-title">
              <h2>نتایج تست‌های کاربر:</h2>
              <h2 className="user-name">{selectedUser?.profile?.fullName}</h2>
            </div>
            <div className="user-actions">
              <button className="btn ghost" onClick={() => setSelectedUser(null)}>بازگشت</button>
              <button className="btn primary" onClick={handlePrintUserResume}>چاپ کارنامه</button>
            </div>
          </header>

          <div className="user-results-body">
            <aside className="user-side">
              <UserProfileCard user={selectedUser} />
            </aside>

            <main className="user-main">
              <ResultsTable
                results={userResults}
                formatDate={formatDate}
                onDelete={handleDeleteUserResult}
                onSelectResult={handleSelectResult}
                onAnalyze={handleCheckTest}
                selectedResultId={selectedResult?._id}
              />

              {selectedResult && (
                <section className="feedback-section card">
                  {selectedResult?.analysis && (
                    <div className="analysis-wrap">
                      <h4>نتایج آزمون {selectedResult.testType}</h4>
                      <ShowAnalysis
                        testType={selectedResult.testType}
                        analysisData={selectedResult.analysis}
                      />
                    </div>
                  )}

                  <FeedbackPanel
                    show={!selectedResult?.adminFeedback}
                    value={feedback}
                    onChange={setFeedback}
                    onSubmit={handleSubmitFeedback}
                    onCancel={() => {
                      setSelectedResult(null);
                      setFeedback("");
                    }}
                  />
                </section>
              )}
            </main>
          </div>
        </div>
      </div>
    );
  }

  // list view
  return (
    <div className="admin-users-container">
      <section className="admin-users-section card">
        <header className="section-head">
          <h2>مدیریت کاربران</h2>
        </header>

        {loading ? (
          <p>در حال بارگذاری…</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          <>
            <SearchBar
              search={search}
              setSearch={setSearch}
              searchFilter={searchFilter}
              setSearchFilter={setSearchFilter}
            />

            <UsersTable
              users={filteredUsers}
              onView={(u) => setSelectedUser(u)}
              onDelete={handleDeleteUser}
              showAddRow={showAddRow}
              setShowAddRow={setShowAddRow}
              newUser={newUser}
              setNewUser={setNewUser}
              onSubmitNew={handleAddUser}
            />
          </>
        )}
      </section>
    </div>
  );
};

export default UsersPage;
