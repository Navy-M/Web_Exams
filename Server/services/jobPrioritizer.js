import mongoose from "mongoose";
import Result from "../models/Result.js";
import User from "../models/User.js";

export const ALGORITHM_VERSION = "job-matching-v3.0.0";

export const JOB_MATCHING_TEST_TYPES = [
  "MBTI",
  "DISC",
  "HOLLAND",
  "GARDNER",
  "CLIFTON",
  "PERSONAL_FAVORITES",
];

export const EXCLUDED_SENSITIVE_SIGNALS = [
  "GHQ",
  "age",
  "gender",
  "maritalStatus",
  "religion",
  "ethnicity",
  "nationality",
  "medicalHistory",
];

const TEST_ALIASES = {
  mbti: "MBTI",
  MBTI: "MBTI",
  disc: "DISC",
  DISC: "DISC",
  holland: "HOLLAND",
  HOLLAND: "HOLLAND",
  gardner: "GARDNER",
  GARDNER: "GARDNER",
  clifton: "CLIFTON",
  CLIFTON: "CLIFTON",
  pf: "PERSONAL_FAVORITES",
  PF: "PERSONAL_FAVORITES",
  personalFavorites: "PERSONAL_FAVORITES",
  personal_favorites: "PERSONAL_FAVORITES",
  PERSONAL_FAVORITES: "PERSONAL_FAVORITES",
};

const clamp100 = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

export const normalizeScore = clamp100;

const avg = (values = []) => {
  const nums = values.map(Number).filter(Number.isFinite);
  if (!nums.length) return 0;
  return clamp100(nums.reduce((sum, n) => sum + n, 0) / nums.length);
};

const stableString = (value) => String(value ?? "");
const lc = (value) => stableString(value).trim().toLowerCase();
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

function arrayify(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string") {
    return value
      .split(/[،,\n|/]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k);
  }
  return [];
}

function normalizeWeightMap(weights = {}) {
  const out = {};
  for (const [key, value] of Object.entries(weights || {})) {
    const testType = TEST_ALIASES[key];
    if (!testType || testType === "GHQ") continue;
    const n = Number(value);
    out[testType] = Number.isFinite(n) && n > 0 ? n : 0;
  }
  return out;
}

function profileWeight(weights = {}, aliases = []) {
  for (const key of aliases) {
    if (!hasOwn(weights, key)) continue;
    const value = Number(weights[key]);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }
  return null;
}

function normalizeRequirementKey(testType) {
  if (testType === "PERSONAL_FAVORITES") {
    return ["PERSONAL_FAVORITES", "personalFavorites", "personal_favorites", "PF", "pf"];
  }
  return [testType, testType.toLowerCase()];
}

function getTestRequirement(raw = {}, testType) {
  for (const key of normalizeRequirementKey(testType)) {
    if (raw && raw[key] != null) return raw[key];
  }
  return null;
}

function gardnerKeys(keys = []) {
  const map = {
    S: "Spatial",
    M: "LogicalMathematical",
    L: "Linguistic",
    B: "BodilyKinesthetic",
    I: "Interpersonal",
    N: "Naturalist",
    Mu: "Musical",
    In: "Intrapersonal",
    Intra: "Intrapersonal",
  };
  return keys.map(String).map((key) => map[key] || key).filter(Boolean);
}

function normalizeTestSpec(rawSpec, testType) {
  if (!rawSpec) return {};
  if (Array.isArray(rawSpec) || typeof rawSpec === "string") {
    const list = arrayify(rawSpec);
    if (testType === "MBTI") return { preferredTypes: list };
    if (testType === "DISC") {
      return {
        preferHigh: list
          .map((item) => (item.toUpperCase().match(/[DISC]/) || [])[0])
          .filter(Boolean),
      };
    }
    if (testType === "GARDNER") return { preferHigh: gardnerKeys(list) };
    if (testType === "CLIFTON") return { traits: list, preferHigh: list };
    return { preferHigh: list, traits: list };
  }

  if (typeof rawSpec !== "object") return {};

  if (testType === "DISC") {
    const prefer = arrayify(rawSpec.prefer || rawSpec.require || rawSpec.preferred || rawSpec.preferHigh);
    const letters = prefer
      .map((item) => (item.toUpperCase().match(/[DISC]/) || [])[0])
      .filter(Boolean);
    return { ...rawSpec, preferHigh: letters.length ? letters : arrayify(rawSpec.preferHigh) };
  }

  if (testType === "MBTI") {
    return {
      ...rawSpec,
      preferredTypes: arrayify(rawSpec.preferredTypes || rawSpec.traits || rawSpec.prefer),
    };
  }

  if (testType === "HOLLAND") {
    return {
      ...rawSpec,
      preferHigh: arrayify(rawSpec.preferHigh || rawSpec.top3 || rawSpec.prefer),
    };
  }

  if (testType === "GARDNER") {
    return {
      ...rawSpec,
      preferHigh: gardnerKeys(arrayify(rawSpec.preferHigh || rawSpec.prefer)),
    };
  }

  if (testType === "CLIFTON") {
    return {
      ...rawSpec,
      preferHigh: [
        ...arrayify(rawSpec.preferHigh),
        ...arrayify(rawSpec.domainsPrefer),
        ...arrayify(rawSpec.themesPrefer),
      ],
      traits: arrayify(rawSpec.traits || rawSpec.themesPrefer),
    };
  }

  return {
    ...rawSpec,
    traits: arrayify(rawSpec.traits || rawSpec.keywords || rawSpec.itemIdsPrefer),
    preferHigh: arrayify(rawSpec.preferHigh),
  };
}

