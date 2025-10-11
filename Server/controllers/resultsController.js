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
    const { resultId } = req.body;
    if (!resultId) {
      return res.status(400).json({ ok: false, error: "MISSING_RESULT_ID" });
    }

    const result = await Result.findById(resultId);
    if (!result) {
      return res.status(404).json({ ok: false, error: "RESULT_NOT_FOUND" });
    }

    const answers = Array.isArray(result.answers) ? result.answers : [];
    const meta = {
      answered: answers.length,
      total: answers.length,
      durationSec: result.durationInSeconds ?? 0,
      completedAt: result.submittedAt?.toISOString?.(),
    };

    const { analysis, overall } = getTestAnalysisUnified({
      testType: result.testType,
      answers,
      meta,
    });

    result.analysis = analysis;
    result.score = overall;
    await result.save();

    if (result.user) {
      const user = await User.findById(result.user);
      if (user) {
        const idx = (user.testsAssigned || []).findIndex(
          (t) => String(t.resultId) === String(result._id)
        );
        if (idx >= 0) {
          user.testsAssigned[idx].score = result.score;
          user.testsAssigned[idx].duration = result.durationInSeconds ?? 0;
          user.testsAssigned[idx].analyzedAt = new Date();
        } else {
          user.testsAssigned.push({
            resultId: result._id,
          testType: result.testType,
            completedAt: result.submittedAt,
            score: result.score,
            duration: result.durationInSeconds ?? 0,
            isPublic: false,
            analyzedAt: new Date(),
          });
        }
        await user.save();
      }
    }

    return res.json({
      ok: true,
      resultId: result._id,
      analysis: result.analysis,
      score: result.score,
    });
  } catch (err) {
    console.error("analyze error:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

export async function clearResultAnalysis(req, res) {
  try {
    const { resultId } = req.params || {};

    if (!resultId || !Types.ObjectId.isValid(resultId)) {
      return res
        .status(400)
        .json({ ok: false, error: "INVALID_RESULT_ID" });
    }

    const result = await Result.findById(resultId);
    if (!result) {
      return res
        .status(404)
        .json({ ok: false, error: "RESULT_NOT_FOUND" });
    }

    result.analysis = {};
    result.markModified("analysis");
    result.score = null;
    await result.save();

    if (result.user) {
      const user = await User.findById(result.user);
      if (user) {
        const idx = (user.testsAssigned || []).findIndex(
          (entry) =>
            entry?.resultId &&
            entry.resultId.toString() === resultId
        );
        if (idx !== -1) {
          delete user.testsAssigned[idx].analyzedAt;
          delete user.testsAssigned[idx].score;
          user.markModified("testsAssigned");
          await user.save();
        }
      }
    }

    return res.json({ ok: true, message: "ANALYSIS_CLEARED" });
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


