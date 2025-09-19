import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { MongoClient, ServerApiVersion } from "mongodb";

dotenv.config();

// const MONGO_URI = process.env.MONGO_URI;
const MONGO_URI = process.env.LOCAL_MONGO_URI;

const DB_NAME = "web_exams"; // or whatever your db name is

const seed = async () => {
  const client = new MongoClient(MONGO_URI, {
    tlsAllowInvalidCertificates: true,
    tlsAllowInvalidHostnames: true,
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(DB_NAME);
    const usersCollection = db.collection("users");

    const existingAdmin = await usersCollection.findOne({
      username: "cooci.ebrahimi@gmail.com",
    });
    if (existingAdmin) {
      console.log("⚠️ Admin already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash("Developer123", 10);

    const adminUser = {
      username: "cooci.ebrahimi@gmail.com",
      password: hashedPassword,
      role: "admin",
      profile: {
        fullName: "Creator",
        age: 24,
        gender: "Male",
      },
      testsAssigned: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await usersCollection.insertOne(adminUser);

    console.log("✅ Admin user created successfully");
  } catch (err) {
    console.error("❌ Error seeding DB:", err.message);
  } finally {
    await client.close();
  }
};

seed();
