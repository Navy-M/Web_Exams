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
export const evaluateUserTest = async (req, res) => {
  try {
    const { userId, resultId } = req.params;
    const { feedback, score, publish } = req.body;

    // 1. Verify admin and user exist
    const adminUser = await User.findById(req.user._id);
    const targetUser = await User.findById(userId);
    
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    // 2. Update the Result document (if using separate Result model)
    const updatedResult = await Result.findOneAndUpdate(
      { _id: resultId, user: userId },
      { 
        $set: { 
          adminFeedback: feedback,
          score: score,
          evaluatedAt: new Date(),
          evaluatedBy: req.user._id,
          isPublished: publish 
        } 
      },
      { new: true }
    );

    if (!updatedResult) {
      return res.status(404).json({ message: "Test result not found" });
    }

    // 3. Update user's private test entry
    const userUpdate = await User.updateOne(
      { 
        _id: userId,
        "testsAssigned.private.testId": resultId // Match by testId in private array
      },
      { 
        $set: { 
          "testsAssigned.private.$.adminFeedback": feedback,
          "testsAssigned.private.$.score": score,
          "testsAssigned.private.$.isPublished": publish,
          "testsAssigned.private.$.evaluatedAt": new Date(),
          "testsAssigned.private.$.evaluatedBy": req.user._id
        } 
      }
    );

    // 4. If publishing, add to public array (without duplicating)
    if (publish) {
      const privateTest = targetUser.testsAssigned.private.find(
        t => t.testId.toString() === resultId
      );

      if (privateTest) {
        await User.updateOne(
          { _id: userId, "testsAssigned.public.testId": { $ne: resultId } },
          {
            $addToSet: {
              "testsAssigned.public": {
                testId: resultId,
                testName: privateTest.testName,
                testType: privateTest.testType,
                score: score,
                adminFeedback: feedback,
                completedAt: privateTest.completedAt,
                duration: privateTest.duration,
                evaluatedAt: new Date()
              }
            }
          }
        );
      }
    }

    res.status(200).json({
      message: "Evaluation submitted successfully",
      result: updatedResult,
      published: publish
    });

  } catch (error) {
    console.error("Evaluation error:", error);
    res.status(500).json({ message: "Server error during evaluation" });
  }
};