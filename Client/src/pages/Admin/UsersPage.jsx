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
  const [activeMutation, setActiveMutation] = useState(null);

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

  const refreshUsers = useCallback(async () => {
    const list = await getUsers();
    const nonAdmin = (list || []).filter((u) => u.role !== "admin");
    setUsers(nonAdmin);
    return nonAdmin;
  }, []);

  const refreshAdminData = useCallback(
    async ({ userId = selectedUser?._id, resultId = selectedResult?._id } = {}) => {
      const [freshUsers, freshResults] = await Promise.all([
        refreshUsers(),
        userId ? getUserResults(userId) : Promise.resolve([]),
      ]);

      const nextSelectedUser = userId
        ? freshUsers.find((user) => String(user._id) === String(userId)) || selectedUser
        : null;
      const nextResults = Array.isArray(freshResults) ? freshResults : [];

      if (userId) {
        setSelectedUser(nextSelectedUser);
        setUserResults(nextResults);
      }

      if (resultId) {
        const nextSelectedResult = nextResults.find((entry) => {
          const id = entry?.resultId || entry?._id;
          return String(id) === String(resultId);
        });
        setSelectedResult(nextSelectedResult || null);
      }

      return { users: freshUsers, results: nextResults };
    },
    [refreshUsers, selectedResult?._id, selectedUser]
  );

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

  //#region // actions
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
      await refreshUsers();
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
      await refreshUsers();
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
    if (activeMutation) return;
    try {
      setActiveMutation(`delete:${resultId}`);
      await deleteResult(resultId);
      await refreshAdminData({ userId: selectedUser?._id, resultId: null });
      setSelectedResult(null);
    } catch {
      alert(t("usersPage.deleteResultFailure"));
    } finally {
      setActiveMutation(null);
    }
  };

  const handleCheckTest = async (result) => {
    const resultId = result?.resultId || result?._id;
    if (!resultId || activeMutation) return;
    try {
      setActiveMutation(`analyze:${resultId}`);
      await analyzeTests({ resultId, testType: result.testType });
      await refreshAdminData({ userId: selectedUser?._id, resultId });
      alert(t("usersPage.analyzeSuccess"));
    } catch {
      alert(t("usersPage.analyzeFailure"));
    } finally {
      setActiveMutation(null);
    }
  };

  const handleRemoveResultAnalysis = async (resultId) => {
    const confirmMessage =
      t("usersPage.deleteAnalysisConfirm") ||
      "Remove the analysis for this result?";
    if (!window.confirm(confirmMessage)) return;
    if (activeMutation) return;

    try {
      setActiveMutation(`clear:${resultId}`);
      await clearResultAnalysis(resultId);
      await refreshAdminData({ userId: selectedUser?._id, resultId });
      alert(t("usersPage.deleteAnalysisSuccess") || "Analysis removed.");
    } catch {
      alert(
        t("usersPage.deleteAnalysisFailure") ||
          "Unable to remove the analysis."
      );
    } finally {
      setActiveMutation(null);
    }
  };
//#endregion

  // analyze all
  const handleAnalyzeAll = async () => {
    if (!selectedUser || bulkAnalyzing) return;

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
    const errors = [];

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
        errors.push({ resultId, message });
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

    if (errors.length === 0) {
      alert(t("usersPage.analyzeAllDone") || "All analyses completed.");
    } else {
      alert(
        (t("usersPage.analyzeAllDoneWithErrors") ||
          "Done with some errors.") +
          ` (${errors.length})`
      );
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim() || !selectedResult || !selectedUser || activeMutation) return;
    const resultId = selectedResult._id || selectedResult.resultId;
    try {
      setActiveMutation(`feedback:${resultId}`);
      await submitTestFeedback({
        userId: selectedUser._id,
        resultId,
        feedback,
      });
      alert(t("usersPage.feedbackSuccess"));
      setFeedback("");
      await refreshAdminData({ userId: selectedUser._id, resultId });
    } catch {
      alert(t("usersPage.feedbackFailure"));
    } finally {
      setActiveMutation(null);
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
            jobsHTML={buildJobsHTML.length >= 2 ? buildJobsHTML(resultsReady, selectedUser)
                                    : buildJobsHTML(resultsReady)}

          />
        );
      }, { title: (selectedUser?.profile?.fullName || "report") } );
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
      const baseName = selectedUser?.profile?.fullName || selectedUser?.username || "report";
      const filename = `${baseName}-${new Date().toISOString().slice(0, 10)}.pdf`;
      await renderHiddenAndSavePdf(async () => {
        const resultsReady = await fetchResultsWithAnalyses(userResults, getTestResults);
        return (
          <PrintDocument
            user={selectedUser}
            results={resultsReady}
            formatDate={formatDate}
            jobsHTML={buildJobsHTML(resultsReady,selectedUser)}
          />
        );
      }, { title: baseName, filename });
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
                busy={Boolean(activeMutation)}
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
