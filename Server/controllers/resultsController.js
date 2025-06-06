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
