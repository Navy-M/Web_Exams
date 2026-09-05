import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";

process.env.NODE_ENV = "development";

const stamp = Date.now();
const adminUsername = `security_smoke_admin_${stamp}`;
const userUsername = `security_smoke_user_${stamp}`;
const password = "SmokePass123!";

async function createUsers() {
  await connectDB();
  const hashed = await bcrypt.hash(password, 10);
  await User.create({
    username: adminUsername,
    password: hashed,
    role: "admin",
    period: "smoke",
    profile: { fullName: "Security Smoke Admin" },
  });
  await User.create({
    username: userUsername,
    password: hashed,
    role: "user",
    period: "smoke",
    profile: { fullName: "Security Smoke User" },
  });
  await mongoose.connection.close();
}

async function cleanup() {
  if (mongoose.connection.readyState !== 1) await connectDB();
  await User.deleteMany({ username: { $in: [adminUsername, userUsername] } });
  await mongoose.connection.close();
}

process.env.SMOKE_ADMIN_USERNAME = adminUsername;
process.env.SMOKE_ADMIN_PASSWORD = password;
process.env.SMOKE_USER_USERNAME = userUsername;
process.env.SMOKE_USER_PASSWORD = password;

try {
  await createUsers();
  await import("./securitySmoke.mjs");
} finally {
  await cleanup().catch((error) => {
    console.error("security smoke cleanup failed:", error?.message || error);
  });
}
