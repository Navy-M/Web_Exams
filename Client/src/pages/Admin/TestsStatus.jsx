// src/pages/Admin/TestsStatus.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  getUsers,
  getUserResults,
  getTestResults,
  prioritizeUsers, // باید مطابق: API.post("/jobs/prioritize", { userIds, capacities, weights })
} from "../../services/api";

import "../../styles/TestsStatus.css";

import ControlsBar from "./TestStatus/ControlsBar";
import UsersTable from "./TestStatus/UsersTable";
import BulkActionsBar from "./TestStatus/BulkActionsBar";
import JobQuotaModal from "./TestStatus/JobQuotaModal";
import AllocationReport from "./TestStatus/AllocationReport";

import * as JR from "../../utils/jobRanking";
import { jobRequirements } from "../../services/dummyData";

/* ===================== تنظیمات اولیه ===================== */
const DEFAULT_QUOTAS = {
  job1: { name: "ناوبری و فرماندهی کشتی", tableCount: 0 },
  job2: { name: "مهندسی مکانیک و موتور دریایی", tableCount: 0 },
  job3: { name: "مهندسی برق و الکترونیک دریایی", tableCount: 0 },
  job4: { name: "تفنگدار دریایی", tableCount: 0 },
  job5: { name: "کمیسر دریایی", tableCount: 0 },
};

// حداقل امتیاز برای ورود به رقابت یک شغل
const MIN_SCORE_FOR_CONSIDERATION = 35;

/* ===================== Helpers ===================== */
async function fetchResultsWithAnalyses(list = [], getTestResultsFn) {
  const items = Array.isArray(list) ? list : [];
  const out = [];
  for (const r of items) {
    if (r?.analysis) { out.push(r); continue; }
    const id = r?.resultId || r?._id;
    if (!id) { out.push(r); continue; }
    try {
      const full = await getTestResultsFn(id);
      const data = full?.data ?? full ?? r;
      out.push({ ...r, ...data });
    } catch {
      out.push(r);
    }
  }
  return out;
}

// نتایج همه‌ی کاربران انتخاب‌شده را با analysis برمی‌گرداند: Map<userId, results[]>
async function fetchSelectedUsersResults(userIds = []) {
  const out = new Map();
  for (const uid of userIds) {
    try {
      const list = (await getUserResults(uid)) || [];
      const ready = await fetchResultsWithAnalyses(list, getTestResults);
      out.set(uid, ready);
    } catch {
      out.set(uid, []);
    }
  }
  return out;
}

// نرمال‌سازی سهمیه‌ها به { "نام شغل": number }
function normalizeQuotas(q = {}) {
  const m = {};
  Object.values(q || {}).forEach((row) => {
    const name = row?.name;
    const c = Number(row?.tableCount || 0);
    if (name && c > 0) m[name] = c;
  });
  return m;
}

// نگاشت ساده خانواده‌ی رشته‌ها
function normalizeMajorFa(s = "") {
  const v = String(s || "").trim();
  if (!v) return "";
  if (/ریاضی|ریاضی فیزیک|ریاضی‌فیزیک/i.test(v)) return "ریاضی";
  if (/تجربی|علوم تجربی/i.test(v)) return "تجربی";
  if (/فنی|کاردانش|فنی حرفه/i.test(v)) return "فنی";
  if (/انسانی|ادبیات|علوم انسانی/i.test(v)) return "انسانی";
  return v;
}

// امتیاز رشته نسبت به نیازمندی‌های هر شغل
function scoreMajorForJob(userMajor, jobReq, mode = "family") {
  const wanted = jobReq?.education || [];
  if (!wanted.length) return 50; // خنثی
  const um = normalizeMajorFa(userMajor);
  if (!um) return 0;

  if (mode === "exact") {
    const hit = wanted.some((w) => normalizeMajorFa(w) === um);
    return hit ? 100 : 0;
  }
  const wNorm = wanted.map(normalizeMajorFa);
  if (wNorm.includes(um)) return 100;
  const loose = wanted.some((w) => String(w).includes(userMajor) || userMajor.includes(String(w)));
  return loose ? 70 : 0;
}

// امتیاز معدل (۰..۱۰۰)
function scoreGPA(value, scale = "0-20") {
  const v = Number(value);
  if (!Number.isFinite(v)) return 0;
  if (scale === "0-4") return Math.max(0, Math.min(100, (v / 4) * 100));
  return Math.max(0, Math.min(100, (v / 20) * 100));
}