function hasConfiguredRequirement(raw = {}, testType) {
  const spec = normalizeTestSpec(getTestRequirement(raw, testType), testType);
  return Object.keys(spec).some((key) => {
    if (Array.isArray(spec[key])) return spec[key].length > 0;
    if (spec[key] && typeof spec[key] === "object") return Object.keys(spec[key]).length > 0;
    return spec[key] != null && spec[key] !== "";
  });
}

function jobIdFromName(name) {
  return stableString(name)
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]+/gu, "")
    .toLowerCase();
}

function adaptJobSpec(name, raw = {}, capacity = 0, globalWeights = {}) {
  const rawWeights = normalizeWeightMap(raw.testWeights || raw.weights || {});
  const overrideWeights = normalizeWeightMap(globalWeights || {});
  const testWeights = {};

  for (const testType of JOB_MATCHING_TEST_TYPES) {
    if (hasOwn(overrideWeights, testType)) {
      testWeights[testType] = overrideWeights[testType];
    } else if (hasOwn(rawWeights, testType)) {
      testWeights[testType] = rawWeights[testType];
    } else {
      testWeights[testType] = hasConfiguredRequirement(raw, testType) ? 1 : 0;
    }
  }

  const required = raw.required || raw.eligibility || {};
  const preferred = raw.preferred || {};
  const exactFields = arrayify(
    raw.fieldWeights?.exact ||
      raw.fields?.exact ||
      required.fields ||
      required.field ||
      []
  );
  const relatedFields = arrayify(
    raw.fieldWeights?.related ||
      raw.fields?.related ||
      preferred.fields ||
      preferred.field ||
      raw.education ||
      raw.relatedFields ||
      []
  );

  const hasFieldConfig = exactFields.length || relatedFields.length;
  const fieldOverride = profileWeight(globalWeights, ["field", "FIELD", "educationField"]);
  const fieldWeight = fieldOverride != null
    ? fieldOverride
    : Number.isFinite(Number(raw.fieldWeight))
      ? Math.max(0, Number(raw.fieldWeight))
    : hasFieldConfig
      ? 0.2
      : 0;
  const academicOverride = profileWeight(globalWeights, ["academic", "ACADEMIC", "academicScore"]);
  const academicWeight = academicOverride != null
    ? academicOverride
    : Math.max(0, Number(raw.academicWeight) || 0);

  return {
    id: stableString(raw.id || jobIdFromName(name)),
    name,
    capacity: Math.max(0, Number(capacity) || 0),
    required: {
      fields: exactFields,
      custom: required,
    },
    preferred,
    testWeights,
    fieldWeights: {
      weight: fieldWeight,
      exact: exactFields,
      related: relatedFields,
    },
    academicWeight,
    thresholds: {
      minimumScore: clamp100(raw.thresholds?.minimumScore ?? raw.minimumScore ?? 0),
    },
    raw,
  };
}

function analysisScores(resultDoc = {}) {
  const analysis = resultDoc?.analysis || {};
  return analysis.normalizedScores || analysis.scores || analysis.dataForUI?.scores || {};
}

function flattenNumbers(obj, values = []) {
  if (typeof obj === "number" && Number.isFinite(obj)) {
    values.push(obj);
    return values;
  }
  if (!obj || typeof obj !== "object") return values;
  for (const value of Object.values(obj)) flattenNumbers(value, values);
  return values;
}

