import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import mongoSanitize from "express-mongo-sanitize";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import testsRoutes from "./routes/testsRoutes.js"
import userRoutes from "./routes/userRoutes.js";
import resultsRoutes from "./routes/resultsRoutes.js";
import errorHandler from "./middleware/errorMiddleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Clean and normalize FRONTEND_URL list
const rawFrontend = process.env.FRONTEND_URL || "";
const allowedOrigins = rawFrontend
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`Blocked CORS origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Body parsing must come before mongoSanitize middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());
const getRoleFromRequest = (req) => {
  const cookieToken = req.cookies?.token;
  const authHeader = req.headers?.authorization;
  const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = cookieToken || bearerToken;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.role || null;
  } catch (err) {
    return null;
  }
};

// If you need original query parsed for some reason
// app.use((req, res, next) => {
//   req._query = url.parse(req.url, true).query;
//   next();
// });

// Sanitize against NoSQL injection attacks
// app.use(mongoSanitize());

// put this near the top, before app.use(limiter)
app.set('trust proxy', 1); // one proxy (nginx). Or just true.

// Rate limiter middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  standardHeaders: "draft-7",
  legacyHeaders: false,
  max: (req, res) => {
    if (process.env.NODE_ENV === "development") {
      return 1000;
    }

    const role = getRoleFromRequest(req);
    if (role === "admin" || role === "dev" || role === "developer") {
      return 1000;
    }

    return 100;
  },
});
app.use(limiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/tests", testsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/results", resultsRoutes);

app.get("/api/health", (req, res) => {
  console.log("Health check hit");
  try {
    res.status(200).json({ message: "Healthy ✅" });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({ error: "Health check failed" });
  }
});

// Error handling middleware (last)
app.use(errorHandler);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
});
