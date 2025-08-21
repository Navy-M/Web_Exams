import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
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

// Clean FRONTEND_URL: remove trailing slash if exists
const frontendURL = process.env.FRONTEND_URL?.replace(/\/$/, "");

app.use(helmet());

app.use(
  cors({
    origin: frontendURL,
    credentials: true,
  })
);

// Body parsing must come before mongoSanitize middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

// If you need original query parsed for some reason
// app.use((req, res, next) => {
//   req._query = url.parse(req.url, true).query;
//   next();
// });

// Sanitize against NoSQL injection attacks
// app.use(mongoSanitize());

// Rate limiter middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Allow 100 requests per minute per IP
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