function overallFrom(resultDoc) {
  if (!resultDoc) return 0;
  if (Number.isFinite(Number(resultDoc.score))) return clamp100(resultDoc.score);
  return avg(flattenNumbers(analysisScores(resultDoc)));
}

function getScoreValue(scores = {}, key, fallback = null) {
  const wanted = lc(key);
  for (const [candidateKey, value] of Object.entries(scores || {})) {
    if (lc(candidateKey) === wanted && Number.isFinite(Number(value))) {
      return clamp100(value);
    }
    if (value && typeof value === "object") {
      const nested = getScoreValue(value, key, null);
      if (nested != null) return nested;
    }
  }
  return fallback;
}

function extractTraits(resultDoc = {}) {
  const analysis = resultDoc.analysis || {};
  const sources = [
    analysis.traits,
    analysis.dominantTraits,
    analysis.strengths,
    analysis.dataForUI?.dominantTraits,
    analysis.dataForUI?.strengths,
  ];
  const traits = [];
  for (const source of sources) {
    if (Array.isArray(source)) traits.push(...source.map(String));
    if (source && typeof source === "object" && !Array.isArray(source)) {
      for (const [key, value] of Object.entries(source)) {
        if (value === true || value?.isDominant || Number(value?.score) >= 50 || Number(value?.percentage) >= 50) {
          traits.push(key);
        }
      }
    }
  }
  return [...new Set(traits.filter(Boolean))];
}

function traitMatchScore(desired = [], candidate = []) {
  const wanted = arrayify(desired);
  if (!wanted.length) return null;
  const candidateSet = new Set(candidate.map(lc));
  const hits = wanted.filter((item) => candidateSet.has(lc(item)));
  return clamp100((hits.length / wanted.length) * 100);
}

function preferredScore(keys = [], scores = {}, fallback = null) {
  const wanted = arrayify(keys);
  if (!wanted.length) return null;
  const vals = wanted.map((key) => getScoreValue(scores, key, fallback)).filter((v) => v != null);
  return vals.length ? avg(vals) : fallback;
}

function scoreProfileDistance(target = {}, scores = {}) {
  const keys = Object.keys(target || {});
  if (!keys.length) return null;
  return avg(
    keys.map((key) => {
      const desired = Number(target[key]);
      const actual = getScoreValue(scores, key, null);
      if (!Number.isFinite(desired) || actual == null) return 50;
      return clamp100(100 - Math.abs(desired - actual));
    })
  );
}

function mbtiScore(resultDoc, spec) {
  const analysis = resultDoc.analysis || {};
  const candidateType = stableString(
    analysis.mbtiType || analysis.type || analysis.dataForUI?.mbtiType
  ).toUpperCase();
  const wanted = arrayify(spec.preferredTypes || spec.traits);
  if (!candidateType || !wanted.length) return null;
  const perType = wanted.map((type) => {
    const target = type.toUpperCase();
    if (target === candidateType) return 100;
    const letters = target.split("");
    const hits = letters.filter((ch, index) => candidateType[index] === ch).length;
    return clamp100((hits / Math.max(letters.length, 1)) * 100);
  });
  return avg(perType);
}

function computeTestCompatibility(testType, resultDoc, jobSpec) {
  const testSpec = normalizeTestSpec(getTestRequirement(jobSpec.raw, testType), testType);
  const scores = analysisScores(resultDoc);
  const traits = extractTraits(resultDoc);
  const fallback = overallFrom(resultDoc);
  const pieces = [];

  if (testType === "MBTI") {
    const mbti = mbtiScore(resultDoc, testSpec);
    if (mbti != null) pieces.push(mbti);
  }

  const preferred = preferredScore(testSpec.preferHigh, scores, fallback);
  if (preferred != null) pieces.push(preferred);

  const trait = traitMatchScore(testSpec.traits, traits);
  if (trait != null) pieces.push(trait);

  const distance = scoreProfileDistance(testSpec.scores, scores);
  if (distance != null) pieces.push(distance);

  const score = pieces.length ? avg(pieces) : fallback;
  const strengths = [];
  const gaps = [];

  if (score >= 75) strengths.push(`${testType}: تطابق بالا`);
  if (score < 50) gaps.push(`${testType}: تطابق پایین`);
  if (testSpec.preferHigh?.length) strengths.push(`${testType}: شاخص‌های ترجیحی بررسی شد`);
  if (testSpec.traits?.length) strengths.push(`${testType}: هم‌پوشانی ویژگی‌ها لحاظ شد`);

  return {
    type: "test",
    key: testType,
    label: testType,
    score: clamp100(score),
    detail: {
      desired: {
        preferHigh: testSpec.preferHigh || [],
        traits: testSpec.traits || [],
        preferredTypes: testSpec.preferredTypes || [],
      },
    },
    strengths,
    gaps,
  };
}

