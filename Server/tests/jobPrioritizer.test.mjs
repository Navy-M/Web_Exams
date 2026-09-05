import test from "node:test";
import assert from "node:assert/strict";
import {
  ALGORITHM_VERSION,
  JOB_MATCHING_TEST_TYPES,
  EXCLUDED_SENSITIVE_SIGNALS,
  explainCandidateJob,
  normalizeScore,
  runJobMatching,
} from "../services/jobPrioritizer.js";

const result = (testType, normalizedScores = {}, extra = {}) => ({
  testType,
  score: extra.score,
  analysis: {
    normalizedScores,
    scores: normalizedScores,
    traits: extra.traits || [],
    mbtiType: extra.mbtiType,
  },
});

const user = (n, field = "Computer") => ({
  _id: `u${String(n).padStart(2, "0")}`,
  username: `user${n}`,
  profile: {
    fullName: `Candidate ${n}`,
    field,
    phone: `091200000${String(n).padStart(2, "0")}`,
  },
});

function baseJobs() {
  return {
    Navigator: {
      id: "navigator",
      capacity: 3,
      required: { fields: ["Computer", "Math"] },
      weights: { disc: 2, mbti: 1, holland: 1 },
      DISC: { prefer: ["D", "I"] },
      MBTI: { prefer: ["ENTJ", "ENTP"] },
      HOLLAND: { top3: ["R", "I"] },
      thresholds: { minimumScore: 45 },
    },
    Mechanic: {
      id: "mechanic",
      capacity: 4,
      weights: { disc: 1, gardner: 2 },
      DISC: { prefer: ["C", "S"] },
      GARDNER: { prefer: ["M", "S"] },
      education: ["Mechanic", "Math"],
      thresholds: { minimumScore: 40 },
    },
    Infantry: {
      id: "infantry",
      capacity: 5,
      weights: { disc: 2, clifton: 1 },
      DISC: { prefer: ["D", "S"] },
      CLIFTON: { themesPrefer: ["Discipline", "Command"] },
    },
    Electrician: {
      id: "electrician",
      capacity: 2,
      weights: { holland: 1, gardner: 1 },
      HOLLAND: { top3: ["I", "R"] },
      GARDNER: { prefer: ["M"] },
      education: ["Electrical", "Math"],
    },
    Commissar: {
      id: "commissar",
      capacity: 2,
      weights: { mbti: 1, pf: 1 },
      MBTI: { prefer: ["ENFJ", "ESFJ"] },
      PF: { keywords: ["people", "coordination"] },
      education: ["Humanities"],
    },
  };
}

function acceptanceDataset() {
  const fields = ["Computer", "Math", "Mechanic", "Electrical", "Humanities"];
  const users = Array.from({ length: 20 }, (_, index) => user(index + 1, fields[index % fields.length]));
  const resultsByUser = {};

  users.forEach((candidate, index) => {
    const factor = index % 5;
    resultsByUser[candidate._id] = {
      DISC: result("DISC", {
        D: 95 - factor * 12,
        I: 82 - factor * 7,
        S: 50 + factor * 8,
        C: 44 + factor * 9,
      }),
      MBTI: result("MBTI", {}, { mbtiType: factor === 4 ? "ENFJ" : factor <= 1 ? "ENTJ" : "ISTJ", score: 70 }),
      HOLLAND: result("HOLLAND", {
        R: 75 + factor * 2,
        I: 86 - factor * 5,
        A: 20 + factor,
      }),
      GARDNER: result("GARDNER", {
        LogicalMathematical: 85 - factor * 4,
        Spatial: 72 + factor * 3,
      }),
      CLIFTON: result("CLIFTON", {}, { traits: factor === 2 ? ["Discipline", "Command"] : ["Analytical"], score: 65 }),
      PERSONAL_FAVORITES: result("PERSONAL_FAVORITES", {}, {
        traits: factor === 4 ? ["people", "coordination"] : ["tools"],
        score: 60,
      }),
      GHQ: result("GHQ", { distress: factor * 20 }, { score: factor * 20 }),
    };
  });

  return { users, resultsByUser };
}

test("1. normalizes scores to 0..100", () => {
  assert.equal(normalizeScore(-10), 0);
  assert.equal(normalizeScore(140), 100);
  assert.equal(normalizeScore(42), 42);
});

test("2. exposes server-only algorithm metadata and excludes GHQ", () => {
  assert.equal(ALGORITHM_VERSION, "job-matching-v2.0.0");
  assert.equal(JOB_MATCHING_TEST_TYPES.includes("GHQ"), false);
  assert.equal(EXCLUDED_SENSITIVE_SIGNALS.includes("GHQ"), true);
});

test("3. returns required output contract", () => {
  const { users, resultsByUser } = acceptanceDataset();
  const output = runJobMatching({
    users,
    resultsByUser,
    capacities: { Navigator: 1 },
    jobRequirements: baseJobs(),
  });

  assert.equal(output.meta.algorithmVersion, ALGORITHM_VERSION);
  assert.ok(output.allocations);
  assert.ok(Array.isArray(output.assignments));
  assert.ok(Array.isArray(output.waitlist));
  assert.ok(Array.isArray(output.unassigned));
  assert.ok(Array.isArray(output.candidateJobScores));
});

