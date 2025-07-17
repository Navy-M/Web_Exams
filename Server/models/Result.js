// models/Result.js
import mongoose from "mongoose";

const resultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    testType: {
      type: String,
      enum: ["MBTI", "DISC", "HOLLAND", "GARDNER", "CLIFTON"],
      required: true,
    },
    answers: [],
    score: { type: Number, default: 0 },  // Explicit default
    durationInSeconds: Number,
    analysis: {
      default: {},
      details: Object,
    },
    adminFeedback: String,
    startedAt: {
      type: Date,
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { timestamps: true }
);

// Middleware to calculate total score and duration
resultSchema.pre("save", function (next) {

  if (this.startedAt && this.submittedAt) {
    const durationMs = this.submittedAt - this.startedAt;
    this.durationInSeconds = Math.floor(durationMs / 1000);
  } else {
    this.durationInSeconds = 0;
  }

  next();
});

const Result = mongoose.model("Result", resultSchema);
export default Result;
