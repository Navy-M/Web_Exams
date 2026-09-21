// controllers/resultsController.js
import mongoose from "mongoose";
const { Types } = mongoose;
import Result from "../models/Result.js";
import ExamSession from "../models/ExamSession.js";
import AllocationAudit from "../models/AllocationAudit.js";
import User from "../models/User.js";
import { getTestAnalysisUnified } from "../utils/testAnalyzer.js";
import { normalizeAnswers } from "../utils/normalizeAnswers.js";
import * as dummy from "../config/dummyData.js";
import { prioritizeCandidates } from "../services/jobPrioritizer.js";

const TEST_TYPES = new Set(["MBTI", "DISC", "HOLLAND", "GARDNER", "CLIFTON", "GHQ", "PERSONAL_FAVORITES"]);

function sessionPayload(session) {
  return {
    sessionId: String(session._id),
    testType: session.testType,
    startedAt: session.startedAt,
    deadlineAt: session.deadlineAt,
    submittedAt: session.submittedAt,
    durationLimitSeconds: session.durationLimitSeconds,
    answersDraft: session.answersDraft || [],
    currentIndex: session.currentIndex || 0,
    resultId: session.resultId,
    serverTime: new Date().toISOString(),
  };
}

function durationForTest(testType) {
  const test = dummy.Test_Cards?.find((item) => item.id === testType);
  return Math.max(60, Number(test?.duration?.to || 10) * 60);
}

export async function getExamSession(req, res) {
  const testType = String(req.params.testType || "").toUpperCase();
  if (!TEST_TYPES.has(testType)) return res.status(400).json({ ok: false, error: "INVALID_TEST_TYPE" });
  const session = await ExamSession.findOne({ user: req.user._id, testType }).lean();
  return res.json({ ok: true, session: session ? sessionPayload(session) : null, serverTime: new Date().toISOString() });
}

