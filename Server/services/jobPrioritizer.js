// services/prioritization.js
// اولویت‌بندی حرفه‌ای با تخصیص سراسریِ بدون‌تکرار + لیست Unassigned + سازگاری عقب‌رو (allocations)

import mongoose from "mongoose";
import Result from "../models/Result.js";
import User from "../models/User.js";

/* ============================== ثابت‌ها ============================== */
const TEST_TYPES = [
  "MBTI",
  "DISC",
  "HOLLAND",
  "GARDNER",
  "CLIFTON",
  "GHQ",
  "PERSONAL_FAVORITES",
];

const clamp100 = (n) => Math.max(0, Math.min(100, Number(n) || 0));
const avg = (vals = []) => {
  const arr = vals.map(Number).filter(Number.isFinite);
  if (!arr.length) return 0;
  return clamp100(arr.reduce((a, b) => a + b, 0) / arr.length);
};

/* ============================== کمک‌ها ============================== */
function overallFrom(resultDoc) {
  if (!resultDoc) return 0;
  if (typeof resultDoc.score === "number") return clamp100(resultDoc.score);
  const scores = resultDoc.analysis?.scores || {};
  const vals = Object.values(scores).map(Number).filter(Number.isFinite);
  return vals.length ? clamp100(avg(vals)) : 0;
}

function traitMatchScore(desired = [], candidate = []) {
  if (!desired.length) return 0;
  const cand = new Set(candidate.map(String).map((s) => s.toLowerCase()));
  const hit = desired
    .map(String)
    .map((s) => s.toLowerCase())
    .filter((t) => cand.has(t));
  return clamp100((hit.length / desired.length) * 100);
}
function scoreDiffScore(desired = {}, candidate = {}) {
  const keys = Object.keys(desired || {});
  if (!keys.length) return 0;
  const diffs = keys.map((k) => {
    const d = Number(desired[k]);
    const c = Number(candidate[k]);
    if (!Number.isFinite(d) || !Number.isFinite(c)) return 50;
    return clamp100(100 - Math.abs(d - c));
  });
  return avg(diffs);
}
function preferHighScore(keys = [], scores = {}, fallback = 0) {
  if (!keys.length) return 0;
  const vals = keys.map((k) => {
    const v = Number(scores?.[k]);
    return Number.isFinite(v) ? clamp100(v) : fallback;
  });
  return avg(vals);
}
function preferLowScore(keys = [], scores = {}, fallback = 0) {
  if (!keys.length) return 0;
  const vals = keys.map((k) => {
    const v = Number(scores?.[k]);
    return Number.isFinite(v) ? clamp100(100 - v) : fallback;
  });
  return avg(vals);
}

function specForTest(jobSpec, testType) {
  if (!jobSpec) return {};
  let raw =
    jobSpec[testType] ||
    jobSpec[testType?.toLowerCase?.()] ||
    jobSpec[`${testType}_REQUIREMENTS`];

  if (!raw && testType === "PERSONAL_FAVORITES") {
    raw =
      jobSpec.PF ||
      jobSpec.pf ||
      jobSpec.personalFavorites ||
      jobSpec.personal_favorites;
  }

  if (Array.isArray(raw)) {
    switch (testType) {
      case "MBTI":
        return { traits: raw.map(String) };
      case "DISC": {
        const letters = raw
          .map(String)
          .map((s) => (s.toUpperCase().match(/[DISC]/) || [])[0])
          .filter(Boolean);
        return letters.length ? { preferHigh: letters } : {};
      }
      case "HOLLAND":
        return { preferHigh: raw.map(String) };
      case "GARDNER": {
        const map = {
          S: "Spatial",
          M: "LogicalMathematical",
          L: "Linguistic",
          B: "BodilyKinesthetic",
          I: "Interpersonal",
          N: "Naturalist",
          Mu: "Musical",
          Intra: "Intrapersonal",
        };
        const dims = raw
          .map(String)
          .map((s) => map[s] || s)
          .filter(Boolean);
        return dims.length ? { preferHigh: dims } : {};
      }
      case "CLIFTON": {
        const domains = new Set([
          "Executing",
          "Influencing",
          "Relationship Building",
          "RelationshipBuilding",
          "Strategic Thinking",
          "StrategicThinking",
        ]);
        const fixed = raw
          .map(String)
          .map((s) =>
            /^discpline$/i.test(s)
              ? "Discipline"
              : /^thinking$/i.test(s)
              ? "Strategic Thinking"
              : s
          );
        const preferHigh = [];
        const themes = [];
        for (const x of fixed) {
          if (domains.has(x)) {
            const norm = x.replace(/\s+/g, " ").trim();
            preferHigh.push(
              norm === "Relationship Building" ? "RelationshipBuilding" : norm
            );
          } else themes.push(x);
        }
        const spec = {};
        if (preferHigh.length) spec.preferHigh = preferHigh;
        if (themes.length) spec.traits = themes;
        return spec;
      }
      case "PERSONAL_FAVORITES":
        return { traits: raw.map((v) => String(v)) };
      default:
        return {};
    }
  }
  return raw || {};
}

