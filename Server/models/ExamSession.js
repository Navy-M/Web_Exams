import mongoose from "mongoose";

const examSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    testType: {
      type: String,
      enum: ["MBTI", "DISC", "HOLLAND", "GARDNER", "CLIFTON", "GHQ", "PERSONAL_FAVORITES"],
      required: true,
    },
    startedAt: { type: Date, required: true },
    deadlineAt: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
    durationLimitSeconds: { type: Number, required: true, min: 1 },
    answersDraft: { type: Array, default: [] },
    currentIndex: { type: Number, default: 0, min: 0 },
    resultId: { type: mongoose.Schema.Types.ObjectId, ref: "Result", default: null },
  },
  { timestamps: true }
);

examSessionSchema.index({ user: 1, testType: 1 }, { unique: true });

const ExamSession = mongoose.model("ExamSession", examSessionSchema);
export default ExamSession;
