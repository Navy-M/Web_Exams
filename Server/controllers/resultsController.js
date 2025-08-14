// controllers/resultsController.js
import mongoose from "mongoose";
const { Types } = mongoose;
import Result from "../models/Result.js";
import User from "../models/User.js";
import { getTestAnalysis } from "../utils/testAnalyzer.js";
import { jobRequirements } from "../config/dummyData.js";

// Create new test result
export const createResult = async (req, res) => {
  try {
    const {
      user, // User ID
      testType, // e.g., "DISC", "MBTI"
      answers, // Array of answers
      score, // Optional score
      analysis, // Optional additional info
      adminFeedback, // Optional
      startedAt, // When test started
    } = req.body;

    if (!user || !testType || !answers) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Calculate time taken
    const endedAt = new Date();
    const durationInSeconds = Math.floor(
      (endedAt - new Date(startedAt)) / 1000
    );

    // Check if result already exists
    const existingResult = await Result.findOne({
      user: user, // if user is just an ID
      testType: testType,
    });
    if (existingResult) {
      return res
        .status(409)
        .json({ message: "This test has already been submitted." });
    }

    const newResult = new Result({
      user,
      testType,
      answers,
      score,
      analysis,
      adminFeedback,
      startedAt: new Date(startedAt),
      endedAt,
      duration: durationInSeconds,
    });

    await newResult.save();
    res.status(201).json(newResult);
  } catch (error) {
    console.error("Error creating result:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getResultById = async (req, res) => {
  try {
    const { resultId } = req.params;
    // console.log(resultId, resultId);

    // 1️⃣ Validate the ID
    if (!resultId) {
      return res.status(400).json({
        status: "error",
        message: "Result ID is required.",
      });
    }

    // 2️⃣ Check if ID is a valid MongoDB ObjectId
    const isValidId = mongoose.Types.ObjectId.isValid(resultId);
    if (!isValidId) {
      return res.status(400).json({
        status: "error",
        message: "Invalid Result ID format.",
      });
    }

    // 3️⃣ Query the database
    const result = await Result.findById(resultId);

    // 4️⃣ Handle missing result
    if (!result) {
      return res.status(404).json({
        status: "error",
        message: "Result not found.",
      });
    }

    // 5️⃣ Return the result
    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("❌ Error fetching result:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while fetching result.",
    });
  }
};

// Get all results
export const getResults = async (req, res) => {
  try {
    const results = await Result.find().populate("user", "name email role");
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching results:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get results by user
export const getResultsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const results = await Result.find({ user: userId }).populate(
      "user",
      "name email"
    );
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching user results:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Save Results
export const submitTestResult = async (req, res) => {
  try {
    const { user, testType, answers, score, analysis, startedAt, submittedAt } =
      req.body;
    // console.log({ user, testType, answers, score, otherResult, startedAt });

    // if (Result.find((r) => r.user === user)) {
    //   return res.status(400).json({ message: "result is already exist." });
    // }

    if (!user || !testType || !answers) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const result = new Result({
      user,
      testType,
      answers,
      score,
      analysis: analysis,
      adminFeedback: "", // initially empty
      startedAt,
      submittedAt,
      duration: Math.round(Date.now() - new Date(startedAt)), // x / 60000 for convert to minutes
    });

    const savedResult = await result.save();

    // Small object to store in user's private array
    const miniResult = {
      resultId: savedResult._id,
      testType,
      completedAt: savedResult.submittedAt,
      isPublic: false,
    };
    // Update the user directly
    const updatedUser = await User.findByIdAndUpdate(
      user,
      {
        $push: { testsAssigned: miniResult },
      },
      { new: true }
    ).select("-password");

    return res.status(200).json({
      message: {
        status: "success",
        text: " your test result successfully submited. ",
      },
      result: savedResult,
      user: updatedUser,
    });

    // const message = {
    //   status: "success",
    //   text: " your test result successfully submited. ",
    // };
    //
    // res.status(201).json(message);
  } catch (err) {
    console.error("Error submitting result to db:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a result by ID
export const deleteResult = async (req, res) => {
  try {
    const { resultId } = req.params;

    // console.log("delete resultId : ", resultId);

    // Validate resultId format
    if (!resultId || !mongoose.Types.ObjectId.isValid(resultId)) {
      return res.status(400).json({
        status: "error",
        message: "شناسه نتیجه نامعتبر است",
      });
    }

    // Find and delete the result
    const result = await Result.findOneAndDelete({ _id: resultId });

    // console.log("delete result : ", result);

    if (!result) {
      return res.status(404).json({
        status: "error",
        message: "نتیجه آزمایش یافت نشد",
      });
    }

    // Remove the result from the user's testsAssigned.private array
    const privateUpdateResult = await User.updateOne(
      { _id: result.user, "testsAssigned.resultId": resultId },
      { $pull: { testsAssigned: { resultId: resultId } } }
    );
    // console.log("Private array update result:", privateUpdateResult); // Debug: Log update result

    return res.status(200).json({
      status: "success",
      message: "نتیجه با موفقیت حذف شد",
    });
  } catch (err) {
    console.error("Error deleting result:", err);
    res.status(500).json({
      status: "error",
      message: "❌خطای سرور در حذف نتیجه",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

export const analyzeResult = async (req, res) => {
  try {
    const { resultId, testType } = req.body;
    // More robust validation
    if (!resultId || typeof resultId !== "string") {
      return res.status(400).json({
        status: "error",
        message: "شناسه نتیجه نامعتبر است",
      });
    }

    if (!testType) {
      return res.status(400).json({
        status: "error",
        message: "نوع تست نامعتبر است",
      });
    }

    // console.log("Searching for resultId:", resultId);
    // console.log("Searching for testType:", testType);

    const result = await Result.findOne({ _id: resultId, testType: testType });
    // console.log("Found result:", result);

    if (!result) {
      return res.status(404).json({
        status: "error",
        message: "نتیجه آزمایش یافت نشد",
      });
    }

    // Validate required fields
    if (!result.testType || !result.answers) {
      return res.status(400).json({
        status: "error",
        message: "داده‌های نتیجه ناقص هستند",
      });
    }

    const analysis = getTestAnalysis(testType, result.answers);

    if (!analysis) {
      console.log(
        `No analysis generated for testType: ${testType}, resultId: ${resultId}`
      );
      return res.status(400).json({
        status: "error",
        message: "تحلیل برای این نوع تست تولید نشد",
      });
    }

    console.log("🔍 analysis generated: ", analysis);

    // Update the result document
    try {
      result.analysis = analysis;
      await result.save(); // Option 1: Save the document

      const user = await User.findById(result.user);
      if (!user) return res.status(404).json({ message: "User not found" });

      const updatedSummary = {
        resultId: result._id,
        adminFeedback: result.adminFeedback,
        completedAt: result.createdAt,
        score: result.score,
        duration: result.duration,
        testType: result.testType,
        analyzedAt: analysis.analyzedAt || "",
        isPublic: true,
      };

      // Find index in array
      const index = user.testsAssigned.findIndex(
        (entry) => entry.resultId.toString() === result._id.toString()
      );

      if (index !== -1) {
        // ✅ Already exists: update it
        user.testsAssigned[index] = {
          ...user.testsAssigned[index],
          ...updatedSummary, // overwrite fields with new values
        };
      } else {
        // ✅ Doesn't exist: add new
        user.testsAssigned.push(updatedSummary);
      }

      await user.save();

      // console.log(`Analysis saved for resultId: ${resultId}`);
    } catch (saveError) {
      console.error(
        `Error saving analysis for resultId: ${resultId}`,
        saveError
      );
      return res.status(500).json({
        status: "error",
        message: "❌خطای سرور در ذخیره تحلیل",
        error:
          process.env.NODE_ENV === "development"
            ? saveError.message
            : undefined,
      });
    }

    return res.status(200).json({
      status: "success",
      message: "تحلیل با موفقیت انجام شد",
      data: analysis, // Consistent response structure
    });
  } catch (err) {
    console.error("Error analyzing result:", err);
    res.status(500).json({
      status: "error",
      message: "❌خطای سرور در تحلیل تست",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Admin submits evaluation and manages test visibility
export const updateTestFeedback = async (req, res) => {
  const { feedbackData } = req.body;
  try {
    console.log(
      "userId : ",
      feedbackData.userId,
      ".....  resultsID : ",
      feedbackData.resultId,
      ".....  feedback : ",
      feedbackData.feedback
    );

    // Step 1: Update the Result document
    const result = await Result.findById(feedbackData.resultId);
    if (!result)
      return res.status(404).json({ message: "Test result not found" });

    result.adminFeedback = feedbackData.feedback;
    await result.save();

    // Step 2: Update the User document
    const user = await User.findById(feedbackData.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const updatedSummary = {
      resultId: result._id,
      adminFeedback: result.adminFeedback,
      completedAt: result.createdAt,
      score: result.score,
      duration: result.durationInSeconds,
      testType: result.testType,
      analyzedAt: result.analysis?.analyzedAt || null,
      isPublic: true,
    };

    // Find index in array
    const index = user.testsAssigned.findIndex(
      (entry) => entry.resultId.toString() === result._id.toString()
    );

    if (index !== -1) {
      // ✅ Already exists: update it
      user.testsAssigned[index] = {
        ...user.testsAssigned[index],
        ...updatedSummary, // overwrite fields with new values
      };
    } else {
      // ✅ Doesn't exist: add new
      user.testsAssigned.push(updatedSummary);
    }

    await user.save();

    res
      .status(200)
      .json({ message: "Feedback submitted successfully", result });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ----------------- helpers: extract traits & compute fit -----------------

const safeNum = (x) => (Number.isFinite(x) ? x : 0);

// DISC: expects analysis.normalizedScores like { D: 0..100, I:..., S:..., C:... }
function discFit(reqDiscArray, analysis) {
  if (!reqDiscArray || !analysis) return 0;
  const ns = analysis.normalizedScores || analysis.NS || {};
  const threshold = 65; // "High" threshold
  const traitMap = { D: ns.D ?? 0, I: ns.I ?? 0, S: ns.S ?? 0, C: ns.C ?? 0 };

  // If we also have primaryTrait in analysis, bump it slightly
  const primary = analysis.primaryTrait;
  if (primary && traitMap[primary] != null) traitMap[primary] += 5;

  let scores = [];
  for (const token of reqDiscArray) {
    const m = /^High\s+([DISC])$/i.exec(token);
    if (!m) continue;
    const letter = m[1].toUpperCase();
    const v = safeNum(traitMap[letter]);
    // If above threshold count it as strong (1), else scale proportionally
    const s = v >= threshold ? 1 : v / threshold;
    scores.push(Math.max(0, Math.min(1, s)));
  }
  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// MBTI: uses analysis.mbtiType ("INTJ"). We allow partial-letter overlap.
function mbtiFit(requiredTypes, analysis) {
  if (!requiredTypes || !analysis) return 0;
  const t = (analysis.mbtiType || "").toUpperCase();
  if (!t || t.length !== 4) return 0;

  let best = 0;
  for (const r of requiredTypes) {
    const rr = (r || "").toUpperCase();
    if (rr.length !== 4) continue;
    if (rr === t) best = Math.max(best, 1);
    else {
      // partial overlap score: each matching letter counts 0.25
      let overlap = 0;
      for (let i = 0; i < 4; i++) if (rr[i] === t[i]) overlap++;
      best = Math.max(best, overlap / 4);
    }
  }
  return best;
}

// HOLLAND: analysis.hollandCode (top 3 letters) and/or normalizedScores {R,I,A,S,E,C}
function hollandFit(reqLetters, analysis) {
  if (!reqLetters || !analysis) return 0;
  const ns = analysis.normalizedScores || {};
  const code = (analysis.hollandCode || "").toUpperCase();
  const letters = ["R", "I", "A", "S", "E", "C"];
  // Use normalizedScores when present; otherwise, award if letter appears in top3 code
  if (Object.keys(ns).length) {
    const vals = reqLetters.map((L) => safeNum(ns[L] ?? 0) / 100);
    if (!vals.length) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  } else if (code) {
    let hits = 0;
    for (const L of reqLetters) if (code.includes(L)) hits++;
    return hits / Math.max(3, reqLetters.length);
  }
  return 0;
}

// GARDNER: analysis.topIntelligences (codes) and/or normalizedScores keyed by codes (L,M,S,B,Mu,I,In,N)
function gardnerFit(reqCodes, analysis) {
  if (!reqCodes || !analysis) return 0;
  const ns = analysis.normalizedScores || {};
  const tops = analysis.topIntelligences || [];

  if (Object.keys(ns).length) {
    const vals = reqCodes.map((c) => safeNum(ns[c] ?? 0) / 100);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }
  if (tops.length) {
    const inter = tops.filter((c) => reqCodes.includes(c)).length;
    return inter / Math.max(tops.length, reqCodes.length);
  }
  return 0;
}

// CLIFTON: analysis.signatureTheme (string), topThemes (array), and possibly normalizedScores by theme
function cliftonFit(reqThemes, analysis) {
  if (!reqThemes || !analysis) return 0;
  const sig = analysis.signatureTheme;
  const tops = analysis.topThemes || [];
  const ns = analysis.normalizedScores || {}; // sometimes keyed by theme name

  let best = 0;

  if (Object.keys(ns).length) {
    for (const t of reqThemes) best = Math.max(best, safeNum(ns[t] ?? 0) / 100);
  }

  if (sig && reqThemes.includes(sig)) best = Math.max(best, 1);
  if (tops.length) {
    const overlap = tops.filter((t) => reqThemes.includes(t)).length;
    best = Math.max(best, Math.min(1, overlap / Math.max(3, reqThemes.length)));
  }

  return best;
}

// GHQ: stress/health risk. Lower is better.
// Accepts: analysis.riskLevel in {"Low","Moderate","High"} or numeric score (0-100) where lower is better.
function ghqScore(analysis) {
  if (!analysis) return 0.5;
  const rl = (analysis.riskLevel || "").toLowerCase();
  if (rl) {
    if (rl.includes("low")) return 1;
    if (rl.includes("moderate")) return 0.6;
    if (rl.includes("high")) return 0.2;
  }
  const v = Number(analysis.score);
  if (Number.isFinite(v)) {
    // Assuming 0 = best, 100 = worst
    return Math.max(0, Math.min(1, 1 - v / 100));
  }
  return 0.5;
}

// Compute per-job fit (0..1) using jobRequirements and all analyses
function computeJobFit(jobName, analyses) {
  const req = jobRequirements[jobName];
  if (!req) return 0;

  const pieces = [];
  if (req.disc) pieces.push(discFit(req.disc, analyses.DISC));
  if (req.mbti) pieces.push(mbtiFit(req.mbti, analyses.MBTI));
  if (req.holland) pieces.push(hollandFit(req.holland, analyses.HOLLAND));
  if (req.gardner) pieces.push(gardnerFit(req.gardner, analyses.GARDNER));
  if (req.clifton) pieces.push(cliftonFit(req.clifton, analyses.CLIFTON));

  if (!pieces.length) return 0;
  // average of available components
  return pieces.reduce((a, b) => a + b, 0) / pieces.length;
}

// Composite score across tests (weights apply to raw test quality,
// not job-specific fit). We’ll use it as a tie-breaker.
function computeCompositeScore(analyses, weights) {
  const {
    DISC = 1,
    CLIFTON = 1,
    HOLLAND = 1,
    MBTI = 1,
    GARDNER = 1,
    GHQ = 1,
  } = weights || {};

  // For “quality” per test, use the max normalized dimension
  const maxFromNS = (ns) =>
    Object.values(ns || {}).reduce((m, v) => (v > m ? v : m), 0) / 100;

  const parts = [];

  // DISC
  parts.push(maxFromNS(analyses.DISC?.normalizedScores) * DISC);

  // HOLLAND
  parts.push(maxFromNS(analyses.HOLLAND?.normalizedScores) * HOLLAND);

  // GARDNER
  parts.push(maxFromNS(analyses.GARDNER?.normalizedScores) * GARDNER);

  // CLIFTON: try normalizedScores if exists, else 0.8 for having signatureTheme
  if (analyses.CLIFTON?.normalizedScores) {
    parts.push(maxFromNS(analyses.CLIFTON.normalizedScores) * CLIFTON);
  } else if (analyses.CLIFTON?.signatureTheme) {
    parts.push(0.8 * CLIFTON);
  } else parts.push(0);

  // MBTI: presence → moderate credit
  parts.push((analyses.MBTI?.mbtiType ? 0.7 : 0) * MBTI);

  // GHQ: invert risk
  parts.push(ghqScore(analyses.GHQ) * GHQ);

  // Normalize to 0..1 by dividing by sum of weights actually considered
  const weightSum = DISC + HOLLAND + GARDNER + CLIFTON + MBTI + GHQ || 1;
  const s = parts.reduce((a, b) => a + b, 0) / weightSum;

  return Math.max(0, Math.min(1, s));
}

// ----------------- main controller -----------------

export const prioritizeJobs = async (req, res) => {
  try {
    const { people, quotas, weights } = req.body;

    if (!Array.isArray(people) || !quotas) {
      return res.status(400).json({ message: "Missing people or quotas" });
    }

    const defaultWeights = {
      DISC: 1,
      CLIFTON: 1,
      HOLLAND: 1,
      MBTI: 1,
      GARDNER: 1,
      GHQ: 1,
    };
    const testWeights = { ...defaultWeights, ...(weights || {}) };

    // 1) Users: we may use job preferences from profile and (optional) PERSONAL_FAVORITES ranking
    const users = await User.find({ _id: { $in: people } }).select(
      "profile.jobPosition"
    );

    // 2) Latest results per user & test
    const agg = await Result.aggregate([
      {
        $match: {
          user: { $in: people.map((id) => new mongoose.Types.ObjectId(id)) },
        },
      },
      { $sort: { submittedAt: -1 } },
      {
        $group: {
          _id: { user: "$user", testType: "$testType" },
          latest: { $first: "$$ROOT" },
        },
      },
    ]);

    // Convert to easy lookup: userId -> testType -> analysis
    const byUser = new Map();
    for (const row of agg) {
      const uid = String(row._id.user);
      const t = row._id.testType;
      const a = row.latest?.analysis || {};
      if (!byUser.has(uid)) byUser.set(uid, {});
      byUser.get(uid)[t] = a;
    }

    // If you store ranked job preferences in PERSONAL_FAVORITES.analysis, pull them
    const preferencesByUser = new Map(); // uid -> [jobName,...]
    for (const row of agg) {
      if (row._id.testType === "PERSONAL_FAVORITES") {
        const uid = String(row._id.user);
        const pref =
          row.latest?.analysis?.rankedJobs ||
          row.latest?.analysis?.preferences ||
          [];
        preferencesByUser.set(uid, Array.isArray(pref) ? pref : []);
      }
    }

    // 3) Build people data with analyses, composite score, preferences
    const pool = users.map((u) => {
      const uid = String(u._id);
      const analyses = byUser.get(uid) || {};
      return {
        id: uid,
        analyses,
        composite: computeCompositeScore(analyses, testWeights), // 0..1
        preferences:
          preferencesByUser.get(uid) ||
          (u.profile?.jobPosition ? [u.profile.jobPosition] : []),
      };
    });

    // 4) Setup allocations and counters
    const allocations = {};
    const capacity = {};
    Object.keys(quotas).forEach((key) => {
      const { name, tableCount } = quotas[key] || {};
      allocations[key] = { name: name || key, persons: [] };
      capacity[key] = Number(tableCount) || 0;
    });
    allocations.Unassigned = { name: "Unassigned", persons: [] };

    const jobKeyByName = {};
    for (const key of Object.keys(quotas)) {
      const nm = quotas[key]?.name || key;
      jobKeyByName[nm] = key;
    }

    const notAssigned = new Set(pool.map((p) => p.id));

    // Utility to assign & mark
    const assign = (jobKey, person) => {
      allocations[jobKey].persons.push(person);
      capacity[jobKey]--;
      notAssigned.delete(person.id);
    };

    // 5) Pass 1: strong fit to each job (fit >= 0.8)
    for (const jobKey of Object.keys(capacity)) {
      if (capacity[jobKey] <= 0) continue;
      const jobName = quotas[jobKey]?.name || jobKey;

      const candidates = pool
        .filter((p) => notAssigned.has(p.id))
        .map((p) => {
          const fit = computeJobFit(jobName, p.analyses); // 0..1
          return { ...p, fit };
        })
        .filter((p) => p.fit >= 0.8)
        .sort((a, b) => b.fit - a.fit || b.composite - a.composite);

      for (const c of candidates) {
        if (capacity[jobKey] <= 0) break;
        assign(jobKey, { id: c.id, fit: c.fit, composite: c.composite });
      }
    }

    // 6) Pass 2: satisfy user preferences in order
    for (const person of pool.filter((p) => notAssigned.has(p.id))) {
      for (const prefName of person.preferences) {
        const key = jobKeyByName[prefName];
        if (!key) continue;
        if (capacity[key] > 0) {
          const fit = computeJobFit(quotas[key]?.name || key, person.analyses);
          assign(key, { id: person.id, fit, composite: person.composite });
          break;
        }
      }
    }

    // 7) Pass 3: fill remaining with best fit/score
    const remainingPeople = pool.filter((p) => notAssigned.has(p.id));
    // For greedy fill, compute best job per person
    const openKeys = Object.keys(capacity).filter((k) => capacity[k] > 0);

    // Sort people by composite desc
    remainingPeople.sort((a, b) => b.composite - a.composite);

    for (const person of remainingPeople) {
      if (openKeys.length === 0) break;

      // pick the job with highest fit that still has capacity
      let bestKey = null;
      let bestFit = -1;
      for (const k of openKeys) {
        if (capacity[k] <= 0) continue;
        const jobName = quotas[k]?.name || k;
        const fit = computeJobFit(jobName, person.analyses);
        if (fit > bestFit) {
          bestFit = fit;
          bestKey = k;
        }
      }
      if (bestKey) {
        assign(bestKey, {
          id: person.id,
          fit: Math.max(0, bestFit),
          composite: person.composite,
        });
        if (capacity[bestKey] <= 0) {
          // update openKeys
          const idx = openKeys.indexOf(bestKey);
          if (idx >= 0) openKeys.splice(idx, 1);
        }
      }
    }

    // 8) Anything still not assigned -> Unassigned
    for (const id of notAssigned) {
      const p = pool.find((x) => x.id === id);
      allocations.Unassigned.persons.push({
        id,
        fit: 0,
        composite: p?.composite ?? 0,
      });
    }

    // console.log("peopleData : ", peopleData);
    console.log("allocations : ", JSON.stringify(allocations, null, 2));

    return res.status(200).json({ success: true, allocations });
  } catch (err) {
    console.error("Job allocation error:", err);
    return res.status(500).json({ message: "Server error in allocation" });
  }
};
