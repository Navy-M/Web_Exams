import mongoose from "mongoose";

const connectDB = async () => {
  // Dev
  // const candidates = [process.env.MONGO_URI, process.env.LOCAL_MONGO_URI].filter(Boolean);
  // Product
  const candidates = [process.env.MONGO_URI].filter(Boolean);

  if (candidates.length === 0) {
    console.error("[DB] No MongoDB connection string provided (MONGO_URI or LOCAL_MONGO_URI).");
    process.exit(1);
  }

  for (const uri of candidates) {
    try {
      const label = uri.includes("mongodb+srv") ? "Atlas" : "local";
      console.info(`[DB] Trying MongoDB connection -> ${label}`);

      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS) || 30000,
      });

      console.log("[DB] ✅ MongoDB Connected");
      return;
    } catch (err) {
      console.error(`[DB] ❌ MongoDB connection failed for ${uri}:`, err.message);
    }
  }

  console.error("[DB] All MongoDB connection attempts failed. Exiting.");
  process.exit(1);
};

export default connectDB;
