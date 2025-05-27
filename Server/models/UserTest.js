import mongoose from 'mongoose';

const userTestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  test: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true
  },
  answers: [{
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test.questions'
    },
    answer: String
  }],
  score: Number,
  status: {
    type: String,
    enum: ['pending', 'completed', 'reviewed'],
    default: 'pending'
  },
  adminFeedback: String
}, { timestamps: true });

const UserTest = mongoose.model('UserTest', userTestSchema);

export default UserTest;