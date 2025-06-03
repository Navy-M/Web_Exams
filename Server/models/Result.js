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
      required: true,
      enum: ["MBTI", "DISC", "MII", "CSTA", "HII"],
    },
    answers: [
      {
        questionId: String,
        selectedOption: String,
        score: Number,
      },
    ],
    summary: {
      type: mongoose.Schema.Types.Mixed,
    },
    durationInSeconds: {
      type: Number,
      required: true, // optional if you'd like to allow some old records without it
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Result = mongoose.model("Result", resultSchema);

export default Result;
