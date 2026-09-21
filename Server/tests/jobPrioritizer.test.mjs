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
  assert.equal(ALGORITHM_VERSION, "job-matching-v3.0.0");
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
  assert.ok(Array.isArray(output.candidates));
  assert.ok(Array.isArray(output.jobs));
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
  assert.ok(score.dataCompleteness > 0 && score.dataCompleteness < 1);
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

test("10. capacity zero produces no assignment for that job", () => {
  const output = runJobMatching({
    users: [user(1)],
    resultsByUser: { u01: { DISC: result("DISC", { D: 100 }) } },
    capacities: { Navigator: 0 },
    jobRequirements: baseJobs(),
  });
  assert.equal(output.assignments.length, 0);
  assert.equal(output.unassigned.length, 1);
});

test("11. changing weights changes ranking and zero weight removes influence", () => {
  const users = [user(1, "Computer"), user(2, "Computer")];
  const resultsByUser = {
    u01: { DISC: result("DISC", { D: 100, I: 100 }), HOLLAND: result("HOLLAND", { R: 0, I: 0 }) },
    u02: { DISC: result("DISC", { D: 0, I: 0 }), HOLLAND: result("HOLLAND", { R: 100, I: 100 }) },
  };
  const discFocused = runJobMatching({ users, resultsByUser, capacities: { Navigator: 1 }, weights: { DISC: 100, HOLLAND: 0, MBTI: 0, field: 0 }, jobRequirements: baseJobs() });
  const hollandFocused = runJobMatching({ users, resultsByUser, capacities: { Navigator: 1 }, weights: { DISC: 0, HOLLAND: 100, MBTI: 0, field: 0 }, jobRequirements: baseJobs() });
  assert.equal(discFocused.assignments[0].slots[0].userId, "u01");
  assert.equal(hollandFocused.assignments[0].slots[0].userId, "u02");
  assert.equal(explainCandidateJob(discFocused, "u01", "navigator").components.some((item) => item.key === "HOLLAND"), false);
});

test("12. academic weight uses diploma average and affects ranking", () => {
  const first = user(1, "Computer");
  const second = user(2, "Computer");
  first.profile.diplomaAverage = 19;
  second.profile.diplomaAverage = 12;
  const output = runJobMatching({
    users: [first, second],
    resultsByUser: {},
    capacities: { Navigator: 1 },
    weights: { DISC: 0, MBTI: 0, HOLLAND: 0, academic: 100, field: 0 },
    jobRequirements: baseJobs(),
  });
  assert.equal(output.assignments[0].slots[0].userId, "u01");
  assert.equal(explainCandidateJob(output, "u01", "navigator").components[0].key, "academic");
});

test("13. field weight affects score while field requirement controls eligibility", () => {
  const output = runJobMatching({
    users: [user(1, "Computer"), user(2, "Humanities")],
    resultsByUser: {},
    capacities: { Navigator: 1 },
    weights: { DISC: 0, MBTI: 0, HOLLAND: 0, academic: 0, field: 100 },
    jobRequirements: baseJobs(),
  });
  assert.equal(output.assignments[0].slots[0].userId, "u01");
  assert.equal(explainCandidateJob(output, "u02", "navigator").eligible, false);
});

test("14. 50 candidates remain deterministic and respect all invariants", () => {
  const users = Array.from({ length: 55 }, (_, index) => {
    const candidate = user(index + 1, "Computer");
    candidate.profile.diplomaAverage = 10 + (index % 11);
    return candidate;
  });
  const resultsByUser = Object.fromEntries(users.map((candidate, index) => [
    candidate._id,
    { DISC: result("DISC", { D: index % 101, I: 100 - (index % 101) }) },
  ]));
  const capacities = { Navigator: 20, Infantry: 15 };
  const first = runJobMatching({ users, resultsByUser, capacities, jobRequirements: baseJobs() });
  const second = runJobMatching({ users, resultsByUser, capacities, jobRequirements: baseJobs() });
  const assigned = first.assignments.flatMap((job) => job.slots);
  assert.deepEqual(first.assignments, second.assignments);
  assert.equal(new Set(assigned.map((item) => item.userId)).size, assigned.length);
  assert.ok(assigned.length <= 35);
  first.candidateJobScores.forEach((row) => {
    assert.ok(row.finalScore >= 0 && row.finalScore <= 100);
    assert.ok(row.dataCompleteness >= 0 && row.dataCompleteness <= 1);
  });
});

test("15. one job with multiple candidates is ranked and capped", () => {
  const users = [user(1, "Computer"), user(2, "Computer"), user(3, "Computer")];
  const resultsByUser = {
    u01: { DISC: result("DISC", { D: 90, I: 90 }) },
    u02: { DISC: result("DISC", { D: 70, I: 70 }) },
    u03: { DISC: result("DISC", { D: 50, I: 50 }) },
  };
  const output = runJobMatching({ users, resultsByUser, capacities: { Navigator: 2 }, weights: { DISC: 100, MBTI: 0, HOLLAND: 0, field: 0 }, jobRequirements: baseJobs() });
  assert.deepEqual(output.assignments[0].slots.map((item) => item.userId), ["u01", "u02"]);
  assert.equal(output.assignments[0].slots.length, 2);
});

