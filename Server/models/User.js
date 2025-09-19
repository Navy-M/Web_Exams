import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    period: String,
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    // optional: keep email if needed later
  email: {
    type: String,
    required: false, // not required anymore
    unique: false,   // remove uniqueness if unused
  },
    profile: {
      fullName: String,
      nationalId: String,
      gender: String,
      age: Number,
      fathersJob: String,
      single: Boolean,
      education: String,
      diplomaAverage: Number,
      field: String,
      phone: String,
      city: String,
      province: String,
      jobPosition: String,
    },
    testsAssigned: [
      {
        resultId: { type: mongoose.Schema.Types.ObjectId, ref: "Result" },
        testType: String,
        completedAt: {
          type: Date,
          require: true,
        },
        score: Number,
        adminFeedback: String,
        duration: Number,
        isPublic: Boolean,
        analyzedAt: Date,
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