test("4. respects capacity and never assigns a user twice", () => {
  const { users, resultsByUser } = acceptanceDataset();
  const capacities = { Navigator: 3, Mechanic: 4, Infantry: 5, Electrician: 2, Commissar: 2 };
  const output = runJobMatching({ users, resultsByUser, capacities, jobRequirements: baseJobs() });
  const slots = output.assignments.flatMap((job) => job.slots.map((slot) => ({ ...slot, jobId: job.jobId })));
  const uniqueUsers = new Set(slots.map((slot) => slot.userId));

  assert.equal(uniqueUsers.size, slots.length);
  for (const job of output.assignments) {
    assert.ok(job.slots.length <= capacities[job.job]);
  }
});

test("5. ranks eligible candidates by final score, completeness, then deterministic user id", () => {
  const users = [user(1, "Computer"), user(2, "Computer")];
  const resultsByUser = {
    u01: { DISC: result("DISC", { D: 80, I: 80 }) },
    u02: { DISC: result("DISC", { D: 80, I: 80 }) },
  };
  const output = runJobMatching({
    users,
    resultsByUser,
    capacities: { Navigator: 1 },
    jobRequirements: baseJobs(),
  });
  assert.equal(output.assignments[0].slots[0].userId, "u01");
});

test("6. missing tests are excluded from final score denominator and lower completeness", () => {
  const users = [user(1, "Computer")];
  const output = runJobMatching({
    users,
    resultsByUser: {
      u01: { DISC: result("DISC", { D: 100, I: 100 }) },
    },
    capacities: { Navigator: 1 },
    jobRequirements: baseJobs(),
  });
  const score = explainCandidateJob(output, "u01", "navigator");
  assert.equal(score.finalScore, 100);
  assert.ok(score.dataCompleteness < 100);
  assert.ok(score.missingTests.includes("MBTI"));
});

test("7. hard field requirements are separated from scoring eligibility", () => {
  const users = [user(1, "Humanities")];
  const output = runJobMatching({
    users,
    resultsByUser: {
      u01: { DISC: result("DISC", { D: 100, I: 100 }), MBTI: result("MBTI", {}, { mbtiType: "ENTJ" }) },
    },
    capacities: { Navigator: 1 },
    jobRequirements: baseJobs(),
  });
  const score = explainCandidateJob(output, "u01", "navigator");
  assert.equal(score.eligible, false);
  assert.ok(score.failedRequirements.includes("FIELD_REQUIRED"));
});

test("8. GHQ has no effect on score, ranking, assignment, or tie-break", () => {
  const users = [user(1, "Computer"), user(2, "Computer")];
  const common = {
    DISC: result("DISC", { D: 88, I: 88 }),
    MBTI: result("MBTI", {}, { mbtiType: "ENTJ" }),
    HOLLAND: result("HOLLAND", { R: 80, I: 80 }),
  };
  const runA = runJobMatching({
    users,
    resultsByUser: {
      u01: { ...common, GHQ: result("GHQ", { distress: 100 }, { score: 100 }) },
      u02: { ...common, GHQ: result("GHQ", { distress: 0 }, { score: 0 }) },
    },
    capacities: { Navigator: 1 },
    jobRequirements: baseJobs(),
  });
  const runB = runJobMatching({
    users,
    resultsByUser: {
      u01: { ...common, GHQ: result("GHQ", { distress: 0 }, { score: 0 }) },
      u02: { ...common, GHQ: result("GHQ", { distress: 100 }, { score: 100 }) },
    },
    capacities: { Navigator: 1 },
    jobRequirements: baseJobs(),
  });

  assert.deepEqual(
    runA.candidateJobScores.map((row) => [row.userId, row.finalScore, row.rank]),
    runB.candidateJobScores.map((row) => [row.userId, row.finalScore, row.rank])
  );
  assert.equal(runA.assignments[0].slots[0].userId, runB.assignments[0].slots[0].userId);
});

test("9. acceptance dataset is deterministic and explainability is consistent", () => {
  const { users, resultsByUser } = acceptanceDataset();
  const capacities = { Navigator: 3, Mechanic: 4, Infantry: 5, Electrician: 2, Commissar: 2 };
  const first = runJobMatching({ users, resultsByUser, capacities, jobRequirements: baseJobs() });
  const second = runJobMatching({ users, resultsByUser, capacities, jobRequirements: baseJobs() });

  assert.deepEqual(
    first.assignments.map((job) => [job.jobId, job.slots.map((slot) => slot.userId)]),
    second.assignments.map((job) => [job.jobId, job.slots.map((slot) => slot.userId)])
  );

  const totalCapacity = Object.values(capacities).reduce((sum, n) => sum + n, 0);
  const assigned = first.assignments.flatMap((job) => job.slots);
  assert.equal(assigned.length + first.unassigned.length, users.length);
  assert.ok(assigned.length <= totalCapacity);

  const explained = explainCandidateJob(first, "u01", "navigator");
  assert.ok(explained.components.length > 0);
  const contributionSum = explained.components.reduce((sum, item) => sum + item.contribution, 0);
  assert.ok(Math.abs(contributionSum - explained.finalScore) < 0.01);
});
