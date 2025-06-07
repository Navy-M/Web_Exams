import User from "../models/User.js";
import Result from "../models/Result.js";

export const getProfile = (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({
      id: decoded.id,
      role: decoded.role,
      email: decoded.email, // optional
    });
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    next(err);
  }
};

// Admin submits evaluation and manages test visibility
export const updateTestFeedback = async (req, res) => {
  const { userId, resultId } = req.params;
  const { feedback } = req.body;

  try {
    // console.log("userId :", userId, ".....  resultsID :", resultId);

    // Step 1: Update the Result document
    const result = await Result.findById(resultId);
    console.log(result);

    if (!result)
      return res.status(404).json({ message: "Test result not found" });

    result.adminFeedback = feedback;
    await result.save();

    // Step 2: Update the User document
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const feedbackSummary = {
      resultId: result._id,
      feedback,
      submittedAt: new Date(),
      completedAt: result.createdAt,
      score: result.score,
      duration: result.durationInSeconds,
      testType: result.testType,
    };

    // Get from user Private
    if (
      user.testsAssigned.private.find((p) => {
        p.testType === result._id;
      })
    ) {
      return res
        .status(444)
        .json({ message: "test not find in private Layer" });
    }

    // Push into public if not already there
    const exists = user.testsAssigned?.public?.some(
      (entry) => entry.resultId.toString() === result._id.toString()
    );

    if (!exists) {
      user.testsAssigned.public.push(feedbackSummary);
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
