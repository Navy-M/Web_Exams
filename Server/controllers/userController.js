import User from "../models/User.js";
import Result from "../models/Result.js";
import { getTestAnalysis } from "../utils/testAnalyzer.js";

export const deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Check if ID exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "کاربر یافت نشد." });
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    res.status(200).json({ message: "کاربر با موفقیت حذف شد." });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "حذف کاربر با خطا مواجه شد." });
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

export const completeProfile = async (req, res) => {
  try {
    const {
      userId,
      fullName,
      nationalId,
      age,
      gender,
      single,
      education,
      field,
      phone,
      city,
      province,
      jobPosition,
    } = req.body;

    // Basic validation
    if (!userId || !fullName || !phone || !nationalId || !age) {
      return res.status(400).json({
        message: "برخی از فیلدهای الزامی تکمیل نشده‌اند.",
      });
    }

    const info = {
      userId,
      fullName,
      nationalId,
      age,
      gender,
      single,
      education,
      field,
      phone,
      city,
      province,
      jobPosition,
    };

    // Update the user profile directly
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: { profile: info },
      },
      { new: true }
    ).select("-password");

    return res.status(200).json({
      message: {
        status: "success",
        text: " your profile information successfully submited. ",
      },
      userProfile: updatedUser.profile,
    });
  } catch (err) {
    console.error("Error completing profile to user:", err);
    res.status(500).json({ message: "Server error" });
  }
};

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
