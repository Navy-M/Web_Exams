import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Result from "../models/Result.js";
import User from "../models/User.js";
import { jobRequirements } from "../config/dummyData.js";

const API_BASE = process.env.SMOKE_API_BASE || "http://localhost:5000/api";
const stamp = Date.now();
const adminUsername = `smoke_admin_${stamp}`;
const userUsername = `smoke_user_${stamp}`;
const password = "SmokePass123!";

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} failed: ${response.status} ${JSON.stringify(data)}`);
  }
  return data;
};

try {
  process.env.NODE_ENV = "development";
  await connectDB();

  const hashed = await bcrypt.hash(password, 10);
  const [admin, user] = await Promise.all([
    User.create({
      username: adminUsername,
      password: hashed,
      role: "admin",
      period: "smoke",
      profile: { fullName: "Smoke Admin" },
    }),
    User.create({
      username: userUsername,
      password: hashed,
      role: "user",
      period: "smoke",
      profile: {
        fullName: "Smoke User",
        field: "Computer",
        phone: "09120000000",
      },
    }),
  ]);

  const login = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: adminUsername, password }),
  });
  const token = login.token;
  assert(token, "admin login did not return token");
  const auth = { Authorization: `Bearer ${token}` };

  const result = await Result.create({
    user: user._id,
    testType: "DISC",
    answers: [
      { dimension: "D", value: 4 },
      { dimension: "I", value: 4 },
      { dimension: "S", value: 2 },
      { dimension: "C", value: 1 },
    ],
    startedAt: new Date(Date.now() - 120000),
    submittedAt: new Date(),
  });

  await User.updateOne(
    { _id: user._id },
    {
      $push: {
        testsAssigned: {
          resultId: result._id,
          testType: "DISC",
          completedAt: result.submittedAt,
          duration: result.durationInSeconds || 120,
          isPublic: false,
        },
      },
    }
  );

  const analyzed = await request("/results/analyze", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ resultId: String(result._id), testType: "DISC" }),
  });
  assert(analyzed.ok === true && analyzed.result, "analyze did not return updated result");

  const feedback = await request("/results/submitfeedback", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      feedbackData: {
        userId: String(user._id),
        resultId: String(result._id),
        feedback: "Smoke feedback",
      },
    }),
  });
  assert(feedback.ok === true && feedback.result?.adminFeedback === "Smoke feedback", "feedback contract failed");

  let freshUser = await User.findById(user._id).lean();
  let assigned = freshUser.testsAssigned.find((entry) => String(entry.resultId) === String(result._id));
  assert(assigned?.isPublic === true, "feedback did not publish user test summary");

  const cleared = await request(`/results/${result._id}/analysis`, {
    method: "DELETE",
    headers: auth,
  });
  assert(cleared.ok === true && cleared.result && cleared.result.score == null, "clear analysis contract failed");

  freshUser = await User.findById(user._id).lean();
  assigned = freshUser.testsAssigned.find((entry) => String(entry.resultId) === String(result._id));
  assert(assigned?.isPublic === false, "clear analysis did not unpublish user test summary");

  const reanalyzed = await request("/results/analyze", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ resultId: String(result._id), testType: "DISC" }),
  });
  assert(reanalyzed.ok === true && reanalyzed.result, "reanalyze failed");

  const jobName = Object.keys(jobRequirements || {})[0] || "Navigator";
  const prioritized = await request("/results/jobs/prioritize", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      userIds: [String(user._id)],
      capacities: { [jobName]: 1 },
      weights: { DISC: 1 },
      jobRequirements,
    }),
  });
  assert(prioritized.ok === true, "prioritize endpoint failed");
  assert(prioritized.meta?.algorithmVersion === "job-matching-v2.0.0", "prioritize meta is missing algorithm version");
  assert(Array.isArray(prioritized.candidateJobScores), "prioritize candidateJobScores missing");

  const deleted = await request(`/results/${result._id}`, {
    method: "DELETE",
    headers: auth,
  });
  assert(deleted.ok === true && deleted.resultId === String(result._id), "delete result contract failed");

  const deletedResult = await Result.findById(result._id).lean();
  freshUser = await User.findById(user._id).lean();
  assert(!deletedResult, "result still exists after delete");
  assert(!freshUser.testsAssigned.some((entry) => String(entry.resultId) === String(result._id)), "testsAssigned still references deleted result");

  console.log("Admin Consistency Smoke PASS");
} finally {
  await Result.deleteMany({ user: { $in: (await User.find({ username: { $in: [adminUsername, userUsername] } }).select("_id")).map((u) => u._id) } }).catch(() => {});
  await User.deleteMany({ username: { $in: [adminUsername, userUsername] } }).catch(() => {});
  await mongoose.connection.close().catch(() => {});
}