function computeTestFitness({ testType, resultDoc, jobSpecForThisTest }) {
  if (!resultDoc) return 0;
  const analysis = resultDoc.analysis || {};
  const candidateScores = analysis.scores || {};
  const candidateTraits = Array.isArray(analysis.traits) ? analysis.traits : [];
  const base = overallFrom(resultDoc);

  if (!jobSpecForThisTest || !Object.keys(jobSpecForThisTest).length) return base;

  const parts = [];
  if (Array.isArray(jobSpecForThisTest.traits) && jobSpecForThisTest.traits.length)
    parts.push(traitMatchScore(jobSpecForThisTest.traits, candidateTraits));
  if (jobSpecForThisTest.scores && typeof jobSpecForThisTest.scores === "object")
    parts.push(scoreDiffScore(jobSpecForThisTest.scores, candidateScores));
  if (
    Array.isArray(jobSpecForThisTest.preferHigh) &&
    jobSpecForThisTest.preferHigh.length
  )
    parts.push(preferHighScore(jobSpecForThisTest.preferHigh, candidateScores, base));
  if (
    Array.isArray(jobSpecForThisTest.preferLow) &&
    jobSpecForThisTest.preferLow.length
  )
    parts.push(preferLowScore(jobSpecForThisTest.preferLow, candidateScores, 100 - base));

  return parts.length ? avg(parts) : base;
}

function normalizeWeights(weights = {}, testsAvailable = []) {
  const filtered = testsAvailable.filter((t) => TEST_TYPES.includes(t));
  if (!filtered.length) return {};
  const entries = filtered.map((t) => [t, Number(weights?.[t] ?? 1)]);
  const positives = entries.map(([t, w]) => [t, Number.isFinite(w) && w > 0 ? w : 0]);
  const sum = positives.reduce((a, [, w]) => a + w, 0);
  if (sum <= 0) {
    const eq = 1 / positives.length;
    return Object.fromEntries(positives.map(([t]) => [t, eq]));
  }
  return Object.fromEntries(positives.map(([t, w]) => [t, w / sum]));
}

async function fetchLatestResultsByUser(userIds = []) {
  const ids = userIds.map((id) =>
    typeof id === "string" ? new mongoose.Types.ObjectId(id) : id
  );
  const results = await Result.aggregate([
    { $match: { user: { $in: ids } } },
    { $sort: { submittedAt: -1, createdAt: -1 } },
    { $group: { _id: { user: "$user", testType: "$testType" }, doc: { $first: "$$ROOT" } } },
  ]);
  const map = new Map();
  for (const r of results) {
    const userId = String(r._id.user);
    const testType = r._id.testType;
    const byUser = map.get(userId) || {};
    byUser[testType] = r.doc;
    map.set(userId, byUser);
  }
  return map;
}

function tiebreak(userResults = {}) {
  const ghq = userResults.GHQ;
  const ghqHealth = clamp100(100 - overallFrom(ghq)); // GHQ پایین‌تر ⇒ سلامت بالاتر
  let strengthsCount = 0,
    durationSec = 0,
    earliest = null;
  for (const t of Object.keys(userResults)) {
    const r = userResults[t];
    const arr = Array.isArray(r?.analysis?.strengths) ? r.analysis.strengths : [];
    strengthsCount += arr.length;
    durationSec += Number(r?.durationInSeconds || 0);
    const done = r?.submittedAt ? new Date(r.submittedAt) : null;
    if (done && (!earliest || done < earliest)) earliest = done;
  }
  return {
    ghqHealth,
    strengthsCount,
    durationSec,
    earliestTs: earliest ? earliest.getTime() : Number.MAX_SAFE_INTEGER,
  };
}

