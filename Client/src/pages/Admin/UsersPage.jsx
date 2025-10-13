// src/pages/UsersPage.jsx — professional, Farsi-first, with robust Print/Download flow
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
  clearResultAnalysis,
} from "../../services/api";
import { useI18n } from "../../i18n";
import PrintChoiceModal from "../../components/User/PrintChoiceModal";

import ShowAnalysis from "../../components/Common/ShowAnalysis";
import SearchBar from "./UsersPage/SearchBar";
import UsersTable from "./UsersPage/UsersTable";
import UserProfileCard from "./UsersPage/UserProfileCard";
import ResultsTable from "./UsersPage/ResultsTable";
import FeedbackPanel from "./UsersPage/FeedbackPanel";

import { usePrintActions, PrintDocument, buildJobsHTML } from "../../print/PrintKit";

import "./UsersPage/usersPage.css";

/* --------------------------------------------------------
   Ensure each result has analysis before printing/downloading
---------------------------------------------------------*/
async function fetchResultsWithAnalyses(list = [], getTestResultsFn) {
  const items = Array.isArray(list) ? list : [];
  const out = [];
  for (const r of items) {
    if (r?.analysis) {
      out.push(r);
      continue;
    }
    const id = r?.resultId || r?._id;
    if (!id) {
      out.push(r);
      continue;
    }
    try {
      const full = await getTestResultsFn(id);
      const data = full?.data ?? full ?? r;
      out.push({ ...r, ...data }); // keep testType/completedAt
    } catch {
      out.push(r); // still show
    }
  }
  return out;
}