// وزن‌های آزمون‌ها از انتخاب‌های کاربر (on/off)
function weightsFromTestToggles(toggles = {}) {
  return {
    disc: toggles?.DISC ? 1 : 0,
    mbti: toggles?.MBTI ? 1 : 0,
    holland: toggles?.HOLLAND ? 1 : 0,
    gardner: toggles?.GARDNER ? 1 : 0,
    clifton: toggles?.CLIFTON ? 1 : 0,
    pf: toggles?.PERSONAL_FAVORITES ? 1 : 0,
  };
}

// Wrapper امن برای rank تابع
function rankJobsSafe(jobReqs, results, userEducation, testWeights) {
  const rankRich =
    JR.rankJobsForUserRich ||
    JR.rankJobsForUserRICH ||
    JR.rankJobsForUser_Advanced;
  const rankBasic = JR.rankJobsForUser || JR.rankJobs || JR.default;

  if (typeof rankRich === "function") {
    return rankRich(jobReqs, results, userEducation, testWeights);
  }
  if (typeof rankBasic === "function") {
    return rankBasic(jobReqs, results, testWeights);
  }
  console.warn("No ranking function exported from utils/jobRanking.ts");
  return Object.keys(jobReqs).map((job) => ({ job, score: 0, reasons: [] }));
}

// تخصیص با ظرفیت‌ها (با لحاظ آزمون‌ها + معدل + رشته)
function allocateWithCapacities(usersArr, resultsMap, quotasByJob, modalPayload) {
  const placements = {}; // { jobName: [{userId, score}] }
  Object.keys(quotasByJob).forEach((k) => (placements[k] = []));

  const unplaced = [];
  const meta = { scoredUsers: 0 };

  const testsWeights = weightsFromTestToggles(modalPayload?.selectedTests || {});
  const useGPA = !!modalPayload?.education?.useGPA;
  const gpaWeight = useGPA ? Number(modalPayload.education.gpaWeight || 0) : 0;
  const gpaScale = modalPayload?.education?.gpaScale || "0-20";

  const useMajor = !!modalPayload?.education?.useMajor;
  const majorWeight = useMajor ? Number(modalPayload.education.majorWeight || 0) : 0;
  const majorMode = modalPayload?.education?.majorMode || "family";

  const testsWeightShare =
    (testsWeights.disc +
      testsWeights.mbti +
      testsWeights.holland +
      testsWeights.gardner +
      testsWeights.clifton +
      testsWeights.pf) > 0
      ? 100
      : 0;

  const totalWeight = testsWeightShare + gpaWeight + majorWeight || 1;

  for (const u of usersArr) {
    const uid = u?._id || u?.id;
    const results = resultsMap.get(uid) || [];

    const userEducation = u?.profile?.field || u?.profile?.education || "";
    const userGPA =
      u?.profile?.diplomaAverage ??
      u?.profile?.gpa20 ??
      (u?.profile?.gpa4 ? (u.profile.gpa4 * 5) : null);

    const baseRanks = rankJobsSafe(jobRequirements, results, userEducation, testsWeights);
    const baseScoreByJob = {};
    baseRanks.forEach((row) => (baseScoreByJob[row.job] = row.score || 0));

    const combined = Object.keys(quotasByJob).map((jobName) => {
      const jobReq = jobRequirements[jobName] || {};
      const base = baseScoreByJob[jobName] ?? 0;

      const majorScore = useMajor ? scoreMajorForJob(userEducation, jobReq, majorMode) : 0;
      const gpaScore = useGPA ? scoreGPA(userGPA, gpaScale) : 0;

      const final =
        ((base * testsWeightShare) + (majorScore * majorWeight) + (gpaScore * gpaWeight)) / totalWeight;

      return { jobName, finalScore: Math.round(final) };
    });

    const filtered = combined
      .filter((x) => x.finalScore >= MIN_SCORE_FOR_CONSIDERATION)
      .sort((a, b) => b.finalScore - a.finalScore);

    meta.scoredUsers++;

    let placed = false;
    for (const c of filtered) {
      const cap = quotasByJob[c.jobName] || 0;
      const taken = (placements[c.jobName] || []).length;
      if (taken < cap) {
        placements[c.jobName].push({ userId: uid, score: c.finalScore });
        placed = true;
        break;
      }
    }
    if (!placed) {
      unplaced.push({ userId: uid, reason: "No capacity or low score", tried: filtered.map(f => f.jobName) });
    }
  }

  Object.keys(placements).forEach((job) => {
    placements[job].sort((a, b) => b.score - a.score);
  });

  return { placements, unplaced, meta };
}