function compareCandidates(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  if (b.ghqHealth !== a.ghqHealth) return b.ghqHealth - a.ghqHealth;
  if (b.strengthsCount !== a.strengthsCount) return b.strengthsCount - a.strengthsCount;
  if (a.durationSec !== b.durationSec) return a.durationSec - b.durationSec;
  if (a.earliestTs !== b.earliestTs) return a.earliestTs - b.earliestTs;
  return String(a.userId).localeCompare(String(b.userId));
}

/* ===== وزن‌های هر شغل از jobRequirements، با fallback به API weights ===== */
function weightsFromJobSpec(jobSpec = {}, weightsFromApi = {}) {
  const fromSpec = jobSpec?.weights || jobSpec?.testWeights || {};
  const merged = { ...weightsFromApi, ...fromSpec }; // spec ارجح
  return Object.fromEntries(
    Object.entries(merged).filter(([k]) => TEST_TYPES.includes(k))
  );
}

/* ===== منطق رشته دبیرستان × شغل با لحاظ IQ تقریبی ===== */
function highSchoolMajorMatchScore(userMajor, jobName, iqScore = 0) {
  const m = (userMajor || "").trim();
  const job = (jobName || "").trim();
  const isHighIQ = Number(iqScore) >= 70;

  if (m.includes("ریاضی")) {
    if (/برق|مکانیک/.test(job)) return 100;
    return 40;
  }
  if (m.includes("تجربی")) {
    if (/ناوبری/.test(job)) return isHighIQ ? 95 : 70;
    if (/تفنگدار/.test(job)) return isHighIQ ? 90 : 65;
    return 50;
  }
  if (m.includes("انسانی")) {
    if (/تفنگدار|کمیسر/.test(job)) return isHighIQ ? 90 : 60;
    return 40;
  }
  return 50;
}

/* ===== امتیاز مرکب تست‌ها بر اساس نیاز همان شغل ===== */
function compositeScoreForJob({ userResults, jobSpec, weights }) {
  const testsAvailable = Object.keys(userResults || {});
  const normalized = normalizeWeights(weights, testsAvailable);
  const perTest = testsAvailable.map((testType) => {
    const resultDoc = userResults[testType];
    const spec = specForTest(jobSpec, testType);
    const fit = computeTestFitness({
      testType,
      resultDoc,
      jobSpecForThisTest: spec,
    });
    return fit * (normalized[testType] ?? 0);
  });
  return clamp100(perTest.reduce((a, b) => a + b, 0));
}

/* ========= field resolver: تضمین ارسال رشته/فیلد در تمام خروجی‌ها ========= */
function resolveField(info, fallbackRow = {}) {
  return (
    fallbackRow.field ||
    info?.profile?.field ||
    info?.profile?.highSchoolMajor ||
    info?.profile?.major ||
    ""
  );
}

/* =========================== خروجی دانلودی =========================== */
function buildCSV(rows = []) {
  const header = [
    "job",
    "rank",
    "assigned",
    "userId",
    "username",
    "fullName",
    "field",
    "score",
    "ghqHealth",
    "strengthsCount",
    "durationSec",
    "testTypes",
    "assignedJob",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    const vals = [
      r.job,
      r.rank ?? "",
      r.assigned ? 1 : 0,
      r.userId,
      r.username ?? "",
      (r.fullName ?? "").replace(/,/g, " "),
      (r.field ?? "").replace(/,/g, " "),
      (r.score ?? 0).toFixed(2),
      (r.ghqHealth ?? 0).toFixed(2),
      r.strengthsCount ?? 0,
      r.durationSec ?? 0,
      Object.keys(r.userResults || {}).join("|"),
      r.assignedJob ?? "",
    ];
    lines.push(vals.join(","));
  }
  return "\uFEFF" + lines.join("\n");
}

