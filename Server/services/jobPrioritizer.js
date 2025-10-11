import mongoose from "mongoose";
import Result from "../models/Result.js";
import User from "../models/User.js";

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
          .map((s) => {
            if (/^discpline$/i.test(s)) return "Discipline";
            if (/^thinking$/i.test(s)) return "Strategic Thinking";
            return s;
          });
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

  if (!jobSpecForThisTest || Object.keys(jobSpecForThisTest).length === 0)
    return base;

  const parts = [];
  if (
    Array.isArray(jobSpecForThisTest.traits) &&
    jobSpecForThisTest.traits.length
  ) {
    parts.push(traitMatchScore(jobSpecForThisTest.traits, candidateTraits));
  }
  if (
    jobSpecForThisTest.scores &&
    typeof jobSpecForThisTest.scores === "object"
  ) {
    parts.push(scoreDiffScore(jobSpecForThisTest.scores, candidateScores));
  }
  if (
    Array.isArray(jobSpecForThisTest.preferHigh) &&
    jobSpecForThisTest.preferHigh.length
  ) {
    parts.push(
      preferHighScore(jobSpecForThisTest.preferHigh, candidateScores, base)
    );
  }
  if (
    Array.isArray(jobSpecForThisTest.preferLow) &&
    jobSpecForThisTest.preferLow.length
  ) {
    parts.push(
      preferLowScore(jobSpecForThisTest.preferLow, candidateScores, 100 - base)
    );
  }

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
    {
      $group: {
        _id: { user: "$user", testType: "$testType" },
        doc: { $first: "$$ROOT" },
      },
    },
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
  const ghqOverall = overallFrom(ghq);
  const ghqHealth = clamp100(100 - ghqOverall);

  let strengthsCount = 0;
  let durationSec = 0;
  let earliest = null;

  for (const t of Object.keys(userResults)) {
    const r = userResults[t];
    const arr = Array.isArray(r?.analysis?.strengths)
      ? r.analysis.strengths
      : [];
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
  if (b.strengthsCount !== a.strengthsCount)
    return b.strengthsCount - a.strengthsCount;
  if (a.durationSec !== b.durationSec) return a.durationSec - b.durationSec;
  if (a.earliestTs !== b.earliestTs) return a.earliestTs - b.earliestTs;
  return String(a.userId).localeCompare(String(b.userId));
}

function buildCSV(rows = []) {
  const header = [
    "job",
    "rank",
    "userId",
    "username",
    "fullName",
    "score",
    "ghqHealth",
    "strengthsCount",
    "durationSec",
    "testTypes",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    const vals = [
      r.job,
      r.rank,
      r.userId,
      r.username ?? "",
      (r.fullName ?? "").replace(/,/g, " "),
      (r.score ?? 0).toFixed(2),
      (r.ghqHealth ?? 0).toFixed(2),
      r.strengthsCount ?? 0,
      r.durationSec ?? 0,
      Object.keys(r.userResults || {}).join("|"),
    ];
    lines.push(vals.join(","));
  }
  return "\uFEFF" + lines.join("\n");
}

function buildHTML(rows = []) {
  const rowsHtml = rows
    .map(
      (r) =>
        `<tr><td class="job">${r.job}</td><td>${r.rank}</td><td>${
          r.username ?? r.userId
        }</td><td>${(r.fullName ?? "").replace(/</g, "&lt;")}</td><td>${(
          r.score ?? 0
        ).toFixed(2)}</td><td>${(r.ghqHealth ?? 0).toFixed(2)}</td><td>${
          r.strengthsCount ?? 0
        }</td><td>${r.durationSec ?? 0}</td><td>${Object.keys(
          r.userResults || {}
        ).join(" | ")}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>گزارش اولویت‌بندی شغلی</title><style>body{font-family:sans-serif;padding:16px}h1{margin:0 0 12px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:center}th{background:#f3f3f3}.job{text-align:right}</style></head><body><h1>گزارش اولویت‌بندی شغلی</h1><table><thead><tr><th>شغل</th><th>رتبه</th><th>کاربر</th><th>نام</th><th>امتیاز</th><th>سلامت (GHQ)</th><th>تعداد قوت‌ها</th><th>مجموع زمان (ثانیه)</th><th>تست‌ها</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`;
}

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
      .select("username profile.fullName")
      .lean(),
  ]);

  const userInfo = new Map(users.map((u) => [String(u._id), u]));

  const jobs = Object.keys(capacities || {}).filter(
    (job) => Number(capacities[job]) > 0
  );

  const rows = [];
  const assignments = [];
  const waitlist = [];

  for (const job of jobs) {
    const jobSpec = jobRequirements?.[job] || {};
    const candidates = [];

    for (const id of userIds) {
      const uid = String(id);
      const userResults = resultsMap.get(uid) || {};
      const score = compositeScoreForJob({
        userResults,
        jobSpec,
        weights,
      });
      const tb = tiebreak(userResults);
      const info = userInfo.get(uid) || {};
      candidates.push({
        job,
        userId: uid,
        username: info.username,
        fullName: info?.profile?.fullName,
        score,
        ...tb,
        userResults,
      });
    }

    candidates.sort(compareCandidates);
    const capacity = Number(capacities[job]) || 0;
    const selected = candidates.slice(0, capacity).map((c, idx) => ({
      ...c,
      rank: idx + 1,
    }));
    const queued = candidates.slice(capacity).map((c, idx) => ({
      ...c,
      rank: capacity + idx + 1,
    }));

    assignments.push({
      job,
      slots: selected.map((s) => ({
        userId: s.userId,
        username: s.username,
        score: s.score,
      })),
    });

    waitlist.push({
      job,
      queue: queued.map((s) => ({
        userId: s.userId,
        username: s.username,
        score: s.score,
      })),
    });

    rows.push(...selected, ...queued);
  }

  const csv = buildCSV(rows);
  const html = buildHTML(rows);

  return {
    assignments,
    waitlist,
    table: rows,
    export: {
      csv,
      csvBase64: Buffer.from(csv, "utf8").toString("base64"),
      html,
    },
  };
}
