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

import ShowAnalysis from "../../components/Common/ShowAnalysis";
import SearchBar from "./UsersPage/SearchBar";
import UsersTable from "./UsersPage/UsersTable";
import UserProfileCard from "./UsersPage/UserProfileCard";
import ResultsTable from "./UsersPage/ResultsTable";
import FeedbackPanel from "./UsersPage/FeedbackPanel";
import { printUserReport } from "./UsersPage/printUserReport.js";
import { printElementToPDF, printHTMLStringToPDF } from "../../report/printUtils";
import AllocationReport from "./TestStatus/AllocationReport.jsx";

import "./UsersPage/usersPage.css";

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
  const [bulkErrors, setBulkErrors] = useState([]); // array of {resultId, message}

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
        if (!ignore) setError(t("usersPage.loadError"));
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    run();
    return () => {
      ignore = true;
    };
  }, [t]);

  // when selecting a user, fetch results (or use embedded)
  useEffect(() => {
    const run = async () => {
      if (!selectedUser) return;
      try {
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

      alert(res.message || t("usersPage.addSuccess"));
      if (res.user) setUsers((prev) => [...prev, res.user]);
      setNewUser({ fullName: "", period: "", username: "", role: "user", password: "" });
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
      setUserResults((prev) => prev.filter((r) => r.resultId !== resultId && r._id !== resultId));
      if (selectedResult?._id === resultId) setSelectedResult(null);
    } catch {
      alert(t("usersPage.deleteResultFailure"));
    }
  };

  const handleCheckTest = async (result) => {
    try {
      const { resultId, testType } = result;
      const response = await analyzeTests({ resultId, testType });
      console.log("Analysis response", response?.data || response);
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

  // ?? NEW: Analyze all results sequentially (one-by-one)
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

    // Refresh results after batch
    try {
      const refreshed = await getUserResults(selectedUser._id);
      setUserResults(refreshed || []);
      setSelectedResult(null);
    } catch {
      // ignore; we already ran the batch
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

  const buildGroupReportData = (resp, capacitiesObj = {}, usersList = []) => {
    const userMeta = new Map(
      (usersList || []).map((u) => {
        const id = String(u?._id || u?.id || "");
        return [
          id,
          {
            fullName:
              u?.profile?.fullName || u?.fullName || u?.username || "",
            phone: u?.profile?.phone || u?.phone || "",
            username: u?.username || "",
          },
        ];
      })
    );

    const allocations = {};
    const quotas = {};
    Object.entries(capacitiesObj || {}).forEach(([jobKey, count]) => {
      quotas[jobKey] = {
        name: jobRequirements[jobKey]?.name || jobKey,
        tableCount: Number(count) || 0,
      };
    });

    const rows = Array.isArray(resp?.table) ? [...resp.table] : [];
    const grouped = new Map();
    rows.forEach((row) => {
      const job = row?.job;
      if (!job) return;
      const bucket = grouped.get(job) || [];
      bucket.push(row);
      grouped.set(job, bucket);
    });

    grouped.forEach((entries, job) => {
      entries.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
      allocations[job] = {
        name: job,
        persons: entries.map((entry) => {
          const meta = userMeta.get(String(entry.userId)) || {};
          return {
            id: entry.userId,
            rank: entry.rank,
            score: entry.score,
            fullName:
              entry.fullName || meta.fullName || meta.username || entry.userId,
            phone: meta.phone || "",
          };
        }),
      };
    });

    Object.keys(capacitiesObj || {}).forEach((job) => {
      if (!allocations[job]) {
        allocations[job] = { name: job, persons: [] };
      }
    });

    return { allocations, quotas, selectedUsers: usersList };
  };

  // eslint-disable-next-line no-unused-vars
  const handlePrintGroupPrioritization = async (
    selectedUsersList = [],
    capacities = {},
    weights = {}
  ) => {
    try {
      const userIds = (selectedUsersList || [])
        .map((u) => u?._id || u?.id)
        .filter(Boolean);
      if (!userIds.length) {
        alert(t("usersPage.noUsersSelected") || "No users selected.");
        return;
      }

      if (
        !capacities ||
        typeof capacities !== "object" ||
        !Object.keys(capacities).length
      ) {
        throw new Error("CAPACITIES_REQUIRED");
      }

      const response = await fetch("/results/jobs/prioritize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds, capacities, weights }),
      });

      const data = await response.json();
      if (!data?.ok) {
        throw new Error(data?.error || "PRIORITIZE_FAILED");
      }

      if (data.export?.html) {
        await printHTMLStringToPDF(data.export.html, "prioritization.pdf");
      } else {
        await import("../../report/report.css");
        const { createRoot } = await import("react-dom/client");

        const host = document.createElement("div");
        host.style.position = "fixed";
        host.style.left = "-99999px";
        host.style.top = "0";
        host.className = "report-root";
        host.setAttribute("dir", "rtl");
        document.body.appendChild(host);

        const root = createRoot(host);
        const allocationData = buildGroupReportData(
          data,
          capacities,
          selectedUsersList
        );

        root.render(
          <AllocationReport
            selectedUsers={allocationData.selectedUsers}
            assignmentResult={{
              allocations: allocationData.allocations,
              quotas: allocationData.quotas,
            }}
          />
        );

        await new Promise((resolve) => setTimeout(resolve, 300));
        await printElementToPDF(host, "prioritization.pdf");
        root.unmount();
        document.body.removeChild(host);
      }

      const csvSource =
        data.export?.csv ||
        (data.export?.csvBase64 ? atob(data.export.csvBase64) : "");
      if (csvSource) {
        const blob = new Blob([csvSource], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "prioritization.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }
    } catch (error) {
      console.error("print prioritization failed:", error);
      alert("خطا در تولید گزارش اولویت‌بندی");
    }
  };

  const handlePrintUserResume = () => {
    if (!selectedUser) return;
    if (!selectedUser?.profile?.age) {
      alert(
        t("usersPage.resumeMissingAge", {
          name: selectedUser?.profile?.fullName || "",
        })
      );
      return;
    }
    if (!window.confirm(t("usersPage.printConfirm"))) return;
    const html = printUserReport({ user: selectedUser, results: userResults, formatDate });
    const w = window.open("", "_blank");
    if (!w) return alert(t("usersPage.popupBlocked"));
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  function escapeHTML(str = "") {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  /**
   * Builds a full printable HTML:
   *  - Cover/summary page (personal info + sorting suggestions)
   *  - One page per test analysis
   */
  function printAllAnalysesReport({ user, results, formatDate, t }) {
    const profile = user?.profile || {};
    const fullName = profile.fullName || user?.username || "�";
    const period = user?.period || "�";
    const age = profile.age != null ? profile.age : "�";
    const job = profile.jobPosition || "�";
    const province = profile.province || "�";
    const createdAt = user?.createdAt ? formatDate(user.createdAt) : "�";
  
    // Gather suggestions from each test analysis if present
    const allSuggestions = [];
    const safeResults = (results || []).filter(Boolean);
    safeResults.forEach((r) => {
      const suggs =
        r?.analysis?.suggestions ||
        r?.analysis?.recommendations ||
        r?.analysis?.careerSuggestions ||
        [];
      if (Array.isArray(suggs)) {
        suggs.forEach((s) => {
          if (s && typeof s === "string") allSuggestions.push(s);
          else if (s?.title) allSuggestions.push(s.title);
        });
      }
    });
  
    // Deduplicate & cap suggestions (nice for 1st page)
    const dedupSuggestions = Array.from(new Set(allSuggestions)).slice(0, 10);
  
    // Card builder for a test page
    const renderTestPage = (r, idx) => {
      const title = r?.testType || `Test #${idx + 1}`;
      const when = r?.createdAt ? formatDate(r.createdAt) : "�";
      const summary =
        r?.analysis?.summary ||
        r?.analysis?.overall ||
        r?.analysis?.overview ||
        "";
  
      const strengths = r?.analysis?.strengths || [];
      const weaknesses = r?.analysis?.weaknesses || [];
      const scores = r?.analysis?.scores || r?.analysis?.score || null;
      const tips =
        r?.analysis?.tips ||
        r?.analysis?.recommendations ||
        r?.analysis?.suggestions ||
        [];
  
      const adminFeedback = r?.adminFeedback || "";
  
      const renderList = (items) =>
        Array.isArray(items) && items.length
          ? `<ul>${items
              .map((x) => `<li>${escapeHTML(typeof x === "string" ? x : x?.title || JSON.stringify(x))}</li>`)
              .join("")}</ul>`
          : `<p class="muted">�</p>`;
  
      const renderScores = (obj) => {
        if (!obj || typeof obj !== "object") return `<p class="muted">�</p>`;
        const rows = Object.entries(obj).map(
          ([k, v]) =>
            `<tr><td>${escapeHTML(k)}</td><td>${escapeHTML(
              typeof v === "number" ? v.toString() : JSON.stringify(v)
            )}</td></tr>`
        );
        return `<table class="scores"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>${rows.join(
          ""
        )}</tbody></table>`;
      };
  
      return `
        <section class="page">
          <header class="page-head">
            <h2>${escapeHTML(title)}</h2>
            <div class="meta">
              <span>${escapeHTML(t("usersPage.date") || "Date")}: ${escapeHTML(when)}</span>
            </div>
          </header>
  
          <div class="grid">
            <div class="block">
              <h3>${escapeHTML(t("usersPage.analysisSummary") || "Summary")}</h3>
              <p>${escapeHTML(summary || "�")}</p>
            </div>
  
            <div class="block">
              <h3>${escapeHTML(t("usersPage.scores") || "Scores")}</h3>
              ${renderScores(scores)}
            </div>
  
            <div class="block two-col">
              <div>
                <h3>${escapeHTML(t("usersPage.strengths") || "Strengths")}</h3>
                ${renderList(strengths)}
              </div>
              <div>
                <h3>${escapeHTML(t("usersPage.weaknesses") || "Weaknesses")}</h3>
                ${renderList(weaknesses)}
              </div>
            </div>
  
            <div class="block">
              <h3>${escapeHTML(t("usersPage.recommendations") || "Recommendations")}</h3>
              ${renderList(tips)}
            </div>
  
            <div class="block">
              <h3>${escapeHTML(t("usersPage.adminFeedback") || "Admin feedback")}</h3>
              <p>${escapeHTML(adminFeedback || "�")}</p>
            </div>
          </div>
        </section>
      `;
    };
  
    const head = `
      <head>
        <meta charset="utf-8" />
        <title>${escapeHTML(fullName)} - ${escapeHTML(t("usersPage.fullAnalysis") || "Full Analysis")}</title>
        <style>
          @page { size: A4; margin: 16mm; }
          * { box-sizing: border-box; }
          body { font-family: -apple-system, Segoe UI, Roboto, "Vazirmatn", Arial, sans-serif; color: #111; }
          h1, h2, h3 { margin: 0 0 8px; }
          .muted { opacity: 0.65; }
          .page { page-break-after: always; }
          .cover { display: flex; flex-direction: column; gap: 12px; }
          .row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
          .grid { display: grid; gap: 12px; }
          .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
          .meta { font-size: 12px; color: #444; display: flex; gap: 12px; }
          table.scores { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; }
          table.scores th, table.scores td { padding: 6px 8px; border-bottom: 1px solid #eee; text-align: left; }
          ul { margin: 6px 0 0 18px; }
          header.page-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
          .kicker { color: #666; font-size: 12px; }
        </style>
      </head>
    `;
  
    const coverPage = `
      <section class="page">
        <div class="cover">
          <div>
            <span class="kicker">${escapeHTML(t("usersPage.report") || "Report")}</span>
            <h1>${escapeHTML(fullName)}</h1>
          </div>
          <div class="card">
            <h3>${escapeHTML(t("usersPage.personalInfo") || "Personal info")}</h3>
            <div class="row">
              <div><strong>${escapeHTML(t("usersPage.name") || "Name")}:</strong> ${escapeHTML(fullName)}</div>
              <div><strong>${escapeHTML(t("usersPage.age") || "Age")}:</strong> ${escapeHTML(String(age))}</div>
              <div><strong>${escapeHTML(t("usersPage.period") || "Period")}:</strong> ${escapeHTML(period)}</div>
              <div><strong>${escapeHTML(t("usersPage.job") || "Job")}:</strong> ${escapeHTML(job)}</div>
              <div><strong>${escapeHTML(t("usersPage.province") || "Province")}:</strong> ${escapeHTML(province)}</div>
              <div><strong>${escapeHTML(t("usersPage.createdAt") || "Created at")}:</strong> ${escapeHTML(createdAt)}</div>
            </div>
          </div>
  
          <div class="card">
            <h3>${escapeHTML(t("usersPage.sortingSuggestions") || "Sorting suggestions")}</h3>
            ${
              dedupSuggestions.length
                ? `<ul>${dedupSuggestions.map((s) => `<li>${escapeHTML(s)}</li>`).join("")}</ul>`
                : `<p class="muted">�</p>`
            }
          </div>
  
          <div class="card">
            <h3>${escapeHTML(t("usersPage.testsOverview") || "Tests overview")}</h3>
            <p class="muted">
              ${escapeHTML(
                t("usersPage.testsCount", { count: safeResults.length }) ||
                  `Total tests: ${safeResults.length}`
              )}
            </p>
            <ul>
              ${safeResults
                .map((r, i) => {
                  const tt = r?.testType || `Test #${i + 1}`;
                  const dt = r?.createdAt ? formatDate(r.createdAt) : "�";
                  return `<li><strong>${escapeHTML(tt)}</strong> � ${escapeHTML(dt)}</li>`;
                })
                .join("")}
            </ul>
          </div>
        </div>
      </section>
    `;
  
    const testsPages = safeResults.map((r, i) => renderTestPage(r, i)).join("");
  
    return `
      <!doctype html>
      <html lang="fa">
        ${head}
        <body>
          ${coverPage}
          ${testsPages}
        </body>
      </html>
    `;
  }

  const handlePrintOrDownloadAllAnalyses = () => {
    if (!selectedUser) return;
  
    const html = printAllAnalysesReport({
      user: selectedUser,
      results: userResults,
      formatDate,
      t,
    });
  
    const userWantsToPrint = window.confirm(
      t("usersPage.choosePrintOrDownload") ||
        "Click OK to PRINT or Cancel to DOWNLOAD PDF"
    );
  
    if (userWantsToPrint) {
      // ?? PRINT
      const w = window.open("", "_blank");
      if (!w) {
        alert(t("usersPage.popupBlocked"));
        return;
      }
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    } else {
      // ?? DOWNLOAD PDF
      const container = document.createElement("div");
      container.innerHTML = html;
  
      const opt = {
        margin: 0,
        filename: `${selectedUser?.profile?.fullName || "report"}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };
  
      html2pdf().from(container).set(opt).save();
    }
  };
  

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
              {/* ?? FIX: this was calling print; now runs sequential analysis */}
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
              <button className="btn primary" onClick={handlePrintOrDownloadAllAnalyses}>
                {t("usersPage.printResume")}
              </button>
              <button style={{color: "var(--text)"}}  className="btn danger" onClick={() => setSelectedUser(null)}>
                {t("usersPage.back")}
              </button>
              
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