function normalizeField(value) {
  return stableString(value).replace(/\s+/g, " ").trim();
}

function fieldCompatibility(user, jobSpec) {
  const field = normalizeField(
    user?.profile?.field || user?.profile?.highSchoolMajor || user?.profile?.major || ""
  );
  const exact = jobSpec.fieldWeights.exact.map(normalizeField).filter(Boolean);
  const related = jobSpec.fieldWeights.related.map(normalizeField).filter(Boolean);

  if (!field && (exact.length || related.length)) {
    return {
      score: 0,
      failedRequirements: exact.length ? ["FIELD_REQUIRED"] : [],
      strengths: [],
      gaps: ["رشته تحصیلی ثبت نشده است"],
    };
  }

  const exactMatch = exact.some((candidate) => field.includes(candidate) || candidate.includes(field));
  const relatedMatch = related.some((candidate) => field.includes(candidate) || candidate.includes(field));
  const requiredFailed = exact.length > 0 && !exactMatch;
  const score = exact.length || related.length ? (exactMatch ? 100 : relatedMatch ? 70 : 35) : 50;

  return {
    score,
    failedRequirements: requiredFailed ? ["FIELD_REQUIRED"] : [],
    strengths: exactMatch || relatedMatch ? [`تطابق رشته تحصیلی: ${field}`] : [],
    gaps: requiredFailed ? [`رشته تحصیلی با الزامات ${exact.join(" / ")} مطابقت ندارد`] : [],
  };
}

function userIdentity(user = {}) {
  const profile = user.profile || {};
  return {
    userId: stableString(user._id || user.id),
    username: user.username || user.email || "",
    fullName: profile.fullName || user.name || user.fullName || "",
    field: profile.field || profile.highSchoolMajor || profile.major || "",
    phone: profile.phone || user.phone || "",
    period: user.period || "",
  };
}

