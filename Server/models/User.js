import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    profile: {
      fullName: String,
      nationalId: String,
      gender: String,
      age: Number,
      single: Boolean,
      education: String,
      field: String,
      phone: String,
      city: String,
      province: String,
      jobPosition: String,
    },
    testsAssigned: {
      public: [
        {
          resultId: { type: mongoose.Schema.Types.ObjectId, ref: "Result" },
          testType: String,
          completedAt: {
            type: Date,
            require: true,
          },
          score: Number,
          adminFeedback: String,
        },
      ],
      private: [
        {
          resultId: { type: mongoose.Schema.Types.ObjectId, ref: "Result" },
          testType: String,
          completedAt: {
            type: Date,
            require: true,
          },
        },
      ],
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
