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
      enum: ["MBTI", "DISC", "MII", "CSTA", "HII"],
      required: true,
    },
    answers: [
      {
        questionId: String,
        selectedOption: String,
        score: Number,
      },
    ],
    score: Number,
    durationInSeconds: Number,
    otherResult: [String],
    adminFeedback: String,
    startedAt: {
      type: Date,
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Middleware to calculate total score and duration
resultSchema.pre("save", function (next) {
  if (this.answers && this.answers.length > 0) {
    this.score = this.answers.reduce((sum, ans) => sum + (ans.score || 0), 0);
  } else {
    this.score = 0;
  }

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