function scoreCandidateForJob(user, userResults, jobSpec, eligibility = {}) {
  const identity = userIdentity(user);
  const configuredTestWeights = Object.entries(jobSpec.testWeights)
    .filter(([testType, weight]) => JOB_MATCHING_TEST_TYPES.includes(testType) && Number(weight) > 0)
    .map(([testType, weight]) => [testType, Number(weight)]);

  const components = [];
  let configuredWeightTotal = configuredTestWeights.reduce((sum, [, weight]) => sum + weight, 0);
  let activeWeightTotal = 0;
  let weightedScore = 0;
  const missingTests = [];
  const strengths = [];
  const gaps = [];
  const failedRequirements = [];

  for (const [testType, weight] of configuredTestWeights) {
    const resultDoc = userResults?.[testType];
    if (!resultDoc) {
      missingTests.push(testType);
      gaps.push(`${testType}: نتیجه آزمون موجود نیست`);
      continue;
    }
    const component = computeTestCompatibility(testType, resultDoc, jobSpec);
    component.weight = weight;
    component.rawScore = component.score;
    component.normalizedScore = component.score;
    components.push(component);
    activeWeightTotal += weight;
    weightedScore += component.score * weight;
    strengths.push(...component.strengths);
    gaps.push(...component.gaps);
  }

  if (jobSpec.fieldWeights.weight > 0) {
    const field = fieldCompatibility(user, jobSpec);
    configuredWeightTotal += jobSpec.fieldWeights.weight;
    if (identity.field) {
      activeWeightTotal += jobSpec.fieldWeights.weight;
      weightedScore += field.score * jobSpec.fieldWeights.weight;
      components.push({
        type: "profile",
        key: "field",
        label: "رشته تحصیلی",
        score: clamp100(field.score),
        rawScore: clamp100(field.score),
        normalizedScore: clamp100(field.score),
        weight: jobSpec.fieldWeights.weight,
        detail: {
          candidateField: identity.field,
          exact: jobSpec.fieldWeights.exact,
          related: jobSpec.fieldWeights.related,
        },
      });
    } else {
      gaps.push("رشته تحصیلی ثبت نشده است");
    }
    strengths.push(...field.strengths);
    gaps.push(...field.gaps);
    failedRequirements.push(...field.failedRequirements);
  }

  if (jobSpec.academicWeight > 0) {
    configuredWeightTotal += jobSpec.academicWeight;
    const diplomaAverage = Number(user?.profile?.diplomaAverage);
    if (Number.isFinite(diplomaAverage) && diplomaAverage >= 0 && diplomaAverage <= 20) {
      const academicScore = clamp100(diplomaAverage * 5);
      activeWeightTotal += jobSpec.academicWeight;
      weightedScore += academicScore * jobSpec.academicWeight;
      components.push({
        type: "profile",
        key: "academic",
        label: "معدل دیپلم",
        score: academicScore,
        rawScore: diplomaAverage,
        normalizedScore: academicScore,
        weight: jobSpec.academicWeight,
        detail: { diplomaAverage },
      });
      if (academicScore >= 75) strengths.push("معدل تحصیلی بالا");
      if (academicScore < 50) gaps.push("معدل تحصیلی پایین‌تر از سطح مطلوب");
    } else {
      gaps.push("معدل دیپلم ثبت نشده است");
    }
  }

  const finalScore = activeWeightTotal > 0 ? clamp100(weightedScore / activeWeightTotal) : 0;
  const dataCompleteness =
    configuredWeightTotal > 0 ? Math.max(0, Math.min(1, activeWeightTotal / configuredWeightTotal)) : 0;

  for (const component of components) {
    component.contribution =
      activeWeightTotal > 0 ? Number(((component.score * component.weight) / activeWeightTotal).toFixed(4)) : 0;
    component.weightedContribution = component.contribution;
  }

  const threshold = Math.max(jobSpec.thresholds.minimumScore || 0, Number(eligibility.minMatchScore) || 0);
  const overridden = eligibility.completenessOverrides?.has(identity.userId);
  if (dataCompleteness < (Number(eligibility.minCompleteness) || 0) && !overridden) {
    failedRequirements.push("INSUFFICIENT_DATA");
  }
  if (finalScore < threshold) failedRequirements.push("LOW_MATCH_SCORE");
  if (failedRequirements.includes("FIELD_REQUIRED")) failedRequirements.push("HARD_REQUIREMENT_FAILED");

  const evidenceStrengths = components
    .filter((component) => component.normalizedScore >= 70)
    .map((component) => `${component.label || component.key}: ${Math.round(component.normalizedScore)}%`);
  const evidenceGaps = [
    ...components
      .filter((component) => component.normalizedScore < 50)
      .map((component) => `${component.label || component.key}: ${Math.round(component.normalizedScore)}%`),
    ...missingTests.map((testType) => `${testType}: نتیجه آزمون موجود نیست`),
  ];

  return {
    jobId: jobSpec.id,
    job: jobSpec.name,
    candidate: identity,
    userId: identity.userId,
    username: identity.username,
    fullName: identity.fullName,
    field: identity.field,
    phone: identity.phone,
    eligible: failedRequirements.length === 0,
    finalScore: Number(finalScore.toFixed(4)),
    score: Number(finalScore.toFixed(4)),
    dataCompleteness: Number(dataCompleteness.toFixed(2)),
    components,
    strengths: [...new Set(evidenceStrengths)].slice(0, 12),
    gaps: [...new Set(evidenceGaps)].slice(0, 12),
    missingTests,
    failedRequirements: [...new Set(failedRequirements)],
    reason: failedRequirements.length ? failedRequirements.join(",") : null,
  };
}

function compareEdges(a, b) {
  if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
  if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
  if (b.dataCompleteness !== a.dataCompleteness) return b.dataCompleteness - a.dataCompleteness;
  if (a.jobId !== b.jobId) return a.jobId.localeCompare(b.jobId);
  return a.userId.localeCompare(b.userId);
}

function compareMatchEdges(a, b) {
  if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
  if (b.dataCompleteness !== a.dataCompleteness) return b.dataCompleteness - a.dataCompleteness;
  if (a.jobId !== b.jobId) return a.jobId.localeCompare(b.jobId);
  return a.userId.localeCompare(b.userId);
}

function summarizePerson(row, rank = null, extra = {}) {
  return {
    id: row.userId,
    userId: row.userId,
    username: row.username,
    fullName: row.fullName,
    field: row.field,
    phone: row.phone,
    rank,
    score: row.finalScore,
    finalScore: row.finalScore,
    dataCompleteness: row.dataCompleteness,
    components: row.components,
    strengths: row.strengths,
    gaps: row.gaps,
    failedRequirements: row.failedRequirements,
    reason: row.reason,
    ...extra,
  };
}

