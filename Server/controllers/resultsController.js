// controllers/resultsController.js
import mongoose from "mongoose";
const { Types } = mongoose;
import Result from "../models/Result.js";
import User from "../models/User.js";
import { getTestAnalysisUnified } from "../utils/testAnalyzer.js";
import { normalizeAnswers } from "../utils/normalizeAnswers.js";
import * as dummy from "../config/dummyData.js";
import { prioritizeCandidates } from "../services/jobPrioritizer.js";

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

    const normalizedAnswers = normalizeAnswers(testType, answers);

    const newResult = new Result({
      user,
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
export async function submitUInfo(req, res) {
  try {
    const { userId, testType, answers, startedAt } = req.body;
    if (!userId || !testType || !Array.isArray(answers)) {
      return res.status(400).json({ ok: false, error: "INVALID_PAYLOAD" });
    }

    const normalized = normalizeAnswers(testType, answers);

    const result = new Result({
      user: userId,
      testType,
      answers: normalized,
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      submittedAt: new Date(),
    });

    await result.save();

    const user = await User.findById(userId);
    if (user) {
      const exists = (user.testsAssigned || []).some(
        (t) => String(t.resultId) === String(result._id)
      );
      if (!exists) {
        user.testsAssigned.push({
          resultId: result._id,
          testType,
          completedAt: result.submittedAt,
          duration: result.durationInSeconds ?? 0,
          isPublic: false,
        });
        await user.save();
      }
    }

    return res.json({ ok: true, resultId: result._id });
  } catch (err) {
    console.error("submitUInfo error:", err);
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


    // 5) پاسخ موفق
    return res.json({
      ok: true,
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
      .json({ message: "Feedback submitted successfully", result });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export async function prioritizeJobs(req, res) {
  try {
    const { userIds, capacities, weights } = req.body || {};

    if (!Array.isArray(userIds) || !userIds.length) {
      return res
        .status(400)
        .json({ ok: false, error: "userIds (array) is required" });
    }

    if (!capacities || typeof capacities !== "object" || !Object.keys(capacities).length) {
      return res
        .status(400)
        .json({ ok: false, error: "capacities (object) is required" });
    }

    const jobRequirements =
      dummy.jobRequirements || dummy.default?.jobRequirements || dummy;

    const out = await prioritizeCandidates({
      userIds,
      capacities,
      weights: weights || {},
      jobRequirements,
    });

    return res.json({ ok: true, ...out });
  } catch (err) {
    console.error("prioritizeJobs error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}


