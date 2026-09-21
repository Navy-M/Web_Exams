import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

dotenv.config();

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be configured in Server/.env.`);
  return value;
};

const seed = async () => {
  const mongoUri = process.env.LOCAL_MONGO_URI || process.env.MONGO_URI;
  if (!mongoUri) throw new Error("LOCAL_MONGO_URI or MONGO_URI must be configured in Server/.env.");

  const username = required("SEED_ADMIN_USERNAME");
  const password = required("SEED_ADMIN_PASSWORD");
  const fullName = process.env.SEED_ADMIN_FULL_NAME?.trim() || "System Administrator";
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const users = client.db(process.env.DB_NAME || "web_exams").collection("users");
    if (await users.findOne({ username })) {
      console.log("Admin already exists; no changes were made.");
      return;
    }

    await users.insertOne({
      username,
      password: await bcrypt.hash(password, 10),
      role: "admin",
      profile: { fullName },
      testsAssigned: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("Admin user created successfully.");
  } finally {
    await client.close();
  }
};

seed().catch((error) => {
  console.error(`Admin seed failed: ${error.message}`);
  process.exitCode = 1;
});
