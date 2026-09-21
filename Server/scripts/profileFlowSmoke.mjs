import "dotenv/config";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";

process.env.NODE_ENV = "development";
const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:5000/api";
const username = `profile_smoke_${Date.now()}`;
const password = `Smoke-${randomUUID()}!Aa1`;

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
    body: JSON.stringify({ username, fullName: "کاربر تست پروفایل", period: "smoke", password }),
  });
  if (!registered?.token || !registered?.user?.id) throw new Error("register contract failed");

  const auth = { "content-type": "application/json", authorization: `Bearer ${registered.token}` };
  const completed = await request("/users/completeProf", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      username,
      profile: {
        fullName: "کاربر تست پروفایل",
        nationalId: "0013547956",
        phone: "09120000000",
        age: 24,
        fathersJob: "کارمند",
        gender: "male",
        single: true,
        education: "دیپلم",
        diplomaAverage: 18.5,
        field: "ریاضی فیزیک",
        city: "تهران",
        province: "تهران",
        jobPosition: "دانشجو",
      },
    }),
  });
  if (completed?.message?.status !== "success") throw new Error("complete profile contract failed");

  const readBack = await request(`/users/${registered.user.id}`, { headers: auth });
  if (readBack?.profile?.field !== "ریاضی فیزیک" || Number(readBack?.profile?.diplomaAverage) !== 18.5) {
    throw new Error("profile read-back mismatch");
  }
  console.log("Profile Flow Smoke PASS");
} finally {
  await connectDB();
  await User.deleteMany({ username });
  await mongoose.connection.close();
}