function unassignedReason(rows = []) {
  if (!rows.length) return "NO_JOB_CONFIGURED";
  if (rows.every((row) => row.dataCompleteness === 0)) return "INSUFFICIENT_DATA";
  if (rows.every((row) => !row.eligible)) return "NOT_ELIGIBLE";
  return "CAPACITY_FULL";
}

function csvEscape(value) {
  const text = stableString(value).replace(/"/g, '""');
  return /[",\n\r]/.test(text) ? `"${text}"` : text;
}

function buildExports(rows = []) {
  const header = [
    "job",
    "rank",
    "assigned",
    "userId",
    "username",
    "fullName",
    "field",
    "finalScore",
    "dataCompleteness",
    "reason",
    "failedRequirements",
  ];
  const csv = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.job,
        row.rank ?? "",
        row.assigned ? 1 : 0,
        row.userId,
        row.username,
        row.fullName,
        row.field,
        row.finalScore ?? row.score ?? 0,
        Number(((row.dataCompleteness ?? 0) * 100).toFixed(2)),
        row.reason || "",
        (row.failedRequirements || []).join("|"),
      ]
        .map(csvEscape)
        .join(",")
    ),
  ].join("\n");

  const body = rows
    .map(
      (row) => `<tr>
        <td>${csvEscape(row.job)}</td>
        <td>${row.rank ?? ""}</td>
        <td>${row.assigned ? "yes" : "no"}</td>
        <td>${csvEscape(row.fullName || row.username || row.userId)}</td>
        <td>${csvEscape(row.field)}</td>
        <td>${Number(row.finalScore ?? row.score ?? 0).toFixed(2)}</td>
        <td>${Number((row.dataCompleteness ?? 0) * 100).toFixed(0)}%</td>
        <td>${csvEscape(row.reason || "")}</td>
      </tr>`
    )
    .join("");

  return {
    csv: "\uFEFF" + csv,
    csvBase64: Buffer.from("\uFEFF" + csv, "utf8").toString("base64"),
    html: `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>Job Allocation</title></head><body><table><tbody>${body}</tbody></table></body></html>`,
  };
}

