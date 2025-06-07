// controllers/resultsController.js

import Result from "../models/Result.js";
import User from "../models/User.js";

// Create new test result
export const createResult = async (req, res) => {
  try {
    const {
      user, // User ID
      testType, // e.g., "DISC", "MBTI"
      answers, // Array of answers
      score, // Optional score
      otherResult, // Optional additional info
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

    const newResult = new Result({
      user,
      testType,
      answers,
      score,
      otherResult,
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
    const { user, testType, answers, score, otherResult, startedAt } = req.body;

    const result = new Result({
      user,
      testType,
      _answers: answers,
      score,
      other_Result: otherResult,
      adminFeedback: "", // initially empty
      startedAt,
      completedAt: new Date(),
      durationMinutes: Math.round((Date.now() - new Date(startedAt)) / 60000),
    });

    const savedResult = await result.save();

    // Small object to store in user's private array
    const assignmentSummary = {
      resultId: savedResult._id,
      testType,
      completedAt: result.completedAt,
      score,
    };

    // Push to user's private assigned tests
    await User.findByIdAndUpdate(user, {
      $push: { "testsAssigned.private": assignmentSummary },
    });

    res.status(201).json(savedResult);
  } catch (err) {
    console.error("Error submitting result:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update admin feedback and result details
export const updateResultEvaluation = async (req, res) => {
  try {
    const { resultId } = req.params;
    const { adminFeedback, otherResult, score, publishToUser } = req.body;
    const { userId: adminId, role } = req.user; // From your auth middleware

    // Verify admin privileges
    if (role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Prepare update object
    const updateData = {
      adminFeedback,
      evaluatedAt: new Date(),
      evaluatedBy: adminId,
      ...(otherResult && { otherResult }), // Only update if provided
      ...(score && { score }) // Only update if provided
    };

    // 1. Update the main Result document
    const updatedResult = await Result.findByIdAndUpdate(
      resultId,
      { $set: updateData },
      { new: true }
    ).populate('user', 'name email');

    if (!updatedResult) {
      return res.status(404).json({ message: "Result not found" });
    }

    // 2. Update the private copy in User collection (if exists)
    await User.updateOne(
      {
        _id: updatedResult.user._id,
        "testsAssigned.private.resultId": resultId
      },
      {
        $set: {
          "testsAssigned.private.$.adminFeedback": adminFeedback,
          "testsAssigned.private.$.score": score || updatedResult.score,
          "testsAssigned.private.$.evaluatedAt": new Date()
        }
      }
    );

    // 3. Optionally publish to user's public results
    if (publishToUser) {
      const publicSummary = {
        resultId: updatedResult._id,
        testType: updatedResult.testType,
        completedAt: updatedResult.completedAt,
        score: score || updatedResult.score,
        adminFeedback,
        evaluatedAt: new Date()
      };

      await User.findByIdAndUpdate(
        updatedResult.user._id,
        {
          $addToSet: { "testsAssigned.public": publicSummary }
        }
      );
    }

    res.status(200).json({
      message: "Evaluation updated successfully",
      result: updatedResult,
      published: publishToUser
    });

  } catch (error) {
    console.error("Error updating evaluation:", error);
    res.status(500).json({ message: "Server error" });
  }
};