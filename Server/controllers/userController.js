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
    const students = users.filter((s) => s.role === "user");
    res.json(students);
  } catch (err) {
    next(err);
  }
};

export const completeProfile = async (req, res) => {
  try {
    // Allow both shapes: flat or { profile: {...} }
    const src = (req.body && typeof req.body.profile === 'object')
      ? req.body.profile
      : req.body;

    const userId = req.body.userId ?? src.userId ?? req.user?._id;
    const username = req.body.username ?? src.username;

    // console.log("=== [completeProfile] payload →", {
    //   userId,
    //   username,
    //   profile: src
    // });

    // Required fields (from src)
    const required = {
      userId,
      fullName: src.fullName,
      nationalId: src.nationalId,
      phone: src.phone,
      age: src.age,
      single: src.single,
      education: src.education,
      diplomaAverage: src.diplomaAverage,
      field: src.field,
    };

    const missing = Object.entries(required)
      .filter(([, v]) => v === undefined || v === null || v === '')
      .map(([k]) => k);

    if (missing.length) {
      console.warn("[completeProfile] Missing fields:", missing);
      return res.status(400).json({
        message: `برخی از فیلدهای الزامی تکمیل نشده‌اند: ${missing.join(", ")}`
      });
    }

    // Coerce types
    const info = {
      fullName: String(src.fullName).trim(),
      nationalId: String(src.nationalId).trim(),
      age: Number(src.age),
      fathersJob: src.fathersJob ?? "",
      gender: src.gender ?? "",
      single: String(src.single) === "true" || src.single === true,
      education: src.education ?? "",
      diplomaAverage: typeof src.diplomaAverage === 'number'
        ? src.diplomaAverage
        : (src.diplomaAverage ? Number(src.diplomaAverage) : ""),
      field: src.field ?? "",
      phone: String(src.phone).trim(),
      city: src.city ?? "",
      province: src.province ?? "",
      jobPosition: src.jobPosition ?? "دانشجو",
    };

    const updateDoc = {
      ...(username ? { username: String(username).trim() } : {}),
      profile: info,
    };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateDoc },
      { new: true, runValidators: true, context: "query" }
    ).select("-password");

    if (!updatedUser) {
      console.error("[completeProfile] User not found:", userId);
      return res.status(404).json({ message: "کاربر پیدا نشد." });
    }

    console.log("[completeProfile] ✅ Update OK for user:", userId);
    return res.status(200).json({
      message: { status: "success", text: "پروفایل با موفقیت تکمیل شد." },
      userProfile: updatedUser.profile,
    });
  } catch (err) {
    console.error("[completeProfile] ❌ Error:", err);
    return res.status(500).json({ message: "Server error" });
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
      username: decoded.username,
    });
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};
