import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/**
 * @desc    Login user and issue JWT
 * @route   POST /api/auth/login
 */
export const loginUser = async (req, res, next) => {
  console.log("====== Controller loginUser function called ======");

  try {
    const { email, password } = req.body;

    console.log("📧 Email:", email);
    console.log("🔒 Password:", password);

    if (!email || !password) {
      console.log("❌ Missing email or password");
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found");
      return res.status(401).json({ message: "Invalid credentials" });
    }
    // console.log("User in DB:", user);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ Password does not match");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    console.log(`✅ ${email} Loged in successfuly`);
    return res.json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("💥 Server error in loginUser:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 */
export const registerUser = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    console.log("[Register Attempt]", { email, role });

    // Validate input
    if (!email || !password) {
      console.warn("[Register Error] Missing email or password");
      return res.status(400).json({ message: "Email and password required" });
    }

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      console.warn("[Register Error] User already exists:", email);
      return res.status(400).json({ message: "User exists" });
    }

    // Hash password and create user
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed, role });

    console.log("[Register Success] User created:", user.email);
    res.status(201).json({ message: "User registered" });
  } catch (err) {
    console.error("[Register Exception]", err);
    next(err);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 */
export const logoutUser = (req, res) => {
  try {
    res.cookie("token", "", {
      httpOnly: true,
      expires: new Date(0),
    });
    console.log("[Logout] User logged out");
    res.json({ message: "Logged out" });
  } catch (err) {
    console.error("[Logout Exception]", err);
    res.status(500).json({ message: "Logout failed" });
  }
};

/**
 * @desc    Get profile of logged-in user based on JWT cookie
 * @route   GET /api/auth/profile
 */
export const getProfile = async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Find user by ID, exclude password
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // console.log({
    //   user: {
    //     id: user._id,
    //     email: user.email,
    //     role: user.role,
    //     name: user.name || null,
    //     testsAssigned: user.testsAssigned || [],
    //   },
    // });

    // Send user data
    res.json({
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name || null,
        testsAssigned: user.testsAssigned.public || [],
      },
    });
  } catch (err) {
    console.error("[GetProfile Exception]", err);
    return res.status(401).json({ message: "Not authorized" });
  }
};