test("16. recommendations are independent from capacity", () => {
  const users = [user(1, "Computer"), user(2, "Computer")];
  const resultsByUser = {
    u01: { DISC: result("DISC", { D: 85, I: 85, S: 70 }) },
    u02: { DISC: result("DISC", { D: 95, I: 95, S: 20 }) },
  };
  const common = { users, resultsByUser, weights: { DISC: 100 }, jobRequirements: baseJobs(), minCompleteness: 0 };
  const full = runJobMatching({ ...common, capacities: { Navigator: 2, Infantry: 2 } });
  const constrained = runJobMatching({ ...common, capacities: { Navigator: 0, Infantry: 1 } });
  assert.deepEqual(
    full.candidates.map((item) => item.recommendations.map((rec) => [rec.jobId, rec.matchScore])),
    constrained.candidates.map((item) => item.recommendations.map((rec) => [rec.jobId, rec.matchScore]))
  );
});

test("17. zero and insufficient data candidates are not force-assigned", () => {
  const output = runJobMatching({
    users: [user(1, "Computer")],
    resultsByUser: {},
    capacities: { Navigator: 10 },
    jobRequirements: baseJobs(),
    minCompleteness: 0.6,
    minMatchScore: 50,
  });
  assert.equal(output.candidates[0].finalAllocation, null);
  assert.equal(output.candidates[0].reasonCode, "INSUFFICIENT_DATA");
  assert.equal(output.assignments[0].slots.length, 0);
});

test("18. minimum match score is respected even when capacity is available", () => {
  const output = runJobMatching({
    users: [user(1, "Computer")],
    resultsByUser: { u01: { DISC: result("DISC", { D: 10, I: 10 }) } },
    capacities: { Navigator: 5 },
    weights: { DISC: 100 },
    jobRequirements: baseJobs(),
    minCompleteness: 0,
    minMatchScore: 50,
  });
  assert.equal(output.candidates[0].finalAllocation, null);
  assert.equal(output.candidates[0].reasonCode, "LOW_MATCH_SCORE");
});

test("19. final allocation can differ from the first recommendation", () => {
  const users = [user(1, "Computer"), user(2, "Computer")];
  const resultsByUser = {
    u01: { DISC: result("DISC", { D: 80, I: 80, S: 70 }) },
    u02: { DISC: result("DISC", { D: 95, I: 95, S: 0 }) },
  };
  const output = runJobMatching({
    users,
    resultsByUser,
    capacities: { Navigator: 1, Infantry: 1 },
    weights: { DISC: 100 },
    jobRequirements: baseJobs(),
    minCompleteness: 0,
  });
  const candidate = output.candidates.find((item) => item.userId === "u01");
  assert.equal(candidate.recommendations[0].jobId, "navigator");
  assert.equal(candidate.finalAllocation.jobId, "infantry");
  assert.equal(candidate.finalAllocation.reasonCode, "CAPACITY_FULL");
});

test("20. v3 contract normalizes every visible component to 0..100", () => {
  const { users, resultsByUser } = acceptanceDataset();
  const output = runJobMatching({
    users: users.slice(0, 10),
    resultsByUser,
    capacities: { Navigator: 2, Mechanic: 2, Infantry: 2, Electrician: 1, Commissar: 1 },
    jobRequirements: baseJobs(),
    minCompleteness: 0.2,
    minMatchScore: 20,
  });
  const assigned = output.candidates.filter((item) => item.finalAllocation);
  assert.equal(new Set(assigned.map((item) => item.userId)).size, assigned.length);
  for (const candidate of output.candidates) {
    for (const recommendation of candidate.recommendations) {
      assert.ok(recommendation.matchScore >= 0 && recommendation.matchScore <= 100);
      for (const component of recommendation.components) {
        assert.ok(component.normalizedScore >= 0 && component.normalizedScore <= 100);
        assert.ok(Number.isFinite(component.weightedContribution));
      }
      recommendation.strengths.forEach((item) => assert.match(item, /\d+%$/));
      recommendation.gaps.forEach((item) => assert.doesNotMatch(item, /بررسی شد|لحاظ شد/));
    }
  }
});

test("21. explicit completeness override is narrow and visible in the contract", () => {
  const output = runJobMatching({
    users: [user(1, "Computer")],
    resultsByUser: { u01: { DISC: result("DISC", { D: 90, I: 90 }) } },
    capacities: { Navigator: 1 },
    weights: { DISC: 100, MBTI: 100, HOLLAND: 100 },
    jobRequirements: baseJobs(),
    minCompleteness: 0.6,
    minMatchScore: 50,
    completenessOverrides: ["u01"],
  });
  assert.equal(output.candidates[0].completenessOverride, true);
  assert.equal(output.candidates[0].finalAllocation.jobId, "navigator");
});