// تبدیل خروجی سرور → AllocationReport
function shapeServerToAllocationReport(server, usersById) {
  const allocations = {};
  (server.assignments || []).forEach(({ job, slots }) => {
    allocations[job] = {
      name: job,
      persons: (slots || []).map((s, idx) => {
        const u = usersById.get(s.userId) || {};
        const p = u.profile || {};
        return {
          id: s.userId,
          rank: idx + 1,
          score: Math.round(Number(s.score || 0)),
          fullName: p.fullName || u.username || "بدون نام",
          phone: p.phone || u.phone || "بدون شماره",
        };
      }),
    };
  });
  return { allocations };
}

/* ===================== Component ===================== */
const TestsStatus = () => {
  // data
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignmentResult, setAssignmentResult] = useState(null);

  // filters
  const [search, setSearch] = useState("");
  const [searchFilter, setSearchFilter] = useState(""); // '', name, role, job, province, period
  const [visibleCount, setVisibleCount] = useState(10);

  // selection
  const [selected, setSelected] = useState(() => new Set());

  // prioritization modal & quotas
  const [showPrioritizationModal, setShowPrioritizationModal] = useState(false);
  const [jobQuotas, setJobQuotas] = useState(DEFAULT_QUOTAS);

  // fetch users
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        const data = await getUsers();
        if (!ignore) setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching users", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  // helpers
  const lc = (v) => (v ?? "").toString().toLowerCase();

  const filteredUsers = useMemo(() => {
    if (!search) return users;
    const q = lc(search);
    return users.filter((u) => {
      if (searchFilter === "name") return lc(u.profile?.fullName).includes(q);
      if (searchFilter === "period") return lc(u.period).includes(q);
      if (searchFilter === "role") return lc(u.role).includes(q);
      if (searchFilter === "job") return lc(u.profile?.jobPosition).includes(q);
      if (searchFilter === "province") return lc(u.profile?.province).includes(q);
      return (
        lc(u.profile?.fullName).includes(q) ||
        lc(u.email).includes(q) ||
        lc(u.role).includes(q) ||
        lc(u.profile?.jobPosition).includes(q) ||
        lc(u.profile?.province).includes(q)
      );
    });
  }, [users, search, searchFilter]);

  const visibleUsers = useMemo(
    () => filteredUsers.slice(0, visibleCount),
    [filteredUsers, visibleCount]
  );

  const isAllVisibleSelected = useMemo(
    () => visibleUsers.length > 0 && visibleUsers.every((u) => selected.has(u._id)),
    [visibleUsers, selected]
  );

  // selection handlers
  const toggleUser = useCallback((id) => {
    setSelected((prev) => {
      const copy = new Set(prev);
      copy.has(id) ? copy.delete(id) : copy.add(id);
      return copy;
    });
  }, []);

  const toggleAllVisible = useCallback(() => {
    setSelected((prev) => {
      const copy = new Set(prev);
      const allSelected = visibleUsers.every((u) => copy.has(u._id));
      visibleUsers.forEach((u) => {
        if (allSelected) copy.delete(u._id);
        else copy.add(u._id);
      });
      return copy;
    });
  }, [visibleUsers]);

  // پاکسازی انتخاب‌های نامعتبر
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set();
      prev.forEach((id) => {
        if (filteredUsers.some((u) => u._id === id)) next.add(id);
      });
      return next;
    });
  }, [filteredUsers, visibleCount]);

  /* ===================== Prioritization Flow ===================== */
  const handleStartPrioritization = () => {
    if (selected.size === 0) return alert("ابتدا چند کاربر را انتخاب کنید");
    setShowPrioritizationModal(true);
  };

  // نسخه‌ی نهایی: اول API، بعد فالبک محلی — با لحاظ تنظیمات مودال
  const submitPrioritization = async (modalPayload) => {
    const people = Array.from(selected);
    if (!people.length) {
      alert("ابتدا چند کاربر را انتخاب کنید");
      return;
    }

    // 1) تلاش با API
    try {
      const res = await prioritizeUsers({
        userIds: people,
        capacities: modalPayload?.capacities,     // از JobQuotaModal ساخته می‌شود
        weights: modalPayload?.serverWeights,     // وزن‌های ساده آزمون‌ها
      });

      if (res?.ok) {
        const selectedUsers = users.filter(u => selected.has(u._id));
        const map = new Map(selectedUsers.map(u => [u._id, u]));
        const shaped = shapeServerToAllocationReport(res, map);

        setAssignmentResult({
          ...shaped,
          quotas: modalPayload?.quotas || jobQuotas,
          meta: { source: "api" },
        });
        setShowPrioritizationModal(false);
        return;
      }
    } catch (err) {
      console.warn("prioritizeUsers API failed, falling back to local:", err?.message || err);
    }

    // 2) فالبک محلی
    try {
      const selectedUsers = users.filter((u) => selected.has(u._id));
      const resultsMap = await fetchSelectedUsersResults(selectedUsers.map((u) => u._id));
      const quotasByJob = normalizeQuotas(modalPayload?.quotas || jobQuotas);

      const local = allocateWithCapacities(selectedUsers, resultsMap, quotasByJob, modalPayload);

      const shaped = {
        allocations: Object.fromEntries(
          Object.entries(local.placements).map(([job, arr]) => [
            job,
            {
              name: job,
              persons: arr.map(({ userId, score }, idx) => {
                const u = selectedUsers.find((x) => (x._id || x.id) === userId) || {};
                const p = u.profile || {};
                return {
                  id: userId,
                  rank: idx + 1,
                  score,
                  fullName: p.fullName || u.username || "بدون نام",
                  phone: p.phone || u.phone || "بدون شماره",
                };
              }),
            },
          ])
        ),
        quotas: modalPayload?.quotas || jobQuotas,
        meta: { ...local.meta, source: "local" },
      };

      setAssignmentResult(shaped);
      setShowPrioritizationModal(false);
    } catch (err) {
      console.error("Error in local prioritization:", err);
      alert("خطا در اولویت‌بندی محلی");
    }
  };

  /* ===================== Bulk demo actions ===================== */
  const handleBulkDeleteFromView = () => {
    if (!selected.size) return;
    if (!window.confirm("حذف از جدول نمایش (نه از سرور)؟")) return;
    setUsers((prev) => prev.filter((u) => !selected.has(u._id)));
    setSelected(new Set());
  };

  const handleBulkMakeGroup = () => {
    if (!selected.size) return;
    console.log("Make group of IDs:", Array.from(selected));
    alert("ساخت گروه (دمو) — می‌تونیم اینو به API وصل کنیم.");
  };

  /* ===================== Render: allocation report ===================== */
  if (assignmentResult) {
    const selectedUsers = users.filter((u) => selected.has(u._id));
    return (
      <section className="tests-status card" dir="rtl">
        <AllocationReport
          selectedUsers={selectedUsers}
          assignmentResult={assignmentResult}
        />
        <div className="footer-actions">
          <button className="btn ghost" onClick={() => setAssignmentResult(null)}>
            بازگشت
          </button>
        </div>
      </section>
    );
  }

  /* ===================== Render: main ===================== */
  return (
    <section className="tests-status card" dir="rtl">
      <header className="ts-head">
        <h2>وضعیت آزمون‌های کاربران</h2>
        <span className="muted">
          {loading ? "در حال بارگذاری..." : `${filteredUsers.length} نتیجه • نمایش ${visibleUsers.length}`}
        </span>
      </header>

      <ControlsBar
        search={search}
        setSearch={setSearch}
        searchFilter={searchFilter}
        setSearchFilter={setSearchFilter}
        visibleCount={visibleCount}
        setVisibleCount={setVisibleCount}
      />

      <UsersTable
        users={visibleUsers}
        selected={selected}
        onToggleUser={toggleUser}
        onToggleAll={toggleAllVisible}
        allVisibleSelected={isAllVisibleSelected}
      />

      {selected.size > 0 && (
        <BulkActionsBar
          count={selected.size}
          onStartPrioritization={handleStartPrioritization}
          onDeleteFromView={handleBulkDeleteFromView}
          onMakeGroup={handleBulkMakeGroup}
        />
      )}

      <JobQuotaModal
        open={showPrioritizationModal}
        quotas={jobQuotas}
        onChange={(key, next) =>
          setJobQuotas((q) => ({ ...q, [key]: { ...q[key], tableCount: next } }))
        }
        onClose={() => setShowPrioritizationModal(false)}
        onSubmit={submitPrioritization}
        jobRequirements={jobRequirements}
        tests={[]} // اگر لیست تست‌های فعال دارید پاس بدهید
      />
    </section>
  );
};

export default TestsStatus;