export function runJobMatching({
  users = [],
  resultsByUser = {},
  capacities = {},
  weights = {},
  jobRequirements = {},
  minCompleteness = 0,
  minMatchScore = 0,
  completenessOverrides = [],
  generatedAt = new Date().toISOString(),
} = {}) {
  const userList = users.map((user) => ({ ...user, _id: stableString(user._id || user.id) }));
  const resultMap =
    resultsByUser instanceof Map
      ? resultsByUser
      : new Map(Object.entries(resultsByUser || {}).map(([userId, results]) => [stableString(userId), results || {}]));

  const jobSpecs = Object.entries(capacities || {})
    .filter(([, capacity]) => Number(capacity) >= 0)
    .map(([name, capacity]) => adaptJobSpec(name, jobRequirements?.[name] || {}, capacity, weights));
  const eligibility = {
    minCompleteness: Math.max(0, Math.min(1, Number(minCompleteness) || 0)),
    minMatchScore: clamp100(minMatchScore),
    completenessOverrides: new Set((completenessOverrides || []).map(stableString)),
  };

  const candidateJobScores = [];
  for (const jobSpec of jobSpecs) {
    for (const user of userList) {
      const userResults = resultMap.get(stableString(user._id)) || {};
      candidateJobScores.push(scoreCandidateForJob(user, userResults, jobSpec, eligibility));
    }
  }

  const rowsByJob = new Map();
  for (const jobSpec of jobSpecs) {
    const rows = candidateJobScores
      .filter((row) => row.jobId === jobSpec.id)
      .sort(compareMatchEdges)
      .map((row, index) => ({ ...row, rank: index + 1 }));
    rowsByJob.set(jobSpec.id, rows);
  }
  const rankedCandidateJobScores = [...rowsByJob.values()].flat().sort(compareEdges);

  const remainingCapacity = new Map(jobSpecs.map((job) => [job.id, job.capacity]));
  const assignedUsers = new Set();
  const chosen = [];
  const globalEdges = [...candidateJobScores].filter((row) => row.eligible).sort(compareEdges);

  for (const edge of globalEdges) {
    if (assignedUsers.has(edge.userId)) continue;
    if ((remainingCapacity.get(edge.jobId) || 0) <= 0) continue;
    assignedUsers.add(edge.userId);
    remainingCapacity.set(edge.jobId, (remainingCapacity.get(edge.jobId) || 0) - 1);
    chosen.push(edge);
  }

  const selectedByJob = new Map(jobSpecs.map((job) => [job.id, []]));
  const assignedJobByUser = new Map();
  for (const row of chosen) {
    assignedJobByUser.set(row.userId, row.jobId);
    selectedByJob.get(row.jobId).push(row);
  }

  const allocations = {};
  const assignments = [];
  const waitlist = [];
  const table = [];

  for (const jobSpec of jobSpecs) {
    const selected = (selectedByJob.get(jobSpec.id) || []).sort(compareEdges);
    const selectedIds = new Set(selected.map((row) => row.userId));
    const persons = selected.map((row, index) => {
      const topMatches = candidateJobScores
        .filter((match) => match.userId === row.userId)
        .sort(compareEdges)
        .slice(0, 3)
        .map((match) => ({ jobId: match.jobId, job: match.job, finalScore: match.finalScore, eligible: match.eligible }));
      return summarizePerson(row, index + 1, {
        topMatches,
        assignmentReason: topMatches[0]?.jobId && topMatches[0].jobId !== row.jobId ? "CAPACITY_FULL" : null,
      });
    });

    allocations[jobSpec.name] = {
      jobId: jobSpec.id,
      name: jobSpec.name,
      capacity: jobSpec.capacity,
      persons,
    };

    if (jobSpec.capacity > 0) {
      assignments.push({
        jobId: jobSpec.id,
        job: jobSpec.name,
        capacity: jobSpec.capacity,
        slots: persons,
      });
    }

    const queue = (rowsByJob.get(jobSpec.id) || [])
      .filter((row) => !selectedIds.has(row.userId))
      .map((row) => {
        const assignedJobId = assignedJobByUser.get(row.userId) || null;
        return {
          ...summarizePerson(row, row.rank),
          status: assignedJobId ? "assigned_elsewhere" : "available",
          reason: !row.eligible ? "NOT_ELIGIBLE" : assignedJobId ? "ASSIGNED_TO_HIGHER_GLOBAL_MATCH" : "CAPACITY_FULL",
          assignedJobId,
          eligible: row.eligible,
        };
      });

    waitlist.push({
      jobId: jobSpec.id,
      job: jobSpec.name,
      queue,
    });

    table.push(...persons.map((person) => ({ ...person, job: jobSpec.name, jobId: jobSpec.id, assigned: true })));
    table.push(
      ...queue.map((person) => ({
        ...person,
        job: jobSpec.name,
        jobId: jobSpec.id,
        assigned: false,
      }))
    );
  }

  const unassigned = userList
    .filter((user) => !assignedUsers.has(stableString(user._id)))
    .map((user) => {
      const identity = userIdentity(user);
      const rows = candidateJobScores.filter((row) => row.userId === identity.userId);
      const best = [...rows].sort(compareEdges)[0] || null;
      return {
        ...identity,
        reason: unassignedReason(rows),
        bestJobId: best?.jobId || null,
        bestJob: best?.job || null,
        bestScore: best?.finalScore || 0,
        dataCompleteness: best?.dataCompleteness || 0,
        failedRequirements: best?.failedRequirements || [],
      };
    });

  const chosenByUser = new Map(chosen.map((row) => [row.userId, row]));
  const candidates = userList.map((user) => {
    const identity = userIdentity(user);
    const matches = candidateJobScores
      .filter((row) => row.userId === identity.userId)
      .sort(compareMatchEdges);
    const recommendations = matches.slice(0, 3).map((row, index) => ({
      jobId: row.jobId,
      job: row.job,
      rank: index + 1,
      matchScore: row.finalScore,
      strengths: row.strengths,
      gaps: row.gaps,
      components: row.components,
      eligible: row.eligible,
      failedRequirements: row.failedRequirements,
    }));
    const selected = chosenByUser.get(identity.userId) || null;
    const recommendationRank = selected
      ? matches.findIndex((row) => row.jobId === selected.jobId) + 1
      : null;
    const higherRecommendationFailure = selected
      ? matches.slice(0, Math.max(0, recommendationRank - 1)).find((row) => !row.eligible)?.failedRequirements?.[0]
      : null;
    const best = matches[0] || null;
    let reasonCode = null;
    if (!selected) {
      if (!best || !matches.length) reasonCode = "NO_ELIGIBLE_JOB";
      else if (matches.every((row) => row.failedRequirements.includes("INSUFFICIENT_DATA"))) reasonCode = "INSUFFICIENT_DATA";
      else if (matches.every((row) => row.failedRequirements.includes("LOW_MATCH_SCORE"))) reasonCode = "LOW_MATCH_SCORE";
      else if (matches.every((row) => row.failedRequirements.includes("HARD_REQUIREMENT_FAILED"))) reasonCode = "HARD_REQUIREMENT_FAILED";
      else reasonCode = "CAPACITY_FULL";
    }
    return {
      ...identity,
      dataCompleteness: best?.dataCompleteness || 0,
      recommendations,
      finalAllocation: selected ? {
        jobId: selected.jobId,
        job: selected.job,
        matchScore: selected.finalScore,
        recommendationRank,
        reasonCode: recommendationRank === 1 ? "TOP_RECOMMENDATION" : higherRecommendationFailure || "CAPACITY_FULL",
      } : null,
      status: selected ? "ASSIGNED" : "UNASSIGNED",
      reasonCode,
      completenessOverride: eligibility.completenessOverrides.has(identity.userId),
    };
  });

  const jobs = jobSpecs.map((jobSpec) => {
    const ranking = rowsByJob.get(jobSpec.id) || [];
    const assignedIds = new Set((selectedByJob.get(jobSpec.id) || []).map((row) => row.userId));
    return {
      jobId: jobSpec.id,
      job: jobSpec.name,
      capacity: jobSpec.capacity,
      assignedCount: assignedIds.size,
      ranking: ranking.map((row) => ({
        rank: row.rank,
        userId: row.userId,
        username: row.username,
        fullName: row.fullName,
        matchScore: row.finalScore,
        dataCompleteness: row.dataCompleteness,
        eligible: row.eligible,
        finalAssignment: assignedJobByUser.get(row.userId) || null,
        reasonCode: row.eligible ? null : row.failedRequirements[0] || "NO_ELIGIBLE_JOB",
      })),
      waitlist: ranking
        .filter((row) => !assignedIds.has(row.userId))
        .map((row) => ({
          rank: row.rank,
          userId: row.userId,
          username: row.username,
          fullName: row.fullName,
          matchScore: row.finalScore,
          dataCompleteness: row.dataCompleteness,
          reasonCode: !row.eligible
            ? row.failedRequirements[0] || "NO_ELIGIBLE_JOB"
            : assignedJobByUser.has(row.userId) ? "ASSIGNED_ELSEWHERE" : "CAPACITY_FULL",
        })),
    };
  });

  return {
    meta: {
      generatedAt,
      candidateCount: userList.length,
      jobCount: jobSpecs.length,
      algorithmVersion: ALGORITHM_VERSION,
      excludedSensitiveSignals: EXCLUDED_SENSITIVE_SIGNALS,
      weights,
      minCompleteness: eligibility.minCompleteness,
      minMatchScore: eligibility.minMatchScore,
    },
    candidates,
    jobs,
    allocations,
    assignments,
    waitlist,
    unassigned,
    candidateJobScores: rankedCandidateJobScores,
    table,
    export: buildExports(table),
  };
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
  for (const row of results) {
    const userId = stableString(row._id.user);
    const testType = stableString(row._id.testType);
    if (!JOB_MATCHING_TEST_TYPES.includes(testType)) continue;
    const byUser = map.get(userId) || {};
    byUser[testType] = row.doc;
    map.set(userId, byUser);
  }
  return map;
}

