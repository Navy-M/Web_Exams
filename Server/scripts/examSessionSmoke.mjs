import "dotenv/config";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Result from "../models/Result.js";
import ExamSession from "../models/ExamSession.js";

process.env.NODE_ENV = "development";
const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:5000/api";
const username = `timer_smoke_${Date.now()}`;
const password = `Smoke-${randomUUID()}!Aa1`;
let userId;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${options.method || "GET"} ${path}: ${response.status} ${JSON.stringify(body)}`);
  return body;
}

try {
  const registered = await request("/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, fullName: "Timer Smoke", period: "smoke", password }),
  });
  userId = registered.user.id;
  const headers = { "content-type": "application/json", authorization: `Bearer ${registered.token}` };
  const first = await request("/results/sessions", { method: "POST", headers, body: JSON.stringify({ testType: "GHQ" }) });
  const resumed = await request("/results/sessions", { method: "POST", headers, body: JSON.stringify({ testType: "GHQ" }) });
  if (first.session.sessionId !== resumed.session.sessionId) throw new Error("session was reset instead of resumed");
  if (!first.session.serverTime || !first.session.deadlineAt || !first.session.durationLimitSeconds) throw new Error("timer session contract is incomplete");

  const answers = [{ questionId: 1, value: 2 }];
  await request(`/results/sessions/${first.session.sessionId}/draft`, { method: "PUT", headers, body: JSON.stringify({ answers, currentIndex: 1 }) });
  const active = await request("/results/sessions/GHQ", { headers });
  if (active.session.answersDraft.length !== 1 || active.session.currentIndex !== 1) throw new Error("draft recovery failed");

  const payload = { testType: "GHQ", answers, sessionId: first.session.sessionId };
  const submitted = await request("/results/submitUInfo", { method: "POST", headers, body: JSON.stringify(payload) });
  const duplicate = await request("/results/submitUInfo", { method: "POST", headers, body: JSON.stringify(payload) });
  if (String(submitted.resultId) !== String(duplicate.resultId) || duplicate.idempotent !== true) throw new Error("duplicate submit was not idempotent");
  console.log("Exam Session Smoke PASS");
} finally {
  await connectDB();
  if (userId) {
    await Promise.all([Result.deleteMany({ user: userId }), ExamSession.deleteMany({ user: userId }), User.deleteOne({ _id: userId })]);
  } else {
    await User.deleteMany({ username });
  }
  await mongoose.connection.close();
}
