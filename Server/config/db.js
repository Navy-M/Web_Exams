// import mongoose from "mongoose";

// const connectDB = async () => {
//   // Dev
//   // const candidates = [process.env.MONGO_URI, process.env.LOCAL_MONGO_URI].filter(Boolean);
//   // Product
//   const candidates = [process.env.MONGO_URI].filter(Boolean);

//   if (candidates.length === 0) {
//     console.error("[DB] No MongoDB connection string provided (MONGO_URI or LOCAL_MONGO_URI).");
//     process.exit(1);
//   }

//   for (const uri of candidates) {
//     try {
//       const label = uri.includes("mongodb+srv") ? "Atlas" : "local";
//       console.info(`[DB] Trying MongoDB connection -> ${label}`);

//       await mongoose.connect(uri, {
//         serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS) || 30000,
//       });

//       console.log("[DB] ✅ MongoDB Connected");
//       return;
//     } catch (err) {
//       console.error(`[DB] ❌ MongoDB connection failed for ${uri}:`, err.message);
//     }
//   }

//   console.error("[DB] All MongoDB connection attempts failed. Exiting.");
//   process.exit(1);
// };

// export default connectDB;



// db/connectDB.js
import mongoose from "mongoose";

export default async function connectDB() {
  const uri = process.env.MONGO_URI; // Use Atlas SRV only in prod
  if (!uri) {
    console.error("[DB] No MONGO_URI provided.");
    process.exit(1);
  }

  const isAtlas = uri.startsWith("mongodb+srv://");
  console.info(`[DB] Trying MongoDB connection -> ${isAtlas ? "Atlas (SRV)" : "Non-SRV"}`);

  // IMPORTANT: keep options minimal but explicit for network stability
  const opts = {
    // Faster fail if routing/DNS is wrong; avoids 30s hangs
    serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS) || 10000,
    connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS) || 10000,
    // Force IPv4 to avoid flaky IPv6 paths on some hosts
    family: 4,
    // Reasonable pool & keepalive for small/medium apps
    maxPoolSize: Number(process.env.MONGO_MAX_POOL) || 10,
    minPoolSize: 0,
    // Keep connections warm; helps Atlas firewalls/NATs
    socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS) || 45000,
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
    appName: process.env.MONGO_APP_NAME || "tipnama-server",
  };

  try {
    await mongoose.connect(uri, opts);
    console.log("[DB] ✅ MongoDB Connected");

    // Wire up durable listeners once (after first connect)
    const c = mongoose.connection;

    c.on("error", (err) => {
      // This catches post-connect errors like replica set selection timeouts
      console.error("💥 [DB] Connection error:", err?.name || err, err?.reason || "");
    });

    c.on("disconnected", () => {
      console.warn("⚠️ [DB] Disconnected from MongoDB. (Driver will try to reconnect)");
    });

    c.on("reconnected", () => {
      console.log("🔄 [DB] Reconnected to MongoDB.");
    });

    // Optional: brief diagnostic after connect
    try {
      const admin = c.getClient().db().admin();
      const rsStatus = await admin.command({ isMaster: 1 });
      console.log("[DB] Topology:", {
        setName: rsStatus.setName,
        hosts: rsStatus.hosts,
        primary: rsStatus.primary,
        me: rsStatus.me,
      });
    } catch { /* non-fatal */ }

  } catch (err) {
    // Richer error detail helps when it’s a routing/DNS issue
    console.error("[DB] ❌ Initial MongoDB connect failed:", {
      name: err?.name,
      message: err?.message,
      reason: err?.reason,
    });
    process.exit(1);
  }
}