export async function startExamSession(req, res) {
  try {
    const testType = String(req.body?.testType || "").toUpperCase();
    if (!TEST_TYPES.has(testType)) return res.status(400).json({ ok: false, error: "INVALID_TEST_TYPE" });

    const completed = await Result.findOne({ user: req.user._id, testType }).select("_id").lean();
    if (completed) return res.status(409).json({ ok: false, error: "TEST_ALREADY_SUBMITTED", resultId: completed._id });

    let session = await ExamSession.findOne({ user: req.user._id, testType });
    if (!session) {
      const startedAt = new Date();
      const durationLimitSeconds = durationForTest(testType);
      try {
        session = await ExamSession.create({
          user: req.user._id,
          testType,
          startedAt,
          deadlineAt: new Date(startedAt.getTime() + durationLimitSeconds * 1000),
          durationLimitSeconds,
        });
      } catch (error) {
        if (error?.code !== 11000) throw error;
        session = await ExamSession.findOne({ user: req.user._id, testType });
      }
    }

    return res.json({ ok: true, session: sessionPayload(session) });
  } catch (error) {
    console.error("startExamSession error:", error);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

export async function saveExamDraft(req, res) {
  const { sessionId } = req.params;
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  const currentIndex = Math.max(0, Number(req.body?.currentIndex) || 0);
  const session = await ExamSession.findOneAndUpdate(
    { _id: sessionId, user: req.user._id, submittedAt: null },
    { $set: { answersDraft: answers, currentIndex } },
    { new: true }
  );
  if (!session) return res.status(404).json({ ok: false, error: "ACTIVE_SESSION_NOT_FOUND" });
  return res.json({ ok: true, savedAt: new Date().toISOString(), serverTime: new Date().toISOString() });
}

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
    const isAdmin = req.user?.role === "admin";
    const targetUserId = isAdmin && user ? user : req.user?._id;

    if (!targetUserId || !testType || !answers) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Calculate time taken
    const endedAt = new Date();
    const durationInSeconds = Math.floor(
      (endedAt - new Date(startedAt)) / 1000
    );

    // Check if result already exists
    const existingResult = await Result.findOne({
      user: targetUserId,
      testType: testType,
    });
    if (existingResult) {
      return res
        .status(409)
        .json({ message: "This test has already been submitted." });
    }

    const normalizedAnswers = normalizeAnswers(testType, answers);

    const newResult = new Result({
      user: targetUserId,
      testType,
      answers: normalizedAnswers,
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
    const isAdmin = req.user?.role === "admin";
    const isOwner = String(result.user) === String(req.user?._id);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        status: "error",
        message: "Access denied.",
      });
    }

    let responseResult = result;
    if (!isAdmin && isOwner) {
      const owner = await User.findOne(
        { _id: result.user, "testsAssigned.resultId": result._id },
        { testsAssigned: { $elemMatch: { resultId: result._id } } }
      ).lean();
      const published = owner?.testsAssigned?.[0]?.isPublic === true;
      if (!published) {
        responseResult = result.toObject();
        delete responseResult.analysis;
        delete responseResult.adminFeedback;
        delete responseResult.answers;
        responseResult.publicationStatus = "WAITING_FOR_PUBLICATION";
      }
    }

    return res.status(200).json({
      ok: true,
      status: "success",
      resultId: String(result._id),
      data: responseResult,
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
    const isAdmin = req.user?.role === "admin";
    const isOwner = String(req.user?._id) === String(userId);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Access denied" });
    }

    const results = await Result.find({ user: userId }).populate(
      "user",
      "name email"
    ).lean();
    const owner = await User.findById(userId).select("testsAssigned").lean();
    const summaries = new Map((owner?.testsAssigned || []).map((item) => [String(item.resultId), item]));
    res.status(200).json(results.map((result) => ({
      ...result,
      ...(summaries.get(String(result._id)) || {}),
      _id: result._id,
    })));
  } catch (error) {
    console.error("Error fetching user results:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Save Results
export async function submitUInfo(req, res) {
  try {
    const { userId: requestedUserId, testType, answers, startedAt, sessionId } = req.body;
    const isAdmin = req.user?.role === "admin";
    const userId = isAdmin && requestedUserId ? requestedUserId : req.user?._id;

    if (!userId || !testType || !Array.isArray(answers)) {
      return res.status(400).json({ ok: false, error: "INVALID_PAYLOAD" });
    }

    if (!isAdmin && requestedUserId && String(requestedUserId) !== String(req.user?._id)) {
      return res.status(403).json({ ok: false, error: "Access denied" });
    }

    const existing = await Result.findOne({ user: userId, testType }).select(
      "_id user testType submittedAt durationInSeconds"
    );
    if (existing) {
      return res.status(200).json({
        ok: true,
        idempotent: true,
        resultId: existing._id,
        result: {
          _id: existing._id,
          user: existing.user,
          testType: existing.testType,
          submittedAt: existing.submittedAt,
          durationInSeconds: existing.durationInSeconds ?? 0,
        },
      });
    }

    const session = sessionId
      ? await ExamSession.findOne({ _id: sessionId, user: userId, testType })
      : null;
    if (sessionId && !session) {
      return res.status(409).json({ ok: false, error: "INVALID_EXAM_SESSION" });
    }
    if (session?.submittedAt && session.resultId) {
      const prior = await Result.findById(session.resultId).select("_id user testType submittedAt durationInSeconds");
      if (prior) return res.json({ ok: true, idempotent: true, resultId: prior._id, result: prior });
    }

    const normalized = normalizeAnswers(testType, answers);

    const result = new Result({
      user: userId,
      testType,
      answers: normalized,
      startedAt: session?.startedAt || (startedAt ? new Date(startedAt) : new Date()),
      submittedAt: new Date(),
    });

    await result.save();

    if (session) {
      session.submittedAt = result.submittedAt;
      session.resultId = result._id;
      session.answersDraft = normalized;
      await session.save();
    }

    await User.updateOne(
      { _id: userId, "testsAssigned.resultId": { $ne: result._id } },
      {
        $push: {
          testsAssigned: {
          resultId: result._id,
          testType,
          completedAt: result.submittedAt,
          duration: result.durationInSeconds ?? 0,
          isPublic: false,
          },
        },
      }
    );

    return res.json({
      ok: true,
      resultId: result._id,
      result: {
        _id: result._id,
        user: result.user,
        testType: result.testType,
        submittedAt: result.submittedAt,
        durationInSeconds: result.durationInSeconds ?? 0,
      },
    });
  } catch (err) {
    console.error("submitUInfo error:", err);
    if (err?.code === 11000) {
      return res.status(409).json({ ok: false, error: "DUPLICATE_RESULT" });
    }
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

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
      ok: true,
      status: "success",
      resultId: String(result._id),
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

export async function analyze(req, res) {
  try {
    // 1) ورودی
    const { resultId } = req.body || {};
    if (!resultId) {
      return res.status(400).json({ ok: false, error: "MISSING_RESULT_ID" });
    }
    const debugOn =
      String(req.query?.debug || "") === "1" ||
      process.env.NODE_ENV !== "production";

    // 2) واکشی نتیجه
    const result = await Result.findById(resultId);
    if (!result) {
      return res.status(404).json({ ok: false, error: "RESULT_NOT_FOUND" });
    }

    // 3) پاسخ‌ها (سازگار با داده‌های قدیمی)
    const answers = Array.isArray(result.answers) ? result.answers : [];

    // 4) محاسبه‌ی زمان‌ها (Backward-Compatible)
    const effectiveSubmittedAt =
      result.submittedAt ||
      result.endedAt ||
      result.updatedAt ||
      result.createdAt ||
      new Date();
    const effectiveStartedAt =
      result.startedAt ||
      result.createdAt ||
      effectiveSubmittedAt;

    let durationSec = 0;
    if (Number.isFinite(Number(result.durationInSeconds))) {
      durationSec = Number(result.durationInSeconds);
    } else if (Number.isFinite(Number(result.duration))) {
      durationSec = Number(result.duration);
    } else {
      const s = new Date(effectiveStartedAt).getTime();
      const e = new Date(effectiveSubmittedAt).getTime();
      durationSec =
        Number.isFinite(s) && Number.isFinite(e) && e >= s
          ? Math.floor((e - s) / 1000)
          : 0;
    }
    const completedAtISO = (() => {
      const d = new Date(effectiveSubmittedAt);
      return Number.isFinite(d.getTime()) ? d.toISOString() : new Date().toISOString();
    })();

    // 5) متادیتا برای تحلیل
    const meta = {
      answered: answers.length,
      total: answers.length,
      durationSec,
      completedAt: completedAtISO,
    };

    // 6) تحلیل یکپارچه
    const unified = getTestAnalysisUnified({
      testType: result.testType,
      answers,
      meta,
    });

    let analysis = unified?.analysis || unified || {};
    let overall = Number.isFinite(Number(unified?.overall))
      ? Number(unified.overall)
      : (Number.isFinite(Number(analysis?.overall)) ? Number(analysis.overall) : null);

    // 7) سازگار‌سازی سبک برای UI (بدون تغییر منطق نمره‌دهی)
    if (!analysis.analyzedAt) analysis.analyzedAt = new Date().toISOString();

    // userInfo → فقط پرکردن امن
    if (!analysis.userInfo) analysis.userInfo = {};
    if (result.user) analysis.userInfo.id = String(result.user);
    // اگر لازم بود نام کاربر را نشان بده:
    if (result.user && !analysis.userInfo.fullName) {
      const u = await User.findById(result.user).select("profile.fullName username");
      analysis.userInfo.fullName = u?.profile?.fullName || u?.username || analysis.userInfo.fullName;
    }

    // normalizedScores برای برخی UIها لازم است
    if (!analysis.normalizedScores && analysis.scores && typeof analysis.scores === "object") {
      analysis.normalizedScores = { ...analysis.scores };
    }

    if (typeof analysis.summary !== "string" || !analysis.summary.trim()) {
      analysis.summary = "تحلیل انجام شد.";
    }

    if (overall == null) {
      const vals = Object.values(analysis.normalizedScores || {}).map(Number).filter(Number.isFinite);
      overall = vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
    }

    if (debugOn) {
      analysis._debug = {
        testType: result.testType,
        answered: answers.length,
        durationSec,
        submittedAt: completedAtISO,
        hasNormalizedScores: !!analysis.normalizedScores,
      };
      console.debug("[analyze] Preparing to persist:", {
        resultId: String(result._id),
        testType: result.testType,
        score: overall,
      });
    }

    // 8) ذخیره‌سازی اتمیک در Result (قابل‌اعتماد و بدون درگیر شدن با markModified)
    const setPayload = {
      analysis,
      score: overall,
      // اگر می‌خواهی updatedAt نیز آپدیت شود، می‌توانی اینجا $currentDate بدهی
    };
    const updRes = await Result.updateOne(
      { _id: result._id },
      { $set: setPayload },
      { runValidators: false } // از گیر کردن به requiredهای قدیمی جلوگیری می‌کند
    );

    if (debugOn) {
      console.debug("[analyze] Result.updateOne:", updRes);
    }

    // تضمین: دوباره بخوان تا مطمئن شویم در DB نشسته است
    const persisted = await Result.findById(result._id);

    // 9) آپدیت خلاصه‌ی کاربر (testsAssigned) — اول موضعی، بعد fallback
    if (result.user) {
      // 9-الف) تلاش با عملگر موضعی
      const positional = await User.updateOne(
        { _id: result.user, "testsAssigned.resultId": result._id },
        {
          $set: {
            "testsAssigned.$.score": overall,
            "testsAssigned.$.duration": durationSec,
            "testsAssigned.$.analyzedAt": new Date(),
            // اگر لازم داری public را تغییر دهی، همین‌جا:
            // "testsAssigned.$.isPublic": false
          },
        },
        { runValidators: false }
      );

      if (debugOn) {
        console.debug("[analyze] User.updateOne (positional):", positional);
      }

      // 9-ب) اگر positional چیزی را تغییر نداد، fallback دستی
      if (positional.modifiedCount === 0) {
        const userDoc = await User.findById(result.user);
        if (userDoc && Array.isArray(userDoc.testsAssigned)) {
          const idx = userDoc.testsAssigned.findIndex(
            (t) => String(t.resultId) === String(result._id)
          );
          if (idx >= 0) {
            userDoc.testsAssigned[idx].score = overall;
            userDoc.testsAssigned[idx].duration = durationSec;
            userDoc.testsAssigned[idx].analyzedAt = new Date();
            // اگر لازم داری public را هم تنظیم کنی:
            // userDoc.testsAssigned[idx].isPublic = false;
            userDoc.markModified("testsAssigned");
            const uSave = await userDoc.save({ validateBeforeSave: false });
            if (debugOn) console.debug("[analyze] userDoc.save fallback:", uSave?._id);
          }
        }
      }
    }

    if (debugOn) {
      console.debug("[analyze] DONE. Persisted result:", {
        id: String(persisted?._id),
        score: persisted?.score,
        hasAnalysis: !!persisted?.analysis,
      });
    }

    // 10) پاسخ
    return res.json({
      ok: true,
      resultId: result._id,
      result: persisted,
      analysis: persisted?.analysis || analysis,
      score: persisted?.score ?? overall,
    });
  } catch (err) {
    console.error("analyze error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

export async function clearResultAnalysis(req, res) {
  try {
    // 1) دریافت و اعتبارسنجی شناسه
    const { resultId } = req.params || {};
    if (!resultId || !Types.ObjectId.isValid(resultId)) {
      return res.status(400).json({ ok: false, error: "INVALID_RESULT_ID" });
    }
    const rid = new Types.ObjectId(resultId);

    // 2) خواندن سبک نتیجه (فقط فیلدهای ضروری برای سرعت)
    const result = await Result.findById(rid, { _id: 1, user: 1 }).lean();
    if (!result) {
      return res.status(404).json({ ok: false, error: "RESULT_NOT_FOUND" });
    }

    // 3) پاک‌سازی اتمی روی سند Result
    //    - analysis را به آبجکت خالی برمی‌گردانیم (بدون نیاز به markModified)
    //    - score را null می‌کنیم (هم‌راستا با منطق فعلی شما)
    const updRes = await Result.updateOne(
      { _id: rid },
      { $set: { analysis: {}, score: null } }
    );

    // اگر هیچ تغییری نکرد، اشکالی نیست—ممکن است قبلاً پاک شده باشد.
    // اما همچنان به سراغ User می‌رویم تا خلاصه‌ی او هم پاک شود.

    // 4) اگر نتیجه به کاربری متصل است، خلاصه‌ی کاربر را هم پاک کنیم
    if (result.user) {
      // 4-الف) تلاش اول: آپدیت موضعی (فرض بر اینکه resultId از نوع ObjectId است)
      // - analyzedAt حذف می‌شود
      // - isPublic به false ست می‌شود
      // - (اختیاری) score هم حذف می‌شود تا اثر تحلیل پاک شود
      const positional = await User.updateOne(
        { _id: result.user, "testsAssigned.resultId": rid },
          {$unset: {
            "testsAssigned.$[elem].analyzedAt": "",
            "testsAssigned.$[elem].score": ""
          },
          $set: {
            "testsAssigned.$[elem].isPublic": false
          }
        },
        {
          arrayFilters: [{ "elem.resultId": rid }]
        }
      );
    
      if (positional.modifiedCount === 0) {
        // 4-ب) fallback: احتمالاً resultId در آرایه به‌صورت String ذخیره شده
        //    → آرایه را بخوان، عضو متناظر را پیدا کن، فیلدها را پاک و isPublic=false کن.
        const userDoc = await User.findById(result.user);
        if (userDoc && Array.isArray(userDoc.testsAssigned)) {
          const idx = userDoc.testsAssigned.findIndex(
            (entry) => entry?.resultId && String(entry.resultId) === String(rid)
          );
          if (idx !== -1) {
            // حذف وضعیت تحلیل
            if ("analyzedAt" in userDoc.testsAssigned[idx]) {
              delete userDoc.testsAssigned[idx].analyzedAt;
            }
            // (اختیاری) پاک کردن نمره‌ی وابسته به تحلیل
            if ("score" in userDoc.testsAssigned[idx]) {
              delete userDoc.testsAssigned[idx].score;
            }
            // اطمینان از عدم انتشار عمومی
            userDoc.testsAssigned[idx].isPublic = false;
          
            userDoc.markModified("testsAssigned");
            await userDoc.save();
          }
        }
      }
    }

    const persisted = await Result.findById(rid);

    // 5) پاسخ موفق
    return res.json({
      ok: true,
      resultId: String(rid),
      result: persisted,
      message: "ANALYSIS_CLEARED",
      // اطلاعات کمکی برای دیباگ مدیر سیستم:
      debug: {
        resultUpdated: Boolean(updRes?.modifiedCount),
      },
    });
  } catch (err) {
    console.error("clearResultAnalysis error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

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
      .json({ ok: true, message: "Feedback submitted successfully", result });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// export async function prioritizeJobs(req, res) {
//   try {
//     const { userIds, capacities, weights } = req.body || {};

//     if (!Array.isArray(userIds) || !userIds.length) {
//       return res
//         .status(400)
//         .json({ ok: false, error: "userIds (array) is required" });
//     }

//     if (!capacities || typeof capacities !== "object" || !Object.keys(capacities).length) {
//       return res
//         .status(400)
//         .json({ ok: false, error: "capacities (object) is required" });
//     }

//     const jobRequirements =
//       dummy.jobRequirements || dummy.default?.jobRequirements || dummy;

//     const out = await prioritizeCandidates({
//       userIds,
//       capacities,
//       weights: weights || {},
//       jobRequirements,
//     });

//     return res.json({ ok: true, ...out });
//   } catch (err) {
//     console.error("prioritizeJobs error:", err);
//     return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
//   }
// }

export async function prioritizeJobs(req, res) {
  try {
    const { userIds, capacities, weights, jobRequirements, quotas, minCompleteness, minMatchScore, completenessOverrides } = req.body || {};

    if (!Array.isArray(userIds) || !userIds.length) {
      return res.status(400).json({ ok: false, error: "userIds (array) is required" });
    }
    if (!capacities || typeof capacities !== "object" || !Object.keys(capacities).length) {
      return res.status(400).json({ ok: false, error: "capacities (object) is required" });
    }

    // Run core algorithm (returns: assignments, waitlist, unassigned, table, allocations, export)
    const out = await prioritizeCandidates({
      userIds,
      capacities,
      weights: weights || {},
      jobRequirements: jobRequirements || {},
      minCompleteness,
      minMatchScore,
      completenessOverrides,
    });

    const meta = {
      ...(out.meta || {}),
      source: "api",
      receivedAt: new Date().toISOString(),
    };
    const audit = await AllocationAudit.create({
      actor: req.user._id,
      candidateIds: userIds,
      completenessOverrides: completenessOverrides || [],
      minCompleteness: out.meta?.minCompleteness ?? 0.6,
      minMatchScore: out.meta?.minMatchScore ?? 50,
      capacities,
      weights: weights || {},
      algorithmVersion: out.meta?.algorithmVersion || "unknown",
    });
    meta.auditId = String(audit._id);

    // If the frontend expects the original quotas object for the summary,
    // pass it through. If you don’t have it, you can reconstruct from capacities.
    const quotasOut = quotas && Object.keys(quotas).length
      ? quotas
      : Object.fromEntries(
          Object.keys(capacities).map((name, i) => [
            `job${i + 1}`,
            { name, tableCount: Number(capacities[name]) || 0 },
          ])
        );

    return res.json({
      ok: true,
      // what AllocationReport expects:
      allocations: out.allocations || {},   // legacy map: { [jobName]: { name, persons: [...] } }
      quotas: quotasOut,                     // keep original UI quotas format if you have it
      meta,
      assignments: out.assignments || [],
      candidates: out.candidates || [],
      jobs: out.jobs || [],
      waitlist: out.waitlist || [],
      unassigned: out.unassigned || [],
      candidateJobScores: out.candidateJobScores || [],
      table: out.table || [],
      export: out.export || {},
    });
  } catch (err) {
    console.error("prioritizeJobs error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

