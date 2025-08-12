// controllers/resultsController.js
import mongoose from "mongoose";
const { Types } = mongoose;
import Result from "../models/Result.js";
import User from "../models/User.js";
import { getTestAnalysis } from "../utils/testAnalyzer.js";

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

export const allocateJobs = async (req, res) => {
  try {
    const { people, quotas } = req.body;
    /**
     * people: array of objects [{ id, name, score, jobPreference }, ...]
     * quotas: object { "Engineer": 5, "Designer": 3, "Manager": 2 }
     */

    console.log("people: ", people);
    console.log("quotas: ", quotas);

    if (!people || !quotas) {
      return res.status(400).json({ message: "Missing required data" });
    }

    // Sort people by score descending
    const sortedPeople = [...people].sort((a, b) => b.score - a.score);

    // Prepare result allocations
    const allocations = {};
    Object.keys(quotas).forEach((job) => {
      allocations[job] = [];
    });

    // Allocate people to jobs based on preferences & limits
    for (let person of sortedPeople) {
      const preferredJob = person.jobPreference;
      if (quotas[preferredJob] > 0) {
        allocations[preferredJob].push(person);
        quotas[preferredJob] -= 1;
      } else {
        // If preferred job full, put them in a "waiting" list
        if (!allocations["Unassigned"]) allocations["Unassigned"] = [];
        allocations["Unassigned"].push(person);
      }
    }
    console.log(allocations);

    res.status(200).json({
      success: true,
      allocations,
    });
  } catch (error) {
    console.error("Job allocation error:", error);
    res.status(500).json({ message: "Server error in allocation" });
  }
};