export async function prioritizeCandidates({
  userIds = [],
  capacities = {},
  weights = {},
  jobRequirements = {},
  minCompleteness = 0.6,
  minMatchScore = 50,
  completenessOverrides = [],
}) {
  if (!Array.isArray(userIds) || !userIds.length) {
    throw new Error("userIds is required");
  }

  const objectIds = userIds.map((id) =>
    typeof id === "string" ? new mongoose.Types.ObjectId(id) : id
  );

  const [resultsByUser, users] = await Promise.all([
    fetchLatestResultsByUser(userIds),
    User.find({ _id: { $in: objectIds } })
      .select("username email period profile.fullName profile.field profile.highSchoolMajor profile.major profile.phone profile.diplomaAverage")
      .lean(),
  ]);

  return runJobMatching({
    users,
    resultsByUser,
    capacities,
    weights,
    jobRequirements,
    minCompleteness,
    minMatchScore,
    completenessOverrides,
  });
}

export function explainCandidateJob(allocationResult, userId, jobIdOrName) {
  const uid = stableString(userId);
  const target = lc(jobIdOrName);
  return (
    allocationResult?.candidateJobScores?.find(
      (row) =>
        row.userId === uid &&
        (lc(row.jobId) === target || lc(row.job) === target)
    ) || null
  );
}
