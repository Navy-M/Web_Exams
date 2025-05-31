//  enum: ['MBTI', 'DISC', 'MII', 'CSTA', 'HII']

import mongoose from "mongoose";

const testSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ["MBTI", "DISC", "MII", "CSTA", "HII"],
    },
    description: String,
    questions: [
      {
        text: String,
        options: [
          {
            value: String,
            text: String,
            score: Number,
          },
        ],
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedTo: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        deadline: Date,
      },
    ],
  },
  { timestamps: true }
);

const Test = mongoose.model("Test", testSchema);

export default Test;