function buildHTML(rows = []) {
  const rowsHtml = rows
    .map(
      (r) => `
    <tr>
      <td class="job">${r.job}</td>
      <td>${r.rank ?? ""}</td>
      <td>${r.assigned ? "✓" : ""}</td>
      <td>${r.username ?? r.userId}</td>
      <td>${(r.fullName ?? "").replace(/</g, "&lt;")}</td>
      <td>${(r.field ?? "").replace(/</g, "&lt;")}</td>
      <td>${(r.score ?? 0).toFixed(2)}</td>
      <td>${(r.ghqHealth ?? 0).toFixed(2)}</td>
      <td>${r.strengthsCount ?? 0}</td>
      <td>${r.durationSec ?? 0}</td>
      <td>${Object.keys(r.userResults || {}).join(" | ")}</td>
      <td>${r.assignedJob ?? ""}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>گزارش اولویت‌بندی شغلی</title>
  <style>
    body{font-family:sans-serif;padding:16px}
    h1{margin:0 0 12px}
    table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #ccc;padding:8px;text-align:center}
    th{background:#f3f3f3}.job{text-align:right}
  </style></head><body>
  <h1>گزارش اولویت‌بندی شغلی</h1>
  <table>
    <thead>
      <tr>
        <th>شغل</th><th>رتبه</th><th>انتخاب</th><th>کاربر</th><th>نام</th><th>رشته/فیلد</th>
        <th>امتیاز</th><th>سلامت(GHQ)</th><th>قوت‌ها</th><th>زمان(ث)</th><th>تست‌ها</th><th>رسته تخصیص</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table></body></html>`;
}

/* =========================== هسته‌ی تخصیص سراسری =========================== */
export async function prioritizeCandidates({
  userIds = [],
  capacities = {},
  weights = {},
  jobRequirements = {},
}) {
  if (!Array.isArray(userIds) || !userIds.length)
    throw new Error("userIds is required");

  const objectIds = userIds.map((id) =>
    typeof id === "string" ? new mongoose.Types.ObjectId(id) : id
  );

  const [resultsMap, users] = await Promise.all([
    fetchLatestResultsByUser(userIds),
    User.find({ _id: { $in: objectIds } })
      .select(
        "username profile.fullName profile.field profile.highSchoolMajor profile.major profile.phone"
      )
      .lean(),
  ]);

  const userInfo = new Map(users.map((u) => [String(u._id), u]));

  // فقط رسته‌های دارای ظرفیت
  const jobs = Object.keys(capacities || {}).filter(
    (job) => Number(capacities[job]) > 0
  );

  // 1) همه‌ی کاندیدها برای همه‌ی رسته‌ها (برای انتخاب سراسری بدون تکرار)
  const globalCandidates = [];
  const perJobAllCandidates = new Map(); // job -> [candidates sorted]

  for (const job of jobs) {
    const jobSpec = jobRequirements?.[job] || {};
    const testsWeights = weightsFromJobSpec(jobSpec, weights);

    const list = [];
    for (const id of userIds) {
      const uid = String(id);
      const userResults = resultsMap.get(uid) || {};
      const info = userInfo.get(uid) || {};

      const scoreTests = compositeScoreForJob({
        userResults,
        jobSpec,
        weights: testsWeights,
      });

      // IQ تقریبی (proxy)
      const iqProxy =
        overallFrom(userResults?.GARDNER) ||
        overallFrom(userResults?.MBTI) ||
        overallFrom(userResults?.DISC);
      const ghqOverall = overallFrom(userResults?.GHQ);
      const iqScore = Math.max(iqProxy, clamp100(100 - ghqOverall));

      const userMajor =
        info?.profile?.highSchoolMajor || info?.profile?.major || "";
      const majorFit = highSchoolMajorMatchScore(userMajor, job, iqScore);

      const finalScore = clamp100(scoreTests * 0.8 + majorFit * 0.2);
      const tb = tiebreak(userResults);

      const row = {
        job,
        userId: uid,
        username: info?.username,
        fullName: info?.profile?.fullName,
        phone: info?.profile?.phone || "",
        field: resolveField(info), // ensure field is always set on candidate rows
        score: finalScore,
        ...tb,
        userResults,
      };
      list.push(row);
      globalCandidates.push(row);
    }
    list.sort(compareCandidates);
    perJobAllCandidates.set(job, list);
  }

  // 2) انتخاب سراسری: هر اسلاتِ هر رسته را از روی بیشترین امتیاز جهانی پر می‌کنیم (بدون تکرار)
  const capacityRem = Object.fromEntries(
    jobs.map((j) => [j, Number(capacities[j]) || 0])
  );
  const takenUser = new Set(); // کاربران تخصیص‌گرفته
  const chosen = []; // انتخاب‌های نهایی سراسری

  globalCandidates.sort(compareCandidates);

  for (const cand of globalCandidates) {
    const j = cand.job;
    if (capacityRem[j] > 0 && !takenUser.has(cand.userId)) {
      capacityRem[j] -= 1;
      takenUser.add(cand.userId);
      chosen.push(cand);
    }
  }

  // 3) assignments + waitlist + table + unassigned + legacy allocations
  const assignments = [];
  const waitlist = [];
  const table = [];
  const assignedJobByUser = new Map(); // userId -> job
  const perJobChosen = new Map(jobs.map((j) => [j, []]));

  for (const c of chosen) {
    assignedJobByUser.set(c.userId, c.job);
    perJobChosen.get(c.job).push(c);
  }

  // رنک‌ها و assignments
  for (const j of jobs) {
    const selected = perJobChosen.get(j) || [];
    selected.sort(compareCandidates);
    selected.forEach((c, i) => {
      c.rank = i + 1;
      c.assigned = true;
      c.assignedJob = j;
    });
    assignments.push({
      job: j,
      slots: selected.map((s) => ({
        userId: s.userId,
        username: s.username,
        score: s.score,
        field: s.field,
        fullName: s.fullName,
        phone: s.phone || "",
      })),
    });
  }

  // waitlist: همه‌ی کاندیدهای این رسته که در این رسته انتخاب نشده‌اند
  for (const j of jobs) {
    const allForJob = perJobAllCandidates.get(j) || [];
    const selectedIds = new Set((perJobChosen.get(j) || []).map((x) => x.userId));
    const wl = allForJob
      .filter((c) => !selectedIds.has(c.userId))
      .map((c, idx) => ({
        ...c,
        rank: (perJobChosen.get(j)?.length || 0) + idx + 1,
        assigned: false,
        assignedJob: assignedJobByUser.get(c.userId) || null, // شاید جای دیگری پذیرفته شده
      }));
    waitlist.push({
      job: j,
      queue: wl.map((s) => ({
        userId: s.userId,
        username: s.username,
        score: s.score,
        field: s.field,
        fullName: s.fullName,
        phone: s.phone || "",
      })),
    });
    table.push(...(perJobChosen.get(j) || []), ...wl);
  }

  // افراد بدون تخصیص در هیچ رسته‌ای
  const unassigned = userIds
    .map(String)
    .filter((uid) => !assignedJobByUser.has(uid))
    .map((uid) => {
      const info = userInfo.get(uid) || {};
      return {
        userId: uid,
        username: info?.username,
        fullName: info?.profile?.fullName,
        field: resolveField(info),
        phone: info?.profile?.phone || "",
      };
    });

  // legacy allocations برای سازگاری با UI قدیمی
  const allocations = {};
  for (const j of jobs) {
    const selected = perJobChosen.get(j) || [];
    allocations[j] = {
      name: j,
      persons: selected.map((s) => {
        const info = userInfo.get(s.userId) || {};
        return {
          id: s.userId,
          rank: s.rank,
          score: s.score,
          fullName: s.fullName || "",
          phone: s.phone || "",
          field: resolveField(info, s), // تضمین وجود رشته
        };
    }),
    };
  }

  // خروجی‌های دانلودی از جدول سراسری
  const csv = buildCSV(table);
  const html = buildHTML(table);

  return {
    assignments, // منتخب‌ها به تفکیک رسته
    waitlist, // لیست انتظار به تفکیک رسته
    unassigned, // افراد بدون تخصیص
    table, // جدول کامل (assigned + waitlist)
    allocations, // سازگاری عقب‌رو برای کامپوننت‌های قدیمی
    export: {
      csv,
      csvBase64: Buffer.from(csv, "utf8").toString("base64"),
      html,
    },
  };
}

/* ============================== کنترلر HTTP ============================== */
export async function prioritizeJobs(req, res) {
  try {
    const { userIds, capacities, weights, jobRequirements } = req.body || {};
    if (!Array.isArray(userIds) || !userIds.length) {
      return res
        .status(400)
        .json({ ok: false, error: "userIds (array) is required" });
    }
    if (
      !capacities ||
      typeof capacities !== "object" ||
      !Object.keys(capacities).length
    ) {
      return res
        .status(400)
        .json({ ok: false, error: "capacities (object) is required" });
    }

    const out = await prioritizeCandidates({
      userIds,
      capacities,
      weights: weights || {},
      jobRequirements: jobRequirements || {},
    });

    return res.json({ ok: true, ...out });
  } catch (err) {
    console.error("prioritizeJobs error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}