/* ========================================================
   Component
======================================================== */
const UsersPage = () => {
  const { t } = useI18n();

  // data
  const [users, setUsers] = useState([]);
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);

  // ui
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddRow, setShowAddRow] = useState(false);

  // bulk analyze ui
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [bulkErrors, setBulkErrors] = useState([]);

  // search
  const [search, setSearch] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  // print modal
  const [printOpen, setPrintOpen] = useState(false);
  const [printing, setPrinting] = useState(false);

  // new user form
  const [newUser, setNewUser] = useState({
    fullName: "",
    period: "",
    username: "",
    role: "user",
    password: "",
  });

  // feedback
  const [feedback, setFeedback] = useState("");

  // load users
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const list = await getUsers();
        const nonAdmin = (list || []).filter((u) => u.role !== "admin");
        if (!ignore) setUsers(nonAdmin);
      } catch {
        if (!ignore) setError(t("usersPage.loadError"));
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [t]);

  // when selecting a user, fetch results
  useEffect(() => {
    (async () => {
      if (!selectedUser) return;
      try {
        const _results =
          (await getUserResults(selectedUser._id)) ||
          selectedUser.testsAssigned ||
          [];
        setUserResults(_results);
      } catch {
        setUserResults(selectedUser.testsAssigned || []);
      }
    })();
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

      alert(res.message || t("usersPage.addSuccess"));
      if (res.user) setUsers((prev) => [...prev, res.user]);
      setNewUser({
        fullName: "",
        period: "",
        username: "",
        role: "user",
        password: "",
      });
      setShowAddRow(false);
    } catch (err) {
      alert(err?.response?.message || t("usersPage.addFailure"));
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm(t("usersPage.deleteUserConfirm"))) return;
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u._id !== id));
      if (selectedUser?._id === id) {
        setSelectedUser(null);
        setUserResults([]);
      }
    } catch {
      alert(t("usersPage.deleteUserFailure"));
    }
  };

  const handleSelectResult = async (resultId) => {
    try {
      const res = await getTestResults(resultId);
      const data = res?.data ?? res;
      setSelectedResult(data);
    } catch {
      alert(t("usersPage.selectResultError"));
    }
  };

  const handleDeleteUserResult = async (resultId) => {
    if (!window.confirm(t("usersPage.deleteResultConfirm"))) return;
    try {
      await deleteResult(resultId);
      setUserResults((prev) =>
        prev.filter((r) => r.resultId !== resultId && r._id !== resultId)
      );
      if (selectedResult?._id === resultId) setSelectedResult(null);
    } catch {
      alert(t("usersPage.deleteResultFailure"));
    }
  };

  const handleCheckTest = async (result) => {
    try {
      const { resultId, testType } = result;
      await analyzeTests({ resultId, testType });
      alert(t("usersPage.analyzeSuccess"));
    } catch {
      alert(t("usersPage.analyzeFailure"));
    }
  };

  const handleRemoveResultAnalysis = async (resultId) => {
    const confirmMessage =
      t("usersPage.deleteAnalysisConfirm") ||
      "Remove the analysis for this result?";
    if (!window.confirm(confirmMessage)) return;

    try {
      await clearResultAnalysis(resultId);

      setUserResults((prev) =>
        prev.map((entry) => {
          const id = entry?.resultId || entry?._id;
          if (id !== resultId) return entry;
          const next = { ...entry };
          delete next.analysis;
          delete next.analyzedAt;
          delete next.score;
          return next;
        })
      );

      setSelectedResult((prev) => {
        if (!prev) return prev;
        const id = prev._id || prev.resultId;
        if (id !== resultId) return prev;
        const next = { ...prev };
        delete next.analysis;
        delete next.analyzedAt;
        delete next.score;
        return next;
      });

      alert(t("usersPage.deleteAnalysisSuccess") || "Analysis removed.");
    } catch {
      alert(
        t("usersPage.deleteAnalysisFailure") ||
          "Unable to remove the analysis."
      );
    }
  };

  // analyze all
  const handleAnalyzeAll = async () => {
    if (!selectedUser) return;

    const items = (userResults || []).filter(
      (r) => r && (r.resultId || r._id) && r.testType
    );

    if (items.length === 0) {
      alert(t("usersPage.noResultsToAnalyze") || "No results to analyze.");
      return;
    }

    setBulkAnalyzing(true);
    setBulkErrors([]);
    setBulkProgress({ done: 0, total: items.length });

    for (let i = 0; i < items.length; i++) {
      const r = items[i];
      const resultId = r.resultId || r._id;
      try {
        await analyzeTests({ resultId, testType: r.testType });
      } catch (e) {
        const message =
          e?.response?.data?.message ||
          e?.message ||
          t("usersPage.analyzeFailure");
        setBulkErrors((prev) => [...prev, { resultId, message }]);
      } finally {
        setBulkProgress({ done: i + 1, total: items.length });
      }
    }

    try {
      const refreshed = await getUserResults(selectedUser._id);
      setUserResults(refreshed || []);
      setSelectedResult(null);
    } catch {
      // ignore
    }

    setBulkAnalyzing(false);

    if (bulkErrors.length === 0) {
      alert(t("usersPage.analyzeAllDone") || "All analyses completed.");
    } else {
      alert(
        (t("usersPage.analyzeAllDoneWithErrors") ||
          "Done with some errors.") +
          ` (${bulkErrors.length})`
      );
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
      alert(t("usersPage.feedbackSuccess"));
      setFeedback("");
      setSelectedResult(null);
      const refreshed = await getUserResults(selectedUser._id);
      setUserResults(refreshed || []);
    } catch {
      alert(t("usersPage.feedbackFailure"));
    }
  };

  /* -------------------- Print / Download -------------------- */
  const openPrintDialog = () => setPrintOpen(true);
  const closePrintDialog = () => setPrintOpen(false);

  const { renderToNewWindowAndPrint, renderHiddenAndSavePdf } = usePrintActions();

  const onPrint = async () => {
    if (!selectedUser) return;
    try {
      setPrinting(true);
      await renderToNewWindowAndPrint(async () => {
        const resultsReady = await fetchResultsWithAnalyses(userResults, getTestResults);
        return (
          <PrintDocument
            user={selectedUser}
            results={resultsReady}
            formatDate={formatDate}
            jobsHTML={buildJobsHTML(resultsReady)}
          />
        );
      });
    } catch (e) {
      alert(t("usersPage.pdfExportFailed") || "خطا در چاپ");
      console.error(e);
    } finally {
      setPrinting(false);
      closePrintDialog();
    }
  };

  const onDownload = async () => {
    if (!selectedUser) return;
    try {
      setPrinting(true);
      const filename = `${(selectedUser?.profile?.fullName || "report")}.pdf`;
      await renderHiddenAndSavePdf(async () => {
        const resultsReady = await fetchResultsWithAnalyses(userResults, getTestResults);
        return (
          <PrintDocument
            user={selectedUser}
            results={resultsReady}
            formatDate={formatDate}
            jobsHTML={buildJobsHTML(resultsReady)}
          />
        );
      }, filename);
    } catch (e) {
      alert(t("usersPage.pdfExportFailed") || "خطا در ساخت PDF");
      console.error(e);
    } finally {
      setPrinting(false);
      closePrintDialog();
    }
  };

  /* -------------------- Render -------------------- */
  if (selectedUser) {
    return (
      <div className="admin-users-container">
        <div className="user-results-layout">
          <header className="user-results-header">
            <div className="user-title">
              <h2>{t("usersPage.selectedTitle")}</h2>
              <h2 className="user-name">{selectedUser?.profile?.fullName}</h2>
            </div>

            <div className="user-actions">
              <button
                style={{ background: "var(--secondary)" }}
                className="btn"
                onClick={handleAnalyzeAll}
                disabled={bulkAnalyzing}
                title={bulkAnalyzing ? `${bulkProgress.done}/${bulkProgress.total}` : ""}
              >
                {bulkAnalyzing
                  ? `${t("usersPage.analyzing")} ${bulkProgress.done}/${bulkProgress.total}`
                  : t("usersPage.analyzeAll")}
              </button>

              <button className="btn" style={{ background:"var(--text)", color:"var(--bg)" }} onClick={openPrintDialog}>
                {t("usersPage.printResume")}
              </button>

              <button
                style={{ color: "var(--text)" }}
                className="btn danger"
                onClick={() => setSelectedUser(null)}
              >
                {t("usersPage.back")}
              </button>
            </div>
          </header>

          <PrintChoiceModal
            open={printOpen}
            busy={printing}
            title="خروجی کارنامه"
            message="می‌خواهید گزارش چاپ شود یا به صورت PDF دانلود گردد؟"
            printLabel="چاپ"
            downloadLabel="دانلود PDF"
            cancelLabel="انصراف"
            onPrint={printing ? undefined : onPrint}
            onDownload={printing ? undefined : onDownload}
            onCancel={printing ? undefined : closePrintDialog}
            dir="rtl"
          />

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
                onRemoveAnalysis={handleRemoveResultAnalysis}
                selectedResultId={selectedResult?._id || selectedResult?.resultId}
              />

              {selectedResult && (
                <section className="feedback-section card">
                  {selectedResult?.analysis && (
                    <div className="analysis-wrap">
                      <h4>
                        {t("usersPage.analysisHeading", {
                          testType: selectedResult.testType,
                        })}
                      </h4>
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

  return (
    <div className="admin-users-container">
      <section className="admin-users-section card">
        <header className="section-head">
          <h2>{t("usersPage.title")}</h2>
        </header>

        {loading ? (
          <p>{t("usersPage.loadingList")}</p>
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
